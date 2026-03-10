import {
  Body,
  Controller,
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
import { LeadDistributionService } from './lead-distribution.service';
import { UpdateDistributionConfigDto } from './dto/update-distribution-config.dto';
import { DistributionLogQueryDto } from './dto/distribution-log-query.dto';
import { QueueQueryDto } from './dto/queue-query.dto';

@ApiTags('Lead Distribution')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('lead-distribution')
export class LeadDistributionController {
  constructor(private readonly service: LeadDistributionService) {}

  @Get('config/:projectId')
  @Roles('LOTEADORA', 'SYSADMIN')
  getConfig(@Param('projectId') projectId: string) {
    return this.service.getProjectConfig(projectId);
  }

  @Patch('config/:projectId')
  @Roles('LOTEADORA', 'SYSADMIN')
  updateConfig(
    @Param('projectId') projectId: string,
    @Body() dto: UpdateDistributionConfigDto
  ) {
    return this.service.updateProjectConfig(projectId, dto);
  }

  @Get('queue/:projectId')
  @Roles('LOTEADORA', 'SYSADMIN')
  getQueueState(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Query() query: QueueQueryDto
  ) {
    return this.service.getQueueState(projectId, tenantId, query);
  }

  @Post('queue/:projectId/reset')
  @Roles('LOTEADORA', 'SYSADMIN')
  resetQueue(@Param('projectId') projectId: string) {
    return this.service.resetQueue(projectId);
  }

  @Get('log/:projectId')
  @Roles('LOTEADORA', 'SYSADMIN')
  getLog(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Query() query: DistributionLogQueryDto
  ) {
    return this.service.getDistributionLog(projectId, tenantId, query);
  }
}
