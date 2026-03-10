import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { PaginatedResponse } from '@common/dto/paginated-response.dto';
import { DistributionLogQueryDto } from './dto/distribution-log-query.dto';
import { UpdateDistributionConfigDto } from './dto/update-distribution-config.dto';
import { QueueQueryDto } from './dto/queue-query.dto';

@Injectable()
export class LeadDistributionService {
  private readonly logger = new Logger(LeadDistributionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Config Management ────────────────────────────────────────────────────

  async getProjectConfig(projectId: string) {
    let config = await this.prisma.leadDistributionConfig.findUnique({
      where: { projectId }
    });

    if (!config) {
      config = await this.prisma.leadDistributionConfig.create({
        data: { projectId, enabled: false, lastAssignedIndex: -1 }
      });
    }

    return config;
  }

  async updateProjectConfig(
    projectId: string,
    dto: UpdateDistributionConfigDto
  ) {
    return this.prisma.leadDistributionConfig.upsert({
      where: { projectId },
      create: {
        projectId,
        enabled: dto.enabled ?? false,
        lastAssignedIndex: -1
      },
      update: dto
    });
  }

  async resetQueue(projectId: string) {
    return this.prisma.leadDistributionConfig.upsert({
      where: { projectId },
      create: { projectId, enabled: false, lastAssignedIndex: -1 },
      update: { lastAssignedIndex: -1 }
    });
  }

  // ─── Queue State ──────────────────────────────────────────────────────────

  async getQueueState(
    projectId: string,
    tenantId: string,
    query: QueueQueryDto
  ) {
    const { page = 1, limit = 50, search } = query;
    const skip = (page - 1) * limit;

    const config = await this.getProjectConfig(projectId);
    const eligibleBrokers = await this.getEligibleBrokers(projectId, tenantId);

    const nextIndex =
      eligibleBrokers.length > 0
        ? (config.lastAssignedIndex + 1) % eligibleBrokers.length
        : -1;

    let filteredBrokers = eligibleBrokers.map((b, i) => ({
      ...b,
      position: i,
      isNext: i === nextIndex
    }));

    if (search) {
      const s = search.toLowerCase();
      filteredBrokers = filteredBrokers.filter(
        (b) =>
          b.name.toLowerCase().includes(s) ||
          (b.code && b.code.toLowerCase().includes(s))
      );
    }

    const totalFiltered = filteredBrokers.length;
    const paginatedBrokers = filteredBrokers.slice(skip, skip + limit);

    return {
      enabled: config.enabled,
      totalBrokers: eligibleBrokers.length,
      lastAssignedIndex: config.lastAssignedIndex,
      nextIndex,
      nextBroker: nextIndex >= 0 ? eligibleBrokers[nextIndex] : null,
      brokers: paginatedBrokers,
      meta: {
        totalItems: totalFiltered,
        itemCount: paginatedBrokers.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalFiltered / limit),
        currentPage: page
      }
    };
  }

  // ─── Distribution Algorithm ───────────────────────────────────────────────

  /**
   * Attempts to auto-distribute a lead to the next eligible broker.
   * Returns the assigned RealtorLink ID, or null if not applicable.
   */
  async distributeLeadIfEligible(
    projectId: string,
    tenantId: string,
    leadId: string
  ): Promise<string | null> {
    const config = await this.prisma.leadDistributionConfig.findUnique({
      where: { projectId }
    });

    if (!config?.enabled) return null;

    const eligibleBrokers = await this.getEligibleBrokers(projectId, tenantId);

    if (eligibleBrokers.length === 0) {
      this.logger.warn(
        `Auto-distribution enabled for project ${projectId} but no eligible brokers found`
      );
      return null;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Re-read config inside transaction for atomicity
      const freshConfig = await tx.leadDistributionConfig.findUnique({
        where: { projectId }
      });
      if (!freshConfig?.enabled) return null;

      const nextIndex =
        (freshConfig.lastAssignedIndex + 1) % eligibleBrokers.length;
      const assignedBroker = eligibleBrokers[nextIndex];

      // Update the lead with the assigned broker
      await tx.lead.update({
        where: { id: leadId },
        data: {
          realtorLinkId: assignedBroker.id,
          source: 'website:auto_dist'
        }
      });

      // Advance the cursor
      await tx.leadDistributionConfig.update({
        where: { projectId },
        data: { lastAssignedIndex: nextIndex }
      });

      // Create audit log
      await tx.leadDistributionLog.create({
        data: {
          projectId,
          leadId,
          realtorLinkId: assignedBroker.id,
          queuePosition: nextIndex,
          queueSize: eligibleBrokers.length
        }
      });

      // Create LeadHistory entry
      await tx.leadHistory.create({
        data: {
          leadId,
          toStatus: 'NEW',
          notes: `Lead distribuído automaticamente para ${assignedBroker.name} (posição ${nextIndex + 1}/${eligibleBrokers.length} na fila)`,
          createdBy: 'SYSTEM_AUTO_DIST'
        }
      });

      return assignedBroker.id;
    });

    if (result) {
      this.logger.log(
        `Lead ${leadId} auto-distributed to broker in project ${projectId}`
      );
    }

    return result;
  }

  // ─── Distribution Log ─────────────────────────────────────────────────────

  async getDistributionLog(
    projectId: string,
    tenantId: string,
    query: DistributionLogQueryDto
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      projectId,
      project: { tenantId }
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.leadDistributionLog.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              status: true,
              createdAt: true
            }
          },
          realtorLink: {
            select: { id: true, name: true, code: true, photoUrl: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.leadDistributionLog.count({ where })
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

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async getEligibleBrokers(projectId: string, tenantId: string) {
    return this.prisma.realtorLink.findMany({
      where: {
        tenantId,
        enabled: true,
        projects: { some: { id: projectId } },
        NOT: { notes: { contains: '[PENDING_APPROVAL_REQUEST]' } }
      },
      select: { id: true, name: true, code: true, photoUrl: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    });
  }
}
