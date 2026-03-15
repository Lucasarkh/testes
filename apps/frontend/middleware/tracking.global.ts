import { useTracking } from '../composables/useTracking';
import { useTenantStore } from '../stores/tenant';

export default defineNuxtRouteMiddleware(async (to) => {
  if (!process.client) return;

  const host = window.location.host;
  const isMainDomain = host.includes('lotio.com.br') || host.includes('localhost:3000');
  
  // Skip tracking for non-public or administrative pages
  const isPainel = to.path.startsWith('/painel');
  const isLogin = to.path.startsWith('/login');
  const isLanding = to.path === '/' && isMainDomain;
  
  if (isPainel || isLogin || isLanding) {
    return;
  }

  const tracking = useTracking();
  const tenantStore = useTenantStore();

  // Extract project from URL if available
  // Path format: /[slug] or it comes from tenantStore on custom domains
  const projectSlug = (to.params.slug || (tenantStore.config?.projectId ? tenantStore.config.project?.slug : '')) as string;

  // Initializing session if needed
  if (projectSlug) {
    // Pass slug so backend can resolve early for correct association in dashboard
    await tracking.initTracking({
      projectSlug: projectSlug,
      realtorCode: to.query.c as string,
    });
  }

  // Tracking page view (will only work if session already exists)
  
  // A "lot page" can be /[slug]/[code] (main domain) or /[code] (custom domain)
  // On custom domain, if they browse to /L-01, to.params.slug is "L-01" because of pages/[slug]/index.vue
  const isLotPage = (!!to.params.slug && !!to.params.code) || (!isMainDomain && to.params.slug && to.path === `/${to.params.slug}`);

  const isProjectHome = (isMainDomain && to.params.slug && to.path === `/${to.params.slug}`) || (!isMainDomain && to.path === '/');
  
  // Create a clean, human-readable label
  let label = (to.meta.title as string) || '';
  
  if (isLotPage) {
    // extract code directly from URL to be safe
    const parts = to.path.split('/');
    const code = to.params.code || to.params.slug || parts[parts.length - 1];
    label = `Lote ${code || '?'}`;
  } else if (isProjectHome) {
    label = 'Mapa do Empreendimento';
  } else if (!label) {
    const parts = to.path.split('/').filter(Boolean);
    label = parts.length > 0 ? (parts[parts.length - 1] || to.path) : to.path;
  }

  // Ensure label is never a route name
  if (label && label.includes('-') && label.includes('tenant')) {
     label = to.path;
  }

  tracking.trackPageView({
    path: to.path,
    label: label,
    category: isLotPage ? 'LOT' : 'PAGE',
  });
});
