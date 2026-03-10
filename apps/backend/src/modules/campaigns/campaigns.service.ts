import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CreateCampaignInvestmentDto,
  CampaignReportQueryDto
} from './dto/campaigns.dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        ...dto,
        tenantId
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        project: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
  }

  async findAll(
    tenantId: string,
    projectId?: string,
    user?: { id: string; role: string }
  ) {
    return this.prisma.campaign.findMany({
      where: {
        tenantId,
        ...(projectId ? { projectId } : {}),
        ...(user?.role === 'CORRETOR' && { userId: user.id })
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        project: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(
    tenantId: string,
    id: string,
    user?: { id: string; role: string }
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id,
        tenantId,
        ...(user?.role === 'CORRETOR' && { userId: user.id })
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        project: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada.');
    return campaign;
  }

  async update(tenantId: string, id: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId }
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada.');

    return this.prisma.campaign.update({
      where: { id },
      data: dto,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        project: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });
  }

  async remove(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId }
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada.');

    await this.prisma.campaign.delete({ where: { id } });
    return { message: 'Campanha removida com sucesso.' };
  }

  // ─── INVESTMENTS ─────────────────────────────────────────

  async createInvestment(
    tenantId: string,
    campaignId: string,
    dto: CreateCampaignInvestmentDto
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId }
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada.');

    return this.prisma.campaignInvestment.create({
      data: {
        ...dto,
        campaignId
      }
    });
  }

  async getInvestments(tenantId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, tenantId }
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada.');

    return this.prisma.campaignInvestment.findMany({
      where: { campaignId },
      orderBy: { date: 'desc' }
    });
  }

  async removeInvestment(
    tenantId: string,
    campaignId: string,
    investmentId: string
  ) {
    const investment = await this.prisma.campaignInvestment.findFirst({
      where: { id: investmentId, campaignId, campaign: { tenantId } }
    });
    if (!investment)
      throw new NotFoundException('Investimento não encontrado.');

    await this.prisma.campaignInvestment.delete({
      where: { id: investmentId }
    });
    return { message: 'Investimento removido com sucesso.' };
  }

  // ─── PERFORMANCE & ANALYTICS ──────────────────────────────

  async getPerformance(
    tenantId: string,
    id: string,
    query: CampaignReportQueryDto
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId }
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada.');

    const start = query.startDate ? new Date(query.startDate) : undefined;
    const end = query.endDate ? new Date(query.endDate) : undefined;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    const utmWhere = {
      utmSource: campaign.utmSource,
      ...(campaign.utmMedium ? { utmMedium: campaign.utmMedium } : {}),
      utmCampaign: campaign.utmCampaign,
      ...(campaign.utmContent ? { utmContent: campaign.utmContent } : {}),
      ...(campaign.utmTerm ? { utmTerm: campaign.utmTerm } : {})
    };

    const dateRange = (field: string) =>
      start || end
        ? {
            [field]: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {})
            }
          }
        : {};

    const [sessions, leads, investments] = await Promise.all([
      this.prisma.trackingSession.findMany({
        where: {
          tenantId,
          projectId: campaign.projectId,
          ...utmWhere,
          ...dateRange('createdAt')
        },
        include: { _count: { select: { events: true } } }
      }),
      this.prisma.lead.findMany({
        where: {
          tenantId,
          projectId: campaign.projectId,
          source: { contains: campaign.utmSource, mode: 'insensitive' }, // Fallback check or link via tracking session
          session: {
            ...utmWhere
          },
          ...dateRange('createdAt')
        },
        include: {
          mapElement: {
            include: { lotDetails: { select: { price: true } } }
          }
        }
      }),
      this.prisma.campaignInvestment.findMany({
        where: {
          campaignId: id,
          ...dateRange('date')
        }
      })
    ]);

    const totalSessions = sessions.length;
    const totalLeads = leads.length;
    const totalWonLeads = leads.filter((l) => l.status === 'WON').length;
    const totalSpent = investments.reduce(
      (acc, curr) => acc + Number(curr.amount),
      0
    );
    const totalRevenue = leads
      .filter((l) => l.status === 'WON')
      .reduce(
        (acc, curr) => acc + Number(curr.mapElement?.lotDetails?.price || 0),
        0
      );

    const costPerLead = totalLeads > 0 ? totalSpent / totalLeads : 0;
    const costPerAcquisition =
      totalWonLeads > 0 ? totalSpent / totalWonLeads : 0;
    const conversionRate =
      totalSessions > 0 ? (totalLeads / totalSessions) * 100 : 0;
    const salesConversionRate =
      totalLeads > 0 ? (totalWonLeads / totalLeads) * 100 : 0;
    const roi =
      totalSpent > 0 ? ((totalRevenue - totalSpent) / totalSpent) * 100 : 0;

    // Daily stats for charts
    const dailyStats = this.calculateDailyStats(
      sessions,
      leads,
      investments,
      start,
      end
    );

    return {
      metrics: {
        totalSessions,
        totalLeads,
        totalWonLeads,
        totalSpent,
        totalRevenue,
        costPerLead,
        costPerAcquisition,
        conversionRate,
        salesConversionRate,
        roi,
        budget: campaign.budget
      },
      dailyStats,
      investments
    };
  }

  private calculateDailyStats(
    sessions: any[],
    leads: any[],
    investments: any[],
    start?: Date,
    end?: Date
  ) {
    const stats = new Map<string, any>();

    // Initialize dates if provided, or just use existing data
    // For simplicity, we'll just group existing data

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    sessions.forEach((s) => {
      const d = formatDate(s.createdAt);
      if (!stats.has(d))
        stats.set(d, { date: d, sessions: 0, leads: 0, spent: 0, rev: 0 });
      stats.get(d).sessions++;
    });

    leads.forEach((l) => {
      const d = formatDate(l.createdAt);
      if (!stats.has(d))
        stats.set(d, { date: d, sessions: 0, leads: 0, spent: 0, rev: 0 });
      stats.get(d).leads++;
      if (l.status === 'WON') {
        stats.get(d).rev += Number(l.mapElement?.lotDetails?.price || 0);
      }
    });

    investments.forEach((i) => {
      const d = formatDate(i.date);
      if (!stats.has(d))
        stats.set(d, { date: d, sessions: 0, leads: 0, spent: 0, rev: 0 });
      stats.get(d).spent += Number(i.amount);
    });

    return Array.from(stats.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }
}
