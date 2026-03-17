import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { S3Service } from '@infra/s3/s3.service';
import { CreatePanoramaDto } from './dto/create-panorama.dto';
import { UpdatePanoramaDto } from './dto/update-panorama.dto';
import { CreateSnapshotDto } from './dto/create-snapshot.dto';
import { UpdateSnapshotDto } from './dto/update-snapshot.dto';
import { CreateBeaconDto } from './dto/create-beacon.dto';
import { UpdateBeaconDto } from './dto/update-beacon.dto';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 30 * 1024 * 1024; // 30 MB (panoramas can be large)

@Injectable()
export class PanoramaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service
  ) {}

  private normalizePanoramaAssets<T extends Record<string, any> | null>(
    panorama: T
  ): T {
    if (!panorama) return panorama;

    return {
      ...panorama,
      implantationUrl:
        this.s3.resolvePublicAssetUrl(panorama.implantationUrl) ||
        panorama.implantationUrl,
      snapshots: Array.isArray(panorama.snapshots)
        ? panorama.snapshots.map((snapshot: any) => ({
            ...snapshot,
            imageUrl:
              this.s3.resolvePublicAssetUrl(snapshot.imageUrl) ||
              snapshot.imageUrl
          }))
        : panorama.snapshots
    } as T;
  }

  // ── Panorama CRUD ──────────────────────────────────────

  async findAllByProject(tenantId: string, projectId: string) {
    const panoramas = await this.prisma.panorama.findMany({
      where: { projectId, tenantId },
      include: {
        snapshots: { orderBy: { sortOrder: 'asc' } },
        beacons: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'asc' }
    });

    return panoramas.map((panorama) => this.normalizePanoramaAssets(panorama));
  }

  async findByProjectPublic(projectId: string, _isPreview = false) {
    const panoramas = await this.prisma.panorama.findMany({
      where: {
        projectId
      },
      include: {
        snapshots: { orderBy: { sortOrder: 'asc' } },
        beacons: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return panoramas.map((panorama) => this.normalizePanoramaAssets(panorama));
  }

  async findOne(tenantId: string, panoramaId: string) {
    const panorama = await this.prisma.panorama.findFirst({
      where: { id: panoramaId, tenantId },
      include: {
        snapshots: { orderBy: { sortOrder: 'asc' } },
        beacons: { orderBy: { createdAt: 'asc' } }
      }
    });
    if (!panorama) throw new NotFoundException('Panorama não encontrado.');
    return this.normalizePanoramaAssets(panorama);
  }

  async create(tenantId: string, projectId: string, dto: CreatePanoramaDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const created = await this.prisma.panorama.create({
      data: {
        tenantId,
        projectId,
        title: dto.title ?? 'Vista Geral',
        projection: dto.projection ?? 'FLAT',
        published: dto.published ?? false,
        sunPathAngleDeg: dto.sunPathAngleDeg ?? 0,
        sunPathLabelEnabled: dto.sunPathLabelEnabled ?? true,
        showImplantation: dto.showImplantation ?? false,
        implantationUrl: dto.implantationUrl
      },
      include: { snapshots: true, beacons: true }
    });

    return this.normalizePanoramaAssets(created);
  }

  async update(tenantId: string, panoramaId: string, dto: UpdatePanoramaDto) {
    const panorama = await this._findPanorama(tenantId, panoramaId);

    const updated = await this.prisma.panorama.update({
      where: { id: panorama.id },
      data: dto,
      include: {
        snapshots: { orderBy: { sortOrder: 'asc' } },
        beacons: { orderBy: { createdAt: 'asc' } }
      }
    });

    return this.normalizePanoramaAssets(updated);
  }

  async remove(tenantId: string, panoramaId: string) {
    const panorama = await this._findPanorama(tenantId, panoramaId);

    // Cleanup S3 images for all snapshots
    const snapshots = await this.prisma.panoramaSnapshot.findMany({
      where: { panoramaId: panorama.id }
    });
    for (const snap of snapshots) {
      if (snap.imageUrl) {
        const key = this.s3.keyFromUrl(snap.imageUrl);
        if (key) await this.s3.delete(key).catch(() => {});
      }
    }

    // Cleanup implantation image
    if (panorama.implantationUrl) {
      const key = this.s3.keyFromUrl(panorama.implantationUrl);
      if (key) await this.s3.delete(key).catch(() => {});
    }

    return this.prisma.panorama.delete({ where: { id: panorama.id } });
  }

  // ── Snapshot CRUD ──────────────────────────────────────

  async createSnapshot(
    tenantId: string,
    panoramaId: string,
    dto: CreateSnapshotDto
  ) {
    const panorama = await this._findPanorama(tenantId, panoramaId);

    // Auto-set sortOrder if not provided
    if (dto.sortOrder === undefined) {
      const maxSort = await this.prisma.panoramaSnapshot.aggregate({
        where: { panoramaId: panorama.id },
        _max: { sortOrder: true }
      });
      dto.sortOrder = (maxSort._max.sortOrder ?? -1) + 1;
    }

    const created = await this.prisma.panoramaSnapshot.create({
      data: {
        panoramaId: panorama.id,
        imageUrl: dto.imageUrl,
        imageWidth: dto.imageWidth,
        imageHeight: dto.imageHeight,
        label: dto.label,
        date: dto.date ? new Date(dto.date) : undefined,
        sortOrder: dto.sortOrder
      }
    });

    return {
      ...created,
      imageUrl: this.s3.resolvePublicAssetUrl(created.imageUrl) || created.imageUrl
    };
  }

  async updateSnapshot(
    tenantId: string,
    snapshotId: string,
    dto: UpdateSnapshotDto
  ) {
    const snapshot = await this._findSnapshot(tenantId, snapshotId);

    const updated = await this.prisma.panoramaSnapshot.update({
      where: { id: snapshot.id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined
      }
    });

    return {
      ...updated,
      imageUrl: this.s3.resolvePublicAssetUrl(updated.imageUrl) || updated.imageUrl
    };
  }

  async removeSnapshot(tenantId: string, snapshotId: string) {
    const snapshot = await this._findSnapshot(tenantId, snapshotId);

    // Cleanup S3
    if (snapshot.imageUrl) {
      const key = this.s3.keyFromUrl(snapshot.imageUrl);
      if (key) await this.s3.delete(key).catch(() => {});
    }

    return this.prisma.panoramaSnapshot.delete({ where: { id: snapshot.id } });
  }

  // ── Image Upload ───────────────────────────────────────

  async uploadSnapshotImage(
    tenantId: string,
    projectId: string,
    panoramaId: string,
    file: Express.Multer.File
  ) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de arquivo inválido. Use JPG, PNG ou WebP.'
      );
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('Arquivo muito grande. Máximo 30 MB.');
    }

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const key = this.s3.buildKey(
      tenantId,
      `projects/${projectId}/panorama/${panoramaId}`,
      file.originalname
    );
    await this.s3.upload(file.buffer, key, file.mimetype);
    const url = this.s3.publicAssetUrl(key);
    return { imageUrl: url };
  }

  async uploadImplantation(
    tenantId: string,
    projectId: string,
    panoramaId: string,
    file: Express.Multer.File
  ) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de arquivo inválido. Use JPG, PNG ou WebP.'
      );
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('Arquivo muito grande. Máximo 30 MB.');
    }

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const key = this.s3.buildKey(
      tenantId,
      `projects/${projectId}/panorama/${panoramaId}/implantation`,
      file.originalname
    );
    await this.s3.upload(file.buffer, key, file.mimetype);
    const url = this.s3.publicAssetUrl(key);
    return { implantationUrl: url };
  }

  // ── Beacon CRUD ────────────────────────────────────────

  async createBeacon(
    tenantId: string,
    panoramaId: string,
    dto: CreateBeaconDto
  ) {
    const panorama = await this._findPanorama(tenantId, panoramaId);

    return this.prisma.panoramaBeacon.create({
      data: {
        tenantId,
        panoramaId: panorama.id,
        title: dto.title,
        description: dto.description,
        x: dto.x,
        y: dto.y,
        style: dto.style ?? 'default',
        visible: dto.visible ?? true
      }
    });
  }

  async updateBeacon(tenantId: string, beaconId: string, dto: UpdateBeaconDto) {
    const beacon = await this._findBeacon(tenantId, beaconId);

    return this.prisma.panoramaBeacon.update({
      where: { id: beacon.id },
      data: dto
    });
  }

  async removeBeacon(tenantId: string, beaconId: string) {
    const beacon = await this._findBeacon(tenantId, beaconId);
    return this.prisma.panoramaBeacon.delete({ where: { id: beacon.id } });
  }

  // ── Helpers ────────────────────────────────────────────

  private async _findPanorama(tenantId: string, panoramaId: string) {
    const panorama = await this.prisma.panorama.findFirst({
      where: { id: panoramaId, tenantId }
    });
    if (!panorama) throw new NotFoundException('Panorama não encontrado.');
    return panorama;
  }

  private async _findSnapshot(tenantId: string, snapshotId: string) {
    const snapshot = await this.prisma.panoramaSnapshot.findFirst({
      where: { id: snapshotId },
      include: { panorama: true }
    });
    if (!snapshot || snapshot.panorama.tenantId !== tenantId) {
      throw new NotFoundException('Snapshot não encontrado.');
    }
    return snapshot;
  }

  private async _findBeacon(tenantId: string, beaconId: string) {
    const beacon = await this.prisma.panoramaBeacon.findFirst({
      where: { id: beaconId, tenantId }
    });
    if (!beacon) throw new NotFoundException('Beacon não encontrado.');
    return beacon;
  }
}
