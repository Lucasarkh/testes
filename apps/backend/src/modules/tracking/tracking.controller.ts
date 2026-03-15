import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards
} from '@nestjs/common';
import {
  CreateSessionDto,
  CreateEventDto,
  TrackingReportQueryDto
} from './dto/tracking.dto';
import { TrackingService } from './tracking.service';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('session')
  async createSession(
    @Body() dto: CreateSessionDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const cookieVisitorId = req.cookies?.['tracking_visitor_id'];
    const cookieVisitId = req.cookies?.['tracking_visit_id'];
    const legacyCookieSessionId = req.cookies?.['tracking_session_id'];

    if (!dto.visitorId && cookieVisitorId) {
      dto.visitorId = cookieVisitorId;
    }
    if (!dto.visitorId && legacyCookieSessionId) {
      dto.visitorId = legacyCookieSessionId;
    }
    if (!dto.sessionId && cookieVisitId) {
      dto.sessionId = cookieVisitId;
    }

    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const session = await this.trackingService.createSession(
      dto,
      ip,
      userAgent
    );

    res.cookie('tracking_visitor_id', session.visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.cookie('tracking_visit_id', session.sessionId || session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000 // 30 minutes
    });

    return session;
  }

  @Post('event')
  async trackEvent(@Body() dto: CreateEventDto, @Req() req: Request) {
    // Also check for cookie if body is missing sessionId
    if (!dto.sessionId) {
      dto.sessionId = req.cookies?.['tracking_visit_id'] || req.cookies?.['tracking_session_id'];
    }
    return this.trackingService.trackEvent(dto);
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getDashboardStats(
    @TenantId() tenantId: string,
    @CurrentUser() user: any
  ) {
    return this.trackingService.getDashboardStats(tenantId, user);
  }

  @Get('metrics/lots')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getLotMetrics(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getLotMetrics(query, user);
  }

  @Get('metrics/trends')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getTrendMetrics(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getTrendMetrics(query, user);
  }

  @Get('metrics/brokers')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getBrokerMetrics(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getBrokerMetrics(query, user);
  }

  @Get('metrics/agencies')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getAgencyMetrics(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getAgencyMetrics(query, user);
  }

  @Get('metrics/enterprise')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getEnterpriseMetrics(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getEnterpriseMetrics(query, user);
  }

  @Get('metrics/traffic')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getTrafficMetrics(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getTrafficMetrics(query, user);
  }

  @Get('metrics/audience')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getAudienceMetrics(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getAudienceMetrics(query, user);
  }

  @Get('metrics')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getMetrics(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getMetrics(query, user);
  }

  @Get('report/lots')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getLotReport(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getMostAccessedLots(query, user);
  }

  @Get('report/pages')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getPageReport(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getPageViews(query, user);
  }

  @Get('report/realtors')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getRealtorReport(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getRealtorLinkClicks(query, user);
  }

  @Get('report/sources')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getSourceReport(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getLeadSources(query, user);
  }

  @Get('report/sessions')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getSessionReport(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getSessionsReport(query, user);
  }

  @Get('report/sessions/:id')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getSessionReportDetail(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getSessionDetail(id, query, user);
  }

  @Get('report/visitors')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getVisitorReport(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getVisitorsReport(query, user);
  }

  @Get('report/visitors/:id')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getVisitorReportDetail(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getVisitorDetail(id, query, user);
  }
}
