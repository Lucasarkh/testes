import { Controller, Get, Param, Req, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Public')
@Controller('p')
export class PublicProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('resolve-tenant')
  @ApiOperation({ summary: 'Resolver contexto de tenant/projeto via Host' })
  async resolveTenant(@Req() req: any) {
    if (!req.tenantId) {
      // In development or when no tenant is resolved, we might want to return null instead of 404
      // This avoids console noise on the main landing page/index.vue
      return null;
    }

    // You could fetch more data here (theme, logo, etc)
    return {
      tenantId: req.tenantId,
      projectId: req.projectId,
      project: req.project || null
    };
  }

  @Get('preview/:id')
  @ApiOperation({ summary: 'Visualização prévia do projeto' })
  findPreview(@Param('id') id: string) {
    return this.projectsService.findPreview(id);
  }

  @Get(':projectSlug/lots')
  @ApiOperation({ summary: 'Lotes disponíveis com paginação server-side' })
  @ApiQuery({ name: 'page',      required: false })
  @ApiQuery({ name: 'limit',     required: false })
  @ApiQuery({ name: 'search',    required: false })
  @ApiQuery({ name: 'tags',      required: false, description: 'Comma-separated tags' })
  @ApiQuery({ name: 'matchMode', required: false, enum: ['any', 'exact'] })
  @ApiQuery({ name: 'codes',     required: false, description: 'Comma-separated lot codes' })
  findPublicLots(
    @Param('projectSlug') projectSlug: string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
    @Query('search')    search?: string,
    @Query('tags')      tagsRaw?: string,
    @Query('matchMode') matchMode?: 'any' | 'exact',
    @Query('codes')     codesRaw?: string,
  ) {
    const tags  = tagsRaw  ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)  : undefined;
    const codes = codesRaw ? codesRaw.split(',').map(c => c.trim()).filter(Boolean) : undefined;
    return this.projectsService.findPublicLots(projectSlug, page, Math.min(limit, 50), search, tags, matchMode, codes);
  }

  @Get(':projectSlug')
  @ApiOperation({ summary: 'Dados públicos do projeto (mapa + lotes + mídia)' })
  findPublic(@Param('projectSlug') projectSlug: string) {
    return this.projectsService.findBySlug(projectSlug);
  }
}
