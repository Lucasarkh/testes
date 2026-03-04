import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/infra/db/prisma.service';
import { UserRole } from '@prisma/client';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { EmailQueueService } from '@infra/email-queue/email-queue.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private emailQueueService: EmailQueueService
  ) {
    this.jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, refreshToken, ...result } = user;
      return result;
    }
    return null;
  }

  async checkTenantSlugAvailability(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase().replace(/\s+/g, '-') }
    });
    return { available: !tenant };
  }

  async registerTenant(dto: RegisterTenantDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() }
    });
    if (existingUser) throw new ConflictException('Email já cadastrado.');

    const slug = dto.tenantSlug
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug }
    });
    if (existingTenant)
      throw new ConflictException('Slug de tenant já em uso.');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug
        }
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          role: UserRole.LOTEADORA
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tenantId: true
        }
      });

      return {
        user,
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug }
      };
    });

    // Send welcome email (non-blocking — don't fail registration if queue is down)
    try {
      await this.emailQueueService.queueWelcomeTenantEmail(
        dto.email.toLowerCase(),
        dto.name,
        dto.tenantName
      );
    } catch (error: any) {
      this.logger.error(`Failed to queue welcome email for ${dto.email}:`, error.message);
    }

    return result;
  }

  async login(user: any) {
    // Check if 2FA is enabled
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorEnabled: true, email: true, name: true }
    });

    if (fullUser?.twoFactorEnabled) {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 10);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { twoFactorCode: code, twoFactorCodeExpiry: expiry }
      });

      // Send code via email
      try {
        await this.emailQueueService.queueTwoFactorEmail(
          fullUser.email,
          fullUser.name,
          code
        );
      } catch (error: any) {
        this.logger.error(`Failed to queue 2FA email for ${fullUser.email}:`, error.message);
      }

      return {
        requiresTwoFactor: true,
        userId: user.id,
        message: 'Código de verificação enviado para seu e-mail.'
      };
    }

    return this.issueTokens(user);
  }

  async verifyTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, role: true,
        tenantId: true, agencyId: true,
        twoFactorCode: true, twoFactorCodeExpiry: true
      }
    });

    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    if (!user.twoFactorCode || !user.twoFactorCodeExpiry) {
      throw new BadRequestException('Nenhum código de verificação pendente');
    }
    if (user.twoFactorCodeExpiry < new Date()) {
      throw new BadRequestException('Código expirado. Faça login novamente.');
    }
    if (user.twoFactorCode !== code) {
      throw new UnauthorizedException('Código inválido');
    }

    // Clear the code
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorCode: null, twoFactorCodeExpiry: null }
    });

    return this.issueTokens(user);
  }

  private async issueTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      agencyId: user.agencyId
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: '8h'
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.jwtSecret,
        expiresIn: '7d'
      }
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(refreshToken, 10) }
    });

    // Set trialStartedAt on first login for LOTEADORA users (starts billing clock)
    if (user.tenantId && user.role === 'LOTEADORA') {
      try {
        await this.prisma.tenant.updateMany({
          where: { id: user.tenantId, trialStartedAt: null },
          data: { trialStartedAt: new Date() },
        });
      } catch (err) {
        this.logger.warn(`Failed to set trialStartedAt for tenant ${user.tenantId}: ${err.message}`);
      }
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        agencyId: user.agencyId
      }
    };
  }

  async refresh(id: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Acesso negado');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken
    );
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Acesso negado');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      agencyId: user.agencyId
    };

    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.jwtSecret,
        expiresIn: '8h'
      })
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null }
    });
  }

  async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const isValid = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Senha atual incorreta');

    const passwordHash = await bcrypt.hash(newPass, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (user) {
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await this.prisma.passwordReset.create({
        data: {
          email: email.toLowerCase(),
          token,
          expiresAt
        }
      });

      try {
        await this.emailQueueService.queuePasswordResetEmail(
          user.email,
          user.name,
          token
        );
      } catch (error: any) {
        this.logger.error(`Failed to queue password reset email for ${user.email}:`, error.message);
      }
    }

    return { message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.' };
  }

  async resetPassword(token: string, newPass: string) {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token }
    });

    if (!reset || reset.expiresAt < new Date()) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    const passwordHash = await bcrypt.hash(newPass, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: reset.email },
        data: { passwordHash }
      }),
      this.prisma.passwordReset.delete({
        where: { id: reset.id }
      })
    ]);

    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        agencyId: true,
        twoFactorEnabled: true,
        tenant: { select: { id: true, name: true, slug: true } }
      }
    });

    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    return user;
  }

  async toggleTwoFactor(userId: string, enable: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: enable,
        twoFactorCode: null,
        twoFactorCodeExpiry: null
      }
    });

    return { twoFactorEnabled: enable };
  }
}
