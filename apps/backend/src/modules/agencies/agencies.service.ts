import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { PrismaService } from '@/infra/db/prisma.service';
import { UserRole } from '@prisma/client';
import { CreateAgencyDto, UpdateAgencyDto } from './dto/agency.dto';
import { CreateInviteDto, AcceptInviteDto } from './dto/invite.dto';
import {
  CreateInviteCodeDto,
  RegisterWithInviteCodeDto,
  UpdateInviteCodeDto
} from './dto/invite-code.dto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { EmailQueueService } from '@infra/email-queue/email-queue.service';

@Injectable()
export class AgenciesService {
  private readonly logger = new Logger(AgenciesService.name);

  constructor(
    private prisma: PrismaService,
    private emailQueueService: EmailQueueService
  ) {}

  private normalizeSharingLinkCode(value: string | null | undefined): string {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async createAgency(tenantId: string, dto: CreateAgencyDto) {
    const existing = await this.prisma.agency.findUnique({
      where: { email: dto.email }
    });
    if (existing)
      throw new ConflictException('Email de imobiliária já cadastrado.');

    return this.prisma.agency.create({
      data: {
        ...dto,
        tenantId,
        isPending: true
      }
    });
  }

  async listAgencies(tenantId: string, page = 1, limit = 12, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { creci: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.agency.findMany({
        where,
        include: {
          invites: {
            where: { used: false, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          _count: {
            select: { realtors: true, users: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.agency.count({ where })
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getAgency(id: string, tenantId: string) {
    const agency = await this.prisma.agency.findFirst({
      where: { id, tenantId },
      include: {
        realtors: {
          include: {
            user: true
          }
        },
        users: true
      }
    });
    if (!agency) throw new NotFoundException('Imobiliária não encontrada.');
    return agency;
  }

  async updateAgency(id: string, tenantId: string, dto: UpdateAgencyDto) {
    return this.prisma.agency.updateMany({
      where: { id, tenantId },
      data: dto
    });
  }

  async deleteAgency(id: string, tenantId: string) {
    return this.prisma.agency.updateMany({
      where: { id, tenantId, isActive: true },
      data: { isActive: false }
    });
  }

  // --- Invite System ---

  async createInvite(tenantId: string, senderId: string, dto: CreateInviteDto) {
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId }
    });
    if (!sender)
      throw new NotFoundException('Usuário remetente não encontrado.');

    // Authorization logic
    if (sender.role === UserRole.IMOBILIARIA) {
      if (dto.role !== UserRole.CORRETOR)
        throw new ForbiddenException(
          'Imobiliárias só podem convidar corretores.'
        );
      if (!sender.agencyId)
        throw new BadRequestException(
          'Usuário imobiliária sem agencyId associado.'
        );
      dto.agencyId = sender.agencyId;
    }

    if (sender.role === UserRole.LOTEADORA) {
      if (dto.role !== UserRole.IMOBILIARIA && dto.role !== UserRole.CORRETOR) {
        throw new ForbiddenException(
          'Loteadoras só podem convidar imobiliárias ou seus próprios corretores.'
        );
      }
    }

    // Se for convite para Administrador de Imobiliária (feito pela Loteadora)
    // Validar se o e-mail coincide com o e-mail da imobiliária pré-cadastrada
    if (dto.role === UserRole.IMOBILIARIA && dto.agencyId) {
      const agency = await this.prisma.agency.findUnique({
        where: { id: dto.agencyId }
      });
      if (!agency) throw new NotFoundException('Imobiliária não encontrada.');
      if (agency.email.toLowerCase() !== dto.email.toLowerCase()) {
        throw new BadRequestException(
          'O e-mail do convite deve ser o mesmo e-mail cadastrado para a imobiliária.'
        );
      }
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const invite = await this.prisma.invite.create({
      data: {
        email: dto.email,
        role: dto.role,
        agencyId: dto.agencyId,
        tenantId,
        token,
        expiresAt
      }
    });

    // Send invite email (non-blocking — don't fail invite creation if queue is down)
    try {
      await this.emailQueueService.queueInviteEmail(
        dto.email,
        invite.token,
        invite.role,
        invite.email
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to queue invite email for ${dto.email}:`,
        error.message
      );
    }

    return invite;
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const invite = await this.prisma.invite.findFirst({
      where: { token: dto.token, used: false, expiresAt: { gt: new Date() } }
    });

    if (!invite) throw new BadRequestException('Convite inválido ou expirado.');

    // Segurança extra: Validar se o e-mail que está tentando registrar é EXATAMENTE o e-mail do convite
    // Isso evita que alguém pegue um token válido e mude o e-mail na requisição (fraude)
    // No frontend vamos passar o e-mail, mas o backend manda na verdade o que está no banco de dados do convite.

    const existingUser = await this.prisma.user.findUnique({
      where: { email: invite.email }
    });

    if (existingUser) {
      await this.prisma.invite.update({
        where: { id: invite.id },
        data: { used: true }
      });
      throw new BadRequestException(
        'Este e-mail já está cadastrado no sistema.'
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: invite.email,
          name: dto.name,
          passwordHash,
          role: invite.role,
          tenantId: invite.tenantId,
          agencyId: invite.agencyId
        }
      });

      if (invite.role === UserRole.CORRETOR) {
        // Se houver agencyId, associa à imobiliária. Se não, é corretor direto da loteadora.
        await tx.realtor.create({
          data: {
            userId: user.id,
            agencyId: invite.agencyId || null
          }
        });

        // Tenta encontrar ou criar um RealtorLink para esse usuário para ele poder ter seu link próprio
        const baseCode = dto.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        // Garante código único
        let finalCode = baseCode;
        let counter = 1;
        while (
          await tx.realtorLink.findUnique({
            where: {
              tenantId_code: { tenantId: invite.tenantId, code: finalCode }
            }
          })
        ) {
          finalCode = `${baseCode}-${counter}`;
          counter++;
        }

        await tx.realtorLink.create({
          data: {
            tenantId: invite.tenantId,
            userId: user.id,
            name: dto.name,
            email: invite.email,
            phone: dto.phone || null,
            creci: dto.creci || null,
            code: finalCode,
            agencyId: invite.agencyId || null
          }
        });
      }

      if (invite.role === UserRole.IMOBILIARIA && invite.agencyId) {
        await tx.agency.update({
          where: { id: invite.agencyId },
          data: { isPending: false }
        });
      }

      await tx.invite.update({
        where: { id: invite.id },
        data: { used: true }
      });

      return user;
    });
  }

  async getInviteDetail(token: string) {
    const invite = await this.prisma.invite.findFirst({
      where: { token, used: false, expiresAt: { gt: new Date() } },
      include: {
        agency: { select: { name: true, email: true } }
      }
    });

    if (!invite)
      throw new BadRequestException(
        'Convite inválido, expirado ou já utilizado.'
      );

    return {
      email: invite.email,
      role: invite.role,
      agencyName: invite.agency?.name
    };
  }

  // --- Invite Codes (open registration links) ---

  async createInviteCode(tenantId: string, dto: CreateInviteCodeDto) {
    const role = dto.role ?? UserRole.CORRETOR;
    if (role !== UserRole.CORRETOR && role !== UserRole.IMOBILIARIA) {
      throw new BadRequestException(
        'Código de convite só pode ser criado para CORRETOR ou IMOBILIARIA.'
      );
    }

    return this.prisma.tenantInviteCode.create({
      data: {
        tenantId,
        description: dto.description,
        role,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null
      }
    });
  }

  async listInviteCodes(tenantId: string) {
    return this.prisma.tenantInviteCode.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateInviteCode(
    id: string,
    tenantId: string,
    dto: UpdateInviteCodeDto
  ) {
    const code = await this.prisma.tenantInviteCode.findFirst({
      where: { id, tenantId }
    });
    if (!code) throw new NotFoundException('Código de convite não encontrado.');

    return this.prisma.tenantInviteCode.update({
      where: { id },
      data: {
        description:
          dto.description !== undefined ? dto.description : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
        maxUses: dto.maxUses !== undefined ? dto.maxUses : undefined,
        expiresAt:
          dto.expiresAt !== undefined
            ? dto.expiresAt
              ? new Date(dto.expiresAt)
              : null
            : undefined
      }
    });
  }

  async deleteInviteCode(id: string, tenantId: string) {
    const code = await this.prisma.tenantInviteCode.findFirst({
      where: { id, tenantId }
    });
    if (!code) throw new NotFoundException('Código de convite não encontrado.');
    return this.prisma.tenantInviteCode.delete({ where: { id } });
  }

  async getInviteCodePublicDetails(code: string) {
    const inviteCode = await this.prisma.tenantInviteCode.findFirst({
      where: {
        code,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      },
      include: {
        tenant: { select: { name: true, slug: true } }
      }
    });

    if (!inviteCode)
      throw new BadRequestException(
        'Link de cadastro inválido, expirado ou desativado.'
      );

    if (
      inviteCode.maxUses !== null &&
      inviteCode.usageCount >= inviteCode.maxUses
    ) {
      throw new BadRequestException(
        'Este link de cadastro atingiu seu limite de usos.'
      );
    }

    return {
      code: inviteCode.code,
      role: inviteCode.role,
      description: inviteCode.description,
      tenantName: inviteCode.tenant.name,
      tenantSlug: inviteCode.tenant.slug
    };
  }

  async checkInviteCodeSharingLinkAvailability(
    code: string,
    sharingLinkValue: string
  ) {
    const inviteCode = await this.prisma.tenantInviteCode.findFirst({
      where: {
        code,
        isActive: true,
        role: UserRole.CORRETOR,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      },
      select: { tenantId: true }
    });

    if (!inviteCode) {
      throw new BadRequestException(
        'Link de cadastro inválido, expirado ou desativado.'
      );
    }

    const normalizedCode = this.normalizeSharingLinkCode(sharingLinkValue);
    if (!normalizedCode) {
      throw new BadRequestException(
        'Informe um link de compartilhamento válido.'
      );
    }

    const existing = await this.prisma.realtorLink.findUnique({
      where: {
        tenantId_code: {
          tenantId: inviteCode.tenantId,
          code: normalizedCode
        }
      },
      select: { id: true }
    });

    return { available: !existing, normalizedCode };
  }

  async registerWithInviteCode(code: string, dto: RegisterWithInviteCodeDto) {
    const inviteCode = await this.prisma.tenantInviteCode.findFirst({
      where: {
        code,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      },
      include: { tenant: true }
    });

    if (!inviteCode)
      throw new BadRequestException(
        'Link de cadastro inválido, expirado ou desativado.'
      );

    if (
      inviteCode.maxUses !== null &&
      inviteCode.usageCount >= inviteCode.maxUses
    ) {
      throw new BadRequestException(
        'Este link de cadastro atingiu seu limite de usos.'
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });
    if (existingUser)
      throw new ConflictException('Este e-mail já está cadastrado no sistema.');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      let agencyId: string | null = null;

      // For IMOBILIARIA role, create the agency record first
      if (inviteCode.role === UserRole.IMOBILIARIA) {
        const agencyName = dto.agencyName || dto.name;
        const existingAgency = await tx.agency.findUnique({
          where: { email: dto.email }
        });
        if (existingAgency)
          throw new ConflictException(
            'Este e-mail de imobiliária já está cadastrado.'
          );

        const agency = await tx.agency.create({
          data: {
            tenantId: inviteCode.tenantId,
            name: agencyName,
            email: dto.email,
            phone: dto.phone,
            creci: dto.creci,
            isPending: false
          }
        });
        agencyId = agency.id;
      }

      const user = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash,
          role: inviteCode.role,
          tenantId: inviteCode.tenantId,
          agencyId
        }
      });

      if (inviteCode.role === UserRole.CORRETOR) {
        await tx.realtor.create({
          data: { userId: user.id, agencyId: null }
        });

        const finalCode = this.normalizeSharingLinkCode(dto.sharingLinkCode);
        if (!finalCode) {
          throw new BadRequestException(
            'Informe um link de compartilhamento válido.'
          );
        }

        const existingCode = await tx.realtorLink.findUnique({
          where: {
            tenantId_code: { tenantId: inviteCode.tenantId, code: finalCode }
          },
          select: { id: true }
        });

        if (existingCode) {
          throw new ConflictException(
            'Este link de compartilhamento já está em uso.'
          );
        }

        await tx.realtorLink.create({
          data: {
            tenantId: inviteCode.tenantId,
            userId: user.id,
            name: dto.name,
            email: dto.email,
            phone: dto.phone || null,
            creci: dto.creci || null,
            code: finalCode,
            agencyId: null
          }
        });
      }

      // Increment usage counter
      await tx.tenantInviteCode.update({
        where: { id: inviteCode.id },
        data: { usageCount: { increment: 1 } }
      });

      return { success: true, role: inviteCode.role };
    });
  }

  async getAgencyMetrics(agencyId: string) {
    const realtors = await this.prisma.realtor.findMany({
      where: { agencyId },
      include: {
        user: {
          include: {
            realtorLink: {
              include: {
                _count: {
                  select: { leads: true, trackingSessions: true }
                }
              }
            }
          }
        }
      }
    });

    const team = realtors.map((r) => {
      const leads = r.user.realtorLink?._count.leads || 0;
      const sessions = r.user.realtorLink?._count.trackingSessions || 0;
      const conversionRate =
        sessions > 0 ? parseFloat(((leads / sessions) * 100).toFixed(1)) : 0;

      return {
        id: r.id,
        name: r.user.name,
        code: r.user.realtorLink?.code || '',
        leads,
        sessions,
        accesses: sessions,
        conversionRate
      };
    });

    const totalLeads = team.reduce((acc, t) => acc + t.leads, 0);
    const totalSessions = team.reduce((acc, t) => acc + t.sessions, 0);

    return {
      team,
      totalLeads,
      totalSessions,
      totalRealtors: team.length
    };
  }
}
