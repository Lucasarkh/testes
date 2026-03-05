import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlantMapService } from './plant-map.service';

/**
 * Public (no-auth) endpoint — exposes plant map for public project pages.
 * Route: GET /api/p/:tenantSlug/:projectSlug/plant-map
 *
 * We use projectId here because the public page already fetches the project
 * and has its ID. For slug-based lookups, use the projects public endpoint first.
 */
@ApiTags('Public')
@Controller('p/projects/:projectId/plant-map')
export class PublicPlantMapController {
  constructor(private readonly plantMapService: PlantMapService) {}

  @Get()
  @ApiOperation({ summary: 'Planta interativa pública do projeto' })
  findPublic(@Param('projectId') projectId: string, @Query('preview') preview?: string) {
    // tenantId not needed for public lookup — uses projectId unique constraint
    return this.plantMapService.findByProjectPublic(projectId, preview === 'true');
  }

  @Get('hotspots/:hotspotId')
  @ApiOperation({ summary: 'Detalhe de um hotspot (lazy — carrega description e metaJson)' })
  findHotspot(
    @Param('projectId') projectId: string,
    @Param('hotspotId') hotspotId: string,
  ) {
    return this.plantMapService.findHotspotPublic(projectId, hotspotId);
  }
}
