import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { PrismaService } from '@/infra/db/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { EmailQueueService } from '@infra/email-queue/email-queue.service';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  tenantId: true,
  createdAt: true
};

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private emailQueueService: EmailQueueService
  ) {}

  private buildTenantScope(tenantId?: string) {
    return tenantId ? { tenantId } : { tenantId: null };
  }

  async create(
    tenantId: string | undefined,
    dto: CreateUserDto,
    currentUser?: { role?: UserRole }
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() }
    });
    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // In global (no tenant) scope, /users is only for internal LOTIO users.
    if (!tenantId) {
      if (dto.role && dto.role !== UserRole.SYSADMIN) {
        throw new BadRequestException(
          'No contexto global, apenas usuários SYSADMIN podem ser criados em /users. Para criar loteadora, use a tela de Loteadoras.'
        );
      }

      const user = await this.prisma.user.create({
        data: {
          tenantId: null,
          name: dto.name,
          email: dto.email.toLowerCase(),
          passwordHash,
          role: UserRole.SYSADMIN
        },
        select: { ...USER_SELECT, tenant: { select: { name: true } } }
      });

      return user;
    }

    // Tenant-scoped managers cannot create SYSADMIN users.
    if (dto.role === UserRole.SYSADMIN) {
      throw new BadRequestException(
        'Usuário SYSADMIN só pode ser criado no contexto global da Lotio.'
      );
    }

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role ?? UserRole.CORRETOR
      },
      select: { ...USER_SELECT, tenant: { select: { name: true } } }
    });

    // Send correct welcome email based on role (non-blocking)
    try {
      if (user.role === UserRole.CORRETOR) {
        await this.emailQueueService.queueWelcomeRealtorEmail(
          user.email,
          user.name
        );
      } else if (user.role === UserRole.LOTEADORA && tenantId) {
        await this.emailQueueService.queueWelcomeTenantEmail(
          user.email,
          user.name,
          user.tenant?.name || 'sua empresa'
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to queue welcome email for ${user.email}:`,
        error.message
      );
    }

    return user;
  }

  async findAll(tenantId: string | undefined, query: PaginationQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;
    const where = this.buildTenantScope(tenantId);

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.user.count({
        where
      })
    ]);

    return {
      data,
      meta: {
        totalItems: total,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      }
    };
  }

  async findById(tenantId: string | undefined, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, ...this.buildTenantScope(tenantId) },
      select: USER_SELECT
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async update(tenantId: string | undefined, id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, ...this.buildTenantScope(tenantId) }
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (!tenantId && dto.role && dto.role !== UserRole.SYSADMIN) {
      throw new BadRequestException(
        'No contexto global, usuários internos devem permanecer com papel SYSADMIN.'
      );
    }

    if (tenantId && dto.role === UserRole.SYSADMIN) {
      throw new BadRequestException(
        'Não é permitido promover usuário de tenant para SYSADMIN por este endpoint.'
      );
    }

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.role) data.role = dto.role;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT
    });
  }

  async remove(tenantId: string | undefined, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, ...this.buildTenantScope(tenantId) }
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    return this.prisma.user.delete({
      where: { id }
    });
  }
}
