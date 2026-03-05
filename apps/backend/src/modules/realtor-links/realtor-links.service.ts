import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException
} from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { CreateRealtorLinkDto } from './dto/create-realtor-link.dto';
import { UpdateRealtorLinkDto } from './dto/update-realtor-link.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

@Injectable()
export class RealtorLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateRealtorLinkDto, currentUser?: any) {
    const { projectIds, accountEmail, accountPassword, ...data } = dto;
    const existing = await this.prisma.realtorLink.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } }
    });
    if (existing)
      throw new ConflictException('Já existe um corretor com este código.');

    // If IMOBILIARIA role, force their agencyId
    let agencyId = currentUser?.role === 'IMOBILIARIA' ? currentUser.agencyId : (dto as any).agencyId;

    // If account credentials are provided, create User + RealtorLink in a transaction
    if (accountEmail && accountPassword) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: accountEmail.toLowerCase() }
      });
      if (existingUser)
        throw new ConflictException('Já existe um usuário com este email.');

      const passwordHash = await bcrypt.hash(accountPassword, 10);

      return this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            tenantId,
            agencyId,
            name: data.name,
            email: accountEmail.toLowerCase(),
            passwordHash,
            role: UserRole.CORRETOR
          }
        });

        // If agencyId is set, also create a Realtor standard profile for team management
        if (agencyId) {
          const realtor = await tx.realtor.create({
            data: {
              userId: user.id,
              agencyId
            }
          });
          // Update the RealtorLink with the agencyId for future filters
          (data as any).agencyId = agencyId; 
        }

        return tx.realtorLink.create({
          data: {
            tenantId,
            ...data,
            userId: user.id,
            projects: projectIds?.length
              ? { connect: projectIds.map((id) => ({ id })) }
              : undefined
          },
          include: {
            projects: true,
            user: { select: { id: true, email: true, name: true } }
          }
        });
      });
    }

    // No account — just create the realtor link
    return this.prisma.realtorLink.create({
      data: {
        tenantId,
        ...data,
        agencyId, // Save agencyId directly in the link if no user account? (Schema has it?)
        projects: projectIds?.length
          ? { connect: projectIds.map((id) => ({ id })) }
          : undefined
      },
      include: { projects: true }
    });
  }

  async findAll(tenantId: string, projectId?: string, currentUser?: any) {
    // If IMOBILIARIA role, only return realtors from their agency
    let agencyId: string | undefined;
    if (currentUser?.role === 'IMOBILIARIA') {
      agencyId = currentUser.agencyId;
      if (!agencyId) return [];
    }

    return this.prisma.realtorLink.findMany({
      where: {
        tenantId,
        ...(projectId ? { projects: { some: { id: projectId } } } : {}),
        ...(agencyId ? { user: { agencyId } } : {})
      },
      include: {
        _count: { select: { leads: true } },
        projects: { select: { id: true, name: true, slug: true } },
        tenant: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, email: true, name: true, agencyId: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(tenantId: string, id: string) {
    const link = await this.prisma.realtorLink.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { leads: true } },
        projects: { select: { id: true, name: true, slug: true } }
      }
    });
    if (!link) throw new NotFoundException('Link de corretor não encontrado.');
    return link;
  }

  async findByUserId(userId: string) {
    const link = await this.prisma.realtorLink.findUnique({
      where: { userId },
      include: {
        projects: { select: { id: true, name: true, slug: true } },
        _count: { select: { leads: true } }
      }
    });
    return link;
  }

  async checkEmail(email: string, excludeId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    // Also check if any existing realtor has this email, except the current one
    const realtor = await this.prisma.realtorLink.findFirst({
        where: {
            email: email.toLowerCase(),
            ...(excludeId ? { NOT: { id: excludeId } } : {})
        }
    });

    return { available: !user && !realtor };
  }

  async checkCode(tenantId: string, code: string, excludeId?: string) {
    const realtor = await this.prisma.realtorLink.findFirst({
      where: {
        tenantId,
        code,
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      }
    });
    return { available: !realtor };
  }

  async updateMe(userId: string, dto: UpdateRealtorLinkDto) {
    const link = await this.prisma.realtorLink.findUnique({
      where: { userId }
    });
    if (!link)
      throw new NotFoundException('Perfil de corretor não encontrado.');

    // Remove fields that the realtor shouldn't be allowed to change themselves
    // Corretor can change: name, phone, email, creci, photoUrl, code
    const {
      projectIds,
      enabled,
      accountEmail,
      accountPassword,
      notes,
      ...data
    } = dto as any;

    if (data.code && data.code !== link.code) {
      const conflict = await this.prisma.realtorLink.findFirst({
        where: {
          tenantId: link.tenantId,
          code: data.code,
          NOT: { id: link.id }
        }
      });
      if (conflict)
        throw new ConflictException(
          'O novo código já está sendo utilizado por outro corretor.'
        );
    }

    return this.prisma.$transaction(async (tx) => {
      if (data.name) {
        await tx.user.update({
          where: { id: userId },
          data: { name: data.name }
        });
      }

      return tx.realtorLink.update({
        where: { id: link.id },
        data
      });
    });
  }

  /** Public – resolve realtor by project slug + code for the public page */
  async findPublic(projectSlug: string, code: string) {
    const project = await this.prisma.project.findUnique({
      where: { slug: projectSlug }
    });
    if (!project) throw new NotFoundException('Project não encontrado.');

    const link = await this.prisma.realtorLink.findFirst({
      where: { tenantId: project.tenantId, code, enabled: true },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        creci: true,
        photoUrl: true,
        code: true,
        projects: { select: { id: true, name: true, slug: true } }
      }
    });
    if (!link)
      throw new NotFoundException(
        'Link de corretor não encontrado ou desabilitado.'
      );
    return link;
  }

  async update(tenantId: string, id: string, dto: UpdateRealtorLinkDto) {
    const { projectIds, ...data } = dto;
    const link = await this.prisma.realtorLink.findFirst({
      where: { id, tenantId }
    });
    if (!link) throw new NotFoundException('Link de corretor não encontrado.');

    if (dto.code && dto.code !== link.code) {
      const conflict = await this.prisma.realtorLink.findFirst({
        where: { tenantId, code: dto.code, NOT: { id } }
      });
      if (conflict)
        throw new ConflictException('Código já utilizado por outro corretor.');
    }

    return this.prisma.realtorLink.update({
      where: { id },
      data: {
        ...data,
        projects: projectIds
          ? { set: projectIds.map((id) => ({ id })) }
          : undefined
      },
      include: { projects: true }
    });
  }

  async remove(tenantId: string, id: string) {
    const link = await this.prisma.realtorLink.findFirst({
      where: { id, tenantId },
      select: { id: true, userId: true }
    });
    if (!link) throw new NotFoundException('Link de corretor não encontrado.');

    // Delete link (and associated user account if exists) in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.realtorLink.delete({ where: { id } });
      if (link.userId) {
        await tx.user.delete({ where: { id: link.userId } });
      }
    });

    return { message: 'Link de corretor removido com sucesso.' };
  }

  async getStats(tenantId: string, id: string) {
    const link = await this.prisma.realtorLink.findFirst({
      where: { id, tenantId },
      select: { id: true, name: true, code: true, email: true, phone: true, creci: true, photoUrl: true, enabled: true, createdAt: true }
    });
    if (!link) throw new NotFoundException('Corretor não encontrado.');

    const [totalLeads, leadsByStatus, schedulingCount, sessionCount, recentLeads] = await Promise.all([
      this.prisma.lead.count({ where: { realtorLinkId: id } }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { realtorLinkId: id },
        _count: { id: true },
      }),
      this.prisma.scheduling.count({ where: { lead: { realtorLinkId: id } } }),
      this.prisma.trackingSession.count({ where: { realtorLinkId: id } }),
      this.prisma.lead.findMany({
        where: { realtorLinkId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          createdAt: true,
          project: { select: { id: true, name: true } },
        },
      }),
    ]);

    const statusMap = leadsByStatus.reduce<Record<string, number>>((acc, g) => {
      acc[g.status] = g._count.id;
      return acc;
    }, {});

    return {
      ...link,
      totalLeads,
      leadsByStatus: statusMap,
      schedulingCount,
      sessionCount,
      recentLeads,
    };
  }
}
