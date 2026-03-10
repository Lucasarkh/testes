import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { UpsertLotDetailsDto } from './dto/upsert-lot-details.dto';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { PaginatedResponse } from '@common/dto/paginated-response.dto';
import { LotDetails } from '@prisma/client';

@Injectable()
export class LotsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureProjectEditable(project: { slug: string | null }) {
    if ((project.slug || '').toLowerCase().startsWith('archived-')) {
      throw new ForbiddenException('Projeto arquivado não pode ser editado.');
    }
  }

  async findByMapElement(tenantId: string, mapElementId: string) {
    const lot = await this.prisma.lotDetails.findFirst({
      where: { tenantId, mapElementId }
    });
    if (!lot) throw new NotFoundException('LotDetails not found');
    return lot;
  }

  async findByProject(
    tenantId: string,
    projectId: string,
    query: PaginationQueryDto
  ): Promise<PaginatedResponse<LotDetails>> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

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
      select: { slug: true }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    this.ensureProjectEditable(project);

    return this.prisma.lotDetails.upsert({
      where: { mapElementId },
      create: {
        tenantId,
        projectId,
        mapElementId,
        ...dto
      },
      update: dto
    });
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
