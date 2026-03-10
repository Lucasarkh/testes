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
import { SchedulingService } from './scheduling.service';
import { CreateSchedulingDto } from './dto/create-scheduling.dto';
import { UpdateSchedulingConfigDto } from './dto/update-scheduling-config.dto';
import { SchedulingStatus } from '@prisma/client';

@ApiTags('Agendamentos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly service: SchedulingService) {}

  @Get('config/:projectId')
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  getConfig(@Param('projectId') projectId: string) {
    return this.service.getProjectConfig(projectId);
  }

  @Patch('config/:projectId')
  @Roles('LOTEADORA', 'SYSADMIN')
  updateConfig(
    @Param('projectId') projectId: string,
    @Body() dto: UpdateSchedulingConfigDto
  ) {
    return this.service.updateProjectConfig(projectId, dto);
  }

  @Post()
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateSchedulingDto,
    @CurrentUser() user: any
  ) {
    return this.service.createScheduling(tenantId, user.id, dto);
  }

  @Get()
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  findAll(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query('projectId') projectId?: string
  ) {
    return this.service.listSchedulings(tenantId, projectId, user);
  }

  @Patch(':id/status')
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: SchedulingStatus
  ) {
    return this.service.updateSchedulingStatus(id, status);
  }

  @Delete(':id')
  @Roles('LOTEADORA', 'IMOBILIARIA', 'SYSADMIN')
  delete(@Param('id') id: string) {
    return this.service.deleteScheduling(id);
  }
}
