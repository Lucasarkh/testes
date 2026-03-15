import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import {
  CreateSessionDto,
  CreateEventDto,
  TrackingReportQueryDto
} from './dto/tracking.dto';
import { ProjectStatus, MapElementType, LeadStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { NotificationsService } from '@modules/notifications/notifications.service';

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  private hashIp(ip: string): string {
    return crypto.createHash('sha256').update(ip).digest('hex');
  }

  private getDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (
      /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Opera Mini/i.test(
        ua
      )
    ) {
      return 'mobile';
    }
    return 'desktop';
  }

  /**
   * Returns high-level dashboard stats for a tenant:
   * project counts, lot/map-element count, lead count.
   */
  async getDashboardStats(
    tenantId: string,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    // If user is a realtor, filter by their realtorLink
    let realtorLinkId: string | undefined;
    if (user?.role === 'CORRETOR') {
      const realtor = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id }
      });
      realtorLinkId = realtor?.id || 'none';
    }

    // If user is Imobiliaria, filter by their agency team
    let agencyId: string | undefined;
    if (user?.role === 'IMOBILIARIA') {
      agencyId = user.agencyId;
    }

    // Date range for "last 30 days" stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      projects,
      publishedProjects,
      totalLots,
      totalLeads,
      totalSchedulings,
      totalSessions,
      totalRealtors
    ] = await Promise.all([
      this.prisma.project.count({ where: { tenantId } }),
      this.prisma.project.count({
        where: { tenantId, status: ProjectStatus.PUBLISHED }
      }),
      this.prisma.mapElement.count({
        where: { tenantId, type: MapElementType.LOT }
      }),
      this.prisma.lead.count({
        where: {
          tenantId,
          ...(realtorLinkId && { realtorLinkId }),
          ...(agencyId && { realtorLink: { user: { agencyId } } })
        }
      }),
      this.prisma.scheduling.count({
        where: {
          tenantId,
          ...(realtorLinkId && { lead: { realtorLinkId } }),
          ...(agencyId && {
            OR: [
              { user: { agencyId } },
              { lead: { realtorLink: { user: { agencyId } } } }
            ]
          })
        }
      }),
      this.prisma.trackingSession.count({
        where: {
          tenantId,
          lastSeenAt: { gte: thirtyDaysAgo },
          ...(realtorLinkId && { realtorLinkId }),
          ...(agencyId && { realtorLink: { user: { agencyId } } })
        }
      }),
      agencyId
        ? this.prisma.realtorLink.count({
            where: { tenantId, enabled: true, user: { agencyId } }
          })
        : this.prisma.realtorLink.count({
            where: {
              tenantId,
              enabled: true,
              ...(realtorLinkId && { id: realtorLinkId })
            }
          })
    ]);

    return {
      projects,
      publishedProjects,
      totalLots,
      totalLeads,
      totalSchedulings,
      totalSessions,
      totalRealtors
    };
  }

  async createSession(dto: CreateSessionDto, ip?: string, userAgent?: string) {
    const {
      tenantSlug,
      projectSlug,
      realtorCode,
      sessionId,
      visitorId,
      ...data
    } = dto;
    let { tenantId, projectId } = data;

    // Resolve IDs
    if (!projectId && projectSlug) {
      const project = await this.prisma.project.findFirst({
        where: { slug: { equals: projectSlug, mode: 'insensitive' } },
        include: { tenant: true }
      });
      if (project) {
        projectId = project.id;
        tenantId = project.tenantId;
      }
    }

    if (!tenantId && tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: tenantSlug }
      });
      if (tenant) {
        tenantId = tenant.id;
      }
    }

    const hashedIp = ip ? this.hashIp(ip) : undefined;
    const deviceType = userAgent ? this.getDeviceType(userAgent) : 'unknown';

    // Normalize UTMs/Source
    let utmSource = data.utmSource;
    let utmMedium = data.utmMedium;
    let utmCampaign = data.utmCampaign;
    const utmContent = data.utmContent || null;
    const utmTerm = data.utmTerm || null;
    const referrer = data.referrer || null;

    if (!utmSource) {
      if (referrer) {
        const ref = referrer.toLowerCase();
        if (
          ref.includes('google.com') ||
          ref.includes('bing.com') ||
          ref.includes('yahoo.com')
        ) {
          utmSource = 'Busca Orgânica';
          utmMedium = 'organic';
        } else if (
          ref.includes('facebook.com') ||
          ref.includes('t.co') ||
          ref.includes('instagram.com') ||
          ref.includes('linkedin.com')
        ) {
          utmSource = 'Social';
          utmMedium = 'social';
        } else {
          utmSource = 'Referência';
          utmMedium = 'referral';
        }
      } else {
        utmSource = 'Direto';
        utmMedium = 'direct';
      }
    }

    if (!utmCampaign) utmCampaign = '(Nenhuma)';

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // 2. Resolve Realtor
    let currentRealtorLinkId: string | null = null;
    if (realtorCode && tenantId) {
      const realtor = await this.prisma.realtorLink.findFirst({
        where: { tenantId, code: realtorCode, enabled: true },
        select: { id: true, name: true, code: true }
      });
      if (realtor) {
        currentRealtorLinkId = realtor.id;
      }
    }

    let visitor = visitorId
      ? await this.prisma.trackingVisitor.findUnique({
          where: { id: visitorId }
        })
      : null;

    if (visitor && visitor.lastSeenAt < thirtyDaysAgo) {
      visitor = null;
    }

    if (visitor) {
      const isNewVisitorAttribution =
        (utmSource && utmSource !== visitor.ltUtmSource) ||
        (utmCampaign && utmCampaign !== visitor.ltUtmCampaign) ||
        (currentRealtorLinkId && currentRealtorLinkId !== visitor.realtorLinkId);

      let visitorRealtorIdToUse = currentRealtorLinkId || visitor.realtorLinkId;
      let visitorLastRealtorAt = currentRealtorLinkId ? now : visitor.lastRealtorAt;

      if (
        !currentRealtorLinkId &&
        visitor.realtorLinkId &&
        visitor.lastRealtorAt &&
        visitor.lastRealtorAt < thirtyDaysAgo
      ) {
        visitorRealtorIdToUse = null;
        visitorLastRealtorAt = null;
      }

      visitor = await this.prisma.trackingVisitor.update({
        where: { id: visitor.id },
        data: {
          lastSeenAt: now,
          tenantId: tenantId || visitor.tenantId,
          projectId: projectId || visitor.projectId,
          userAgent,
          deviceType,
          ip,
          ipHash: hashedIp,
          landingPage: data.landingPage || visitor.landingPage,
          ...(isNewVisitorAttribution && {
            ltUtmSource: utmSource,
            ltUtmMedium: utmMedium,
            ltUtmCampaign: utmCampaign,
            ltUtmContent: utmContent,
            ltUtmTerm: utmTerm,
            ltReferrer: referrer,
            utmSource,
            utmMedium,
            utmCampaign,
            utmContent,
            utmTerm,
            referrer
          }),
          realtorLinkId: visitorRealtorIdToUse,
          lastRealtorAt: visitorLastRealtorAt
        }
      });
    } else {
      visitor = await this.prisma.trackingVisitor.create({
        data: {
          tenantId,
          projectId,
          ip,
          ipHash: hashedIp,
          userAgent,
          deviceType,
          landingPage: data.landingPage || null,
          firstSeenAt: now,
          lastSeenAt: now,
          ftUtmSource: utmSource,
          ftUtmMedium: utmMedium,
          ftUtmCampaign: utmCampaign,
          ftUtmContent: utmContent,
          ftUtmTerm: utmTerm,
          ftReferrer: referrer,
          ltUtmSource: utmSource,
          ltUtmMedium: utmMedium,
          ltUtmCampaign: utmCampaign,
          ltUtmContent: utmContent,
          ltUtmTerm: utmTerm,
          ltReferrer: referrer,
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm,
          referrer,
          realtorLinkId: currentRealtorLinkId,
          lastRealtorAt: currentRealtorLinkId ? now : null
        }
      });
    }

    let session = sessionId
      ? await this.prisma.trackingSession.findUnique({
          where: { id: sessionId }
        })
      : null;

    if (
      session &&
      (session.lastSeenAt < thirtyMinutesAgo ||
        (session.visitorId && visitor.id && session.visitorId !== visitor.id))
    ) {
      session = null;
    }

    let createdNewSession = false;

    if (session) {
      const isNewSessionAttribution =
        (utmSource && utmSource !== session.ltUtmSource) ||
        (utmCampaign && utmCampaign !== session.ltUtmCampaign) ||
        (currentRealtorLinkId && currentRealtorLinkId !== session.realtorLinkId);

      let sessionRealtorIdToUse =
        currentRealtorLinkId || session.realtorLinkId || visitor.realtorLinkId;
      let sessionLastRealtorAt = currentRealtorLinkId
        ? now
        : session.lastRealtorAt || visitor.lastRealtorAt;

      if (
        !currentRealtorLinkId &&
        session.realtorLinkId &&
        session.lastRealtorAt &&
        session.lastRealtorAt < thirtyDaysAgo
      ) {
        sessionRealtorIdToUse = null;
        sessionLastRealtorAt = null;
      }

      session = await this.prisma.trackingSession.update({
        where: { id: session.id },
        data: {
          visitorId: visitor.id,
          lastSeenAt: now,
          userAgent,
          deviceType,
          ip,
          ipHash: hashedIp,
          landingPage: session.landingPage || data.landingPage || visitor.landingPage || null,
          tenantId: tenantId || session.tenantId,
          projectId: projectId || session.projectId,
          ...(isNewSessionAttribution && {
            ltUtmSource: utmSource,
            ltUtmMedium: utmMedium,
            ltUtmCampaign: utmCampaign,
            ltUtmContent: utmContent,
            ltUtmTerm: utmTerm,
            ltReferrer: referrer,
            utmSource,
            utmMedium,
            utmCampaign,
            utmContent,
            utmTerm,
            referrer
          }),
          realtorLinkId: sessionRealtorIdToUse,
          lastRealtorAt: sessionLastRealtorAt
        }
      });
    } else {
      createdNewSession = true;
      session = await this.prisma.trackingSession.create({
        data: {
          visitorId: visitor.id,
          tenantId,
          projectId,
          ip,
          ipHash: hashedIp,
          userAgent,
          deviceType,
          landingPage: data.landingPage || visitor.landingPage || null,
          firstSeenAt: now,
          lastSeenAt: now,
          ftUtmSource: utmSource,
          ftUtmMedium: utmMedium,
          ftUtmCampaign: utmCampaign,
          ftUtmContent: utmContent,
          ftUtmTerm: utmTerm,
          ftReferrer: referrer,
          ltUtmSource: utmSource,
          ltUtmMedium: utmMedium,
          ltUtmCampaign: utmCampaign,
          ltUtmContent: utmContent,
          ltUtmTerm: utmTerm,
          ltReferrer: referrer,
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm,
          referrer,
          realtorLinkId: currentRealtorLinkId || visitor.realtorLinkId,
          lastRealtorAt: currentRealtorLinkId ? now : visitor.lastRealtorAt
        }
      });

      if (tenantId && projectId) {
        this.notifications.onNewSession(tenantId, projectId).catch(() => {});
      }
    }

    if (realtorCode && session.realtorLinkId && createdNewSession) {
      await this.trackEvent({
        sessionId: session.id,
        type: 'REFERRAL',
        category: 'REALTOR_LINK',
        action: 'AUTOMATIC_LANDING',
        label: `Corretor Link: ${realtorCode}`
      });
    }

    return {
      ...session,
      visitorId: visitor.id,
      sessionId: session.id
    };
  }

  async trackEvent(dto: CreateEventDto) {
    // Verify session existence
    const session = await this.prisma.trackingSession.findUnique({
      where: { id: dto.sessionId },
      select: { id: true, lastSeenAt: true }
    });

    if (!session) {
      throw new BadRequestException('Invalid session ID');
    }

    // UPDATE: Update lastSeenAt on every event
    await this.prisma.trackingSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() }
    });

    // DEDUPLICATION: check for similar event in the last 5 seconds to avoid duplicate clicks
    if (dto.type !== 'PAGE_VIEW') {
      const fiveSecondsAgo = new Date();
      fiveSecondsAgo.setSeconds(fiveSecondsAgo.getSeconds() - 5);

      const duplicate = await this.prisma.trackingEvent.findFirst({
        where: {
          sessionId: session.id,
          type: dto.type,
          category: dto.category || null,
          action: dto.action || null,
          label: dto.label || null,
          timestamp: { gte: fiveSecondsAgo }
        },
        select: { id: true }
      });

      if (duplicate) {
        return duplicate; // Skip creation if duplicate
      }
    }

    return this.prisma.trackingEvent.create({
      data: {
        ...dto
      }
    });
  }

  private async getRealtorContextFromUser(user?: {
    id: string;
    role: string;
    agencyId?: string;
  }) {
    if (user?.role === 'CORRETOR') {
      const realtor = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id },
        select: { id: true }
      });
      return { realtorLinkId: realtor?.id || 'none' };
    }

    if (user?.role === 'IMOBILIARIA' && user.agencyId) {
      return { agencyId: user.agencyId };
    }

    return {};
  }

  private getSessionWhere(
    query: TrackingReportQueryDto,
    context: { realtorLinkId?: string; agencyId?: string } = {}
  ) {
    const { tenantId, projectId, startDate, endDate } = query;

    // Use Brasilia timezone boundaries (UTC-3) for consistent filtering
    const start = startDate ? new Date(`${startDate}T03:00:00.000Z`) : null;
    const end = endDate
      ? new Date(
          new Date(`${endDate}T03:00:00.000Z`).getTime() +
            24 * 60 * 60 * 1000 -
            1
        )
      : null;

    return {
      tenantId,
      ...(projectId && projectId !== 'all' ? { projectId } : {}),
      ...(context.realtorLinkId && { realtorLinkId: context.realtorLinkId }),
      ...(context.agencyId && { realtorLink: { agencyId: context.agencyId } }),
      ...(start || end
        ? {
            lastSeenAt: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {})
            }
          }
        : {})
    };
  }

  private getEventWhere(
    query: TrackingReportQueryDto,
    context: { realtorLinkId?: string; agencyId?: string } = {},
    type?: string,
    category?: string
  ) {
    const { tenantId, projectId, startDate, endDate } = query;

    // Use Brasilia timezone boundaries (UTC-3) for consistent filtering
    const start = startDate ? new Date(`${startDate}T03:00:00.000Z`) : null;
    const end = endDate
      ? new Date(
          new Date(`${endDate}T03:00:00.000Z`).getTime() +
            24 * 60 * 60 * 1000 -
            1
        )
      : null;

    return {
      session: {
        tenantId,
        ...(projectId && projectId !== 'all' ? { projectId } : {}),
        ...(context.realtorLinkId && { realtorLinkId: context.realtorLinkId }),
        ...(context.agencyId && { realtorLink: { agencyId: context.agencyId } })
      },
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
      ...(start || end
        ? {
            timestamp: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {})
            }
          }
        : {})
    };
  }

  private getLeadWhere(
    query: TrackingReportQueryDto,
    context: { realtorLinkId?: string; agencyId?: string } = {}
  ) {
    const { tenantId, projectId, startDate, endDate } = query;

    // Use Brasilia timezone boundaries (UTC-3) for consistent filtering
    const start = startDate ? new Date(`${startDate}T03:00:00.000Z`) : null;
    const end = endDate
      ? new Date(
          new Date(`${endDate}T03:00:00.000Z`).getTime() +
            24 * 60 * 60 * 1000 -
            1
        )
      : null;

    return {
      tenantId,
      ...(projectId && projectId !== 'all' ? { projectId } : {}),
      ...(context.realtorLinkId && { realtorLinkId: context.realtorLinkId }),
      ...(context.agencyId && { realtorLink: { agencyId: context.agencyId } }),
      ...(start || end
        ? {
            createdAt: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {})
            }
          }
        : {})
    };
  }

  private getVisitorWhere(
    query: TrackingReportQueryDto,
    context: { realtorLinkId?: string; agencyId?: string } = {}
  ) {
    const { tenantId, projectId, startDate, endDate } = query;

    const start = startDate ? new Date(`${startDate}T03:00:00.000Z`) : null;
    const end = endDate
      ? new Date(
          new Date(`${endDate}T03:00:00.000Z`).getTime() +
            24 * 60 * 60 * 1000 -
            1
        )
      : null;

    return {
      tenantId,
      ...(projectId && projectId !== 'all' ? { projectId } : {}),
      ...(context.realtorLinkId && { realtorLinkId: context.realtorLinkId }),
      ...(context.agencyId && { realtorLink: { agencyId: context.agencyId } }),
      ...(start || end
        ? {
            lastSeenAt: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {})
            }
          }
        : {})
    };
  }

  private getPagination(query: TrackingReportQueryDto) {
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 25), 1), 100);

    return {
      page,
      limit,
      skip: (page - 1) * limit
    };
  }

  private getSessionDurationSec(session: {
    firstSeenAt: Date;
    lastSeenAt: Date;
  }) {
    return Math.max(
      0,
      Math.round(
        (new Date(session.lastSeenAt).getTime() -
          new Date(session.firstSeenAt).getTime()) /
          1000
      )
    );
  }

  // Restore individual report methods for the controller
  async getMostAccessedLots(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereEvent = this.getEventWhere(query, context, 'PAGE_VIEW', 'LOT');
    const whereEventQrOnly = {
      ...whereEvent,
      session: {
        ...(whereEvent as any).session,
        utmSource: 'qr_code'
      }
    };

    const res = await this.prisma.trackingEvent.groupBy({
      by: ['label'],
      where: whereEventQrOnly,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    });
    return res.map((r) => ({ label: r.label, count: r._count.id }));
  }

  async getPageViews(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereEvent = this.getEventWhere(query, context, 'PAGE_VIEW');
    const raw = await this.prisma.trackingEvent.groupBy({
      by: ['path', 'label', 'category'],
      where: whereEvent,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 100
    });
    return await this.processTopPaths(raw, query.tenantId, query.projectId);
  }

  async getRealtorLinkClicks(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereEvent = this.getEventWhere(
      query,
      context,
      undefined,
      'REALTOR_LINK'
    );
    const res = await this.prisma.trackingEvent.groupBy({
      by: ['label'],
      where: whereEvent,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    return res.map((r) => ({ label: r.label, count: r._count.id }));
  }

  async getLeadSources(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereSession = this.getSessionWhere(query, context);
    const res = await this.prisma.trackingSession.groupBy({
      by: ['utmSource'],
      where: whereSession,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    return res.map((r) => ({ utmSource: r.utmSource, count: r._count.id }));
  }

  async getMetrics(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereVisitor = this.getVisitorWhere(query, context);
    const whereSession = this.getSessionWhere(query, context);
    const whereEvent = this.getEventWhere(query, context);
    const whereLead = this.getLeadWhere(query, context);

    const [
      totalVisitors,
      totalSessions,
      totalPageViews,
      totalLotClicks,
      totalRealtorClicks,
      totalLeads,
      topUtmSources,
      topUtmCampaigns,
      topLots,
      topRealtors,
      dailyStats,
      topProjects,
      topPathsRaw,
      // Engagement metrics - session durations
      sessionDurations,
      // Page views per session for bounce rate
      pageViewsPerSession,
      sessionsPerVisitor
    ] = await Promise.all([
      this.prisma.trackingVisitor.count({ where: whereVisitor }),
      this.prisma.trackingSession.count({ where: whereSession }),
      this.prisma.trackingEvent.count({
        where: { ...whereEvent, type: 'PAGE_VIEW' }
      }),
      this.prisma.trackingEvent.count({
        where: { ...whereEvent, type: 'CLICK', category: 'LOT' }
      }),
      // Realtor accesses should represent attributed sessions, not repeated referral events.
      this.prisma.trackingSession.count({
        where: { ...whereSession, realtorLinkId: { not: null } }
      }),
      this.prisma.lead.count({
        where: whereLead as any
      }),
      this.prisma.trackingSession.groupBy({
        by: ['utmSource'],
        where: whereSession,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      this.prisma.trackingSession.groupBy({
        by: ['utmCampaign'],
        where: whereSession,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      this.prisma.trackingEvent.groupBy({
        by: ['label'],
        where: { ...whereEvent, category: 'LOT' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 50
      }),
      this.prisma.trackingEvent.groupBy({
        by: ['label'],
        where: { ...whereEvent, category: 'REALTOR_LINK' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 30
      }),
      // Raw daily stats — use lastSeenAt so returning visitors count on the day they were active
      this.prisma.trackingSession.findMany({
        where: whereSession,
        select: { lastSeenAt: true },
        orderBy: { lastSeenAt: 'asc' }
      }),
      // Project stats
      this.prisma.trackingSession.groupBy({
        by: ['projectId'],
        where: { ...whereSession, projectId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      // Page paths - Fetch more to allow in-memory cleaning transition
      this.prisma.trackingEvent.groupBy({
        by: ['path', 'label', 'category'],
        where: { ...whereEvent, type: 'PAGE_VIEW' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 500 // Large number to group query params in-memory
      }),
      // Session durations for engagement - get firstSeenAt and lastSeenAt
      this.prisma.trackingSession.findMany({
        where: whereSession,
        select: { id: true, firstSeenAt: true, lastSeenAt: true },
        take: 5000 // Limit for performance
      }),
      // Page views per session for bounce rate calculation
      this.prisma.trackingEvent.groupBy({
        by: ['sessionId'],
        where: { ...whereEvent, type: 'PAGE_VIEW' },
        _count: { id: true }
      }),
      this.prisma.trackingSession.groupBy({
        by: ['visitorId'],
        where: {
          ...whereSession,
          visitorId: { not: null }
        },
        _count: { id: true }
      })
    ]);

    const returningVisitors = sessionsPerVisitor.filter(
      (entry) => entry.visitorId && entry._count.id > 1
    ).length;

    // Grouping sessions per day (by lastSeenAt = day of last activity)
    const history: Record<string, { sessions: number; views: number }> = {};
    dailyStats.forEach((s) => {
      const day = s.lastSeenAt.toISOString().split('T')[0];
      if (!history[day]) history[day] = { sessions: 0, views: 0 };
      history[day].sessions++;
    });

    // Also get page view history to correlate
    const viewHistory = await this.prisma.trackingEvent.findMany({
      where: { ...whereEvent, type: 'PAGE_VIEW' },
      select: { timestamp: true }
    });
    viewHistory.forEach((v) => {
      const day = v.timestamp.toISOString().split('T')[0];
      if (!history[day]) history[day] = { sessions: 0, views: 0 };
      history[day].views++;
    });

    // Enrich UTM Campaigns with Campaign Names if available
    const utmCampaignValues = topUtmCampaigns
      .map((c) => c.utmCampaign)
      .filter(Boolean);
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        tenantId: whereSession.tenantId,
        utmCampaign: { in: utmCampaignValues as string[] }
      },
      select: { utmCampaign: true, name: true }
    });

    const projectIds = topProjects.map((p) => p.projectId).filter(Boolean);
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds as string[] } },
      select: { id: true, name: true }
    });

    // Pre-fetch MapElements by both ID and code for better performance
    const potentialIds = new Set<string>();
    const potentialCodes = new Set<string>();
    for (const l of topLots) {
      if (!l.label) continue;
      const cleanLabel = l.label
        .replace(/^(Lote\s+|lote-|Lote:\s+)/i, '')
        .trim();
      if (l.label.length > 20) {
        potentialIds.add(l.label);
      } else if (cleanLabel) {
        potentialCodes.add(cleanLabel);
      }
    }

    type LotElement = {
      id: string;
      name: string | null;
      code: string | null;
      project: { name: string } | null;
      lotDetails: { block: string | null; lotNumber: string | null } | null;
    };

    const [elementsById, elementsByCode]: [LotElement[], LotElement[]] =
      await Promise.all([
        potentialIds.size > 0
          ? this.prisma.mapElement.findMany({
              where: { id: { in: Array.from(potentialIds) } },
              select: {
                id: true,
                name: true,
                code: true,
                project: { select: { name: true } },
                lotDetails: { select: { block: true, lotNumber: true } }
              }
            })
          : Promise.resolve([] as LotElement[]),
        potentialCodes.size > 0
          ? this.prisma.mapElement.findMany({
              where: {
                tenantId: whereSession.tenantId as string,
                ...(whereSession.projectId && {
                  projectId: whereSession.projectId
                }),
                code: { in: Array.from(potentialCodes) }
              },
              select: {
                id: true,
                name: true,
                code: true,
                project: { select: { name: true } },
                lotDetails: { select: { block: true, lotNumber: true } }
              }
            })
          : Promise.resolve([] as LotElement[])
      ]);

    const elementMapById = new Map(elementsById.map((e) => [e.id, e]));
    const elementMapByCode = new Map(elementsByCode.map((e) => [e.code, e]));

    const lotGroups = new Map<string, number>();
    for (const l of topLots) {
      const rawLabel = l.label || 'Desconhecido';
      const cleanLabel = rawLabel
        .replace(/^(Lote\s+|lote-|Lote:\s+)/i, '')
        .trim();
      const isId = rawLabel.length > 20;

      // Try to find element by ID or code
      const element = isId
        ? elementMapById.get(rawLabel)
        : elementMapByCode.get(cleanLabel);

      let projectName = element?.project?.name || '';
      let finalLotName = cleanLabel;

      if (element) {
        const block = element.lotDetails?.block || '';
        const lotCode =
          element.lotDetails?.lotNumber ||
          element.code ||
          element.name ||
          cleanLabel;
        finalLotName = block ? `${block} ${lotCode}` : lotCode;
      }

      // Fallback: get project name from session if not found in element
      if (!projectName) {
        const sampleEvent = await this.prisma.trackingEvent.findFirst({
          where: { ...whereEvent, category: 'LOT', label: l.label },
          select: {
            session: { select: { project: { select: { name: true } } } }
          }
        });
        projectName = sampleEvent?.session?.project?.name || '';
      }

      const label = projectName
        ? `${projectName} - ${finalLotName}`
        : finalLotName;
      const count = lotGroups.get(label) || 0;
      lotGroups.set(label, count + l._count.id);
    }

    const topLotsProcessed = Array.from(lotGroups.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Calculate engagement metrics (cap at 1 hour to avoid outliers from idle sessions)
    const validSessionDurations = sessionDurations
      .map((s) => {
        if (!s.firstSeenAt || !s.lastSeenAt) return 0;
        const duration =
          new Date(s.lastSeenAt).getTime() - new Date(s.firstSeenAt).getTime();
        return duration > 0 && duration < 3600000 ? duration : 0; // Cap at 1 hour
      })
      .filter((d) => d > 0);
    const avgSessionDurationSec =
      validSessionDurations.length > 0
        ? Math.round(
            validSessionDurations.reduce((a, b) => a + b, 0) /
              validSessionDurations.length /
              1000
          )
        : 0;

    // Bounce rate: sessions with only 1 page view
    const sessionsWithOnePageView = pageViewsPerSession.filter(
      (p) => p._count.id === 1
    ).length;
    const totalSessionsWithPageViews = pageViewsPerSession.length;
    const bounceRate =
      totalSessionsWithPageViews > 0
        ? parseFloat(
            (
              (sessionsWithOnePageView / totalSessionsWithPageViews) *
              100
            ).toFixed(1)
          )
        : 0;

    // Pages per session
    const totalPageViewsForAvg = pageViewsPerSession.reduce(
      (a, b) => a + b._count.id,
      0
    );
    const avgPagesPerSession =
      totalSessionsWithPageViews > 0
        ? parseFloat(
            (totalPageViewsForAvg / totalSessionsWithPageViews).toFixed(1)
          )
        : 0;

    return {
      summary: {
        totalVisitors,
        returningVisitors,
        totalSessions,
        totalPageViews,
        totalLotClicks,
        totalRealtorClicks,
        totalLeads,
        avgVisitsPerVisitor:
          totalVisitors > 0
            ? parseFloat((totalSessions / totalVisitors).toFixed(1))
            : 0
      },
      history: Object.keys(history)
        .sort()
        .map((date) => ({
          date,
          sessions: history[date].sessions,
          views: history[date].views
        })),
      topUtmSources: topUtmSources.map((s) => ({
        label: s.utmSource || '(Direto)',
        count: s._count.id
      })),
      topUtmCampaigns: topUtmCampaigns.map((item) => {
        const camp = campaigns.find((c) => c.utmCampaign === item.utmCampaign);
        return {
          label: camp ? camp.name : item.utmCampaign || '(Nenhuma)',
          utm: item.utmCampaign,
          count: item._count.id
        };
      }),
      topLots: topLotsProcessed,
      topRealtors: await Promise.all(
        topRealtors.map(async (r) => {
          let label = r.label || 'Desconhecido';
          if (label.startsWith('Corretor Link: ')) {
            const code = label.replace('Corretor Link: ', '');
            const rl = await this.prisma.realtorLink.findFirst({
              where: {
                tenantId: whereSession.tenantId as string,
                code,
                enabled: true
              },
              select: { name: true }
            });
            if (rl) {
              label = `${rl.name} (${code})`;
            }
          }
          return {
            label,
            count: r._count.id
          };
        })
      ),
      topProjects: topProjects.map((p) => {
        const proj = projects.find((pr) => pr.id === p.projectId);
        return {
          label: proj ? proj.name : 'Outro',
          count: p._count.id
        };
      }),
      topPaths: await this.processTopPaths(
        topPathsRaw,
        query.tenantId,
        query.projectId
      ),
      engagement: {
        avgSessionDurationSec,
        bounceRate,
        avgPagesPerSession
      }
    };
  }

  // ─── LOT METRICS ──────────────────────────────────────────────
  async getLotMetrics(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereEvent = this.getEventWhere(query, context, undefined, 'LOT');
    const whereSession = this.getSessionWhere(query, context);

    const [lotViews, lotLeadGroups, totalReservations] = await Promise.all([
      this.prisma.trackingEvent.groupBy({
        by: ['label'],
        where: whereEvent,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 50
      }),
      this.prisma.lead.groupBy({
        by: ['mapElementId'],
        where: {
          tenantId: whereSession.tenantId as string,
          ...(whereSession.projectId && { projectId: whereSession.projectId }),
          mapElementId: { not: null },
          ...(context.realtorLinkId && {
            realtorLinkId: context.realtorLinkId
          }),
          ...(context.agencyId && {
            realtorLink: { agencyId: context.agencyId }
          })
        } as any,
        _count: { id: true }
      }),
      this.prisma.lead.count({
        where: {
          tenantId: whereSession.tenantId as string,
          ...(whereSession.projectId && { projectId: whereSession.projectId }),
          mapElementId: { not: null },
          status: { in: [LeadStatus.RESERVATION, LeadStatus.WON] },
          ...(context.realtorLinkId && {
            realtorLinkId: context.realtorLinkId
          }),
          ...(context.agencyId && {
            realtorLink: { agencyId: context.agencyId }
          })
        } as any
      })
    ]);

    // Build lead map: mapElementId -> count
    const leadMap = new Map<string, number>();
    for (const lg of lotLeadGroups) {
      if (lg.mapElementId) {
        const existing = leadMap.get(lg.mapElementId) || 0;
        leadMap.set(lg.mapElementId, existing + lg._count.id);
      }
    }

    // Count reservations per lot
    const reservationsByLot = await this.prisma.lead.groupBy({
      by: ['mapElementId'],
      where: {
        tenantId: whereSession.tenantId as string,
        ...(whereSession.projectId && { projectId: whereSession.projectId }),
        mapElementId: { not: null },
        status: { in: [LeadStatus.RESERVATION, LeadStatus.WON] },
        ...(context.realtorLinkId && { realtorLinkId: context.realtorLinkId }),
        ...(context.agencyId && { realtorLink: { agencyId: context.agencyId } })
      } as any,
      _count: { id: true }
    });
    const reservationMap = new Map<string, number>();
    for (const r of reservationsByLot) {
      if (r.mapElementId) reservationMap.set(r.mapElementId, r._count.id);
    }

    // Resolve lot labels to MapElement details
    // First, collect potential IDs (CUIDs) and codes (short labels like "L-01")
    const potentialIds = new Set<string>();
    const potentialCodes = new Set<string>();
    for (const l of lotViews) {
      if (!l.label) continue;
      const cleanLabel = l.label
        .replace(/^(Lote\s+|lote-|Lote:\s+)/i, '')
        .trim();
      if (l.label.length > 20) {
        potentialIds.add(l.label);
      } else if (cleanLabel) {
        potentialCodes.add(cleanLabel);
      }
    }
    for (const id of leadMap.keys()) potentialIds.add(id);

    // Query elements by ID
    const elementsById =
      potentialIds.size > 0
        ? await this.prisma.mapElement.findMany({
            where: { id: { in: Array.from(potentialIds) } },
            select: {
              id: true,
              code: true,
              name: true,
              lotDetails: {
                select: { status: true, block: true, lotNumber: true }
              },
              project: { select: { name: true } }
            }
          })
        : [];

    // Query elements by code (scoped to tenant/project)
    const elementsByCode =
      potentialCodes.size > 0
        ? await this.prisma.mapElement.findMany({
            where: {
              tenantId: whereSession.tenantId as string,
              ...(whereSession.projectId && {
                projectId: whereSession.projectId
              }),
              code: { in: Array.from(potentialCodes) }
            },
            select: {
              id: true,
              code: true,
              name: true,
              lotDetails: {
                select: { status: true, block: true, lotNumber: true }
              },
              project: { select: { name: true } }
            }
          })
        : [];

    // Build lookup maps
    const elementMap = new Map(elementsById.map((e) => [e.id, e]));
    const codeToElementMap = new Map(elementsByCode.map((e) => [e.code, e]));

    // Merge views with lot data
    const lotsMap = new Map<
      string,
      {
        code: string;
        name: string;
        project: string;
        views: number;
        leads: number;
        reservations: number;
        status: string;
      }
    >();

    for (const l of lotViews) {
      const rawLabel = l.label || '';
      const cleanLabel = rawLabel
        .replace(/^(Lote\s+|lote-|Lote:\s+)/i, '')
        .trim();
      const isId = rawLabel.length > 20;

      // Try to find element by ID first, then by code
      const el = isId
        ? elementMap.get(rawLabel)
        : codeToElementMap.get(cleanLabel);

      const block = el?.lotDetails?.block || '';
      const lotCode = el?.lotDetails?.lotNumber || el?.code || cleanLabel;
      const code = block ? `${block} ${lotCode}` : lotCode;
      const name = el?.name || code;
      const project = el?.project?.name || '';
      const status = el?.lotDetails?.status || '';

      // Use element ID as key if available, otherwise use cleaned label
      const key = el?.id || cleanLabel;
      const existing = lotsMap.get(key);

      lotsMap.set(key, {
        code,
        name,
        project,
        views: (existing?.views || 0) + l._count.id,
        leads: el?.id ? leadMap.get(el.id) || 0 : 0,
        reservations: el?.id ? reservationMap.get(el.id) || 0 : 0,
        status
      });
    }

    // Add lots that have leads but no views
    for (const [mapElementId, leadCount] of leadMap) {
      if (!lotsMap.has(mapElementId)) {
        const el = elementMap.get(mapElementId);
        if (el) {
          const block = el.lotDetails?.block || '';
          const lotCode = el.lotDetails?.lotNumber || el.code || '';
          const code = block ? `${block} ${lotCode}` : lotCode;
          lotsMap.set(mapElementId, {
            code,
            name: el.name || '',
            project: el.project?.name || '',
            views: 0,
            leads: leadCount,
            reservations: reservationMap.get(mapElementId) || 0,
            status: el.lotDetails?.status || ''
          });
        }
      }
    }

    const lots = Array.from(lotsMap.values()).sort((a, b) => b.views - a.views);

    return {
      summary: {
        totalViews: lotViews.reduce((a, b) => a + b._count.id, 0),
        totalLeads: Array.from(leadMap.values()).reduce((a, b) => a + b, 0),
        totalReservations
      },
      lots
    };
  }

  // ─── TREND METRICS ──────────────────────────────────────────
  async getTrendMetrics(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);

    // Calculate previous period
    const start = query.startDate
      ? new Date(`${query.startDate}T03:00:00.000Z`)
      : null;
    const end = query.endDate
      ? new Date(
          new Date(`${query.endDate}T03:00:00.000Z`).getTime() + 86400000 - 1
        )
      : null;

    let prevQuery: TrackingReportQueryDto | undefined;
    if (start && end) {
      const periodMs = end.getTime() - start.getTime();
      const prevEnd = new Date(start.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - periodMs);
      prevQuery = {
        ...query,
        startDate: prevStart.toISOString().split('T')[0],
        endDate: prevEnd.toISOString().split('T')[0]
      };
    }

    const currentWhere = this.getSessionWhere(query, context);
    const currentEventWhere = this.getEventWhere(
      query,
      context,
      undefined,
      'LOT'
    );

    const [
      currentSessions,
      currentLeads,
      currentLotViews,
      deviceBreakdown,
      eventTimestamps,
      pageViewEvents,
      sessionDurationsForTrend
    ] = await Promise.all([
      this.prisma.trackingSession.count({ where: currentWhere }),
      this.prisma.lead.count({
        where: {
          tenantId: currentWhere.tenantId as string,
          ...(currentWhere.projectId && { projectId: currentWhere.projectId }),
          ...(context.realtorLinkId && {
            realtorLinkId: context.realtorLinkId
          }),
          ...(context.agencyId && {
            realtorLink: { agencyId: context.agencyId }
          })
        } as any
      }),
      this.prisma.trackingEvent.groupBy({
        by: ['label'],
        where: currentEventWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20
      }),
      this.prisma.trackingSession.groupBy({
        by: ['deviceType'],
        where: currentWhere,
        _count: { id: true }
      }),
      this.prisma.trackingEvent.findMany({
        where: this.getEventWhere(query, context),
        select: { timestamp: true },
        take: 10000
      }),
      // Page view events for time-per-page calculation
      this.prisma.trackingEvent.findMany({
        where: { ...this.getEventWhere(query, context), type: 'PAGE_VIEW' },
        select: { sessionId: true, path: true, label: true, timestamp: true },
        orderBy: [{ sessionId: 'asc' }, { timestamp: 'asc' }],
        take: 10000
      }),
      // Session durations for detailed engagement
      this.prisma.trackingSession.findMany({
        where: currentWhere,
        select: { firstSeenAt: true, lastSeenAt: true },
        take: 3000
      })
    ]);

    // Previous period
    let prevSessions = 0;
    let prevLeads = 0;
    let prevLotViews: typeof currentLotViews = [];
    if (prevQuery) {
      const prevWhere = this.getSessionWhere(prevQuery, context);
      const prevEventWhere = this.getEventWhere(
        prevQuery,
        context,
        undefined,
        'LOT'
      );
      [prevSessions, prevLeads, prevLotViews] = await Promise.all([
        this.prisma.trackingSession.count({ where: prevWhere }),
        this.prisma.lead.count({
          where: {
            tenantId: prevWhere.tenantId as string,
            ...(prevWhere.projectId && { projectId: prevWhere.projectId }),
            ...(context.realtorLinkId && {
              realtorLinkId: context.realtorLinkId
            }),
            ...(context.agencyId && {
              realtorLink: { agencyId: context.agencyId }
            })
          } as any
        }),
        this.prisma.trackingEvent.groupBy({
          by: ['label'],
          where: prevEventWhere,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 20
        })
      ]);
    }

    // Growth calculations
    const sessionGrowth =
      prevSessions > 0
        ? parseFloat(
            (((currentSessions - prevSessions) / prevSessions) * 100).toFixed(1)
          )
        : null;
    const leadGrowth =
      prevLeads > 0
        ? parseFloat(
            (((currentLeads - prevLeads) / prevLeads) * 100).toFixed(1)
          )
        : null;

    // Lot trend calculations - resolve labels to friendly names with block info
    const potentialLotIds = new Set<string>();
    const potentialLotCodes = new Set<string>();
    for (const l of currentLotViews) {
      if (!l.label) continue;
      const cleanLabel = l.label
        .replace(/^(Lote\s+|lote-|Lote:\s+)/i, '')
        .trim();
      if (l.label.length > 20) {
        potentialLotIds.add(l.label);
      } else if (cleanLabel) {
        potentialLotCodes.add(cleanLabel);
      }
    }

    // Query by ID
    const lotElementsById =
      potentialLotIds.size > 0
        ? await this.prisma.mapElement.findMany({
            where: { id: { in: Array.from(potentialLotIds) } },
            select: {
              id: true,
              code: true,
              name: true,
              project: { select: { name: true } },
              lotDetails: { select: { block: true, lotNumber: true } }
            }
          })
        : [];

    // Query by code
    const lotElementsByCode =
      potentialLotCodes.size > 0
        ? await this.prisma.mapElement.findMany({
            where: {
              tenantId: currentWhere.tenantId as string,
              ...(currentWhere.projectId && {
                projectId: currentWhere.projectId
              }),
              code: { in: Array.from(potentialLotCodes) }
            },
            select: {
              id: true,
              code: true,
              name: true,
              project: { select: { name: true } },
              lotDetails: { select: { block: true, lotNumber: true } }
            }
          })
        : [];

    const lotElementMap = new Map(lotElementsById.map((e) => [e.id, e]));
    const lotCodeMap = new Map(lotElementsByCode.map((e) => [e.code, e]));

    const prevLotMap = new Map(prevLotViews.map((l) => [l.label, l._count.id]));
    const lotTrends = currentLotViews
      .map((l) => {
        const current = l._count.id;
        const previous = prevLotMap.get(l.label) || 0;
        const growth =
          previous > 0
            ? parseFloat((((current - previous) / previous) * 100).toFixed(1))
            : current > 0
              ? 100
              : 0;

        // Resolve label - try by ID first, then by code
        const rawLabel = l.label || 'Desconhecido';
        const cleanLabel = rawLabel
          .replace(/^(Lote\s+|lote-|Lote:\s+)/i, '')
          .trim();
        const isId = rawLabel.length > 20;

        const el = isId
          ? lotElementMap.get(rawLabel)
          : lotCodeMap.get(cleanLabel);

        let label = cleanLabel;
        if (el) {
          const block = el.lotDetails?.block;
          const lotCode =
            el.lotDetails?.lotNumber || el.code || el.name || cleanLabel;
          const lotName = block ? `${block} ${lotCode}` : lotCode;
          label = el.project?.name
            ? `${el.project.name} - ${lotName}`
            : lotName;
        }

        return { label, current, previous, growth };
      })
      .sort((a, b) => b.growth - a.growth);

    // Device breakdown
    const totalDevices = deviceBreakdown.reduce((a, b) => a + b._count.id, 0);
    const devices = deviceBreakdown.map((d) => ({
      type: d.deviceType || 'unknown',
      count: d._count.id,
      percentage:
        totalDevices > 0
          ? parseFloat(((d._count.id / totalDevices) * 100).toFixed(1))
          : 0
    }));

    // Peak hours
    const hourCounts = new Array(24).fill(0);
    for (const e of eventTimestamps) {
      const hour = new Date(e.timestamp).getUTCHours();
      // Adjust for Brasilia (UTC-3)
      const brHour = (hour - 3 + 24) % 24;
      hourCounts[brHour]++;
    }
    const peakHours = hourCounts.map((count, hour) => ({ hour, count }));

    // Engagement: Calculate time per page from consecutive PAGE_VIEW events
    const pageTimeMap = new Map<string, { totalTime: number; count: number }>();
    let currentSessionId = '';
    let lastEvent: { path: string; label: string; timestamp: Date } | null =
      null;

    for (const event of pageViewEvents) {
      if (event.sessionId !== currentSessionId) {
        currentSessionId = event.sessionId;
        lastEvent = {
          path: event.path || '',
          label: event.label || '',
          timestamp: event.timestamp
        };
        continue;
      }

      if (lastEvent) {
        const timeOnPage =
          new Date(event.timestamp).getTime() -
          new Date(lastEvent.timestamp).getTime();
        // Cap at 10 minutes (600000ms) to avoid outliers from idle sessions
        const validTime = Math.min(timeOnPage, 600000);
        if (validTime > 0 && validTime < 600000) {
          const pageKey = lastEvent.label || lastEvent.path || 'unknown';
          const existing = pageTimeMap.get(pageKey) || {
            totalTime: 0,
            count: 0
          };
          pageTimeMap.set(pageKey, {
            totalTime: existing.totalTime + validTime,
            count: existing.count + 1
          });
        }
      }
      lastEvent = {
        path: event.path || '',
        label: event.label || '',
        timestamp: event.timestamp
      };
    }

    // Top pages by engagement time - first resolve lot codes to friendly names
    const engagementCodes = new Set<string>();
    for (const [page] of pageTimeMap) {
      const clean = page.replace(/^(Lote\s+|lote-)/i, '').trim();
      if (clean && clean.length <= 20) {
        engagementCodes.add(clean);
      }
    }

    const engagementLotElements =
      engagementCodes.size > 0
        ? await this.prisma.mapElement.findMany({
            where: {
              tenantId: currentWhere.tenantId as string,
              ...(currentWhere.projectId && {
                projectId: currentWhere.projectId
              }),
              code: { in: Array.from(engagementCodes) }
            },
            select: {
              code: true,
              lotDetails: { select: { block: true, lotNumber: true } },
              project: { select: { name: true } }
            }
          })
        : [];
    const engagementCodeMap = new Map(
      engagementLotElements.map((e) => [e.code, e])
    );

    const topEngagementPages = Array.from(pageTimeMap.entries())
      .map(([page, data]) => {
        const cleanPage = page.replace(/^(Lote\s+|lote-)/i, '').trim();
        const el = engagementCodeMap.get(cleanPage);

        let path = cleanPage;
        if (el) {
          const block = el.lotDetails?.block || '';
          const lotCode = el.lotDetails?.lotNumber || cleanPage;
          path = block ? `${block} ${lotCode}` : lotCode;
          if (el.project?.name) {
            path = `${el.project.name} - ${path}`;
          }
        }

        return {
          path,
          avgTime: Math.round(data.totalTime / data.count / 1000),
          views: data.count
        };
      })
      .filter((p) => p.avgTime > 5 && p.avgTime < 600) // Filter out very short/long times
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    // Session duration stats for trend
    const validDurations = sessionDurationsForTrend
      .map((s) => {
        const duration =
          new Date(s.lastSeenAt).getTime() - new Date(s.firstSeenAt).getTime();
        return duration > 0 && duration < 3600000 ? duration : 0; // Cap at 1 hour
      })
      .filter((d) => d > 0);

    const avgSessionDurationSec =
      validDurations.length > 0
        ? Math.round(
            validDurations.reduce((a, b) => a + b, 0) /
              validDurations.length /
              1000
          )
        : 0;

    // Session duration distribution
    const durationBuckets = {
      '< 30s': 0,
      '30s - 2min': 0,
      '2 - 5min': 0,
      '5 - 15min': 0,
      '> 15min': 0
    };
    for (const d of validDurations) {
      const secs = d / 1000;
      if (secs < 30) durationBuckets['< 30s']++;
      else if (secs < 120) durationBuckets['30s - 2min']++;
      else if (secs < 300) durationBuckets['2 - 5min']++;
      else if (secs < 900) durationBuckets['5 - 15min']++;
      else durationBuckets['> 15min']++;
    }

    const totalDurationSessions = validDurations.length;
    const durationDistribution = Object.entries(durationBuckets).map(
      ([label, count]) => ({
        label,
        count,
        percentage:
          totalDurationSessions > 0
            ? parseFloat(((count / totalDurationSessions) * 100).toFixed(1))
            : 0
      })
    );

    return {
      summary: {
        currentSessions,
        prevSessions,
        sessionGrowth,
        currentLeads,
        prevLeads,
        leadGrowth
      },
      lotTrends,
      deviceBreakdown: devices,
      peakHours,
      engagement: {
        avgSessionDurationSec,
        topEngagementPages,
        durationDistribution
      }
    };
  }

  // ─── BROKER METRICS ─────────────────────────────────────────
  async getBrokerMetrics(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereSession = this.getSessionWhere(query, context);
    const whereLead = this.getLeadWhere(query, context);

    const realtorLinks = await this.prisma.realtorLink.findMany({
      where: {
        tenantId: query.tenantId!,
        enabled: true,
        ...(context.agencyId && { agencyId: context.agencyId }),
        ...(context.realtorLinkId && { id: context.realtorLinkId })
      },
      select: {
        id: true,
        name: true,
        code: true,
        photoUrl: true,
        userId: true,
        user: {
          select: {
            id: true,
            isActive: true
          }
        }
      }
    });

    const brokers = await Promise.all(
      realtorLinks.map(async (rl) => {
        const [sessions, leads] = await Promise.all([
          this.prisma.trackingSession.count({
            where: { ...whereSession, realtorLinkId: rl.id }
          }),
          this.prisma.lead.count({
            where: {
              ...whereLead,
              realtorLinkId: rl.id
            } as any
          })
        ]);

        let campaigns: Array<{
          id: string;
          name: string;
          utmCampaign: string | null;
          active: boolean;
        }> = [];
        if (rl.userId) {
          campaigns = await this.prisma.campaign.findMany({
            where: { tenantId: query.tenantId!, userId: rl.userId },
            select: { id: true, name: true, utmCampaign: true, active: true }
          });
        }

        // Get sessions/leads per campaign
        const campaignMetrics = await Promise.all(
          campaigns.map(async (c) => {
            const [campSessions, campLeads] = await Promise.all([
              c.utmCampaign
                ? this.prisma.trackingSession.count({
                    where: {
                      ...whereSession,
                      realtorLinkId: rl.id,
                      utmCampaign: c.utmCampaign
                    }
                  })
                : Promise.resolve(0),
              c.utmCampaign
                ? this.prisma.lead.count({
                    where: {
                      ...whereLead,
                      realtorLinkId: rl.id,
                      session: { utmCampaign: c.utmCampaign }
                    }
                  })
                : Promise.resolve(0)
            ]);
            return {
              id: c.id,
              name: c.name,
              active: c.active,
              sessions: campSessions,
              leads: campLeads
            };
          })
        );

        return {
          id: rl.id,
          name: rl.name,
          code: rl.code,
          photoUrl: rl.photoUrl,
          sessions,
          leads,
          conversionRate:
            sessions > 0
              ? parseFloat(((leads / sessions) * 100).toFixed(1))
              : 0,
          campaigns: campaignMetrics
        };
      })
    );

    brokers.sort((a, b) => b.leads - a.leads);

    const activeBrokers = realtorLinks.filter((rl) => rl.user?.isActive).length;

    const totalSessions = brokers.reduce((a, b) => a + b.sessions, 0);
    const totalLeads = brokers.reduce((a, b) => a + b.leads, 0);

    return {
      summary: {
        totalBrokers: activeBrokers,
        totalSessions,
        totalLeads,
        avgConversionRate:
          totalSessions > 0
            ? parseFloat(((totalLeads / totalSessions) * 100).toFixed(1))
            : 0
      },
      brokers
    };
  }

  async getAgencyMetrics(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereSession = this.getSessionWhere(query, context);
    const whereLead = this.getLeadWhere(query, context);

    const agencies = await this.prisma.agency.findMany({
      where: {
        tenantId: query.tenantId!,
        ...(context.agencyId && { id: context.agencyId })
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            realtorLinks: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const agenciesWithMetrics = await Promise.all(
      agencies.map(async (agency) => {
        const [sessions, leads, activeRealtors] = await Promise.all([
          this.prisma.trackingSession.count({
            where: {
              ...whereSession,
              realtorLink: { agencyId: agency.id }
            } as any
          }),
          this.prisma.lead.count({
            where: {
              ...whereLead,
              realtorLink: { agencyId: agency.id }
            } as any
          }),
          this.prisma.realtorLink.count({
            where: {
              tenantId: query.tenantId!,
              agencyId: agency.id,
              enabled: true
            }
          })
        ]);

        return {
          id: agency.id,
          name: agency.name,
          email: agency.email,
          sessions,
          leads,
          activeRealtors,
          conversionRate:
            sessions > 0
              ? parseFloat(((leads / sessions) * 100).toFixed(1))
              : 0
        };
      })
    );

    agenciesWithMetrics.sort((a, b) => b.leads - a.leads);

    const totalSessions = agenciesWithMetrics.reduce(
      (acc, agency) => acc + agency.sessions,
      0
    );
    const totalLeads = agenciesWithMetrics.reduce(
      (acc, agency) => acc + agency.leads,
      0
    );
    const totalRealtors = agenciesWithMetrics.reduce(
      (acc, agency) => acc + agency.activeRealtors,
      0
    );

    return {
      summary: {
        totalAgencies: agenciesWithMetrics.length,
        totalSessions,
        totalLeads,
        totalRealtors,
        avgConversionRate:
          totalSessions > 0
            ? parseFloat(((totalLeads / totalSessions) * 100).toFixed(1))
            : 0
      },
      agencies: agenciesWithMetrics
    };
  }

  // ─── ENTERPRISE METRICS ─────────────────────────────────────
  async getEnterpriseMetrics(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    // Override projectId to get all projects
    const allProjectQuery = { ...query, projectId: undefined };
    const whereSession = this.getSessionWhere(allProjectQuery, context);

    const [projectSessions, projectLeads] = await Promise.all([
      this.prisma.trackingSession.groupBy({
        by: ['projectId'],
        where: { ...whereSession, projectId: { not: null } } as any,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      this.prisma.lead.groupBy({
        by: ['projectId'],
        where: {
          tenantId: query.tenantId!,
          ...(context.realtorLinkId && {
            realtorLinkId: context.realtorLinkId
          }),
          ...(context.agencyId && {
            realtorLink: { agencyId: context.agencyId }
          })
        } as any,
        _count: { id: true }
      })
    ]);

    const projectIds = projectSessions
      .map((p) => p.projectId)
      .filter(Boolean) as string[];
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true, slug: true, status: true }
    });

    const leadMap = new Map(
      projectLeads.map((pl) => [pl.projectId, pl._count.id])
    );

    const enriched = await Promise.all(
      projectSessions.map(async (ps) => {
        const proj = projects.find((p) => p.id === ps.projectId);
        const leads = leadMap.get(ps.projectId!) || 0;

        const lotEvents = await this.prisma.trackingEvent.groupBy({
          by: ['label'],
          where: {
            category: 'LOT',
            session: { tenantId: query.tenantId!, projectId: ps.projectId }
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        });

        return {
          projectId: ps.projectId,
          name: proj?.name || 'Desconhecido',
          slug: proj?.slug,
          status: proj?.status,
          sessions: ps._count.id,
          leads,
          conversionRate:
            ps._count.id > 0
              ? parseFloat(((leads / ps._count.id) * 100).toFixed(1))
              : 0,
          topLots: lotEvents.map((l) => ({
            label: l.label || 'Desconhecido',
            count: l._count.id
          }))
        };
      })
    );

    enriched.sort((a, b) => b.sessions - a.sessions);

    return {
      summary: {
        totalProjects: enriched.length,
        totalSessions: enriched.reduce((a, b) => a + b.sessions, 0),
        totalLeads: enriched.reduce((a, b) => a + b.leads, 0)
      },
      projects: enriched
    };
  }

  // ─── TRAFFIC METRICS ────────────────────────────────────────
  async getTrafficMetrics(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereSession = this.getSessionWhere(query, context);

    const [sourceBreakdown, campaignBreakdown, mediumBreakdown, allCampaigns] =
      await Promise.all([
        this.prisma.trackingSession.groupBy({
          by: ['utmSource'],
          where: whereSession,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } }
        }),
        this.prisma.trackingSession.groupBy({
          by: ['utmCampaign'],
          where: whereSession,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } }
        }),
        this.prisma.trackingSession.groupBy({
          by: ['utmMedium'],
          where: whereSession,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } }
        }),
        this.prisma.campaign.findMany({
          where: {
            tenantId: query.tenantId!,
            ...(whereSession.projectId && { projectId: whereSession.projectId })
          },
          include: {
            investments: true,
            project: { select: { name: true } }
          }
        })
      ]);

    // Sources with lead counts
    const sources = await Promise.all(
      sourceBreakdown.map(async (s) => {
        const leads = await this.prisma.lead.count({
          where: {
            tenantId: query.tenantId!,
            session: { utmSource: s.utmSource },
            ...(whereSession.projectId && {
              projectId: whereSession.projectId
            }),
            ...(context.realtorLinkId && {
              realtorLinkId: context.realtorLinkId
            }),
            ...(context.agencyId && {
              realtorLink: { agencyId: context.agencyId }
            })
          } as any
        });
        return {
          source: s.utmSource || '(Direto)',
          sessions: s._count.id,
          leads,
          conversionRate:
            s._count.id > 0
              ? parseFloat(((leads / s._count.id) * 100).toFixed(1))
              : 0
        };
      })
    );

    // Campaigns with enriched data
    const campaigns = await Promise.all(
      campaignBreakdown
        .filter((c) => c.utmCampaign && c.utmCampaign !== '(Nenhuma)')
        .map(async (c) => {
          const matched = allCampaigns.find(
            (camp) => camp.utmCampaign === c.utmCampaign
          );
          const totalSpent =
            matched?.investments.reduce((a, i) => a + Number(i.amount), 0) || 0;

          const leads = await this.prisma.lead.count({
            where: {
              tenantId: query.tenantId!,
              session: { utmCampaign: c.utmCampaign },
              ...(whereSession.projectId && {
                projectId: whereSession.projectId
              }),
              ...(context.realtorLinkId && {
                realtorLinkId: context.realtorLinkId
              }),
              ...(context.agencyId && {
                realtorLink: { agencyId: context.agencyId }
              })
            } as any
          });

          return {
            utmCampaign: c.utmCampaign,
            name: matched?.name || c.utmCampaign,
            projectName: matched?.project?.name,
            sessions: c._count.id,
            leads,
            totalSpent,
            costPerLead:
              leads > 0 ? parseFloat((totalSpent / leads).toFixed(2)) : 0,
            conversionRate:
              c._count.id > 0
                ? parseFloat(((leads / c._count.id) * 100).toFixed(1))
                : 0,
            budget: matched?.budget ? Number(matched.budget) : null,
            active: matched?.active ?? null
          };
        })
    );

    const totalSessionsAll = sources.reduce((a, b) => a + b.sessions, 0);
    const totalLeadsAll = sources.reduce((a, b) => a + b.leads, 0);

    return {
      summary: {
        totalSessions: totalSessionsAll,
        totalLeads: totalLeadsAll,
        uniqueSources: sources.length,
        activeCampaigns: campaigns.filter((c) => c.active).length
      },
      sources,
      campaigns,
      mediums: mediumBreakdown.map((m) => ({
        medium: m.utmMedium || '(none)',
        count: m._count.id
      }))
    };
  }

  async getAudienceMetrics(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereVisitor = this.getVisitorWhere(query, context);
    const whereSession = this.getSessionWhere(query, context);

    const [
      totalVisitors,
      totalSessions,
      totalLeads,
      sessionsPerVisitor,
      deviceBreakdown,
      sourceBreakdown,
      landingBreakdown,
      recentVisitors
    ] = await Promise.all([
      this.prisma.trackingVisitor.count({ where: whereVisitor }),
      this.prisma.trackingSession.count({ where: whereSession }),
      this.prisma.lead.count({ where: this.getLeadWhere(query, context) }),
      this.prisma.trackingSession.groupBy({
        by: ['visitorId'],
        where: {
          ...whereSession,
          visitorId: { not: null }
        },
        _count: { id: true }
      }),
      this.prisma.trackingVisitor.groupBy({
        by: ['deviceType'],
        where: whereVisitor,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      this.prisma.trackingVisitor.groupBy({
        by: ['utmSource'],
        where: whereVisitor,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 8
      }),
      this.prisma.trackingVisitor.groupBy({
        by: ['landingPage'],
        where: {
          ...whereVisitor,
          landingPage: { not: null }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 8
      }),
      this.prisma.trackingVisitor.findMany({
        where: whereVisitor,
        orderBy: { lastSeenAt: 'desc' },
        take: 5,
        include: {
          project: { select: { id: true, name: true } },
          realtorLink: { select: { id: true, name: true, code: true } },
          _count: { select: { sessions: true, leads: true } }
        }
      })
    ]);

    const returningVisitors = sessionsPerVisitor.filter(
      (entry) => entry.visitorId && entry._count.id > 1
    ).length;

    return {
      summary: {
        totalVisitors,
        returningVisitors,
        totalSessions,
        totalLeads,
        avgVisitsPerVisitor:
          totalVisitors > 0
            ? parseFloat((totalSessions / totalVisitors).toFixed(1))
            : 0,
        leadRate:
          totalVisitors > 0
            ? parseFloat(((totalLeads / totalVisitors) * 100).toFixed(1))
            : 0
      },
      devices: deviceBreakdown.map((entry) => ({
        label: entry.deviceType || 'desconhecido',
        count: entry._count.id
      })),
      sources: sourceBreakdown.map((entry) => ({
        label: entry.utmSource || '(Direto)',
        count: entry._count.id
      })),
      landingPages: landingBreakdown.map((entry) => ({
        label: entry.landingPage || '/',
        count: entry._count.id
      })),
      recentVisitors: recentVisitors.map((visitor) => ({
        id: visitor.id,
        firstSeenAt: visitor.firstSeenAt,
        lastSeenAt: visitor.lastSeenAt,
        landingPage: visitor.landingPage,
        deviceType: visitor.deviceType,
        utmSource: visitor.utmSource,
        projectName: visitor.project?.name || null,
        realtorName: visitor.realtorLink?.name || null,
        sessions: visitor._count.sessions,
        leads: visitor._count.leads
      }))
    };
  }

  async getSessionsReport(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereSession = this.getSessionWhere(query, context);
    const { page, limit, skip } = this.getPagination(query);

    const [total, sessions] = await Promise.all([
      this.prisma.trackingSession.count({ where: whereSession }),
      this.prisma.trackingSession.findMany({
        where: whereSession,
        orderBy: { lastSeenAt: 'desc' },
        skip,
        take: limit,
        include: {
          project: { select: { id: true, name: true } },
          realtorLink: { select: { id: true, name: true, code: true } },
          visitor: {
            select: {
              id: true,
              firstSeenAt: true,
              lastSeenAt: true
            }
          },
          _count: { select: { events: true, leads: true } }
        }
      })
    ]);

    const sessionIds = sessions.map((session) => session.id);
    const visitorIds = Array.from(
      new Set(
        sessions
          .map((session) => session.visitorId)
          .filter((value): value is string => Boolean(value))
      )
    );

    const [pageViewCounts, lotInteractionCounts, visitorSessionCounts] =
      await Promise.all([
        sessionIds.length
          ? this.prisma.trackingEvent.groupBy({
              by: ['sessionId'],
              where: { sessionId: { in: sessionIds }, type: 'PAGE_VIEW' },
              _count: { id: true }
            })
          : Promise.resolve([]),
        sessionIds.length
          ? this.prisma.trackingEvent.groupBy({
              by: ['sessionId'],
              where: { sessionId: { in: sessionIds }, category: 'LOT' },
              _count: { id: true }
            })
          : Promise.resolve([]),
        visitorIds.length
          ? this.prisma.trackingSession.groupBy({
              by: ['visitorId'],
              where: { visitorId: { in: visitorIds } },
              _count: { id: true }
            })
          : Promise.resolve([])
      ]);

    const typedPageViewCounts = pageViewCounts as Array<{
      sessionId: string;
      _count: { id: number };
    }>;
    const typedLotInteractionCounts = lotInteractionCounts as Array<{
      sessionId: string;
      _count: { id: number };
    }>;
    const typedVisitorSessionCounts = visitorSessionCounts as Array<{
      visitorId: string | null;
      _count: { id: number };
    }>;

    const pageViewMap = new Map<string, number>(
      typedPageViewCounts.map(
        (entry): [string, number] => [entry.sessionId, entry._count.id]
      )
    );
    const lotInteractionMap = new Map<string, number>(
      typedLotInteractionCounts.map(
        (entry): [string, number] => [entry.sessionId, entry._count.id]
      )
    );
    const visitorSessionMap = new Map<string, number>(
      typedVisitorSessionCounts
        .filter((entry) => entry.visitorId)
        .map((entry): [string, number] => [entry.visitorId as string, entry._count.id])
    );

    return {
      summary: {
        totalSessions: total,
        page,
        limit
      },
      items: sessions.map((session) => {
        const pageViews = pageViewMap.get(session.id) || 0;
        const visitorSessions = session.visitorId
          ? visitorSessionMap.get(session.visitorId) || 0
          : 0;

        return {
          id: session.id,
          visitorId: session.visitorId,
          firstSeenAt: session.firstSeenAt,
          lastSeenAt: session.lastSeenAt,
          durationSec: this.getSessionDurationSec(session),
          pageViews,
          lotInteractions: lotInteractionMap.get(session.id) || 0,
          totalEvents: session._count.events,
          totalLeads: session._count.leads,
          isBounce: pageViews <= 1,
          landingPage: session.landingPage,
          deviceType: session.deviceType,
          utmSource: session.utmSource,
          utmCampaign: session.utmCampaign,
          projectName: session.project?.name || null,
          realtorName: session.realtorLink?.name || null,
          realtorCode: session.realtorLink?.code || null,
          visitorSessions,
          visitorFirstSeenAt: session.visitor?.firstSeenAt || null
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0
      }
    };
  }

  async getSessionDetail(
    sessionId: string,
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereSession = this.getSessionWhere(query, context);

    const session = await this.prisma.trackingSession.findFirst({
      where: {
        ...whereSession,
        id: sessionId
      },
      include: {
        project: { select: { id: true, name: true } },
        realtorLink: { select: { id: true, name: true, code: true } },
        visitor: {
          select: {
            id: true,
            firstSeenAt: true,
            lastSeenAt: true,
            landingPage: true,
            utmSource: true,
            utmCampaign: true,
            deviceType: true,
            _count: { select: { sessions: true, leads: true } }
          }
        },
        leads: {
          orderBy: { createdAt: 'desc' },
          take: 25,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
            mapElementId: true
          }
        },
        _count: { select: { events: true, leads: true } }
      }
    });

    if (!session) {
      throw new BadRequestException('Sessao nao encontrada');
    }

    const [events, pageViews, lotInteractions] = await Promise.all([
      this.prisma.trackingEvent.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
        take: 200
      }),
      this.prisma.trackingEvent.count({
        where: { sessionId, type: 'PAGE_VIEW' }
      }),
      this.prisma.trackingEvent.groupBy({
        by: ['label'],
        where: { sessionId, category: 'LOT' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20
      })
    ]);

    return {
      summary: {
        id: session.id,
        visitorId: session.visitorId,
        firstSeenAt: session.firstSeenAt,
        lastSeenAt: session.lastSeenAt,
        durationSec: this.getSessionDurationSec(session),
        pageViews,
        totalEvents: session._count.events,
        totalLeads: session._count.leads,
        landingPage: session.landingPage,
        deviceType: session.deviceType,
        utmSource: session.utmSource,
        utmCampaign: session.utmCampaign,
        projectName: session.project?.name || null,
        realtorName: session.realtorLink?.name || null,
        realtorCode: session.realtorLink?.code || null,
        visitorSessions: session.visitor?._count.sessions || 0,
        visitorLeads: session.visitor?._count.leads || 0
      },
      lots: lotInteractions.map((entry) => ({
        label: entry.label || 'Lote sem identificacao',
        count: entry._count.id
      })),
      leads: session.leads,
      events: events.map((event) => ({
        id: event.id,
        timestamp: event.timestamp,
        type: event.type,
        category: event.category,
        action: event.action,
        label: event.label,
        path: event.path,
        metadata: event.metadata
      })),
      visitor: session.visitor
        ? {
            id: session.visitor.id,
            firstSeenAt: session.visitor.firstSeenAt,
            lastSeenAt: session.visitor.lastSeenAt,
            landingPage: session.visitor.landingPage,
            deviceType: session.visitor.deviceType,
            utmSource: session.visitor.utmSource,
            utmCampaign: session.visitor.utmCampaign
          }
        : null
    };
  }

  async getVisitorsReport(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereVisitor = this.getVisitorWhere(query, context);
    const whereSession = this.getSessionWhere(query, context);
    const { page, limit, skip } = this.getPagination(query);

    const [total, visitors] = await Promise.all([
      this.prisma.trackingVisitor.count({ where: whereVisitor }),
      this.prisma.trackingVisitor.findMany({
        where: whereVisitor,
        orderBy: { lastSeenAt: 'desc' },
        skip,
        take: limit,
        include: {
          project: { select: { id: true, name: true } },
          realtorLink: { select: { id: true, name: true, code: true } },
          sessions: {
            orderBy: { lastSeenAt: 'desc' },
            take: 1,
            select: { id: true, lastSeenAt: true, landingPage: true }
          },
          _count: { select: { sessions: true, leads: true } }
        }
      })
    ]);

    const visitorIds = visitors.map((visitor) => visitor.id);

    const [pageViewCounts, lotInteractionCounts] = await Promise.all([
      visitorIds.length
        ? this.prisma.trackingEvent.groupBy({
            by: ['sessionId'],
            where: {
              type: 'PAGE_VIEW',
              session: { visitorId: { in: visitorIds } }
            },
            _count: { id: true }
          })
        : Promise.resolve([]),
      visitorIds.length
        ? this.prisma.trackingEvent.groupBy({
            by: ['sessionId'],
            where: {
              category: 'LOT',
              session: { visitorId: { in: visitorIds } }
            },
            _count: { id: true }
          })
        : Promise.resolve([])
    ]);

    const typedPageViewCounts = pageViewCounts as Array<{
      sessionId: string;
      _count: { id: number };
    }>;
    const typedLotInteractionCounts = lotInteractionCounts as Array<{
      sessionId: string;
      _count: { id: number };
    }>;

    const latestSessionByVisitor = new Map<
      string,
      { id: string; lastSeenAt: Date; landingPage: string | null }
    >();
    for (const visitor of visitors) {
      const latestSession = visitor.sessions[0];
      if (latestSession) {
        latestSessionByVisitor.set(visitor.id, latestSession);
      }
    }

    const sessionIdsByVisitor = new Map<string, string[]>();
    for (const visitor of visitors) {
      sessionIdsByVisitor.set(visitor.id, []);
    }

    const visitorSessions = visitorIds.length
      ? await this.prisma.trackingSession.findMany({
          where: {
            ...whereSession,
            visitorId: { in: visitorIds }
          },
          select: { id: true, visitorId: true }
        })
      : [];

    for (const session of visitorSessions) {
      if (!session.visitorId) continue;
      const existing = sessionIdsByVisitor.get(session.visitorId) || [];
      existing.push(session.id);
      sessionIdsByVisitor.set(session.visitorId, existing);
    }

    const pageViewBySession = new Map<string, number>(
      typedPageViewCounts.map(
        (entry): [string, number] => [entry.sessionId, entry._count.id]
      )
    );
    const lotBySession = new Map<string, number>(
      typedLotInteractionCounts.map(
        (entry): [string, number] => [entry.sessionId, entry._count.id]
      )
    );

    return {
      summary: {
        totalVisitors: total,
        page,
        limit
      },
      items: visitors.map((visitor) => {
        const visitorSessionIds = sessionIdsByVisitor.get(visitor.id) || [];
        const pageViews = visitorSessionIds.reduce(
          (sum, currentId) => sum + (pageViewBySession.get(currentId) || 0),
          0
        );
        const lotInteractions = visitorSessionIds.reduce(
          (sum, currentId) => sum + (lotBySession.get(currentId) || 0),
          0
        );
        const latestSession = latestSessionByVisitor.get(visitor.id);

        return {
          id: visitor.id,
          firstSeenAt: visitor.firstSeenAt,
          lastSeenAt: visitor.lastSeenAt,
          landingPage: visitor.landingPage,
          deviceType: visitor.deviceType,
          utmSource: visitor.utmSource,
          utmCampaign: visitor.utmCampaign,
          projectName: visitor.project?.name || null,
          realtorName: visitor.realtorLink?.name || null,
          realtorCode: visitor.realtorLink?.code || null,
          sessions: visitor._count.sessions,
          leads: visitor._count.leads,
          pageViews,
          lotInteractions,
          lastSessionId: latestSession?.id || null,
          lastSessionAt: latestSession?.lastSeenAt || null
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0
      }
    };
  }

  async getVisitorDetail(
    visitorId: string,
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereVisitor = this.getVisitorWhere(query, context);
    const whereSession = this.getSessionWhere(query, context);

    const visitor = await this.prisma.trackingVisitor.findFirst({
      where: {
        ...whereVisitor,
        id: visitorId
      },
      include: {
        project: { select: { id: true, name: true } },
        realtorLink: { select: { id: true, name: true, code: true } },
        leads: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
            mapElementId: true,
            sessionId: true
          }
        },
        _count: { select: { sessions: true, leads: true } }
      }
    });

    if (!visitor) {
      throw new BadRequestException('Visitante nao encontrado');
    }

    const sessions = await this.prisma.trackingSession.findMany({
      where: {
        ...whereSession,
        visitorId
      },
      orderBy: { lastSeenAt: 'desc' },
      take: 25,
      include: {
        project: { select: { id: true, name: true } },
        realtorLink: { select: { id: true, name: true, code: true } },
        _count: { select: { events: true, leads: true } }
      }
    });

    const sessionIds = sessions.map((session) => session.id);

    const [events, pageViews, lotInteractions] = await Promise.all([
      this.prisma.trackingEvent.findMany({
        where: { sessionId: { in: sessionIds } },
        orderBy: { timestamp: 'desc' },
        take: 200
      }),
      sessionIds.length
        ? this.prisma.trackingEvent.groupBy({
            by: ['sessionId'],
            where: { sessionId: { in: sessionIds }, type: 'PAGE_VIEW' },
            _count: { id: true }
          })
        : Promise.resolve([]),
      sessionIds.length
        ? this.prisma.trackingEvent.groupBy({
            by: ['label'],
            where: {
              sessionId: { in: sessionIds },
              category: 'LOT'
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 20
          })
        : Promise.resolve([])
    ]);

    const typedPageViews = pageViews as Array<{
      sessionId: string;
      _count: { id: number };
    }>;

    const pageViewMap = new Map<string, number>(
      typedPageViews.map(
        (entry): [string, number] => [entry.sessionId, entry._count.id]
      )
    );

    return {
      summary: {
        id: visitor.id,
        firstSeenAt: visitor.firstSeenAt,
        lastSeenAt: visitor.lastSeenAt,
        landingPage: visitor.landingPage,
        deviceType: visitor.deviceType,
        utmSource: visitor.utmSource,
        utmCampaign: visitor.utmCampaign,
        referrer: visitor.referrer,
        projectName: visitor.project?.name || null,
        realtorName: visitor.realtorLink?.name || null,
        realtorCode: visitor.realtorLink?.code || null,
        totalSessions: visitor._count.sessions,
        totalLeads: visitor._count.leads
      },
      sessions: sessions.map((session) => ({
        id: session.id,
        firstSeenAt: session.firstSeenAt,
        lastSeenAt: session.lastSeenAt,
        durationSec: this.getSessionDurationSec(session),
        pageViews: pageViewMap.get(session.id) || 0,
        totalEvents: session._count.events,
        totalLeads: session._count.leads,
        landingPage: session.landingPage,
        projectName: session.project?.name || null,
        realtorName: session.realtorLink?.name || null
      })),
      lots: lotInteractions.map((entry) => ({
        label: entry.label || 'Lote sem identificacao',
        count: entry._count.id
      })),
      leads: visitor.leads,
      events: events.map((event) => ({
        id: event.id,
        sessionId: event.sessionId,
        timestamp: event.timestamp,
        type: event.type,
        category: event.category,
        action: event.action,
        label: event.label,
        path: event.path,
        metadata: event.metadata
      }))
    };
  }

  private async processTopPaths(
    paths: any[],
    tenantId?: string,
    projectId?: string
  ) {
    // Map with label as key to group by their friendly names
    const groupedByLabel = new Map<string, { count: number; path: string }>();

    // 1. Collect all potential IDs for batch lookup
    const potentialIds = new Set<string>();
    const potentialSlugs = new Set<string>();

    // If filtering by specific project, look it up by ID for guaranteed name resolution
    let contextProjectName: string | null = null;
    if (projectId && projectId !== 'all') {
      const contextProject = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, slug: true }
      });
      if (contextProject) {
        contextProjectName = contextProject.name;
      }
    }

    for (const p of paths) {
      const rawPath = p.path || '/';
      const cleanPath = rawPath.split('?')[0].split('#')[0];
      const parts = cleanPath.split('/').filter(Boolean);

      // Collect potential element IDs (CUIDs are 25+ chars)
      for (const part of parts) {
        if (part && part.length > 20) {
          potentialIds.add(part);
        }
      }

      // Also check if label itself is an ID
      if (p.label && p.label.length > 20) {
        potentialIds.add(p.label);
      }

      // Collect first segment as potential project slug
      if (
        parts[0] &&
        parts[0].length <= 60 &&
        parts[0] !== 'painel' &&
        parts[0] !== 'login' &&
        parts[0] !== 'undefined'
      ) {
        potentialSlugs.add(parts[0]);
      }
    }

    // 2. Batch lookups
    const elements =
      potentialIds.size > 0
        ? await this.prisma.mapElement.findMany({
            where: { id: { in: Array.from(potentialIds) } },
            select: {
              id: true,
              code: true,
              name: true,
              project: { select: { name: true, slug: true } }
            }
          })
        : [];

    const elementMap = new Map(
      elements.map((e) => [
        e.id,
        {
          name: e.code || e.name,
          projectName: e.project?.name,
          projectSlug: e.project?.slug
        }
      ])
    );

    // Resolve project slugs to names
    const projects =
      potentialSlugs.size > 0
        ? await this.prisma.project.findMany({
            where: { slug: { in: Array.from(potentialSlugs) } },
            select: { slug: true, name: true }
          })
        : [];

    const projectSlugMap = new Map(projects.map((pr) => [pr.slug, pr.name]));

    // If we have a context project and some slugs couldn't be resolved,
    // use the context project name as a fallback for unresolved slugs
    // This handles the case where a project slug was changed after tracking data was recorded
    if (contextProjectName) {
      for (const slug of potentialSlugs) {
        if (!projectSlugMap.has(slug)) {
          projectSlugMap.set(slug, contextProjectName);
        }
      }
    }

    // For global metrics (no specific project filter), also load all tenant projects
    // to maximize resolution of any slugs
    if (
      (!projectId || projectId === 'all') &&
      tenantId &&
      potentialSlugs.size > 0
    ) {
      const allTenantProjects = await this.prisma.project.findMany({
        where: { tenantId },
        select: { slug: true, name: true }
      });
      for (const p of allTenantProjects) {
        if (!projectSlugMap.has(p.slug)) {
          projectSlugMap.set(p.slug, p.name);
        }
      }
    }

    // Known page sub-paths mapping
    const PAGE_LABELS: Record<string, string> = {
      unidades: 'Unidades',
      galeria: 'Galeria',
      contato: 'Contato',
      teste: 'Teste',
      planta: 'Planta',
      panorama: 'Panorama 360°',
      obrigado: 'Obrigado',
      pagamento: 'Pagamento'
    };

    for (const p of paths) {
      // Clean query and anchors for grouping
      const rawPath = p.path || '/';
      const cleanPath = rawPath.split('?')[0].split('#')[0];
      const parts = cleanPath.split('/').filter(Boolean);

      // Skip empty or root paths
      if (parts.length === 0) {
        const existing = groupedByLabel.get('Página Inicial');
        if (existing) {
          existing.count += p._count.id;
        } else {
          groupedByLabel.set('Página Inicial', {
            count: p._count.id,
            path: '/'
          });
        }
        continue;
      }

      // Skip junk: paths containing 'undefined', or painel admin pages
      if (parts.some((pt: string) => pt === 'undefined' || pt === 'null')) {
        continue; // skip garbage entries
      }
      if (parts[0] === 'painel' || parts[0] === 'login') {
        continue; // skip admin/login pages from public metrics
      }

      let label = '';

      // Determine what kind of page this is
      const firstPart = parts[0];
      const projectName = projectSlugMap.get(firstPart);

      if (parts.length === 1) {
        // Just project slug, this is the landing page
        label = projectName
          ? `${projectName} - Início`
          : `${firstPart} - Início`;
      } else if (parts.length >= 2) {
        const secondPart = parts[1];

        // Check if second part is a known sub-page
        if (PAGE_LABELS[secondPart]) {
          label = projectName
            ? `${projectName} - ${PAGE_LABELS[secondPart]}`
            : `${firstPart} - ${PAGE_LABELS[secondPart]}`;
        } else if (secondPart.length > 20) {
          // Likely a CUID (lot detail page)
          const elementInfo = elementMap.get(secondPart);
          if (elementInfo) {
            const pName = elementInfo.projectName || projectName || firstPart;
            label = `${pName} - Lote ${elementInfo.name}`;
          } else {
            // Unknown CUID, skip or give generic label
            label = projectName
              ? `${projectName} - Detalhe de Unidade`
              : `${firstPart} - Detalhe de Unidade`;
          }
        } else {
          // Some other sub-page
          label = projectName
            ? `${projectName} - ${secondPart}`
            : `${firstPart}/${secondPart}`;
        }
      }

      if (!label) {
        label = cleanPath;
      }

      // Final TRIM and casing for the Map key to ensure deduplication
      const mapKey = label.trim();

      const existing = groupedByLabel.get(mapKey);
      if (existing) {
        existing.count += p._count.id;
      } else {
        groupedByLabel.set(mapKey, { count: p._count.id, path: cleanPath });
      }
    }

    return Array.from(groupedByLabel.entries())
      .map(([label, data]) => ({ label, path: data.path, count: data.count }))
      .filter((entry) => {
        // Filter out entries with unresolved CUIDs in label
        const hasCuid = /[a-z0-9]{25,}/.test(entry.label);
        return !hasCuid;
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }
}
