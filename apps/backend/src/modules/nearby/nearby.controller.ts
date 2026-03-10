import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Logger
} from '@nestjs/common';
import { NearbyService } from './nearby.service';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Nearby')
@ApiBearerAuth()
@Controller('nearby')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class NearbyController {
  private readonly logger = new Logger(NearbyController.name);

  constructor(private readonly nearbyService: NearbyService) {}

  @Post(':projectId/generate')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Gerar/regerar proximidades do projeto' })
  async generate(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string
  ) {
    this.logger.log(
      `Manual nearby generation triggered for project ${projectId}`
    );
    // Fire async — don't block the request
    this.nearbyService.generateNearby(projectId).catch((err) => {
      this.logger.error(`Async generation failed: ${err.message}`);
    });
    return { message: 'Geração de proximidades iniciada.' };
  }

  @Get(':projectId/status')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Status das proximidades do projeto' })
  getStatus(@Param('projectId') projectId: string) {
    return this.nearbyService.getNearbyStatus(projectId);
  }

  @Patch(':projectId/toggle')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Ativar/desativar seção de proximidades' })
  toggle(
    @Param('projectId') projectId: string,
    @Body() body: { enabled: boolean }
  ) {
    return this.nearbyService.toggleNearby(projectId, body.enabled);
  }

  @Patch('item/:itemId/visibility')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Mostrar/ocultar um local específico' })
  toggleItemVisibility(
    @Param('itemId') itemId: string,
    @Body() body: { visible: boolean }
  ) {
    return this.nearbyService.toggleItemVisibility(itemId, body.visible);
  }
}
