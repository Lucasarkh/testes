import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  ForbiddenException,
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
import { S3Service } from '@infra/s3/s3.service';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  private isArchivedProject(project: { slug: string | null }): boolean {
    return (project.slug || '').toLowerCase().startsWith('archived-');
  }

  private toSlug(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  private removeArchivedPrefix(name: string): string {
    return name.replace(/^\[Arquivado\]\s*/i, '').trim();
  }

  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_SERVICE') private redis: any,
    private nearbyService: NearbyService,
    private billingService: BillingService,
    private readonly s3: S3Service
  ) {}

  private async toPublicAssetUrl(url?: string | null): Promise<string | null> {
    if (!url) return null;

    const trimmed = String(url).trim();
    if (!trimmed) return null;

    const key = this.s3.keyFromUrl(trimmed);
    if (!key) return trimmed;

    if (this.s3.hasPublicAssetBaseUrl()) {
      return this.s3.publicAssetUrl(key);
    }

    try {
      return await this.s3.presignedDownloadUrl(key, 60 * 60 * 24);
    } catch (error: any) {
      this.logger.warn(
        `Failed to sign public asset URL for key ${key}: ${error?.message || error}`
      );
      return trimmed;
    }
  }

  private async hydratePublicLotDetailsAssets<T extends {
    panoramaUrl?: string | null;
    medias?: Array<{ url?: string | null }>;
  } | null>(lotDetails: T): Promise<T> {
    if (!lotDetails) return lotDetails;

    const medias = Array.isArray(lotDetails.medias)
      ? await Promise.all(
          lotDetails.medias.map(async (media) => ({
            ...media,
            url: await this.toPublicAssetUrl(media?.url)
          }))
        )
      : [];

    return {
      ...lotDetails,
      panoramaUrl: await this.toPublicAssetUrl(lotDetails.panoramaUrl),
      medias
    };
  }

  private async hydrateProjectAssets<T extends Record<string, any> | null>(
    project: T
  ): Promise<T> {
    if (!project) return project;

    const logos = Array.isArray(project.logos)
      ? await Promise.all(
          project.logos.map(async (logo: any) => ({
            ...logo,
            url: await this.toPublicAssetUrl(logo?.url)
          }))
        )
      : project.logos;

    const projectMedias = Array.isArray(project.projectMedias)
      ? await Promise.all(
          project.projectMedias.map(async (media: any) => ({
            ...media,
            url: await this.toPublicAssetUrl(media?.url)
          }))
        )
      : project.projectMedias;

    return {
      ...project,
      ogLogoUrl: await this.toPublicAssetUrl(project.ogLogoUrl),
      bannerImageUrl: await this.toPublicAssetUrl(project.bannerImageUrl),
      bannerImageTabletUrl: await this.toPublicAssetUrl(
        project.bannerImageTabletUrl
      ),
      bannerImageMobileUrl: await this.toPublicAssetUrl(
        project.bannerImageMobileUrl
      ),
      logos,
      projectMedias,
      plantMap: project.plantMap
        ? {
            ...project.plantMap,
            imageUrl: await this.toPublicAssetUrl(project.plantMap.imageUrl)
          }
        : project.plantMap
    } as T;
  }

  private async hydratePublicLegacyMapData<T>(mapData: T): Promise<T> {
    if (!mapData) return mapData;

    let parsed: any = mapData;
    let shouldStringify = false;

    if (typeof mapData === 'string') {
      try {
        parsed = JSON.parse(mapData);
        shouldStringify = true;
      } catch {
        return mapData;
      }
    }

    if (!parsed || typeof parsed !== 'object' || !parsed.lots) {
      return mapData;
    }

    const hydrateLot = async (lot: any) => ({
      ...lot,
      panoramaUrl: await this.toPublicAssetUrl(lot?.panoramaUrl),
      medias: Array.isArray(lot?.medias)
        ? await Promise.all(
            lot.medias.map(async (media: any) => ({
              ...media,
              url: await this.toPublicAssetUrl(media?.url)
            }))
          )
        : lot?.medias
    });

    const hydratedLots = Array.isArray(parsed.lots)
      ? await Promise.all(
          parsed.lots.map(async (entry: any) => {
            if (!Array.isArray(entry) || entry.length < 2) return entry;

            const [key, lot] = entry;
            return [key, await hydrateLot(lot)];
          })
        )
      : Object.fromEntries(
          await Promise.all(
            Object.entries(parsed.lots).map(async ([key, lot]) => [
              key,
              await hydrateLot(lot)
            ])
          )
        );

    const hydratedMapData = {
      ...parsed,
      lots: hydratedLots
    };

    return (shouldStringify
      ? JSON.stringify(hydratedMapData)
      : hydratedMapData) as T;
  }

  private async hydratePublicProjectAssets<T extends Record<string, any>>(
    project: T
  ): Promise<T> {
    const teaserLots = Array.isArray(project.teaserLots)
      ? await Promise.all(
          project.teaserLots.map(async (lot: any) => ({
            ...lot,
            lotDetails: await this.hydratePublicLotDetailsAssets(lot?.lotDetails || null)
          }))
        )
      : [];

    const mapData = await this.hydratePublicLegacyMapData(project.mapData);

    const hydratedProject = await this.hydrateProjectAssets(project);

    return {
      ...hydratedProject,
      mapData,
      teaserLots
    };
  }

  private hasPreferenceSearchInputs(
    tags?: string[],
    smartFilters?: {
      minArea?: number;
      maxArea?: number;
      minPrice?: number;
      maxPrice?: number;
      maxPricePerM2?: number;
      minFrontage?: number;
      minDepth?: number;
    }
  ) {
    return Boolean(
      tags?.length ||
        smartFilters?.minArea != null ||
        smartFilters?.maxArea != null ||
        smartFilters?.minPrice != null ||
        smartFilters?.maxPrice != null ||
        smartFilters?.maxPricePerM2 != null ||
        smartFilters?.minFrontage != null ||
        smartFilters?.minDepth != null
    );
  }

  private matchesPreferenceRange(
    rawValue: number | null | undefined,
    minimum?: number,
    maximum?: number
  ) {
    if (rawValue == null || Number.isNaN(rawValue)) return false;
    if (minimum != null && rawValue < minimum) return false;
    if (maximum != null && rawValue > maximum) return false;
    return true;
  }

  private getPreferenceMatchScore(
    metrics: {
      tags?: string[];
      areaM2?: number | null;
      price?: number | null;
      pricePerM2?: number | null;
      frontage?: number | null;
      depth?: number | null;
    },
    tags?: string[],
    matchMode: 'any' | 'exact' = 'any',
    smartFilters?: {
      minArea?: number;
      maxArea?: number;
      minPrice?: number;
      maxPrice?: number;
      maxPricePerM2?: number;
      minFrontage?: number;
      minDepth?: number;
    }
  ) {
    let score = 0;

    if (tags?.length) {
      const lotTags = metrics.tags || [];
      const tagMatched =
        matchMode === 'exact'
          ? tags.every((tag) => lotTags.includes(tag))
          : tags.some((tag) => lotTags.includes(tag));

      if (tagMatched) {
        score += matchMode === 'exact' ? Math.max(2, tags.length) : 2;
      }
    }

    if (smartFilters?.minArea != null || smartFilters?.maxArea != null) {
      if (
        this.matchesPreferenceRange(
          metrics.areaM2,
          smartFilters?.minArea,
          smartFilters?.maxArea
        )
      ) {
        score += 1;
      }
    }

    if (smartFilters?.minPrice != null || smartFilters?.maxPrice != null) {
      if (
        this.matchesPreferenceRange(
          metrics.price,
          smartFilters?.minPrice,
          smartFilters?.maxPrice
        )
      ) {
        score += 1;
      }
    }

    if (smartFilters?.maxPricePerM2 != null) {
      if (
        this.matchesPreferenceRange(
          metrics.pricePerM2,
          undefined,
          smartFilters.maxPricePerM2
        )
      ) {
        score += 1;
      }
    }

    if (smartFilters?.minFrontage != null) {
      if (
        this.matchesPreferenceRange(
          metrics.frontage,
          smartFilters.minFrontage,
          undefined
        )
      ) {
        score += 1;
      }
    }

    if (smartFilters?.minDepth != null) {
      if (
        this.matchesPreferenceRange(
          metrics.depth,
          smartFilters.minDepth,
          undefined
        )
      ) {
        score += 1;
      }
    }

    return score;
  }

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
        reservationExpiryHours: dto.reservationExpiryHours ?? 24,
        preLaunchEnabled: dto.preLaunchEnabled ?? false
      }
    });

    // Sync billing subscription after project creation
    try {
      await this.billingService.onProjectCreated(tenantId, project.id);
    } catch (err) {
      this.logger.warn(
        `Failed to sync billing after project creation: ${err.message}`
      );
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
      data: await Promise.all(data.map((project) => this.hydrateProjectAssets(project))),
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
        logos: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, label: true, sortOrder: true }
        },
        aiConfig: true,
        _count: {
          select: { mapElements: true, leads: true, projectMedias: true }
        }
      }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return this.hydrateProjectAssets(project);
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
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            creci: true,
            phone: true,
            publicEmail: true,
            website: true
          }
        },
        logos: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, label: true, sortOrder: true }
        },
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
        ? Array.isArray(data.lots)
          ? data.lots.map(([, l]: [any, any]) => l)
          : Object.values(data.lots)
        : [];
      const PPM = Number(data.pixelsPerMeter) || 10;

      const available = allLots.filter((l: any) => l.status === 'available');
      const lotDetailsOverrides = await this._loadLegacyLotDetailsOverrides(
        project.id
      );
      const prices = available
        .map((l: any) => Number(l.price))
        .filter((p: number) => p > 0);
      const areas = available
        .map((l: any) =>
          Number(l.area) > 0 ? Number(l.area) / (PPM * PPM) : 0
        )
        .filter((a: number) => a > 0);

      lotSummary = {
        total: allLots.length,
        available: available.length,
        reserved: allLots.filter((l: any) => l.status === 'reserved').length,
        sold: allLots.filter((l: any) => l.status === 'sold').length,
        minPrice: prices.length
          ? prices.reduce((a, b) => Math.min(a, b), Infinity)
          : null,
        minArea: areas.length
          ? areas.reduce((a, b) => Math.min(a, b), Infinity)
          : null
      };

      teaserLots = available.slice(0, 6).map((l: any) => {
        const override = this._findLegacyLotOverride(lotDetailsOverrides, l);
        return {
          id: l.id,
          name: l.label,
          code: l.code,
          frontEdgeIndex: l.frontEdgeIndex ?? l.metaJson?.frontEdgeIndex ?? null,
          frontAngleDeg: l.frontAngleDeg ?? l.metaJson?.frontAngleDeg ?? null,
          lotDetails: {
            areaM2:
              override?.areaM2 ??
              (Number(l.area) > 0
                ? parseFloat((Number(l.area) / (PPM * PPM)).toFixed(2))
                : 0),
            frontage:
              override?.frontage ??
              (Number(l.frontage) > 0
                ? parseFloat((Number(l.frontage) / PPM).toFixed(2))
                : 0),
            depth: override?.depth ?? l.manualBack ?? l.depth ?? null,
            sideLeft: override?.sideLeft ?? l.sideLeft ?? null,
            sideRight: override?.sideRight ?? l.sideRight ?? null,
            sideMetricsJson: override?.sideMetricsJson ?? l.sideMetrics ?? [],
            slope:
              override?.slope ?? (l.slope || 'FLAT').toString().toUpperCase(),
            notes: override?.notes ?? (l.notes || ''),
            price: override?.price ?? l.price,
            pricePerM2: override?.pricePerM2 ?? l.pricePerM2,
            tags: override?.tags?.length ? override.tags : l.tags || [],
            block: override?.block ?? l.block,
            lotNumber: override?.lotNumber ?? l.lotNumber,
            conditionsJson:
              override?.conditionsJson ?? (l.conditionsJson || null),
            paymentConditions:
              override?.paymentConditions ?? (l.paymentConditions || null),
            panoramaUrl: override?.panoramaUrl ?? (l.panoramaUrl || null),
            medias: override?.medias || [],
            status: override?.status ?? 'AVAILABLE'
          }
        };
      });
    } else {
      // ── New mapElements path — 3 lightweight parallel queries instead of 1 huge join ──
      const [countsByStatus, minAgg, teaser] = await Promise.all([
        this.prisma.lotDetails.groupBy({
          by: ['status'] as any,
          where: { projectId: project.id },
          _count: { id: true }
        }),
        this.prisma.lotDetails.aggregate({
          where: { projectId: project.id, status: 'AVAILABLE' },
          _min: { price: true, areaM2: true }
        }),
        this.prisma.mapElement.findMany({
          where: {
            projectId: project.id,
            type: 'LOT',
            lotDetails: { status: 'AVAILABLE' }
          },
          select: {
            id: true,
            name: true,
            code: true,
            metaJson: true,
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
                  select: {
                    id: true,
                    type: true,
                    url: true,
                    caption: true,
                    createdAt: true
                  },
                  orderBy: { createdAt: 'desc' }
                }
              }
            }
          },
          take: 6,
          orderBy: { code: 'asc' }
        })
      ]);

      const byStatus: Record<string, number> = {};
      for (const row of countsByStatus as any[]) {
        byStatus[row.status] = row._count.id ?? 0;
      }

      lotSummary = {
        total: Object.values(byStatus).reduce((s, n) => s + n, 0),
        available: byStatus['AVAILABLE'] ?? 0,
        reserved: byStatus['RESERVED'] ?? 0,
        sold: byStatus['SOLD'] ?? 0,
        minPrice: (minAgg as any)._min?.price ?? null,
        minArea: (minAgg as any)._min?.areaM2 ?? null
      };
      teaserLots = teaser.map((lot: any) => ({
        ...lot,
        frontEdgeIndex: lot.metaJson?.frontEdgeIndex ?? null,
        frontAngleDeg: lot.metaJson?.frontAngleDeg ?? null,
      }));
    }

    return this.hydratePublicProjectAssets({ ...project, lotSummary, teaserLots });
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
    smartFilters?: {
      minArea?: number;
      maxArea?: number;
      minPrice?: number;
      maxPrice?: number;
      maxPricePerM2?: number;
      minFrontage?: number;
      minDepth?: number;
    },
    smartMode?: 'preference',
    sortBy?: 'pricePerM2Asc'
  ) {
    const project = await this.prisma.project.findFirst({
      where: { slug: projectSlug, status: ProjectStatus.PUBLISHED },
      select: { id: true, mapData: true }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const skip = (page - 1) * limit;
    const usePreferenceMode = smartMode === 'preference';

    if ((project as any).mapData) {
      // ── Legacy mapData path ───────────────────────────────────────────────────
      const raw = (project as any).mapData;
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const PPM = Number(data.pixelsPerMeter) || 10;

      let lots: any[] = data.lots
        ? Array.isArray(data.lots)
          ? data.lots.map(([, l]: [any, any]) => l)
          : Object.values(data.lots)
        : [];

      // If we're searching for specific codes, include all lots.
      // Otherwise only public listings show available.
      if (!codes?.length && !search) {
        lots = lots.filter((l: any) => l.status === 'available');
      }

      if (codes?.length) lots = lots.filter((l: any) => codes.includes(l.code));

      if (search) {
        const q = search.toLowerCase();
        lots = lots.filter(
          (l: any) =>
            (l.code || '').toLowerCase().includes(q) ||
            (l.label || '').toLowerCase().includes(q)
        );
      }

      if (!usePreferenceMode && tags?.length) {
        lots = lots.filter((l: any) => {
          const lt: string[] = l.tags || [];
          return matchMode === 'exact'
            ? tags.every((t) => lt.includes(t))
            : tags.some((t) => lt.includes(t));
        });
      }

      const lotDetailsOverrides = await this._loadLegacyLotDetailsOverrides(
        project.id
      );

      const getLegacyLotMetrics = (l: any) => {
        const override = this._findLegacyLotOverride(lotDetailsOverrides, l);

        const areaM2 =
          override?.areaM2 ??
          (Number(l.area) > 0
            ? parseFloat((Number(l.area) / (PPM * PPM)).toFixed(2))
            : 0);
        const frontage =
          override?.frontage ??
          (Number(l.frontage) > 0
            ? parseFloat((Number(l.frontage) / PPM).toFixed(2))
            : 0);
        const depth = override?.depth ?? l.manualBack ?? l.depth ?? null;
        const price = override?.price ?? l.price;
        const pricePerM2 = override?.pricePerM2 ?? l.pricePerM2;

        return {
          override,
          areaM2: Number(areaM2),
          frontage: Number(frontage),
          depth: depth == null ? null : Number(depth),
          price: price == null ? null : Number(price),
          pricePerM2: pricePerM2 == null ? null : Number(pricePerM2)
        };
      };

      const hasMinArea = smartFilters?.minArea != null;
      const hasMaxArea = smartFilters?.maxArea != null;
      const hasMinPrice = smartFilters?.minPrice != null;
      const hasMaxPrice = smartFilters?.maxPrice != null;
      const hasMaxPricePerM2 = smartFilters?.maxPricePerM2 != null;
      const hasMinFrontage = smartFilters?.minFrontage != null;
      const hasMinDepth = smartFilters?.minDepth != null;

      if (
        !usePreferenceMode &&
        (
          hasMinArea ||
          hasMaxArea ||
          hasMinPrice ||
          hasMaxPrice ||
          hasMaxPricePerM2 ||
          hasMinFrontage ||
          hasMinDepth
        )
      ) {
        lots = lots.filter((l: any) => {
          const metrics = getLegacyLotMetrics(l);

          if (hasMinArea && metrics.areaM2 < (smartFilters?.minArea as number)) {
            return false;
          }
          if (hasMaxArea && metrics.areaM2 > (smartFilters?.maxArea as number)) {
            return false;
          }
          if (hasMinPrice) {
            if (metrics.price == null || metrics.price < (smartFilters?.minPrice as number)) {
              return false;
            }
          }
          if (hasMaxPrice) {
            if (metrics.price == null || metrics.price > (smartFilters?.maxPrice as number)) {
              return false;
            }
          }
          if (hasMaxPricePerM2) {
            if (
              metrics.pricePerM2 == null ||
              metrics.pricePerM2 > (smartFilters?.maxPricePerM2 as number)
            ) {
              return false;
            }
          }
          if (hasMinFrontage) {
            if (
              Number.isNaN(metrics.frontage) ||
              metrics.frontage < (smartFilters?.minFrontage as number)
            ) {
              return false;
            }
          }
          if (hasMinDepth) {
            if (
              metrics.depth == null ||
              Number.isNaN(metrics.depth) ||
              metrics.depth < (smartFilters?.minDepth as number)
            ) {
              return false;
            }
          }

          return true;
        });
      }

      if (usePreferenceMode) {
        const hasPreferenceInputs = this.hasPreferenceSearchInputs(tags, smartFilters);
        lots = lots
          .map((lot: any) => {
            const metrics = getLegacyLotMetrics(lot);
            return {
              lot,
              score: this.getPreferenceMatchScore(
                {
                  tags: lot.tags || [],
                  areaM2: metrics.areaM2,
                  price: metrics.price,
                  pricePerM2: metrics.pricePerM2,
                  frontage: metrics.frontage,
                  depth: metrics.depth
                },
                tags,
                matchMode,
                smartFilters
              ),
              pricePerM2: metrics.pricePerM2
            };
          })
          .filter(({ score }) => !hasPreferenceInputs || score > 0)
          .sort((a: any, b: any) => {
            if (b.score !== a.score) return b.score - a.score;

            if (sortBy === 'pricePerM2Asc') {
              const aOrder =
                a.pricePerM2 == null || Number.isNaN(a.pricePerM2)
                  ? Number.POSITIVE_INFINITY
                  : a.pricePerM2;
              const bOrder =
                b.pricePerM2 == null || Number.isNaN(b.pricePerM2)
                  ? Number.POSITIVE_INFINITY
                  : b.pricePerM2;

              if (aOrder !== bOrder) return aOrder - bOrder;
            }

            return String(a.lot.code || '').localeCompare(String(b.lot.code || ''));
          })
          .map(({ lot }: any) => lot);
      } else if (sortBy === 'pricePerM2Asc') {
        lots = [...lots].sort((a: any, b: any) => {
          const aValue = getLegacyLotMetrics(a).pricePerM2;
          const bValue = getLegacyLotMetrics(b).pricePerM2;
          const aOrder = aValue == null || Number.isNaN(aValue) ? Number.POSITIVE_INFINITY : aValue;
          const bOrder = bValue == null || Number.isNaN(bValue) ? Number.POSITIVE_INFINITY : bValue;

          if (aOrder === bOrder) {
            return String(a.code || '').localeCompare(String(b.code || ''));
          }
          return aOrder - bOrder;
        });
      }

      const total = lots.length;
      const availableTags = Array.from(
        new Set(lots.flatMap((l: any) => l.tags || []))
      ).sort();
      const paged = lots.slice(skip, skip + limit).map((l: any) => {
        const { override } = getLegacyLotMetrics(l);
        return {
          id: l.id,
          name: l.label,
          code: l.code,
          lotDetails: {
            areaM2:
              override?.areaM2 ??
              (Number(l.area) > 0
                ? parseFloat((Number(l.area) / (PPM * PPM)).toFixed(2))
                : 0),
            frontage:
              override?.frontage ??
              (Number(l.frontage) > 0
                ? parseFloat((Number(l.frontage) / PPM).toFixed(2))
                : 0),
            depth: override?.depth ?? l.manualBack ?? l.depth ?? null,
            sideLeft: override?.sideLeft ?? l.sideLeft ?? null,
            sideRight: override?.sideRight ?? l.sideRight ?? null,
            sideMetricsJson: override?.sideMetricsJson ?? l.sideMetrics ?? [],
            slope:
              override?.slope ?? (l.slope || 'FLAT').toString().toUpperCase(),
            notes: override?.notes ?? (l.notes || ''),
            price: override?.price ?? l.price,
            pricePerM2: override?.pricePerM2 ?? l.pricePerM2,
            tags: override?.tags?.length ? override.tags : l.tags || [],
            block: override?.block ?? l.block,
            lotNumber: override?.lotNumber ?? l.lotNumber,
            conditionsJson:
              override?.conditionsJson ?? (l.conditionsJson || null),
            paymentConditions:
              override?.paymentConditions ?? (l.paymentConditions || null),
            panoramaUrl: override?.panoramaUrl ?? (l.panoramaUrl || null),
            medias: override?.medias || [],
            status: override?.status ?? 'AVAILABLE'
          }
        };
      });

      return {
        data: await Promise.all(
          paged.map(async (lot: any) => ({
            ...lot,
            lotDetails: await this.hydratePublicLotDetailsAssets(lot.lotDetails)
          }))
        ),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        availableTags
      };
    }

    // ── New mapElements path ──────────────────────────────────────────────────
    const lotDetailsFilter: any = {};
    if (!codes?.length && !search) {
      lotDetailsFilter.status = 'AVAILABLE';
    }

    if (!usePreferenceMode && tags?.length) {
      Object.assign(
        lotDetailsFilter,
        matchMode === 'exact'
          ? { tags: { hasEvery: tags } }
          : { tags: { hasSome: tags } }
      );
    }

    if (!usePreferenceMode && (smartFilters?.minArea != null || smartFilters?.maxArea != null)) {
      lotDetailsFilter.areaM2 = {
        ...(smartFilters?.minArea != null && { gte: smartFilters.minArea }),
        ...(smartFilters?.maxArea != null && { lte: smartFilters.maxArea })
      };
    }

    if (!usePreferenceMode && (smartFilters?.minPrice != null || smartFilters?.maxPrice != null)) {
      lotDetailsFilter.price = {
        ...(smartFilters?.minPrice != null && { gte: smartFilters.minPrice }),
        ...(smartFilters?.maxPrice != null && { lte: smartFilters.maxPrice })
      };
    }

    if (!usePreferenceMode && smartFilters?.maxPricePerM2 != null) {
      lotDetailsFilter.pricePerM2 = { lte: smartFilters.maxPricePerM2 };
    }

    if (!usePreferenceMode && smartFilters?.minFrontage != null) {
      lotDetailsFilter.frontage = { gte: smartFilters.minFrontage };
    }

    if (!usePreferenceMode && smartFilters?.minDepth != null) {
      lotDetailsFilter.depth = { gte: smartFilters.minDepth };
    }

    const elementFilter: any = {
      projectId: project.id,
      type: 'LOT',
      lotDetails: lotDetailsFilter
    };

    if (codes?.length) {
      elementFilter.code = { in: codes };
    } else if (search) {
      elementFilter.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    const lotSelect = {
      id: true,
      name: true,
      code: true,
      metaJson: true,
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
            select: {
              id: true,
              type: true,
              url: true,
              caption: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      }
    } as const;

    const dataPromise = usePreferenceMode
      ? this.prisma.mapElement.findMany({
          where: elementFilter,
          select: lotSelect,
          orderBy: [{ code: 'asc' }]
        })
      : this.prisma.mapElement.findMany({
          where: elementFilter,
          select: lotSelect,
          skip,
          take: limit,
          orderBy:
            sortBy === 'pricePerM2Asc'
              ? [{ lotDetails: { pricePerM2: 'asc' } }, { code: 'asc' }]
              : [{ code: 'asc' }]
        });

    const [data, tagRows] = await Promise.all([
      dataPromise,
      this.prisma.lotDetails.findMany({
        where: { projectId: project.id, status: 'AVAILABLE' },
        select: { tags: true }
      })
    ]);

    let rankedData = data;

    if (usePreferenceMode) {
      const hasPreferenceInputs = this.hasPreferenceSearchInputs(tags, smartFilters);
      rankedData = data
        .map((lot) => ({
          lot,
          score: this.getPreferenceMatchScore(
            {
              tags: lot.lotDetails?.tags || [],
              areaM2: lot.lotDetails?.areaM2 == null ? null : Number(lot.lotDetails.areaM2),
              price: lot.lotDetails?.price == null ? null : Number(lot.lotDetails.price),
              pricePerM2:
                lot.lotDetails?.pricePerM2 == null ? null : Number(lot.lotDetails.pricePerM2),
              frontage: lot.lotDetails?.frontage == null ? null : Number(lot.lotDetails.frontage),
              depth: lot.lotDetails?.depth == null ? null : Number(lot.lotDetails.depth)
            },
            tags,
            matchMode,
            smartFilters
          )
        }))
        .filter(({ score }) => !hasPreferenceInputs || score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;

          if (sortBy === 'pricePerM2Asc') {
            const aOrder =
              a.lot.lotDetails?.pricePerM2 == null || Number.isNaN(Number(a.lot.lotDetails.pricePerM2))
                ? Number.POSITIVE_INFINITY
                : Number(a.lot.lotDetails.pricePerM2);
            const bOrder =
              b.lot.lotDetails?.pricePerM2 == null || Number.isNaN(Number(b.lot.lotDetails.pricePerM2))
                ? Number.POSITIVE_INFINITY
                : Number(b.lot.lotDetails.pricePerM2);
            if (aOrder !== bOrder) return aOrder - bOrder;
          }

          return String(a.lot.code || '').localeCompare(String(b.lot.code || ''));
        })
        .map(({ lot }) => lot);
    }

    const total = usePreferenceMode
      ? rankedData.length
      : await this.prisma.mapElement.count({ where: elementFilter });
    const pagedData = usePreferenceMode ? rankedData.slice(skip, skip + limit) : rankedData;

    const availableTags = Array.from(
      new Set((tagRows as any[]).flatMap((r: any) => r.tags || []))
    ).sort() as string[];

    return {
      data: await Promise.all(
        pagedData.map(async (lot) => ({
          ...lot,
          frontEdgeIndex: (lot as any).metaJson?.frontEdgeIndex ?? null,
          frontAngleDeg: (lot as any).metaJson?.frontAngleDeg ?? null,
          lotDetails: await this.hydratePublicLotDetailsAssets(lot.lotDetails)
        }))
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      availableTags
    };
  }

  async findPreview(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            creci: true,
            phone: true,
            publicEmail: true,
            website: true
          }
        },
        logos: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, label: true, sortOrder: true }
        },
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

    if (!project) throw new NotFoundException('Projeto não encontrado.');

    return this.hydrateProjectAssets(project);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateProjectDto,
    user?: User
  ) {
    const project = await this.prisma.project.findFirst({
      where: user?.role === UserRole.SYSADMIN ? { id } : { id, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    if (this.isArchivedProject(project)) {
      throw new ForbiddenException('Projeto arquivado não pode ser editado.');
    }

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
        ...(dto.customDomain !== undefined && {
          customDomain: dto.customDomain
        }),
        ...(dto.bannerImageUrl !== undefined && {
          bannerImageUrl: dto.bannerImageUrl
        }),
        ...(dto.bannerImageTabletUrl !== undefined && {
          bannerImageTabletUrl: dto.bannerImageTabletUrl
        }),
        ...(dto.bannerImageMobileUrl !== undefined && {
          bannerImageMobileUrl: dto.bannerImageMobileUrl
        }),
        ...(dto.ogLogoUrl !== undefined && {
          ogLogoUrl: dto.ogLogoUrl
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
        ...(dto.preLaunchEnabled !== undefined && {
          preLaunchEnabled: dto.preLaunchEnabled
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
        ...(dto.aiConfigId !== undefined && {
          aiConfigId: dto.aiConfigId || null
        }),
        ...(dto.legalNotice !== undefined && { legalNotice: dto.legalNotice }),
        ...(dto.salesMotionConfig !== undefined && {
          salesMotionConfig: dto.salesMotionConfig
        }),
        ...(dto.nearbyEnabled !== undefined && {
          nearbyEnabled: dto.nearbyEnabled
        })
      },
      include: {
        tenant: { select: { slug: true, name: true } },
        logos: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, url: true, label: true, sortOrder: true }
        },
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
    if (
      dto.slug &&
      dto.slug.toLowerCase().replace(/\s+/g, '-') !== project.slug
    ) {
      await this.redis.del(`domain_resolve:subdomain:${project.slug}`);
    }

    // Trigger nearby regeneration if address changed
    if (dto.address !== undefined && dto.address !== project.address) {
      this.logger.log(
        `Address changed for project ${id}, triggering nearby regeneration`
      );
      this.nearbyService.generateNearby(id).catch((err) => {
        this.logger.error(
          `Nearby generation failed after address update: ${err.message}`
        );
      });
    }

    return this.hydrateProjectAssets(updated);
  }

  async publish(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    if (this.isArchivedProject(project)) {
      const restoredName = this.removeArchivedPrefix(project.name) || project.name;
      let nextSlugBase = this.toSlug(restoredName) || `projeto-${id.slice(0, 8)}`;
      let nextSlug = nextSlugBase;
      let suffix = 2;

      while (
        await this.prisma.project.findFirst({
          where: {
            slug: nextSlug,
            NOT: { id }
          },
          select: { id: true }
        })
      ) {
        nextSlug = `${nextSlugBase}-${suffix}`;
        suffix++;
      }

      return this.prisma.project.update({
        where: { id },
        data: {
          status: ProjectStatus.PUBLISHED,
          name: restoredName,
          slug: nextSlug
        },
        include: { tenant: { select: { slug: true, name: true } } }
      });
    }

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
    if (this.isArchivedProject(project)) {
      throw new ForbiddenException('Projeto arquivado não pode ser alterado.');
    }

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

    const archivedSlug = `archived-${id}-${Date.now()}`;
    const archivedName = project.name.startsWith('[Arquivado]')
      ? project.name
      : `[Arquivado] ${project.name}`;

    await this.prisma.project.update({
      where: { id },
      data: {
        status: ProjectStatus.DRAFT,
        customDomain: null,
        slug: archivedSlug,
        name: archivedName
      }
    });

    // Sync billing subscription after project deletion
    try {
      await this.billingService.onProjectDeleted(tenantId, id);
    } catch (err) {
      this.logger.warn(
        `Failed to sync billing after project deletion: ${err.message}`
      );
    }

    return { message: 'Projeto arquivado com sucesso.' };
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
          select: {
            id: true,
            type: true,
            url: true,
            caption: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        },
        mapElement: {
          select: { id: true, code: true, name: true }
        }
      }
    });

    const lookup = new Map<string, any>();
    for (const row of rows) {
      const keys = [
        this._normalizeLegacyLotLookup(row.mapElementId),
        this._normalizeLegacyLotLookup(row.mapElement?.id),
        this._normalizeLegacyLotLookup(row.mapElement?.code),
        this._normalizeLegacyLotLookup(row.mapElement?.name)
      ].filter(Boolean);

      for (const key of keys) {
        lookup.set(key, row);
      }
    }

    return lookup;
  }
}
