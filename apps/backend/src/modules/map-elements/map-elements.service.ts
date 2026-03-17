import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/infra/db/prisma.service';
import { BulkMapElementsDto, MapElementDto } from './dto/map-element.dto';
import { v4 as uuidv4 } from 'uuid';
import { LotStatus, SlopeType } from '@prisma/client';
import { S3Service } from '@infra/s3/s3.service';

@Injectable()
export class MapElementsService {
  constructor(
    private prisma: PrismaService,
    private readonly s3: S3Service
  ) {}

  private normalizeElementAssets<T extends Record<string, any>>(element: T): T {
    return {
      ...element,
      lotDetails: element?.lotDetails
        ? {
            ...element.lotDetails,
            panoramaUrl:
              this.s3.resolvePublicAssetUrl(element.lotDetails.panoramaUrl) ||
              element.lotDetails.panoramaUrl
          }
        : element?.lotDetails
    } as T;
  }

  private ensureProjectEditable(project: { slug: string | null }) {
    if ((project.slug || '').toLowerCase().startsWith('archived-')) {
      throw new ForbiddenException('Projeto arquivado não pode ser editado.');
    }
  }

  private parseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private parseStatus(value: unknown): LotStatus | null {
    const normalized = String(value ?? '')
      .trim()
      .toUpperCase();
    if (
      normalized === 'AVAILABLE' ||
      normalized === 'RESERVED' ||
      normalized === 'SOLD'
    ) {
      return normalized as LotStatus;
    }
    return null;
  }

  private parseSlope(value: unknown): SlopeType | null {
    const normalized = String(value ?? '')
      .trim()
      .toUpperCase();
    if (!normalized) return null;
    if (normalized === 'FLAT' || normalized === 'PLANO') return SlopeType.FLAT;
    if (
      normalized === 'UPHILL' ||
      normalized === 'UP' ||
      normalized === 'ACLIVE' ||
      normalized === 'GENTLE' ||
      normalized === 'MODERATE' ||
      normalized === 'STEEP'
    ) {
      return SlopeType.UPHILL;
    }
    if (
      normalized === 'DOWNHILL' ||
      normalized === 'DOWN' ||
      normalized === 'DECLIVE'
    ) {
      return SlopeType.DOWNHILL;
    }
    return null;
  }

  async findAllByProject(tenantId: string, projectId: string) {
    const elements = await this.prisma.mapElement.findMany({
      where: { tenantId, projectId },
      include: { lotDetails: true },
      orderBy: { createdAt: 'asc' }
    });

    return elements.map((element) => this.normalizeElementAssets(element));
  }

  async findOne(tenantId: string, id: string) {
    const el = await this.prisma.mapElement.findFirst({
      where: { id, tenantId },
      include: { lotDetails: true }
    });
    if (!el) throw new NotFoundException('Elemento não encontrado.');
    return this.normalizeElementAssets(el);
  }

  /**
   * Bulk upsert: replaces all map elements for a project.
   * Elements with an existing `id` are updated, new ones are created.
   * Elements in DB that are NOT in the payload are deleted.
   */
  async bulkUpsert(
    tenantId: string,
    projectId: string,
    dto: BulkMapElementsDto
  ) {
    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    this.ensureProjectEditable(project);

    // We'll use a transaction for safety
    return this.prisma.$transaction(
      async (tx) => {
        const incomingIds = dto.elements
          .filter((el) => el.id)
          .map((el) => el.id as string);

        // 1. Delete elements that are no longer present in the payload
        await tx.mapElement.deleteMany({
          where: {
            tenantId,
            projectId,
            ...(incomingIds.length > 0 ? { id: { notIn: incomingIds } } : {})
          }
        });

        const toUpdate = dto.elements.filter((el) => el.id);
        const toCreate = dto.elements
          .filter((el) => !el.id)
          .map((el) => ({ ...el, id: uuidv4() })); // Generate ID for convenience

        // 2. Perform updates in parallel (limited chunks if necessary, but here we can use Promise.all)
        const updatePromises = toUpdate.map((el) =>
          tx.mapElement.update({
            where: { id: el.id },
            data: {
              type: el.type,
              name: el.name,
              code: el.code,
              geometryType: el.geometryType,
              geometryJson: el.geometryJson,
              styleJson: el.styleJson ?? undefined,
              metaJson: el.metaJson ?? undefined
            }
          })
        );

        // 3. Perform creates in one go (Note: createMany is faster)
        const createPromise = tx.mapElement.createMany({
          data: toCreate.map((el) => ({
            id: el.id,
            tenantId,
            projectId,
            type: el.type,
            name: el.name,
            code: el.code,
            geometryType: el.geometryType,
            geometryJson: el.geometryJson,
            styleJson: el.styleJson,
            metaJson: el.metaJson
          }))
        });

        const [updatedElements] = await Promise.all([
          Promise.all(updatePromises),
          createPromise
        ]);

        // All elements for LOT details sync
        const allElements = [...toUpdate, ...toCreate];
        const lotsToSync = allElements.filter((el) => el.type === 'LOT');

        // 4. Batch LotDetails upserts
        // To keep it clean and fairly fast, we also Promise.all these
        const lotPromises = lotsToSync.map((element) => {
          const lotMeta = element.metaJson || {};
          const mapElementId = element.id!; // We are sure id exists as we update/create it above
          const areaM2 = this.parseNumber(lotMeta.areaM2 ?? lotMeta.area);
          const frontage = this.parseNumber(lotMeta.frontage);
          const price = this.parseNumber(lotMeta.price);
          const depth = this.parseNumber(
            lotMeta.depth ?? lotMeta.back ?? lotMeta.manualBack
          );
          const sideLeft = this.parseNumber(lotMeta.sideLeft);
          const sideRight = this.parseNumber(lotMeta.sideRight);
          const status = this.parseStatus(lotMeta.status ?? lotMeta.lotStatus);
          const slope = this.parseSlope(lotMeta.slope);
          const notes =
            typeof lotMeta.notes === 'string'
              ? lotMeta.notes
              : typeof lotMeta.description === 'string'
                ? lotMeta.description
                : null;
          const tags = Array.isArray(lotMeta.tags)
            ? lotMeta.tags.filter(
                (t: unknown) => typeof t === 'string' && t.trim().length > 0
              )
            : null;
          const sideMetricsJson = Array.isArray(lotMeta.sideMetrics)
            ? lotMeta.sideMetrics
            : Array.isArray(lotMeta.sideMetricsJson)
              ? lotMeta.sideMetricsJson
              : null;
          const paymentConditions = lotMeta.paymentConditions ?? null;
          const conditionsJson = lotMeta.conditionsJson ?? null;
          const panoramaUrl =
            typeof lotMeta.panoramaUrl === 'string'
              ? lotMeta.panoramaUrl
              : null;

          const updateData: any = {
            ...(areaM2 !== null && { areaM2 }),
            ...(frontage !== null && { frontage }),
            ...(price !== null && { price }),
            ...(depth !== null && { depth }),
            ...(sideLeft !== null && { sideLeft }),
            ...(sideRight !== null && { sideRight }),
            ...(status && { status }),
            ...(slope && { slope }),
            ...(notes !== null && { notes }),
            ...(tags !== null && { tags }),
            ...(sideMetricsJson !== null && { sideMetricsJson }),
            ...(paymentConditions !== null && { paymentConditions }),
            ...(conditionsJson !== null && { conditionsJson }),
            ...(panoramaUrl !== null && { panoramaUrl })
          };

          const createData: any = {
            tenantId,
            projectId,
            mapElementId,
            status: status || 'AVAILABLE',
            areaM2,
            frontage,
            price,
            depth,
            sideLeft,
            sideRight,
            slope: slope || 'FLAT',
            notes: notes || null,
            tags: tags || [],
            sideMetricsJson: sideMetricsJson || null,
            paymentConditions,
            conditionsJson,
            panoramaUrl
          };

          return tx.lotDetails.upsert({
            where: { mapElementId },
            update: updateData,
            create: createData
          });
        });

        await Promise.all(lotPromises);

        // Return a full list for frontend acknowledgment (optional, but consistent with return type)
        const elements = await tx.mapElement.findMany({
          where: { tenantId, projectId },
          include: { lotDetails: true }
        });

        return elements.map((element) => this.normalizeElementAssets(element));
      },
      {
        timeout: 30000 // Increase timeout for massive map saves
      }
    );
  }

  async create(tenantId: string, projectId: string, dto: MapElementDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    this.ensureProjectEditable(project);

    return this.prisma.mapElement.create({
      data: {
        tenantId,
        projectId,
        type: dto.type,
        name: dto.name,
        code: dto.code,
        geometryType: dto.geometryType,
        geometryJson: dto.geometryJson,
        styleJson: dto.styleJson,
        metaJson: dto.metaJson
      }
    });
  }

  async update(tenantId: string, id: string, dto: Partial<MapElementDto>) {
    const el = await this.prisma.mapElement.findFirst({
      where: { id, tenantId }
    });
    if (!el) throw new NotFoundException('Elemento não encontrado.');

    const project = await this.prisma.project.findFirst({
      where: { id: el.projectId, tenantId },
      select: { slug: true }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    this.ensureProjectEditable(project);

    return this.prisma.mapElement.update({
      where: { id },
      data: {
        ...(dto.type && { type: dto.type }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.geometryType && { geometryType: dto.geometryType }),
        ...(dto.geometryJson && { geometryJson: dto.geometryJson }),
        ...(dto.styleJson !== undefined && { styleJson: dto.styleJson }),
        ...(dto.metaJson !== undefined && { metaJson: dto.metaJson })
      }
    });
  }

  async remove(tenantId: string, id: string) {
    const el = await this.prisma.mapElement.findFirst({
      where: { id, tenantId }
    });
    if (!el) throw new NotFoundException('Elemento não encontrado.');

    const project = await this.prisma.project.findFirst({
      where: { id: el.projectId, tenantId },
      select: { slug: true }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    this.ensureProjectEditable(project);

    await this.prisma.mapElement.delete({ where: { id } });
    return { message: 'Elemento removido.' };
  }
}
