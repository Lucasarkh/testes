import { useTenantStore } from '~/stores/tenant';

export default defineNuxtRouteMiddleware(async (to) => {
  const tenantStore = useTenantStore();

  // On client side, wait for the resolver plugin to finish loading tenant context.
  // BUG-09: use a reactive watch-based wait instead of an arbitrary polling loop
  // so this never proceeds with stale/null state due to a fixed 2-second timeout.
  if (process.client && !tenantStore.isLoaded) {
    await tenantStore.waitUntilLoaded();
  }

  // On custom domains, keep clean URLs without /:slug in the address bar.
  if (tenantStore.config?.projectId && tenantStore.config.project?.slug) {
    const slug = tenantStore.config.project.slug;
    const canonicalMap: Record<string, string> = {
      [`/${slug}`]: '/',
      [`/${slug}/unidades`]: '/unidades',
      [`/${slug}/categorias`]: '/categorias',
      [`/${slug}/galeria`]: '/galeria',
      [`/${slug}/espelho-planta`]: '/espelho-planta',
    };

    const canonicalPath = canonicalMap[to.path];
    if (canonicalPath !== undefined) {
      return navigateTo(
        { path: canonicalPath, query: to.query },
        { replace: true },
      );
    }

    // Legacy links that still include /:slug/:lotCode should work without slug.
    const parts = to.path.split('/').filter(Boolean);
    if (parts.length === 3 && parts[0] === slug && parts[1] === 'categorias') {
      return navigateTo(
        { path: `/categorias/${parts[2]}`, query: to.query },
        { replace: true },
      );
    }

    if (parts.length === 2 && parts[0] === slug) {
      return navigateTo(
        { path: `/${parts[1]}`, query: to.query },
        { replace: true },
      );
    }
  }

  // If a tenant domain is used but no specific project (e.g. vendas.loteadora.com.br)
  // You could redirect to a list of projects or a specific featured project here.
  if (to.path === '/' && tenantStore.config?.tenantId && !tenantStore.config?.projectId) {
     // Optional: navigateTo('/empreendimentos') 
  }
});
