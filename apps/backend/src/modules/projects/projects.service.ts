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
        logos: { orderBy: { sortOrder: 'asc' }, select: { id: true, url: true, label: true, sortOrder: true } },
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
    // Fetch project without the heavy mapElements join
    const project = await this.prisma.project.findFirst({
      where: { slug: projectSlug, status: ProjectStatus.PUBLISHED },
      include: {
        tenant: { select: { id: true, name: true, slug: true, creci: true, phone: true, publicEmail: true, website: true } },
        logos: { orderBy: { sortOrder: 'asc' }, select: { id: true, url: true, label: true, sortOrder: true } },
        // mapElements deliberately excluded — replaced by lotSummary + teaserLots
        projectMedias: {
          where: { lotDetailsId: null },
          orderBy: { createdAt: 'desc' }
        },
        paymentGateways: {
          where: { isActive: true },
          select: { isActive: true, provider: true }
        },
        plantMap: true,
        panoramas: {
          where: { published: true },
          select: { id: true, title: true }
        }
      }
    });

    if (!project)
      throw new NotFoundException('Projeto não encontrado ou não publicado.');

    let lotSummary: any;
    let teaserLots: any[] = [];

    if ((project as any).mapData) {
      // ── Legacy mapData path ───────────────────────────────────────────────────
      const raw = (project as any).mapData;
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const allLots: any[] = data.lots
        ? (Array.isArray(data.lots)
            ? data.lots.map(([, l]: [any, any]) => l)
            : Object.values(data.lots))
        : [];
      const PPM = Number(data.pixelsPerMeter) || 10;

      const available = allLots.filter((l: any) => l.status === 'available');
      const lotDetailsOverrides = await this._loadLegacyLotDetailsOverrides(project.id);
      const prices = available.map((l: any) => Number(l.price)).filter((p: number) => p > 0);
      const areas  = available
        .map((l: any) => Number(l.area) > 0 ? Number(l.area) / (PPM * PPM) : 0)
        .filter((a: number) => a > 0);

      lotSummary = {
        total:     allLots.length,
        available: available.length,
        reserved:  allLots.filter((l: any) => l.status === 'reserved').length,
        sold:      allLots.filter((l: any) => l.status === 'sold').length,
        minPrice:  prices.length ? prices.reduce((a, b) => Math.min(a, b), Infinity) : null,
        minArea:   areas.length  ? areas.reduce((a, b)  => Math.min(a, b), Infinity) : null,
      };

      teaserLots = available.slice(0, 6).map((l: any) => {
        const override = this._findLegacyLotOverride(lotDetailsOverrides, l);
        return {
          id:   l.id,
          name: l.label,
          code: l.code,
          lotDetails: {
            areaM2:    override?.areaM2 ?? (Number(l.area) > 0 ? parseFloat((Number(l.area) / (PPM * PPM)).toFixed(2)) : 0),
            frontage:  override?.frontage ?? (Number(l.frontage) > 0 ? parseFloat((Number(l.frontage) / PPM).toFixed(2)) : 0),
            depth:     override?.depth ?? (l.manualBack ?? l.depth ?? null),
            sideLeft:  override?.sideLeft ?? (l.sideLeft ?? null),
            sideRight: override?.sideRight ?? (l.sideRight ?? null),
            sideMetricsJson: override?.sideMetricsJson ?? (l.sideMetrics ?? []),
            slope:     override?.slope ?? ((l.slope || 'FLAT').toString().toUpperCase()),
            notes:     override?.notes ?? (l.notes || ''),
            price:     override?.price ?? l.price,
            pricePerM2: override?.pricePerM2 ?? l.pricePerM2,
            tags:      (override?.tags?.length ? override.tags : (l.tags || [])),
            block:     override?.block ?? l.block,
            lotNumber: override?.lotNumber ?? l.lotNumber,
            conditionsJson: override?.conditionsJson ?? (l.conditionsJson || null),
            paymentConditions: override?.paymentConditions ?? (l.paymentConditions || null),
            panoramaUrl: override?.panoramaUrl ?? (l.panoramaUrl || null),
            medias: override?.medias || [],
            status:    override?.status ?? 'AVAILABLE',
          },
        }
      });
    } else {
      // ── New mapElements path — 3 lightweight parallel queries instead of 1 huge join ──
      const [countsByStatus, minAgg, teaser] = await Promise.all([
        this.prisma.lotDetails.groupBy({
          by: ['status'] as any,
          where: { projectId: project.id },
          _count: { id: true },
        }),
        this.prisma.lotDetails.aggregate({
          where: { projectId: project.id, status: 'AVAILABLE' },
          _min: { price: true, areaM2: true },
        }),
        this.prisma.mapElement.findMany({
          where: { projectId: project.id, type: 'LOT', lotDetails: { status: 'AVAILABLE' } },
          select: {
            id: true, name: true, code: true,
            lotDetails: {
              select: {
                id: true,
                status: true,
                price: true,
                pricePerM2: true,
                areaM2: true,
                frontage: true,
                depth: true,
                sideLeft: true,
                sideRight: true,
                sideMetricsJson: true,
                slope: true,
                notes: true,
                tags: true,
                block: true,
                lotNumber: true,
                conditionsJson: true,
                paymentConditions: true,
                panoramaUrl: true,
                medias: {
                  select: { id: true, type: true, url: true, caption: true, createdAt: true },
                  orderBy: { createdAt: 'desc' }
                }
              }
            }
          },
          take: 6,
          orderBy: { code: 'asc' },
        }),
      ]);

      const byStatus: Record<string, number> = {};
      for (const row of countsByStatus as any[]) {
        byStatus[row.status] = (row._count as any).id ?? 0;
      }

      lotSummary = {
        total:     (Object.values(byStatus) as number[]).reduce((s, n) => s + n, 0),
        available: byStatus['AVAILABLE'] ?? 0,
        reserved:  byStatus['RESERVED']  ?? 0,
        sold:      byStatus['SOLD']       ?? 0,
        minPrice:  (minAgg as any)._min?.price  ?? null,
        minArea:   (minAgg as any)._min?.areaM2 ?? null,
      };
      teaserLots = teaser;
    }

    return { ...project, lotSummary, teaserLots };
  }

  /**
   * Server-side paginated lots for the public /unidades page.
   * Handles both legacy mapData projects and new mapElements-based projects.
   */
  async findPublicLots(
    projectSlug: string,
    page: number,
    limit: number,
    search?: string,
    tags?: string[],
    matchMode: 'any' | 'exact' = 'any',
    codes?: string[],
  ) {
    const project = await this.prisma.project.findFirst({
      where: { slug: projectSlug, status: ProjectStatus.PUBLISHED },
      select: { id: true, mapData: true }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const skip = (page - 1) * limit;

    if ((project as any).mapData) {
      // ── Legacy mapData path ───────────────────────────────────────────────────
      const raw = (project as any).mapData;
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const PPM = Number(data.pixelsPerMeter) || 10;

      let lots: any[] = data.lots
        ? (Array.isArray(data.lots)
            ? data.lots.map(([, l]: [any, any]) => l)
            : Object.values(data.lots))
        : [];

      // If we're searching for specific codes, include all lots.
      // Otherwise only public listings show available.
      if (!codes?.length && !search) {
        lots = lots.filter((l: any) => l.status === 'available');
      }

      if (codes?.length) lots = lots.filter((l: any) => codes.includes(l.code));

      if (search) {
        const q = search.toLowerCase();
        lots = lots.filter((l: any) =>
          (l.code || '').toLowerCase().includes(q) ||
          (l.label || '').toLowerCase().includes(q));
      }

      if (tags?.length) {
        lots = lots.filter((l: any) => {
          const lt: string[] = l.tags || [];
          return matchMode === 'exact'
            ? tags.every(t => lt.includes(t))
            : tags.some(t => lt.includes(t));
        });
      }

      const total = lots.length;
      const availableTags = Array.from(new Set(lots.flatMap((l: any) => l.tags || []))).sort();
      const lotDetailsOverrides = await this._loadLegacyLotDetailsOverrides(project.id);
      const paged = lots.slice(skip, skip + limit).map((l: any) => {
        const override = this._findLegacyLotOverride(lotDetailsOverrides, l);
        return {
          id: l.id,
          name: l.label,
          code: l.code,
          lotDetails: {
            areaM2:     override?.areaM2 ?? (Number(l.area) > 0 ? parseFloat((Number(l.area) / (PPM * PPM)).toFixed(2)) : 0),
            frontage:   override?.frontage ?? (Number(l.frontage) > 0 ? parseFloat((Number(l.frontage) / PPM).toFixed(2)) : 0),
            depth:      override?.depth ?? (l.manualBack ?? l.depth ?? null),
            sideLeft:   override?.sideLeft ?? (l.sideLeft ?? null),
            sideRight:  override?.sideRight ?? (l.sideRight ?? null),
            sideMetricsJson: override?.sideMetricsJson ?? (l.sideMetrics ?? []),
            slope:      override?.slope ?? ((l.slope || 'FLAT').toString().toUpperCase()),
            notes:      override?.notes ?? (l.notes || ''),
            price:      override?.price ?? l.price,
            pricePerM2: override?.pricePerM2 ?? l.pricePerM2,
            tags:       (override?.tags?.length ? override.tags : (l.tags || [])),
            block:      override?.block ?? l.block,
            lotNumber:  override?.lotNumber ?? l.lotNumber,
            conditionsJson: override?.conditionsJson ?? (l.conditionsJson || null),
            paymentConditions: override?.paymentConditions ?? (l.paymentConditions || null),
            panoramaUrl: override?.panoramaUrl ?? (l.panoramaUrl || null),
            medias:     override?.medias || [],
            status:     override?.status ?? 'AVAILABLE',
          },
        }
      });

      return { data: paged, total, page, limit, totalPages: Math.ceil(total / limit), availableTags };
    }

    // ── New mapElements path ──────────────────────────────────────────────────
    const lotDetailsFilter: any = {};
    if (!codes?.length && !search) {
      lotDetailsFilter.status = 'AVAILABLE';
    }

    if (tags?.length) {
      Object.assign(lotDetailsFilter, matchMode === 'exact'
        ? { tags: { hasEvery: tags } }
        : { tags: { hasSome: tags } }
      );
    }

    const elementFilter: any = {
      projectId: project.id,
      type: 'LOT',
      lotDetails: lotDetailsFilter,
    };

    if (codes?.length) {
      elementFilter.code = { in: codes };
    } else if (search) {
      elementFilter.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data, tagRows] = await Promise.all([
      this.prisma.mapElement.count({ where: elementFilter }),
      this.prisma.mapElement.findMany({
        where: elementFilter,
        select: {
          id: true, name: true, code: true,
          lotDetails: {
            select: {
              id: true,
              status: true,
              price: true,
              pricePerM2: true,
              areaM2: true,
              frontage: true,
              depth: true,
              sideLeft: true,
              sideRight: true,
              sideMetricsJson: true,
              slope: true,
              notes: true,
              tags: true,
              block: true,
              lotNumber: true,
              conditionsJson: true,
              paymentConditions: true,
              panoramaUrl: true,
              medias: {
                select: { id: true, type: true, url: true, caption: true, createdAt: true },
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { code: 'asc' },
      }),
      this.prisma.lotDetails.findMany({
        where: { projectId: project.id, status: 'AVAILABLE' },
        select: { tags: true }
      }),
    ]);

    const availableTags = Array.from(
      new Set((tagRows as any[]).flatMap((r: any) => r.tags || []))
    ).sort() as string[];

    return { data, total, page, limit, totalPages: Math.ceil(total / limit), availableTags };
  }

  async findPreview(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true, creci: true, phone: true, publicEmail: true, website: true } },
        logos: { orderBy: { sortOrder: 'asc' }, select: { id: true, url: true, label: true, sortOrder: true } },
        mapElements: {
          select: {
            id: true,
            type: true,
            name: true,
            code: true,
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
        ...(dto.bannerImageTabletUrl !== undefined && {
          bannerImageTabletUrl: dto.bannerImageTabletUrl
        }),
        ...(dto.bannerImageMobileUrl !== undefined && {
          bannerImageMobileUrl: dto.bannerImageMobileUrl
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
        ...(dto.salesMotionConfig !== undefined && { salesMotionConfig: dto.salesMotionConfig }),
        ...(dto.nearbyEnabled !== undefined && { nearbyEnabled: dto.nearbyEnabled })
      },
      include: {
        tenant: { select: { slug: true, name: true } },
        logos: { orderBy: { sortOrder: 'asc' }, select: { id: true, url: true, label: true, sortOrder: true } },
        aiConfig: true,
        _count: {
          select: { mapElements: true, leads: true, projectMedias: true }
        }
      }
    });

    // Invalidate Redis cache when customDomain or slug changes so the new mapping
    // takes effect immediately without waiting for the 5-minute TTL.
    if (dto.customDomain !== undefined) {
      if (project.customDomain) {
        await this.redis.del(`domain_resolve:${project.customDomain}`);
      }
      if (dto.customDomain && dto.customDomain !== project.customDomain) {
        await this.redis.del(`domain_resolve:${dto.customDomain}`);
      }
    }
    // BUG-03: also flush the subdomain cache key when the project slug changes,
    // otherwise oldSlug.lotio.com.br keeps resolving stale data for up to 5 minutes.
    if (dto.slug && dto.slug.toLowerCase().replace(/\s+/g, '-') !== project.slug) {
      await this.redis.del(`domain_resolve:subdomain:${project.slug}`);
    }

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

  private _normalizeLegacyLotLookup(value?: string | null) {
    return String(value ?? '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private _findLegacyLotOverride(overrides: Map<string, any>, lot: any) {
    const byId = this._normalizeLegacyLotLookup(lot?.id);
    const byCode = this._normalizeLegacyLotLookup(lot?.code || lot?.label);
    return overrides.get(byId) || overrides.get(byCode) || null;
  }

  private async _loadLegacyLotDetailsOverrides(projectId: string) {
    const rows = await this.prisma.lotDetails.findMany({
      where: { projectId },
      select: {
        mapElementId: true,
        status: true,
        price: true,
        pricePerM2: true,
        areaM2: true,
        frontage: true,
        depth: true,
        sideLeft: true,
        sideRight: true,
        sideMetricsJson: true,
        slope: true,
        notes: true,
        tags: true,
        block: true,
        lotNumber: true,
        conditionsJson: true,
        paymentConditions: true,
        panoramaUrl: true,
        medias: {
          select: { id: true, type: true, url: true, caption: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        mapElement: {
          select: { id: true, code: true, name: true },
        },
      },
    })

    const lookup = new Map<string, any>()
    for (const row of rows) {
      const keys = [
        this._normalizeLegacyLotLookup(row.mapElementId),
        this._normalizeLegacyLotLookup(row.mapElement?.id),
        this._normalizeLegacyLotLookup(row.mapElement?.code),
        this._normalizeLegacyLotLookup(row.mapElement?.name),
      ].filter(Boolean)

      for (const key of keys) {
        lookup.set(key, row)
      }
    }

    return lookup
  }
}
