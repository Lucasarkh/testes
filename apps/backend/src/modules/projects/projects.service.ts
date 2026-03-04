import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  Logger
} from '@nestjs/common';
import { PrismaService } from '@/infra/db/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus, Project, User, UserRole } from '@prisma/client';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { PaginatedResponse } from '@common/dto/paginated-response.dto';
import { NearbyService } from '@modules/nearby/nearby.service';
import { BillingService } from '@modules/billing/billing.service';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_SERVICE') private redis: any,
    private nearbyService: NearbyService,
    private billingService: BillingService,
  ) {}

  async create(tenantId: string, dto: CreateProjectDto, user?: User) {
    // Validate project creation against billing limits
    await this.billingService.validateProjectCreation(tenantId);

    const existing = await this.prisma.project.findUnique({
      where: { slug: dto.slug.toLowerCase().replace(/\s+/g, '-') }
    });
    if (existing)
      throw new ConflictException('Já existe um projeto com este slug.');

    // Only sysadmin can set customDomain on creation
    if (dto.customDomain && user?.role !== UserRole.SYSADMIN) {
        delete dto.customDomain;
    }

    if (dto.customDomain) {
      const existingDomain = await this.prisma.project.findUnique({
          where: { customDomain: dto.customDomain }
      });
      if (existingDomain) throw new ConflictException('Domínio já em uso.');
    }

    const project = await this.prisma.project.create({
      data: {
        tenantId,
        name: dto.name,
        slug: dto.slug.toLowerCase().replace(/\s+/g, '-'),
        description: dto.description,
        customDomain: dto.customDomain,
        reservationExpiryHours: dto.reservationExpiryHours ?? 24
      }
    });

    // Sync billing subscription after project creation
    try {
      await this.billingService.onProjectCreated(tenantId, project.id);
    } catch (err) {
      this.logger.warn(`Failed to sync billing after project creation: ${err.message}`);
    }

    return project;
  }

  async findAll(
    tenantId: string,
    query: PaginationQueryDto
  ): Promise<PaginatedResponse<Project>> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      (this.prisma as any).project.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { slug: true, name: true } },
          _count: { select: { mapElements: true, leads: true } }
        },
        skip,
        take: limit
      }),
      this.prisma.project.count({
        where: { tenantId }
      })
    ]);

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page
      }
    };
  }

  async findOne(tenantId: string, id: string) {
    const project = await (this.prisma as any).project.findFirst({
      where: { id, tenantId },
      include: {
        tenant: { select: { slug: true, name: true } },
        aiConfig: true,
        _count: {
          select: { mapElements: true, leads: true, projectMedias: true }
        }
      }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }

  async checkSlugAvailability(slug: string, excludeId?: string) {
    const s = slug
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const project = await this.prisma.project.findFirst({
      where: {
        slug: s,
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      }
    });
    return { available: !project };
  }

  async findBySlug(projectSlug: string) {
    // 1. Check Redis cache first
    const cacheKey = `project_public:${projectSlug}`;
    const cached = await this.redis?.get(cacheKey);
    if (cached) return cached;

    const project = await this.prisma.project.findFirst({
      where: {
        slug: projectSlug,
        status: ProjectStatus.PUBLISHED
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        mapElements: {
          include: {
            lotDetails: {
              select: {
                id: true,
                status: true,
                price: true,
                areaM2: true,
                frontage: true,
                slope: true,
                updatedAt: true
              }
            }
          }
        },
        projectMedias: {
          where: { lotDetailsId: null },
          orderBy: { createdAt: 'desc' }
        },
        paymentGateways: {
          where: { isActive: true },
          select: {
            isActive: true,
            provider: true
          }
        },
        plantMap: true,
        panoramas: {
          where: { published: true },
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!project)
      throw new NotFoundException('Projeto não encontrado ou não publicado.');

    // Ordenação manual dos mapElements considerando números na string do código
    if (project.mapElements) {
      project.mapElements.sort((a: any, b: any) => {
        const codeA = a.code || '';
        const codeB = b.code || '';
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    // 2. Save to Redis (short TTL: 2 minutes for public info)
    if (this.redis) {
      await this.redis.set(cacheKey, project, 120);
    }

    return project;
  }

  async findPreview(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        mapElements: {
          include: {
            lotDetails: {
              select: {
                id: true,
                status: true,
                price: true,
                areaM2: true,
                frontage: true,
                slope: true,
                updatedAt: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        projectMedias: {
          where: { lotDetailsId: null },
          orderBy: { createdAt: 'desc' }
        },
        paymentGateways: {
          where: { isActive: true },
          select: {
            isActive: true,
            provider: true
          }
        },
        plantMap: true,
        panoramas: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!project)
      throw new NotFoundException('Projeto não encontrado.');

    return project;
  }

  async update(tenantId: string, id: string, dto: UpdateProjectDto, user?: User) {
    const project = await this.prisma.project.findFirst({
      where: user?.role === UserRole.SYSADMIN ? { id } : { id, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    if (dto.slug) {
      const existing = await this.prisma.project.findFirst({
        where: {
          slug: dto.slug.toLowerCase().replace(/\s+/g, '-'),
          NOT: { id }
        }
      });
      if (existing)
        throw new ConflictException('Já existe um projeto com este slug.');
    }

    // Custom domain check: only SysAdmin can edit it
    if (dto.customDomain !== undefined && user?.role !== UserRole.SYSADMIN) {
        delete dto.customDomain;
    }

    if (dto.customDomain === '') {
      dto.customDomain = null;
    }

    if (dto.customDomain !== undefined && dto.customDomain !== null) {
      const existing = await this.prisma.project.findFirst({
        where: { customDomain: dto.customDomain, NOT: { id } }
      });
      if (existing) throw new ConflictException('Domínio já em uso.');
    }

    const updated = await (this.prisma as any).project.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug.toLowerCase().replace(/\s+/g, '-') }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.customDomain !== undefined && { customDomain: dto.customDomain }),
        ...(dto.bannerImageUrl !== undefined && {
          bannerImageUrl: dto.bannerImageUrl
        }),
        ...(dto.status && { status: dto.status }),
        ...(dto.mapData !== undefined && { mapData: dto.mapData }),
        ...(dto.highlightsJson !== undefined && {
          highlightsJson: dto.highlightsJson
        }),
        ...(dto.highlightsTitle !== undefined && {
          highlightsTitle: dto.highlightsTitle
        }),
        ...(dto.highlightsSubtitle !== undefined && {
          highlightsSubtitle: dto.highlightsSubtitle
        }),
        ...(dto.traditionalHighlightsTitle !== undefined && {
          traditionalHighlightsTitle: dto.traditionalHighlightsTitle
        }),
        ...(dto.traditionalHighlightsSubtitle !== undefined && {
          traditionalHighlightsSubtitle: dto.traditionalHighlightsSubtitle
        }),
        ...(dto.locationText !== undefined && {
          locationText: dto.locationText
        }),
        ...(dto.showPaymentConditions !== undefined && {
          showPaymentConditions: dto.showPaymentConditions
        }),
        ...(dto.startingPrice !== undefined && {
          startingPrice: dto.startingPrice
        }),
        ...(dto.maxInstallments !== undefined && {
          maxInstallments: dto.maxInstallments
        }),
        ...(dto.minDownPaymentPercent !== undefined && {
          minDownPaymentPercent: dto.minDownPaymentPercent
        }),
        ...(dto.minDownPaymentValue !== undefined && {
          minDownPaymentValue: dto.minDownPaymentValue
        }),
        ...(dto.monthlyInterestRate !== undefined && {
          monthlyInterestRate: dto.monthlyInterestRate
        }),
        ...(dto.indexer !== undefined && {
          indexer: dto.indexer
        }),
        ...(dto.allowIntermediary !== undefined && {
          allowIntermediary: dto.allowIntermediary
        }),
        ...(dto.reservationExpiryHours !== undefined && {
            reservationExpiryHours: dto.reservationExpiryHours
        }),
        ...(dto.financingDisclaimer !== undefined && {
          financingDisclaimer: dto.financingDisclaimer
        }),
        ...(dto.paymentConditionsSummary !== undefined && {
          paymentConditionsSummary: dto.paymentConditionsSummary
        }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.googleMapsUrl !== undefined && {
          googleMapsUrl: dto.googleMapsUrl
        }),
        ...(dto.youtubeVideoUrl !== undefined && {
          youtubeVideoUrl: dto.youtubeVideoUrl
        }),
        ...(dto.constructionStatus !== undefined && {
          constructionStatus: dto.constructionStatus
        }),
        ...(dto.reservationFeeType !== undefined && {
          reservationFeeType: dto.reservationFeeType
        }),
        ...(dto.reservationFeeValue !== undefined && {
          reservationFeeValue: dto.reservationFeeValue
        }),
        ...(dto.aiEnabled !== undefined && { aiEnabled: dto.aiEnabled }),
        ...(dto.aiConfigId !== undefined && { aiConfigId: dto.aiConfigId || null }),
        ...(dto.legalNotice !== undefined && { legalNotice: dto.legalNotice }),
        ...(dto.nearbyEnabled !== undefined && { nearbyEnabled: dto.nearbyEnabled })
      },
      include: {
        tenant: { select: { slug: true, name: true } },
        aiConfig: true,
        _count: {
          select: { mapElements: true, leads: true, projectMedias: true }
        }
      }
    });

    // Trigger nearby regeneration if address changed
    if (dto.address !== undefined && dto.address !== project.address) {
      this.logger.log(`Address changed for project ${id}, triggering nearby regeneration`);
      this.nearbyService.generateNearby(id).catch((err) => {
        this.logger.error(`Nearby generation failed after address update: ${err.message}`);
      });
    }

    return updated;
  }

  async publish(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    return this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.PUBLISHED },
      include: { tenant: { select: { slug: true, name: true } } }
    });
  }

  async unpublish(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    return this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.DRAFT },
      include: { tenant: { select: { slug: true, name: true } } }
    });
  }

  async remove(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    await this.prisma.project.delete({ where: { id } });

    // Sync billing subscription after project deletion
    try {
      await this.billingService.onProjectDeleted(tenantId, id);
    } catch (err) {
      this.logger.warn(`Failed to sync billing after project deletion: ${err.message}`);
    }

    return { message: 'Projeto removido com sucesso.' };
  }
}
