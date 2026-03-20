import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { UpsertLotDetailsDto } from './dto/upsert-lot-details.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { PaginatedResponse } from '@common/dto/paginated-response.dto';
import { LotDetails, LotStatus } from '@prisma/client';
import { S3Service } from '@infra/s3/s3.service';
import { CreateLotCategoryDto } from './dto/create-lot-category.dto';
import { UpdateLotCategoryDto } from './dto/update-lot-category.dto';

const LOT_PANORAMA_MEDIA_TAGS = [
  'lot_panorama_360',
  'panorama_360',
  'panorama-360',
  'panorama 360'
];

@Injectable()
export class LotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service
  ) {}

  private normalizeMediaUrl(url?: string | null): string | null {
    const trimmed = String(url || '').trim();
    return trimmed || null;
  }

  private normalizeCategoryName(name?: string | null): string {
    return String(name || '').trim().replace(/\s+/g, ' ');
  }

  private slugifyCategory(name: string): string {
    const base = this.normalizeCategoryName(name)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return base || 'categoria';
  }

  private async buildUniqueCategorySlug(
    projectId: string,
    name: string,
    excludeCategoryId?: string,
  ): Promise<string> {
    const baseSlug = this.slugifyCategory(name);

    for (let suffix = 0; suffix < 1000; suffix += 1) {
      const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
      const existing = await this.prisma.lotCategory.findFirst({
        where: {
          projectId,
          slug: candidate,
          ...(excludeCategoryId ? { id: { not: excludeCategoryId } } : {}),
        },
        select: { id: true },
      });

      if (!existing) return candidate;
    }

    return `${baseSlug}-${Date.now()}`;
  }

  private async ensureProjectBelongsToTenant(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { id: true, slug: true, customDomain: true, name: true },
    });

    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }

  private async mapCategorySummaries(categories: Array<any>) {
    return categories.map((category) => {
      const lots = Array.isArray(category.lots) ? category.lots : [];
      const availableLots = lots.filter((lot: any) => lot.status === LotStatus.AVAILABLE).length;

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        imageUrl: this.s3.resolvePublicAssetUrl(category.imageUrl) || category.imageUrl || null,
        description: category.description || null,
        sortOrder: category.sortOrder,
        totalLots: lots.length,
        availableLots,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      };
    });
  }

  async listCategories(tenantId: string, projectId: string) {
    await this.ensureProjectBelongsToTenant(tenantId, projectId);

    const categories = await this.prisma.lotCategory.findMany({
      where: { tenantId, projectId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { lots: { select: { status: true } } },
    });

    return this.mapCategorySummaries(categories);
  }

  async createCategory(tenantId: string, projectId: string, dto: CreateLotCategoryDto) {
    const project = await this.ensureProjectBelongsToTenant(tenantId, projectId);
    this.ensureProjectEditable(project);

    const name = this.normalizeCategoryName(dto.name);
    const slug = await this.buildUniqueCategorySlug(projectId, name);
    const currentMaxSort = await this.prisma.lotCategory.aggregate({
      where: { tenantId, projectId },
      _max: { sortOrder: true },
    });

    await this.prisma.lotCategory.create({
      data: {
        tenantId,
        projectId,
        name,
        slug,
        description: this.normalizeMediaUrl(dto.description) || undefined,
        sortOrder: (currentMaxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return this.listCategories(tenantId, projectId);
  }

  async updateCategory(
    tenantId: string,
    projectId: string,
    categoryId: string,
    dto: UpdateLotCategoryDto,
  ) {
    const project = await this.ensureProjectBelongsToTenant(tenantId, projectId);
    this.ensureProjectEditable(project);

    const category = await this.prisma.lotCategory.findFirst({
      where: { id: categoryId, tenantId, projectId },
      select: { id: true, name: true },
    });
    if (!category) throw new NotFoundException('Categoria não encontrada.');

    const nextName = dto.name ? this.normalizeCategoryName(dto.name) : category.name;
    const nextSlug = dto.name
      ? await this.buildUniqueCategorySlug(projectId, nextName, categoryId)
      : undefined;

    await this.prisma.lotCategory.update({
      where: { id: categoryId },
      data: {
        ...(dto.name ? { name: nextName, slug: nextSlug } : {}),
        ...(dto.description !== undefined
          ? { description: this.normalizeMediaUrl(dto.description) }
          : {}),
      },
    });

    return this.listCategories(tenantId, projectId);
  }

  async removeCategory(tenantId: string, projectId: string, categoryId: string) {
    const project = await this.ensureProjectBelongsToTenant(tenantId, projectId);
    this.ensureProjectEditable(project);

    const category = await this.prisma.lotCategory.findFirst({
      where: { id: categoryId, tenantId, projectId },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Categoria não encontrada.');

    await this.prisma.lotCategory.delete({ where: { id: categoryId } });
    return this.listCategories(tenantId, projectId);
  }

  async uploadCategoryImage(
    tenantId: string,
    projectId: string,
    categoryId: string,
    file: Express.Multer.File,
  ) {
    const project = await this.ensureProjectBelongsToTenant(tenantId, projectId);
    this.ensureProjectEditable(project);

    const category = await this.prisma.lotCategory.findFirst({
      where: { id: categoryId, tenantId, projectId },
      select: { id: true, imageUrl: true },
    });
    if (!category) throw new NotFoundException('Categoria não encontrada.');

    const key = this.s3.buildKey(
      tenantId,
      `projects/${projectId}/lot-categories/${categoryId}`,
      file.originalname,
    );
    const uploadedUrl = await this.s3.upload(file.buffer, key, file.mimetype);

    const previousKey = this.s3.keyFromUrl(category.imageUrl || '');
    if (previousKey) {
      await this.s3.delete(previousKey).catch(() => {});
    }

    await this.prisma.lotCategory.update({
      where: { id: categoryId },
      data: { imageUrl: uploadedUrl },
    });

    return this.listCategories(tenantId, projectId);
  }

  async removeCategoryImage(tenantId: string, projectId: string, categoryId: string) {
    const project = await this.ensureProjectBelongsToTenant(tenantId, projectId);
    this.ensureProjectEditable(project);

    const category = await this.prisma.lotCategory.findFirst({
      where: { id: categoryId, tenantId, projectId },
      select: { id: true, imageUrl: true },
    });
    if (!category) throw new NotFoundException('Categoria não encontrada.');

    const previousKey = this.s3.keyFromUrl(category.imageUrl || '');
    if (previousKey) {
      await this.s3.delete(previousKey).catch(() => {});
    }

    await this.prisma.lotCategory.update({
      where: { id: categoryId },
      data: { imageUrl: null },
    });

    return this.listCategories(tenantId, projectId);
  }

  private isLotPanoramaMedia(
    media: { caption?: string | null; url?: string | null },
    fallbackUrls: Array<string | null | undefined> = []
  ): boolean {
    const caption = String(media.caption || '').toLowerCase();
    const url = String(media.url || '').toLowerCase();
    const normalizedFallbackUrls = fallbackUrls
      .map((value) => this.normalizeMediaUrl(value))
      .filter((value): value is string => Boolean(value));

    if (
      normalizedFallbackUrls.length > 0
      && normalizedFallbackUrls.includes(this.normalizeMediaUrl(media.url) || '')
    ) {
      return true;
    }

    if (LOT_PANORAMA_MEDIA_TAGS.some((tag) => caption.includes(tag))) return true;
    if (url.includes('panorama_360') || url.includes('panorama-360') || url.includes('/panorama/')) return true;
    return false;
  }

  private async cleanupObsoleteLotPanoramaMedia(
    tenantId: string,
    lotDetailsId: string,
    previousPanoramaUrl?: string | null,
    nextPanoramaUrl?: string | null
  ) {
    const medias = await this.prisma.projectMedia.findMany({
      where: { tenantId, lotDetailsId }
    });

    const normalizedPreviousUrl = this.normalizeMediaUrl(previousPanoramaUrl);
    const normalizedNextUrl = this.normalizeMediaUrl(nextPanoramaUrl);

    const obsoleteMedias = medias.filter((media) => {
      const mediaUrl = this.normalizeMediaUrl(media.url);
      if (!mediaUrl) return false;
      if (normalizedNextUrl && mediaUrl === normalizedNextUrl) return false;
      if (normalizedPreviousUrl && mediaUrl === normalizedPreviousUrl && normalizedPreviousUrl !== normalizedNextUrl) {
        return true;
      }

      return this.isLotPanoramaMedia(media, [normalizedPreviousUrl]);
    });

    if (!obsoleteMedias.length) return;

    await Promise.all(
      obsoleteMedias.map(async (media) => {
        const key = this.s3.keyFromUrl(media.url);
        if (key) await this.s3.delete(key).catch(() => {});
      })
    );

    await this.prisma.projectMedia.deleteMany({
      where: {
        tenantId,
        id: { in: obsoleteMedias.map((media) => media.id) }
      }
    });
  }

  private resolveProjectBasePublicUrl(project: {
    slug: string;
    customDomain: string | null;
  }): string {
    const protocol = process.env.PUBLIC_SITE_PROTOCOL || 'https';
    const siteUrl = (process.env.NUXT_PUBLIC_SITE_URL || process.env.FRONTEND_URL || '')
      .trim()
      .replace(/\/+$/, '');
    const mainDomain = (process.env.MAIN_DOMAIN || 'lotio.com.br')
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');

    if (project.customDomain) {
      return `${protocol}://${project.customDomain.toLowerCase()}`;
    }

    if (siteUrl) {
      return `${siteUrl}/${encodeURIComponent(project.slug)}`;
    }

    return `${protocol}://www.${mainDomain}/${encodeURIComponent(project.slug)}`;
  }

  private buildLotPublicPageUrl(
    project: { slug: string; customDomain: string | null },
    lot: {
      id: string;
      mapElementId: string;
      mapElement?: { code?: string | null; name?: string | null } | null;
    }
  ): string {
    const baseUrl = this.resolveProjectBasePublicUrl(project);
    const lotCode = String(
      lot.mapElement?.code || lot.mapElement?.name || lot.mapElementId || lot.id
    ).trim();
    return `${baseUrl}/${encodeURIComponent(lotCode)}`;
  }

  private buildTrackedLotPublicPageUrl(
    publicPageUrl: string,
    params: { source: string; medium: string; campaign: string; content: string }
  ): string {
    const separator = publicPageUrl.includes('?') ? '&' : '?';
    return `${publicPageUrl}${separator}utm_source=${encodeURIComponent(
      params.source
    )}&utm_medium=${encodeURIComponent(params.medium)}&utm_campaign=${encodeURIComponent(
      params.campaign
    )}&utm_content=${encodeURIComponent(params.content)}`;
  }

  private buildLotQrCodeUrl(publicPageUrl: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=768x768&data=${encodeURIComponent(publicPageUrl)}`;
  }

  private enrichLotPublicData(
    lot: any,
    project: { slug: string; customDomain: string | null; name: string }
  ) {
    const rawFrontEdgeIndex = Number(lot?.mapElement?.metaJson?.frontEdgeIndex);
    const rawFrontAngleDeg = Number(lot?.mapElement?.metaJson?.frontAngleDeg);
    const frontEdgeIndex = Number.isInteger(rawFrontEdgeIndex)
      ? rawFrontEdgeIndex
      : null;
    const frontAngleDeg = Number.isFinite(rawFrontAngleDeg)
      ? ((rawFrontAngleDeg % 360) + 360) % 360
      : null;
    const publicPageUrl = this.buildLotPublicPageUrl(project, lot);
    const lotLabelRaw =
      lot?.lotNumber || lot?.mapElement?.code || lot?.mapElement?.name || lot?.id;
    const lotLabel = String(lotLabelRaw || 'lote').trim();
    const trackedQrUrl = this.buildTrackedLotPublicPageUrl(publicPageUrl, {
      source: 'qr_code',
      medium: 'offline',
      campaign: `project_${String(project.slug || 'projeto').trim().toLowerCase()}`,
      content: `lot_${lotLabel.replace(/\s+/g, '-').toLowerCase()}`
    });

    return {
      ...lot,
      frontEdgeIndex,
      frontAngleDeg,
      publicPageUrl,
      qrCodeUrl: this.buildLotQrCodeUrl(trackedQrUrl),
      shareText: `Saiba mais sobre o lote ${lotLabel} do ${project.name}`
    };
  }

  private ensureProjectEditable(project: { slug: string | null }) {
    if ((project.slug || '').toLowerCase().startsWith('archived-')) {
      throw new ForbiddenException('Projeto arquivado não pode ser editado.');
    }
  }

  async findByMapElement(tenantId: string, mapElementId: string) {
    const lot = await this.prisma.lotDetails.findFirst({
      where: { tenantId, mapElementId },
      include: { mapElement: true, category: true }
    });
    if (!lot) throw new NotFoundException('LotDetails not found');

    const project = await this.prisma.project.findFirst({
      where: { id: lot.projectId, tenantId },
      select: { slug: true, customDomain: true, name: true }
    });

    if (!project) return lot;
    return this.enrichLotPublicData(lot, project);
  }

  async findByProject(
    tenantId: string,
    projectId: string,
    query: PaginationQueryDto
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { slug: true, customDomain: true, name: true }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const [data, totalItems] = await Promise.all([
      this.prisma.lotDetails.findMany({
        where: { tenantId, projectId },
        include: {
          mapElement: true,
          category: true,
          medias: { orderBy: { createdAt: 'desc' } }
        },
        skip,
        take: limit
      }),
      this.prisma.lotDetails.count({
        where: { tenantId, projectId }
      })
    ]);

    // Ordenação manual para lidar com números dentro de strings (Ex: L-14 antes de L-140)
    data.sort((a, b) => {
      const codeA = a.mapElement?.code || '';
      const codeB = b.mapElement?.code || '';
      return codeA.localeCompare(codeB, undefined, {
        numeric: true,
        sensitivity: 'base'
      });
    });

    return {
      data: data.map((lot) => this.enrichLotPublicData(lot, project)),
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page
      }
    };
  }

  async upsert(
    tenantId: string,
    projectId: string,
    mapElementId: string,
    dto: UpsertLotDetailsDto
  ) {
    // Validate that mapElement exists and belongs to tenant/project
    const el = await this.prisma.mapElement.findFirst({
      where: { id: mapElementId, tenantId, projectId }
    });
    if (!el) throw new NotFoundException('MapElement not found');

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { slug: true, customDomain: true, name: true }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    this.ensureProjectEditable(project);

    if (dto.categoryId) {
      const category = await this.prisma.lotCategory.findFirst({
        where: { id: dto.categoryId, tenantId, projectId },
        select: { id: true },
      });
      if (!category) throw new NotFoundException('Categoria do lote não encontrada.');
    }

    const existingLot = await this.prisma.lotDetails.findFirst({
      where: { tenantId, mapElementId },
      select: { id: true, panoramaUrl: true }
    });

    await this.prisma.lotDetails.upsert({
      where: { mapElementId },
      create: {
        tenantId,
        projectId,
        mapElementId,
        ...dto
      },
      update: dto
    });

    const lot = await this.prisma.lotDetails.findFirst({
      where: { tenantId, mapElementId },
      include: { mapElement: true, category: true }
    });
    if (!lot) throw new NotFoundException('LotDetails not found');

    await this.cleanupObsoleteLotPanoramaMedia(
      tenantId,
      lot.id,
      existingLot?.panoramaUrl,
      dto.panoramaUrl ?? lot.panoramaUrl
    );

    return this.enrichLotPublicData(lot, project);
  }

  async remove(tenantId: string, mapElementId: string) {
    const lot = await this.prisma.lotDetails.findFirst({
      where: { tenantId, mapElementId }
    });
    if (!lot) throw new NotFoundException('LotDetails not found');

    const project = await this.prisma.project.findFirst({
      where: { id: lot.projectId, tenantId },
      select: { slug: true }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    this.ensureProjectEditable(project);

    return this.prisma.lotDetails.delete({ where: { id: lot.id } });
  }
}
