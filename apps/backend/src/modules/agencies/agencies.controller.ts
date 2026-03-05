import { Controller, Get, Post, Body, Param, Put, Patch, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto, UpdateAgencyDto } from './dto/agency.dto';
import { CreateInviteDto, AcceptInviteDto } from './dto/invite.dto';
import { CreateInviteCodeDto, RegisterWithInviteCodeDto, UpdateInviteCodeDto } from './dto/invite-code.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';
import { SkipTermsCheck } from '@common/decorators/skip-terms-check.decorator';
import { UserRole } from '@prisma/client';

@Controller('agencies')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Post()
  @Roles('LOTEADORA')
  create(@Req() req, @Body() dto: CreateAgencyDto) {
    return this.agenciesService.createAgency(req.user.tenantId, dto);
  }

  @Get()
  @Roles('LOTEADORA')
  findAll(
    @Req() req, 
    @Query('page') page?: string, 
    @Query('limit') limit?: string,
    @Query('search') search?: string
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 12;
    return this.agenciesService.listAgencies(req.user.tenantId, p, l, search);
  }

  // --- Invites ---

  @Post('invite')
  @Roles('LOTEADORA', 'IMOBILIARIA')
  createInvite(@Req() req, @Body() dto: CreateInviteDto) {
    return this.agenciesService.createInvite(req.user.tenantId, req.user.id, dto);
  }

  @Post('invite/accept')
  @Public()
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.agenciesService.acceptInvite(dto);
  }

  @Get('invite/:token')
  @Public()
  getInvite(@Param('token') token: string) {
    return this.agenciesService.getInviteDetail(token);
  }

  // --- Invite Codes (open registration links) ---

  @Post('invite-codes')
  @Roles('LOTEADORA')
  createInviteCode(@Req() req, @Body() dto: CreateInviteCodeDto) {
    return this.agenciesService.createInviteCode(req.user.tenantId, dto);
  }

  @Get('invite-codes')
  @Roles('LOTEADORA')
  listInviteCodes(@Req() req) {
    return this.agenciesService.listInviteCodes(req.user.tenantId);
  }

  @Patch('invite-codes/:id')
  @Roles('LOTEADORA')
  updateInviteCode(@Req() req, @Param('id') id: string, @Body() dto: UpdateInviteCodeDto) {
    return this.agenciesService.updateInviteCode(id, req.user.tenantId, dto);
  }

  @Delete('invite-codes/:id')
  @Roles('LOTEADORA')
  deleteInviteCode(@Req() req, @Param('id') id: string) {
    return this.agenciesService.deleteInviteCode(id, req.user.tenantId);
  }

  @Get('invite-codes/public/:code')
  @Public()
  @SkipTermsCheck()
  getInviteCodePublicDetails(@Param('code') code: string) {
    return this.agenciesService.getInviteCodePublicDetails(code);
  }

  @Post('invite-codes/public/:code/register')
  @Public()
  @SkipTermsCheck()
  registerWithInviteCode(@Param('code') code: string, @Body() dto: RegisterWithInviteCodeDto) {
    return this.agenciesService.registerWithInviteCode(code, dto);
  }

  // --- Metrics for Agency ---

  @Get('metrics')
  @Roles('IMOBILIARIA', 'LOTEADORA', 'SYSADMIN')
  getMetrics(@Req() req, @Query('agencyId') queryAgencyId?: string) {
    const agencyId = queryAgencyId || req.user.agencyId;
    if (!agencyId) throw new Error('Acesso negado: ID da imobiliária não fornecido');
    return this.agenciesService.getAgencyMetrics(agencyId);
  }

  // Keep dynamic ":id" routes last so they do not shadow static routes like
  // /invite-codes and /metrics.
  @Get(':id')
  @Roles('LOTEADORA', 'IMOBILIARIA')
  findOne(@Req() req, @Param('id') id: string) {
    // If user is IMOBILIARIA, they can only see their own agency
    const targetId = req.user.role === 'IMOBILIARIA' ? req.user.agencyId : id;
    return this.agenciesService.getAgency(targetId, req.user.tenantId);
  }

  @Put(':id')
  @Roles('LOTEADORA', 'IMOBILIARIA')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateAgencyDto) {
    // If user is IMOBILIARIA, they can only update their own agency
    const targetId = req.user.role === 'IMOBILIARIA' ? req.user.agencyId : id;
    return this.agenciesService.updateAgency(targetId, req.user.tenantId, dto);
  }

  @Delete(':id')
  @Roles('LOTEADORA')
  remove(@Req() req, @Param('id') id: string) {
    return this.agenciesService.deleteAgency(id, req.user.tenantId);
  }
}
