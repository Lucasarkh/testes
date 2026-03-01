import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { S3Service } from '@infra/s3/s3.service';
import { CreatePlantMapDto } from './dto/create-plant-map.dto';
import { UpdatePlantMapDto } from './dto/update-plant-map.dto';
import { CreateHotspotDto } from './dto/create-hotspot.dto';
import { UpdateHotspotDto } from './dto/update-hotspot.dto';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20 MB

@Injectable()
export class PlantMapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service
  ) {}

  // ── PlantMap CRUD ──────────────────────────────────────

  async findByProject(tenantId: string, projectId: string) {
    const plantMap = await this.prisma.plantMap.findUnique({
      where: { projectId },
      include: {
        hotspots: { 
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            type: true,
            title: true,
            x: true,
            y: true,
            label: true,
            labelEnabled: true,
            labelOffsetX: true,
            labelOffsetY: true,
            linkType: true,
            linkId: true,
            linkUrl: true,
            loteStatus: true,
            // Only fetch what's needed for the list/map
            // We keep description and metaJson for the popover but maybe we could lazy fetch them?
            // To stick to "no interference", let's keep them and focus on query performance.
            description: true,
            metaJson: true,
            createdAt: true,
          }
        }
      }
    });
    if (!plantMap || plantMap.tenantId !== tenantId) return null;

    // Attach tags from linked MapElements (Lots)
    const hotspotsWithTags = await this._attachTagsToHotspots(
      plantMap.hotspots
    );
    return { ...plantMap, hotspots: hotspotsWithTags };
  }

  /** Public access — no tenantId check (project uniqueness ensures isolation) */
  async findByProjectPublic(projectId: string, _isPreview = false) {
    const plantMap = (await this.prisma.plantMap.findUnique({
      where: { projectId },
      include: {
        hotspots: { 
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            type: true,
            title: true,
            x: true,
            y: true,
            label: true,
            labelEnabled: true,
            labelOffsetX: true,
            labelOffsetY: true,
            linkType: true,
            linkId: true,
            linkUrl: true,
            loteStatus: true,
            description: true,
            metaJson: true,
          }
        }
      }
    })) as any;

    if (!plantMap) return null;

    // Attach tags from linked MapElements (Lots)
    const hotspotsWithTags = await this._attachTagsToHotspots(
      plantMap.hotspots
    );
    return { ...plantMap, hotspots: hotspotsWithTags };
  }

  private async _attachTagsToHotspots(hotspots: any[]) {
    // Collect all linkIds for LOTE_PAGE
    const lotIds = hotspots
      .filter((h) => h.linkType === 'LOTE_PAGE' && h.linkId)
      .map((h) => h.linkId);

    if (lotIds.length === 0) {
      return hotspots.map((h) => ({ ...h, tags: [] }));
    }

    // Fetch all lot details for these IDs
    const lotDetails = await this.prisma.lotDetails.findMany({
      where: { mapElementId: { in: lotIds } },
      select: { mapElementId: true, tags: true }
    });

    const tagsMap = new Map<string, string[]>();
    lotDetails.forEach((ld) => {
      tagsMap.set(ld.mapElementId, ld.tags || []);
    });

    return hotspots.map((h) => {
      if (h.linkType === 'LOTE_PAGE' && h.linkId) {
        return { ...h, tags: tagsMap.get(h.linkId) || [] };
      }
      return { ...h, tags: [] };
    });
  }

  async create(tenantId: string, projectId: string, dto: CreatePlantMapDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const existing = await this.prisma.plantMap.findFirst({
      where: { projectId, tenantId }
    });
    if (existing) {
      throw new BadRequestException(
        'Já existe uma planta para este projeto. Use PUT para atualizar.'
      );
    }

    return this.prisma.plantMap.create({
      data: {
        tenantId,
        projectId,
        ...dto
      },
      include: { hotspots: true }
    });
  }

  async update(tenantId: string, plantMapId: string, dto: UpdatePlantMapDto) {
    const plantMap = await this._findMap(tenantId, plantMapId);

    return this.prisma.plantMap.update({
      where: { id: plantMap.id },
      data: dto,
      include: { hotspots: { orderBy: { createdAt: 'asc' } } }
    });
  }

  async remove(tenantId: string, plantMapId: string) {
    const plantMap = await this._findMap(tenantId, plantMapId);

    // Delete S3 image
    if (plantMap.imageUrl) {
      const key = this.s3.keyFromUrl(plantMap.imageUrl);
      if (key) await this.s3.delete(key).catch(() => {});
    }

    return this.prisma.plantMap.delete({ where: { id: plantMap.id } });
  }

  // ── Image upload ───────────────────────────────────────

  async uploadImage(
    tenantId: string,
    projectId: string,
    file: Express.Multer.File
  ) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de arquivo inválido. Use JPG, PNG ou WebP.'
      );
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('Arquivo muito grande. Máximo 20 MB.');
    }

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const key = this.s3.buildKey(
      tenantId,
      `projects/${projectId}/plant-map`,
      file.originalname
    );
    const url = await this.s3.upload(file.buffer, key, file.mimetype);
    return { imageUrl: url };
  }

  // ── Hotspot CRUD ───────────────────────────────────────

  async createHotspot(
    tenantId: string,
    plantMapId: string,
    dto: CreateHotspotDto
  ) {
    const plantMap = await this._findMap(tenantId, plantMapId);

    return this.prisma.$transaction(async (tx) => {
      let linkId = dto.linkId;
      let linkType = dto.linkType || 'NONE';

      // Criar página (MapElement/LotDetails) automaticamente APENAS para hotspots do tipo LOTE
      if (dto.type === 'LOTE' && (!linkId || linkId === '')) {
        const mapElement = await tx.mapElement.create({
          data: {
            tenantId,
            projectId: plantMap.projectId,
            type: 'LOT',
            name: dto.title,
            code: dto.label || dto.title,
            geometryType: 'POLYGON', // Mantido para compatibilidade com o sistema de páginas
            geometryJson: { points: [] },
            styleJson: {}
          }
        });

        await tx.lotDetails.create({
          data: {
            tenantId,
            projectId: plantMap.projectId,
            mapElementId: mapElement.id,
            status: dto.loteStatus || 'AVAILABLE'
          }
        });

        linkId = mapElement.id;
        linkType = 'LOTE_PAGE';
      }

      return tx.plantHotspot.create({
        data: {
          tenantId,
          plantMapId: plantMap.id,
          ...dto,
          linkId,
          linkType
        }
      });
    });
  }

  async updateHotspot(
    tenantId: string,
    hotspotId: string,
    dto: UpdateHotspotDto
  ) {
    const hotspot = await this._findHotspot(tenantId, hotspotId);

    return this.prisma.$transaction(async (tx) => {
      const updatedHotspot = await tx.plantHotspot.update({
        where: { id: hotspot.id },
        data: dto
      });

      // Synchronize linked MapElement and LotDetails
      if (updatedHotspot.linkType === 'LOTE_PAGE' && updatedHotspot.linkId) {
        // 1. Update MapElement (Name, Code/Label, Type)
        await tx.mapElement
          .update({
            where: { id: updatedHotspot.linkId },
            data: {
              name: updatedHotspot.title,
              code: updatedHotspot.label || updatedHotspot.title,
              type: updatedHotspot.type === 'LOTE' ? 'LOT' : 'LABEL'
            }
          })
          .catch(() => null); // Ignore if already deleted or non-existent

        // 2. Update LotDetails (Status)
        if (dto.loteStatus) {
          await tx.lotDetails.updateMany({
            where: {
              mapElementId: updatedHotspot.linkId,
              tenantId
            },
            data: {
              status: dto.loteStatus
            }
          });
        }
      }

      return updatedHotspot;
    });
  }

  async removeHotspot(tenantId: string, hotspotId: string) {
    const hotspot = await this._findHotspot(tenantId, hotspotId);

    return this.prisma.$transaction(async (tx) => {
      // If we have a linked LOTE_PAGE, we delete it (MapElement and LotDetails will cascade if correctly configured, otherwise we do it manually)
      if (hotspot.linkType === 'LOTE_PAGE' && hotspot.linkId) {
        // Find if any other hotspot is using this same linkId (unlikely with auto-creation, but safe)
        const others = await tx.plantHotspot.count({
          where: { linkId: hotspot.linkId, id: { not: hotspotId } }
        });

        if (others === 0) {
          // Delete its lot details first (prismacolumn cascade usually handles, but let's be explicit)
          await tx.lotDetails
            .deleteMany({
              where: { mapElementId: hotspot.linkId }
            })
            .catch(() => {});

          await tx.mapElement
            .delete({
              where: { id: hotspot.linkId }
            })
            .catch(() => {});
        }
      }

      return tx.plantHotspot.delete({ where: { id: hotspot.id } });
    });
  }

  // ── Helpers ────────────────────────────────────────────

  private async _findMap(tenantId: string, plantMapId: string) {
    const plantMap = await this.prisma.plantMap.findFirst({
      where: { id: plantMapId, tenantId }
    });
    if (!plantMap) throw new NotFoundException('PlantMap não encontrado.');
    return plantMap;
  }

  private async _findHotspot(tenantId: string, hotspotId: string) {
    const hotspot = await this.prisma.plantHotspot.findFirst({
      where: { id: hotspotId, tenantId }
    });
    if (!hotspot) throw new NotFoundException('Hotspot não encontrado.');
    return hotspot;
  }
}
