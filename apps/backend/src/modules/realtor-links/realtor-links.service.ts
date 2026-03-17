import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException
} from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { S3Service } from '@infra/s3/s3.service';
import { CreateRealtorLinkDto } from './dto/create-realtor-link.dto';
import { UpdateRealtorLinkDto } from './dto/update-realtor-link.dto';
import * as bcrypt from 'bcrypt';
import { NotificationType, UserRole } from '@prisma/client';
import { NotificationsService } from '@modules/notifications/notifications.service';

const PENDING_REQUEST_MARKER = '[PENDING_APPROVAL_REQUEST]';
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

@Injectable()
export class RealtorLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly s3: S3Service
  ) {}

  private isPendingRequest(notes?: string | null) {
    return typeof notes === 'string' && notes.includes(PENDING_REQUEST_MARKER);
  }

  private ensurePendingMarker(notes?: string | null) {
    if (!notes || !notes.trim()) return PENDING_REQUEST_MARKER;
    if (this.isPendingRequest(notes)) return notes;
    return `${notes}\n${PENDING_REQUEST_MARKER}`;
  }

  private removePendingMarker(notes?: string | null) {
    if (!notes) return notes;
    return notes
      .replace(PENDING_REQUEST_MARKER, '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');
  }

  private toRealtorLinkResponse<T extends Record<string, any>>(
    link: T
  ): T & {
    isPending: boolean;
    profileImageUrl: string | null;
    avatarUrl: string | null;
  } {
    const photoUrl = this.s3.resolvePublicAssetUrl(
      (link.photoUrl as string | null | undefined) ?? null
    );

    return {
      ...link,
      photoUrl,
      isPending: this.isPendingRequest(link.notes),
      profileImageUrl: photoUrl,
      avatarUrl: photoUrl
    };
  }

  private validatePhoto(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    if (!ALLOWED_PHOTO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo não permitido. Aceitos: ${ALLOWED_PHOTO_TYPES.join(', ')}`
      );
    }
    if (file.size > MAX_PHOTO_SIZE) {
      throw new BadRequestException('Arquivo muito grande. Máximo: 10 MB');
    }
  }

  private async buildUniqueCode(tenantId: string, baseName: string) {
    const slugBase =
      (baseName || 'corretor')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48) || 'corretor';

    for (let i = 0; i < 10; i++) {
      const suffix = i === 0 ? '' : `-${Math.floor(100 + Math.random() * 900)}`;
      const candidate = `${slugBase}${suffix}`;
      const exists = await this.prisma.realtorLink.findUnique({
        where: { tenantId_code: { tenantId, code: candidate } },
        select: { id: true }
      });
      if (!exists) return candidate;
    }

    return `${slugBase}-${Date.now().toString().slice(-6)}`;
  }

  async create(tenantId: string, dto: CreateRealtorLinkDto, currentUser?: any) {
    const { projectIds, accountEmail, accountPassword, ...data } = dto;
    delete (data as any).photoUrl;
    const existing = await this.prisma.realtorLink.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } }
    });
    if (existing)
      throw new ConflictException('Já existe um corretor com este código.');

    // If IMOBILIARIA role, force their agencyId
    const agencyId =
      currentUser?.role === 'IMOBILIARIA'
        ? currentUser.agencyId
        : (dto as any).agencyId;

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

    const links = await this.prisma.realtorLink.findMany({
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

    return links.map((link) => this.toRealtorLinkResponse(link));
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
    return this.toRealtorLinkResponse(link);
  }

  async findByUserId(userId: string) {
    const link = await this.prisma.realtorLink.findUnique({
      where: { userId },
      include: {
        projects: { select: { id: true, name: true, slug: true } },
        _count: { select: { leads: true } }
      }
    });
    return link ? this.toRealtorLinkResponse(link) : null;
  }

  async requestAccess(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        agencyId: true
      }
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');
    if (user.role !== UserRole.CORRETOR) {
      throw new BadRequestException(
        'Apenas corretores podem solicitar vínculo.'
      );
    }
    if (!user.tenantId) {
      throw new BadRequestException(
        'Sua conta não está vinculada a uma loteadora.'
      );
    }

    const existingLink = await this.prisma.realtorLink.findUnique({
      where: { userId: user.id },
      include: {
        projects: { select: { id: true, name: true, slug: true } },
        _count: { select: { leads: true } }
      }
    });

    if (existingLink) {
      if (this.isPendingRequest(existingLink.notes)) {
        return {
          alreadyRequested: true,
          realtorLink: this.toRealtorLinkResponse(existingLink),
          message: 'Sua solicitação já está pendente de aprovação.'
        };
      }

      if (!existingLink.enabled) {
        const reRequested = await this.prisma.realtorLink.update({
          where: { id: existingLink.id },
          data: {
            notes: this.ensurePendingMarker(
              existingLink.notes ||
                'Solicitação de reativação criada pelo corretor no painel.'
            )
          },
          include: {
            projects: { select: { id: true, name: true, slug: true } },
            _count: { select: { leads: true } }
          }
        });

        await this.notificationsService.notifyTenantLoteadoras(
          user.tenantId,
          NotificationType.SYSTEM,
          'Solicitação de reativação de corretor',
          `${user.name} (${user.email}) solicitou reativação do link de compartilhamento no painel.`,
          '/painel/corretores',
          {
            event: 'REALTOR_LINK_REACTIVATION_REQUESTED',
            realtorLinkId: reRequested.id,
            requesterUserId: user.id
          }
        );

        return {
          alreadyRequested: false,
          realtorLink: this.toRealtorLinkResponse(reRequested),
          message: 'Solicitação de reativação enviada para a loteadora.'
        };
      }

      throw new ConflictException(
        'Seu vínculo de corretor já está cadastrado.'
      );
    }

    const generatedCode = await this.buildUniqueCode(
      user.tenantId,
      user.name || user.email
    );
    const pendingNotes = this.ensurePendingMarker(
      'Solicitação de vínculo criada pelo corretor no painel.'
    );

    const createdLink = await this.prisma.realtorLink.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        agencyId: user.agencyId || null,
        name: user.name,
        email: user.email,
        code: generatedCode,
        enabled: false,
        notes: pendingNotes
      },
      include: {
        projects: { select: { id: true, name: true, slug: true } },
        _count: { select: { leads: true } }
      }
    });

    await this.notificationsService.notifyTenantLoteadoras(
      user.tenantId,
      NotificationType.SYSTEM,
      'Solicitação de vínculo de corretor',
      `${user.name} (${user.email}) solicitou link de compartilhamento no painel. Aprove para liberar o acesso.`,
      '/painel/corretores',
      {
        event: 'REALTOR_LINK_REQUESTED',
        realtorLinkId: createdLink.id,
        requesterUserId: user.id
      }
    );

    return {
      alreadyRequested: false,
      realtorLink: this.toRealtorLinkResponse(createdLink),
      message: 'Solicitação enviada com sucesso para a loteadora.'
    };
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
    delete data.photoUrl;

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

  async uploadMyPhoto(userId: string, file: Express.Multer.File) {
    this.validatePhoto(file);

    const link = await this.prisma.realtorLink.findUnique({
      where: { userId },
      select: { id: true, tenantId: true, photoUrl: true }
    });
    if (!link)
      throw new NotFoundException('Perfil de corretor não encontrado.');

    if (link.photoUrl) {
      const oldKey = this.s3.keyFromUrl(link.photoUrl);
      if (oldKey) await this.s3.delete(oldKey).catch(() => {});
    }

    const key = this.s3.buildKey(
      link.tenantId,
      `realtors/${link.id}/profile-photo`,
      file.originalname
    );
    await this.s3.upload(file.buffer, key, file.mimetype);
    const photoUrl = this.s3.publicAssetUrl(key);

    const updated = await this.prisma.realtorLink.update({
      where: { id: link.id },
      data: { photoUrl },
      include: {
        projects: { select: { id: true, name: true, slug: true } },
        _count: { select: { leads: true } }
      }
    });

    return this.toRealtorLinkResponse(updated);
  }

  async removeMyPhoto(userId: string) {
    const link = await this.prisma.realtorLink.findUnique({
      where: { userId },
      include: {
        projects: { select: { id: true, name: true, slug: true } },
        _count: { select: { leads: true } }
      }
    });
    if (!link)
      throw new NotFoundException('Perfil de corretor não encontrado.');

    if (link.photoUrl) {
      const oldKey = this.s3.keyFromUrl(link.photoUrl);
      if (oldKey) await this.s3.delete(oldKey).catch(() => {});
    }

    const updated = await this.prisma.realtorLink.update({
      where: { id: link.id },
      data: { photoUrl: null },
      include: {
        projects: { select: { id: true, name: true, slug: true } },
        _count: { select: { leads: true } }
      }
    });

    return this.toRealtorLinkResponse(updated);
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
    const photoUrl = this.s3.resolvePublicAssetUrl(link.photoUrl) || link.photoUrl;
    return {
      ...link,
      photoUrl,
      profileImageUrl: photoUrl,
      avatarUrl: photoUrl
    };
  }

  async update(tenantId: string, id: string, dto: UpdateRealtorLinkDto) {
    const { projectIds, ...data } = dto;
    delete (data as any).photoUrl;
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

    const normalizedData: any = { ...data };
    if (dto.enabled === true) {
      normalizedData.notes = this.removePendingMarker(
        dto.notes !== undefined ? dto.notes : link.notes
      );
    } else if (dto.notes !== undefined) {
      normalizedData.notes = dto.notes;
    }

    const updated = await this.prisma.realtorLink.update({
      where: { id },
      data: {
        ...normalizedData,
        projects: projectIds
          ? { set: projectIds.map((id) => ({ id })) }
          : undefined
      },
      include: { projects: true }
    });

    return this.toRealtorLinkResponse(updated);
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
      select: {
        id: true,
        name: true,
        code: true,
        email: true,
        phone: true,
        creci: true,
        photoUrl: true,
        enabled: true,
        createdAt: true
      }
    });
    if (!link) throw new NotFoundException('Corretor não encontrado.');

    const [
      totalLeads,
      leadsByStatus,
      schedulingCount,
      sessionCount,
      recentLeads
    ] = await Promise.all([
      this.prisma.lead.count({ where: { realtorLinkId: id } }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { realtorLinkId: id },
        _count: { id: true }
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
          project: { select: { id: true, name: true } }
        }
      })
    ]);

    const statusMap = leadsByStatus.reduce<Record<string, number>>((acc, g) => {
      acc[g.status] = g._count.id;
      return acc;
    }, {});

    return this.toRealtorLinkResponse({
      ...link,
      totalLeads,
      leadsByStatus: statusMap,
      schedulingCount,
      sessionCount,
      recentLeads
    });
  }
}
