import {
  Injectable,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { S3Service } from '@infra/s3/s3.service';
import { MediaType, Prisma } from '@prisma/client';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, 'video/mp4', 'video/webm'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50 MB
type BannerDevice = 'desktop' | 'tablet' | 'mobile';

@Injectable()
export class UploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service
  ) {}

  // ── Project Banner ──────────────────────────────────────

  async uploadBannerImage(
    tenantId: string,
    projectId: string,
    file: Express.Multer.File,
    deviceRaw?: string,
  ) {
    this.validateFile(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
    const device = this.normalizeBannerDevice(deviceRaw);
    const bannerField = this.bannerFieldByDevice(device);

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    // Delete old image from S3 if it exists
    const previousUrl = (project as any)[bannerField] as string | null | undefined;
    if (previousUrl) {
      const oldKey = this.s3.keyFromUrl(previousUrl);
      if (oldKey) await this.s3.delete(oldKey).catch(() => {});
    }

    const key = this.s3.buildKey(
      tenantId,
      `projects/${projectId}/banner/${device}`,
      file.originalname
    );
    const url = await this.s3.upload(file.buffer, key, file.mimetype);

    return this.updateProjectBannerField(projectId, bannerField, url);
  }

  async removeBannerImage(tenantId: string, projectId: string, deviceRaw?: string) {
    const device = this.normalizeBannerDevice(deviceRaw);
    const bannerField = this.bannerFieldByDevice(device);

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    const previousUrl = (project as any)[bannerField] as string | null | undefined;
    if (!previousUrl) return project;

    const oldKey = this.s3.keyFromUrl(previousUrl);
    if (oldKey) await this.s3.delete(oldKey).catch(() => {});

    return this.updateProjectBannerField(projectId, bannerField, null);
  }

  // ── Project footer logos (Realizacao e Propriedade) ───

  async listFooterLogos(tenantId: string, projectId: string) {
    await this.ensureProjectExists(tenantId, projectId);

    return this.prisma.projectLogo.findMany({
      where: { tenantId, projectId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, url: true, label: true, sortOrder: true },
    });
  }

  async uploadFooterLogo(
    tenantId: string,
    projectId: string,
    file: Express.Multer.File,
    label?: string,
  ) {
    this.validateFile(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
    await this.ensureProjectExists(tenantId, projectId);

    const key = this.s3.buildKey(
      tenantId,
      `projects/${projectId}/footer-logos`,
      file.originalname,
    );
    const url = await this.s3.upload(file.buffer, key, file.mimetype);

    const count = await this.prisma.projectLogo.count({ where: { tenantId, projectId } });

    return this.prisma.projectLogo.create({
      data: {
        tenantId,
        projectId,
        url,
        label: label?.trim() || null,
        sortOrder: count,
      },
      select: { id: true, url: true, label: true, sortOrder: true },
    });
  }

  async removeFooterLogo(tenantId: string, projectId: string, logoId: string) {
    const logo = await this.prisma.projectLogo.findFirst({
      where: { id: logoId, tenantId, projectId },
    });
    if (!logo) throw new NotFoundException('Logo não encontrado.');

    const key = this.s3.keyFromUrl(logo.url);
    if (key) await this.s3.delete(key).catch(() => {});

    await this.prisma.projectLogo.delete({ where: { id: logoId } });
    return { ok: true };
  }

  // ── Project media (gallery) ─────────────────────────────

  async uploadMedia(
    tenantId: string,
    projectId: string,
    file: Express.Multer.File,
    caption?: string,
    lotDetailsId?: string
  ) {
    this.validateFile(file, ALLOWED_MEDIA_TYPES, MAX_MEDIA_SIZE);

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    if (lotDetailsId) {
      const lot = await this.prisma.lotDetails.findFirst({
        where: { id: lotDetailsId, tenantId, projectId }
      });
      if (!lot) throw new NotFoundException('Lote não encontrado.');
    }

    const folder = lotDetailsId
      ? `projects/${projectId}/lots/${lotDetailsId}`
      : `projects/${projectId}/media`;
    const key = this.s3.buildKey(tenantId, folder, file.originalname);
    const url = await this.s3.upload(file.buffer, key, file.mimetype);

    const type: MediaType = file.mimetype.startsWith('video/')
      ? 'VIDEO'
      : 'PHOTO';

    return this.prisma.projectMedia.create({
      data: { tenantId, projectId, type, url, caption, lotDetailsId }
    });
  }

  async listMedia(tenantId: string, projectId: string) {
    return this.prisma.projectMedia.findMany({
      where: { tenantId, projectId, lotDetailsId: null },
      orderBy: { createdAt: 'desc' }
    });
  }

  async removeMedia(tenantId: string, mediaId: string) {
    const media = await this.prisma.projectMedia.findFirst({
      where: { id: mediaId, tenantId }
    });
    if (!media) throw new NotFoundException('Mídia não encontrada.');

    const key = this.s3.keyFromUrl(media.url);
    if (key) await this.s3.delete(key).catch(() => {});

    return this.prisma.projectMedia.delete({ where: { id: mediaId } });
  }

  // ── Presigned URL (frontend-direct upload) ──────────────

  async getPresignedUploadUrl(
    tenantId: string,
    projectId: string,
    folder: string,
    fileName: string,
    contentType: string
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    // Restrict folders to known areas
    const allowedFolders = ['banner', 'media', 'plant-map', 'panorama', 'lots', 'footer-logos'];
    const baseFolder = folder.split('/')[0];
    if (!allowedFolders.includes(baseFolder)) {
      throw new BadRequestException('Pasta de destino não permitida.');
    }

    // Direct folder construction to avoid arbitrary placement
    const key = this.s3.buildKey(
      tenantId,
      `projects/${projectId}/${folder}`,
      fileName
    );
    return this.s3.presignedUploadUrl(key, contentType);
  }

  // ── validation ──────────────────────────────────────────

  private validateFile(
    file: Express.Multer.File,
    allowedTypes: string[],
    maxSize: number
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    if (!allowedTypes.includes(file.mimetype))
      throw new BadRequestException(
        `Tipo não permitido. Aceitos: ${allowedTypes.join(', ')}`
      );
    if (file.size > maxSize)
      throw new BadRequestException(
        `Arquivo muito grande. Máximo: ${(maxSize / 1024 / 1024).toFixed(0)} MB`
      );
  }

  private normalizeBannerDevice(deviceRaw?: string): BannerDevice {
    const normalized = (deviceRaw || 'desktop').toLowerCase();
    if (normalized === 'desktop' || normalized === 'tablet' || normalized === 'mobile') {
      return normalized;
    }
    throw new BadRequestException('Dispositivo inválido. Use desktop, tablet ou mobile.');
  }

  private bannerFieldByDevice(device: BannerDevice): 'bannerImageUrl' | 'bannerImageTabletUrl' | 'bannerImageMobileUrl' {
    if (device === 'tablet') return 'bannerImageTabletUrl';
    if (device === 'mobile') return 'bannerImageMobileUrl';
    return 'bannerImageUrl';
  }

  private async updateProjectBannerField(
    projectId: string,
    field: 'bannerImageUrl' | 'bannerImageTabletUrl' | 'bannerImageMobileUrl',
    value: string | null,
  ) {
    if (field === 'bannerImageUrl') {
      return this.prisma.project.update({
        where: { id: projectId },
        data: { bannerImageUrl: value },
      });
    }

    if (field === 'bannerImageTabletUrl') {
      await this.prisma.$executeRaw(
        Prisma.sql`UPDATE "Project" SET "bannerImageTabletUrl" = ${value}, "updatedAt" = NOW() WHERE "id" = ${projectId}`,
      );
    } else {
      await this.prisma.$executeRaw(
        Prisma.sql`UPDATE "Project" SET "bannerImageMobileUrl" = ${value}, "updatedAt" = NOW() WHERE "id" = ${projectId}`,
      );
    }

    const refreshed = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!refreshed) throw new NotFoundException('Projeto não encontrado.');
    return refreshed;
  }

  private async ensureProjectExists(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }
}
