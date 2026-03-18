import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
import { LeadsQueryDto } from './dto/leads-query.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import {
  CreateManualLeadDto,
  UpdateLeadStatusDto,
  AddLeadDocumentDto,
  AddLeadPaymentDto
} from './dto/manual-lead.dto';
import {
  PreLaunchQueueQueryDto,
  UpdatePreLaunchQueueDto
} from './dto/prelaunch-queue.dto';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateManualLeadDto,
    @CurrentUser() user: any
  ) {
    return this.leadsService.createManual(tenantId, dto, user);
  }

  @Get()
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  findAll(
    @TenantId() tenantId: string,
    @Query() query: LeadsQueryDto,
    @CurrentUser() user: any
  ) {
    return this.leadsService.findAll(tenantId, query, user);
  }

  @Get('prelaunch-queue')
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  listPreLaunchQueue(
    @TenantId() tenantId: string,
    @Query() query: PreLaunchQueueQueryDto,
    @CurrentUser() user: any
  ) {
    return this.leadsService.listPreLaunchQueue(tenantId, query, user);
  }

  @Patch('prelaunch-queue/:id')
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  updatePreLaunchQueue(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePreLaunchQueueDto,
    @CurrentUser() user: any
  ) {
    return this.leadsService.updatePreLaunchQueueEntry(tenantId, id, dto, user);
  }

  @Get(':id')
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.leadsService.findOne(tenantId, id, user);
  }

  @Patch(':id')
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: any
  ) {
    return this.leadsService.update(tenantId, id, dto, user);
  }

  @Patch(':id/status')
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
    @CurrentUser() user: any
  ) {
    return this.leadsService.updateStatus(tenantId, id, dto, user);
  }

  @Post(':id/documents')
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  addDocument(
    @TenantId() tenantId: string,
    @Param('id') leadId: string,
    @Body() dto: AddLeadDocumentDto,
    @CurrentUser() user: any
  ) {
    return this.leadsService.addDocument(tenantId, leadId, dto, user);
  }

  @Post(':id/payments')
  @Roles('LOTEADORA', 'SYSADMIN')
  addPayment(
    @TenantId() tenantId: string,
    @Param('id') leadId: string,
    @Body() dto: AddLeadPaymentDto,
    @CurrentUser() user: any
  ) {
    return this.leadsService.addPayment(tenantId, leadId, dto, user);
  }

  @Delete(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.leadsService.remove(tenantId, id);
  }
}
