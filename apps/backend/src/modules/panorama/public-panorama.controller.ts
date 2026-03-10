import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PanoramaService } from './panorama.service';

@ApiTags('Public')
@Controller('p/projects/:projectId/panoramas')
export class PublicPanoramaController {
  constructor(private readonly panoramaService: PanoramaService) {}

  @Get()
  @ApiOperation({ summary: 'Panoramas públicos do projeto' })
  findPublic(
    @Param('projectId') projectId: string,
    @Query('preview') preview?: string
  ) {
    return this.panoramaService.findByProjectPublic(
      projectId,
      preview === 'true'
    );
  }
}
