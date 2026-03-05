import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { PlantMapService } from './plant-map.service';
import { CreatePlantMapDto } from './dto/create-plant-map.dto';
import { UpdatePlantMapDto } from './dto/update-plant-map.dto';
import { CreateHotspotDto } from './dto/create-hotspot.dto';
import { CreateHotspotsBulkDto } from './dto/create-hotspots-bulk.dto';
import { UpdateHotspotDto } from './dto/update-hotspot.dto';

// ── Admin routes (authenticated) ──────────────────────────
@ApiTags('Plant Map')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('projects/:projectId/plant-map')
export class PlantMapController {
  constructor(private readonly plantMapService: PlantMapService) {}

  // GET admin/projects/:projectId/plant-map
  @Get()
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  @ApiOperation({ summary: 'Buscar planta do projeto (admin)' })
  findByProject(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string
  ) {
    return this.plantMapService.findByProject(tenantId, projectId);
  }

  // POST admin/projects/:projectId/plant-map
  @Post()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Criar planta do projeto' })
  create(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreatePlantMapDto
  ) {
    return this.plantMapService.create(tenantId, projectId, dto);
  }

  // POST admin/projects/:projectId/plant-map/upload-image
  @Post('upload-image')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Upload da imagem da planta' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } }
    }
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.plantMapService.uploadImage(tenantId, projectId, file);
  }
}

// ── Per-plantMap routes ───────────────────────────────────
@ApiTags('Plant Map')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('plant-maps/:plantMapId')
export class PlantMapItemController {
  constructor(private readonly plantMapService: PlantMapService) {}

  // PUT plant-maps/:plantMapId
  @Put()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar configurações da planta' })
  update(
    @TenantId() tenantId: string,
    @Param('plantMapId') plantMapId: string,
    @Body() dto: UpdatePlantMapDto
  ) {
    return this.plantMapService.update(tenantId, plantMapId, dto);
  }

  // DELETE plant-maps/:plantMapId
  @Delete()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Deletar planta' })
  remove(
    @TenantId() tenantId: string,
    @Param('plantMapId') plantMapId: string
  ) {
    return this.plantMapService.remove(tenantId, plantMapId);
  }

  // POST plant-maps/:plantMapId/hotspots/bulk
  @Post('hotspots/bulk')
  @SkipThrottle()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Criar múltiplos hotspots em lote (transação única)' })
  createHotspotsBulk(
    @TenantId() tenantId: string,
    @Param('plantMapId') plantMapId: string,
    @Body() dto: CreateHotspotsBulkDto
  ) {
    return this.plantMapService.createHotspotsBulk(tenantId, plantMapId, dto);
  }

  // POST plant-maps/:plantMapId/hotspots
  @Post('hotspots')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Criar hotspot na planta' })
  createHotspot(
    @TenantId() tenantId: string,
    @Param('plantMapId') plantMapId: string,
    @Body() dto: CreateHotspotDto
  ) {
    return this.plantMapService.createHotspot(tenantId, plantMapId, dto);
  }
}

// ── Hotspot routes ────────────────────────────────────────
@ApiTags('Plant Map')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('plant-hotspots/:hotspotId')
export class PlantHotspotController {
  constructor(private readonly plantMapService: PlantMapService) {}

  // PUT plant-hotspots/:hotspotId
  @Put()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar hotspot' })
  update(
    @TenantId() tenantId: string,
    @Param('hotspotId') hotspotId: string,
    @Body() dto: UpdateHotspotDto
  ) {
    return this.plantMapService.updateHotspot(tenantId, hotspotId, dto);
  }

  // DELETE plant-hotspots/:hotspotId
  @Delete()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Deletar hotspot' })
  remove(@TenantId() tenantId: string, @Param('hotspotId') hotspotId: string) {
    return this.plantMapService.removeHotspot(tenantId, hotspotId);
  }
}
