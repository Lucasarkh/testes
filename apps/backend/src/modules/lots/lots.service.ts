import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { UpsertLotDetailsDto } from './dto/upsert-lot-details.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { PaginatedResponse } from '@common/dto/paginated-response.dto';
import { LotDetails } from '@prisma/client';

@Injectable()
export class LotsService {
  constructor(private readonly prisma: PrismaService) {}

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
      include: { mapElement: true }
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
      include: { mapElement: true }
    });
    if (!lot) throw new NotFoundException('LotDetails not found');

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
