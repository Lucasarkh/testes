import {
  Injectable,
  NestMiddleware,
  NotFoundException,
  Inject
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '@/infra/db/prisma.service';

/**
 * Global Middleware to resolve Tenant and Project context from Host header
 * or route slugs, ensuring isolation and domain-based access.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private static CACHE_TTL = 300; // 5 minutes in seconds for Redis

  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_SERVICE') private redis: any
  ) {}

  async use(req: any, res: Response, next: NextFunction) {
    if (req.method === 'OPTIONS') return next();

    let host = req.headers['host'] || '';

    // In local development, trust the Origin/Referer header to determine the "virtual"
    // host being accessed. This lets a frontend running on localhost:3000 simulate
    // subdomain/custom-domain resolution without a real DNS entry.
    // NEVER enabled in production — would allow tenant context spoofing via forged headers.
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      const origin = req.headers['origin'] as string | undefined;
      const referer = req.headers['referer'] as string | undefined;
      const virtualHost = origin || referer;
      if (virtualHost && (host === 'localhost' || host === '127.0.0.1' || host.startsWith('localhost:') || host.startsWith('127.0.0.1:'))) {
        try {
          const originHost = new URL(virtualHost).hostname;
          if (originHost !== 'localhost' && originHost !== '127.0.0.1' && originHost !== '') {
            host = originHost;
          }
        } catch (e) { /* ignore invalid URL */ }
      }
    }

    // Strip port for comparison (e.g., "localhost:3000" -> "localhost")
    if (host.includes(':')) {
        host = host.split(':')[0];
    }

    // Ignorar logs para caminhos de infraestrutura/documentação para reduzir ruído
    const ignoredPaths = [
      '/favicon.ico',
      '/docs',
      '/api/metrics',
      '/api/health',
      '/api/internal/tls/allow-host',
      '/',
    ];
    if (ignoredPaths.some(p => req.path === p) || req.path.startsWith('/docs')) {
        return next();
    }
    
    // Main domain can be configured via Env. Treat apex/www as equivalent.
    const configuredMainDomain = (process.env.MAIN_DOMAIN || 'lotio.com.br')
      .toLowerCase()
      .replace(/\.$/, '');
    const configuredApex = configuredMainDomain.startsWith('www.')
      ? configuredMainDomain.slice(4)
      : configuredMainDomain;
    const hostNormalized = host.toLowerCase();
    const hostApex = hostNormalized.startsWith('www.')
      ? hostNormalized.slice(4)
      : hostNormalized;

    const isLocalHost = hostNormalized === 'localhost' || hostNormalized === '127.0.0.1';
    const isMainDomain =
      isLocalHost ||
      hostApex === configuredApex ||
      hostApex === 'lotio.com.br';

    // 1a. Resolve subdomains of the main domain as project slugs
    // e.g. empreendimento.lotio.com.br → resolves project with slug 'empreendimento'
    const isSubdomainOfMain =
      !isMainDomain &&
      (hostNormalized.endsWith(`.${configuredApex}`) ||
        hostNormalized.endsWith('.lotio.com.br'));

    if (isSubdomainOfMain) {
      const subdomain = hostNormalized.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        const cacheKey = `domain_resolve:subdomain:${subdomain}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          req.tenantId = cached.tenantId;
          req.projectId = cached.projectId;
          req.project = cached.project;
        } else {
          const project = await this.prisma.project.findUnique({
            where: { slug: subdomain },
            include: { tenant: { select: { id: true, slug: true, isActive: true } } },
          });
          // BUG-06: throw 404 instead of silently serving the marketing landing page
          if (!project) throw new NotFoundException('Projeto não encontrado para este subdomínio.');
          if (!project.tenant.isActive) throw new NotFoundException('Tenant inativo.');

          const data = { tenantId: project.tenantId, projectId: project.id, project };
          await this.redis.set(cacheKey, data, TenantMiddleware.CACHE_TTL);
          req.tenantId = data.tenantId;
          req.projectId = data.projectId;
          req.project = data.project;
        }
      }
      return next();
    }

    // 1b. Resolve from custom domain (third-party domains)
    if (!isMainDomain && host) {
      // Check Redis cache first
      const cacheKey = `domain_resolve:${host}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
          req.tenantId = cached.tenantId;
          req.projectId = cached.projectId;
          req.project = cached.project;
          return next();
      }

      // Try project first
      const project = await this.prisma.project.findUnique({
        where: { customDomain: host },
        include: { tenant: { select: { id: true, slug: true, isActive: true } } }
      });

      if (project) {
        if (!project.tenant.isActive) throw new NotFoundException('Tenant inativo.');
        const data = { tenantId: project.tenantId, projectId: project.id, project };
        await this.redis.set(cacheKey, data, TenantMiddleware.CACHE_TTL);
        req.tenantId = data.tenantId;
        req.projectId = data.projectId;
        req.project = data.project;
        return next();
      }

      // Try tenant next
      const tenant = await this.prisma.tenant.findUnique({
        where: { customDomain: host }
      });

      if (tenant) {
        if (!tenant.isActive) throw new NotFoundException('Tenant inativo.');
        const data = { tenantId: tenant.id };
        await this.redis.set(cacheKey, data, TenantMiddleware.CACHE_TTL);
        req.tenantId = data.tenantId;
        return next();
      }

      // Domain not recognized — don't throw here. Allow the request to proceed
      // without tenant context so the resolve-tenant controller's own fallback
      // (resolveFromHost) can engage and try further resolution strategies
      // (e.g. tenant.customDomain apex + subdomain as slug).
      return next();
    }

    // 2. Resolve from Slugs (when on main domain)
    // Extract slugs from path /api/p/:projectSlug or query params
    const path = req.path; // e.g., /p/nome-do-projeto/details
    const projectSlugMatch = path.match(/\/p\/([^\/]+)/);
    let projectSlug = projectSlugMatch ? projectSlugMatch[1] : (req.params.projectSlug || req.query.projectSlug);
    
    // Ignore internal routes that shouldn't be treated as slugs
    if (projectSlug === 'resolve-tenant') {
       projectSlug = null;
    }
    
    const tenantSlug = req.params.tenantSlug || req.query.tenantSlug;

    if (projectSlug) {
      const project = await this.prisma.project.findUnique({
        where: { slug: projectSlug as string },
        include: { tenant: { select: { id: true, isActive: true } } }
      });
      if (project) {
        if (!project.tenant.isActive) throw new NotFoundException('Tenant inativo.');
        req.tenantId = project.tenantId;
        req.projectId = project.id;
        req.project = project;
      }
    } else if (tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: tenantSlug as string }
      });
      if (tenant) {
        if (!tenant.isActive) throw new NotFoundException('Tenant inativo.');
        req.tenantId = tenant.id;
      }
    }

    next();
  }
}
