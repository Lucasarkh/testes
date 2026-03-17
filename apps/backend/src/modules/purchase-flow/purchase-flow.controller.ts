import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { PurchaseFlowService } from './purchase-flow.service';
import {
  ConfirmSaleDto,
  PurchaseMetricsQueryDto,
  PurchaseReservationsQueryDto,
  ReservationActionDto,
  UpdateReservationAdminDto,
  UpdatePurchaseFlowConfigDto
} from './dto/purchase-flow.dto';

@ApiTags('Purchase Flow')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('purchase-flow')
export class PurchaseFlowController {
  constructor(private readonly service: PurchaseFlowService) {}

  @Get('config/:projectId')
  @Roles('LOTEADORA', 'SYSADMIN')
  getConfig(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string
  ) {
    return this.service.getConfig(tenantId, projectId);
  }

  @Put('config/:projectId')
  @Roles('LOTEADORA', 'SYSADMIN')
  updateConfig(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdatePurchaseFlowConfigDto
  ) {
    return this.service.updateConfig(tenantId, projectId, dto);
  }

  @Get('metrics')
  @Roles('LOTEADORA', 'SYSADMIN')
  getMetrics(
    @TenantId() tenantId: string,
    @Query() query: PurchaseMetricsQueryDto
  ) {
    return this.service.getMetrics(tenantId, query);
  }

  @Get('reservations')
  @Roles('LOTEADORA', 'SYSADMIN')
  listReservations(
    @TenantId() tenantId: string,
    @Query() query: PurchaseReservationsQueryDto
  ) {
    return this.service.listReservations(tenantId, query);
  }

  @Patch('reservations/:leadId')
  @Roles('LOTEADORA', 'SYSADMIN')
  updateReservation(
    @TenantId() tenantId: string,
    @Param('leadId') leadId: string,
    @Body() dto: UpdateReservationAdminDto
  ) {
    return this.service.updateReservationAdmin(tenantId, leadId, dto);
  }

  @Patch('reservations/:leadId/release')
  @Roles('LOTEADORA', 'SYSADMIN')
  releaseReservation(
    @TenantId() tenantId: string,
    @Param('leadId') leadId: string,
    @Body() dto: ReservationActionDto
  ) {
    return this.service.releaseReservation(tenantId, leadId, dto);
  }

  @Patch('reservations/:leadId/cancel')
  @Roles('LOTEADORA', 'SYSADMIN')
  cancelReservation(
    @TenantId() tenantId: string,
    @Param('leadId') leadId: string,
    @Body() dto: ReservationActionDto
  ) {
    return this.service.cancelReservation(tenantId, leadId, dto);
  }

  @Get('processes/:leadId')
  @Roles('LOTEADORA', 'SYSADMIN', 'IMOBILIARIA', 'CORRETOR')
  getProcess(
    @TenantId() tenantId: string,
    @Param('leadId') leadId: string
  ) {
    return this.service.getProcessForAdmin(tenantId, leadId);
  }

  @Patch('processes/:leadId/confirm-sale')
  @Roles('LOTEADORA', 'SYSADMIN')
  confirmSale(
    @TenantId() tenantId: string,
    @Param('leadId') leadId: string,
    @Body() dto: ConfirmSaleDto
  ) {
    return this.service.confirmSale(tenantId, leadId, dto);
  }

  @Patch('reservations/:leadId/confirm-sale')
  @Roles('LOTEADORA', 'SYSADMIN')
  confirmSaleFromReservations(
    @TenantId() tenantId: string,
    @Param('leadId') leadId: string,
    @Body() dto: ConfirmSaleDto
  ) {
    return this.service.confirmSale(tenantId, leadId, dto);
  }
}