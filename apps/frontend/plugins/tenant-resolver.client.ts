import { defineNuxtPlugin } from '#app';
import { useTenantStore } from '~/stores/tenant';

export default defineNuxtPlugin(async (nuxtApp) => {
  // Only run in client for SPA context (hostname check)
  if (!process.client) return;

  const tenantStore = useTenantStore();
  const hostname = window.location.hostname;
  const mainDomain = 'lotio.com.br';

  try {
    // Always call resolve-tenant using the current window origin so the Host
    // header forwarded to the backend matches the page's domain. This is critical
    // for subdomain / custom-domain tenant resolution via Caddy, and must NOT go
    // through NUXT_PUBLIC_API_BASE (which may point to localhost in prod builds).
    const res = await fetch(`${window.location.origin}/api/p/resolve-tenant`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => null);

    const config = res && res.ok ? await res.text().then(t => t ? JSON.parse(t) : null) : null;

    if (config) {
      tenantStore.setTenantConfig(config);

      // Canonicalize to slug-based route for custom-domain projects.
      // tenant-router.global.ts middleware also handles this, but we do it here
      // as well so the redirect happens before the initial page component mounts.
      if (window.location.pathname === '/' && config.projectId && config.project?.slug) {
        const slug = config.project.slug;
        await navigateTo(`/${slug}`, { replace: true });
      }
    } else {
      // Non-recognized domain or main domain without project context — normal for
      // index.vue, but we must mark isLoaded so pages can proceed.
      tenantStore.isLoaded = true;
    }
  } catch (err: any) {
    console.error('Failed to resolve tenant configuration:', err);
    tenantStore.setError('Loteadora não encontrada ou erro na plataforma.');

    if (hostname !== mainDomain && !hostname.includes('localhost')) {
      // Could redirect to an error page here if needed
    }
  }
});

