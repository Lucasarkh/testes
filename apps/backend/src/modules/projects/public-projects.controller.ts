import { Controller, Get, Param, Req, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PrismaService } from '@/infra/db/prisma.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';

@ApiTags('Public')
@Controller('p')
export class PublicProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('resolve-tenant')
  @ApiOperation({ summary: 'Resolver contexto de tenant/projeto via Host' })
  async resolveTenant(@Req() req: any) {
    let tenantId = req.tenantId as string | undefined;
    let projectId: string | null | undefined = req.projectId as string | null | undefined;
    let resolvedProject = req.project as { id: string; slug: string; name: string; tenantId: string } | undefined;

    // Fallback resolver: if middleware did not inject tenant/project context,
    // resolve directly from the incoming host so subdomain custom domains still work.
    if (!tenantId) {
      const host = this.getRequestHost(req);
      const hostResolution = host ? await this.resolveFromHost(host) : null;
      if (!hostResolution) {
        return null;
      }

      tenantId = hostResolution.tenantId;
      projectId = hostResolution.projectId;
      resolvedProject = hostResolution.project ?? undefined;
    }

    // When a custom domain is mapped to a tenant (not a specific project),
    // resolve a default project so the subdomain root always renders a project page.
    if (!projectId) {
      const fallbackProject = await this.findDefaultProject(tenantId);
      if (fallbackProject) {
        return {
          tenantId,
          projectId: fallbackProject.id,
          project: fallbackProject,
        };
      }

      return { tenantId, projectId: null, project: null };
    }

    // BUG-07: always return a consistent minimal shape for `project` regardless of
    // how it was resolved (subdomain, custom domain, or auto-resolve above).
    // The full project data is loaded separately via GET /api/p/:slug by the pages.
    const p = resolvedProject;
    const projectPayload = p
      ? { id: p.id, slug: p.slug, name: p.name, tenantId: p.tenantId }
      : null;

    return {
      tenantId,
      projectId,
      project: projectPayload,
    };
  }

  private async findDefaultProject(tenantId: string) {
    const preferredProject = await this.prisma.project.findFirst({
      where: { tenantId, status: ProjectStatus.PUBLISHED },
      select: { id: true, slug: true, name: true, tenantId: true },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    if (preferredProject) return preferredProject;

    return this.prisma.project.findFirst({
      where: { tenantId },
      select: { id: true, slug: true, name: true, tenantId: true },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private getRequestHost(req: any): string | null {
    const forwardedHost = req.headers?.['x-forwarded-host'] as string | undefined;
    const hostHeader = req.headers?.host as string | undefined;
    const rawHost = forwardedHost?.split(',')[0]?.trim() || hostHeader?.trim();
    if (!rawHost) return null;
    return rawHost.toLowerCase().replace(/\.$/, '').split(':')[0];
  }

  private async resolveFromHost(host: string) {
    const mainDomain = (process.env.MAIN_DOMAIN || 'lotio.com.br').toLowerCase().replace(/\.$/, '');
    const mainApex = mainDomain.startsWith('www.') ? mainDomain.slice(4) : mainDomain;
    const hostLabels = host.split('.').filter(Boolean);
    const hostApex = host.startsWith('www.') ? host.slice(4) : host;

    const isMainDomain =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      hostApex === mainApex ||
      hostApex === 'lotio.com.br';

    // Main-domain subdomain pattern: <projectSlug>.<mainDomain>
    const isSubdomainOfMain =
      !isMainDomain && (host.endsWith(`.${mainApex}`) || host.endsWith('.lotio.com.br'));

    if (isSubdomainOfMain) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        const project = await this.prisma.project.findUnique({
          where: { slug: subdomain },
          select: { id: true, slug: true, name: true, tenantId: true, tenant: { select: { isActive: true } } },
        });
        if (project?.tenant?.isActive) {
          return {
            tenantId: project.tenantId,
            projectId: project.id,
            project: { id: project.id, slug: project.slug, name: project.name, tenantId: project.tenantId },
          };
        }
      }
    }

    // Exact project custom domain
    const projectByDomain = await this.prisma.project.findUnique({
      where: { customDomain: host },
      select: { id: true, slug: true, name: true, tenantId: true, tenant: { select: { isActive: true } } },
    });
    if (projectByDomain?.tenant?.isActive) {
      return {
        tenantId: projectByDomain.tenantId,
        projectId: projectByDomain.id,
        project: {
          id: projectByDomain.id,
          slug: projectByDomain.slug,
          name: projectByDomain.name,
          tenantId: projectByDomain.tenantId,
        },
      };
    }

    // Exact tenant custom domain
    const tenantByDomain = await this.prisma.tenant.findUnique({
      where: { customDomain: host },
      select: { id: true, isActive: true },
    });
    if (tenantByDomain?.isActive) {
      const defaultProject = await this.findDefaultProject(tenantByDomain.id);
      return {
        tenantId: tenantByDomain.id,
        projectId: defaultProject?.id ?? null,
        project: defaultProject ?? null,
      };
    }

    // Subdomain over tenant base custom domain:
    // e.g. host=vendas.ventue.com.br, tenant.customDomain=ventue.com.br
    if (hostLabels.length >= 3) {
      const subdomain = hostLabels[0];
      const apex = hostLabels.slice(1).join('.');

      const tenantByApex = await this.prisma.tenant.findUnique({
        where: { customDomain: apex },
        select: { id: true, isActive: true },
      });

      if (tenantByApex?.isActive) {
        const projectBySlug = await this.prisma.project.findFirst({
          where: { tenantId: tenantByApex.id, slug: subdomain },
          select: { id: true, slug: true, name: true, tenantId: true },
        });

        const projectForTenant = projectBySlug ?? await this.findDefaultProject(tenantByApex.id);

        return {
          tenantId: tenantByApex.id,
          projectId: projectForTenant?.id ?? null,
          project: projectForTenant ?? null,
        };
      }
    }

    return null;
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
