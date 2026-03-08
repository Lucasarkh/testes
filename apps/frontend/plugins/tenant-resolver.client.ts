import { defineNuxtPlugin } from '#app';
import { useTenantStore } from '~/stores/tenant';

export default defineNuxtPlugin(async () => {
  // Only run in client context (SPA).
  if (!process.client) return;

  const tenantStore = useTenantStore();

  try {
    // Always call resolve-tenant using the current window origin so the Host
    // header forwarded to the backend matches the page's domain. This is critical
    // for subdomain / custom-domain tenant resolution via Caddy, and must NOT go
    // through NUXT_PUBLIC_API_BASE (which may point to localhost in dev builds).
    const res = await fetch(`${window.location.origin}/api/p/resolve-tenant`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => null);

    const config = res && res.ok ? await res.text().then(t => (t ? JSON.parse(t) : null)) : null;

    if (config) {
      tenantStore.setTenantConfig(config);
      // BUG-05: redirect to /:slug is handled exclusively by tenant-router.global.ts,
      // which runs reactively after this plugin sets isLoaded. Keeping a second
      // navigateTo here caused a duplicate navigation on every custom-domain visit.
    } else {
      // Main domain or unrecognized host — mark as loaded so pages can proceed.
      tenantStore.isLoaded = true;
    }
  } catch (err: any) {
    console.error('[tenant-resolver] Failed to resolve tenant configuration:', err);
    // BUG-08: always call setError (which also sets isLoaded = true) so the UI
    // never hangs on the loading spinner, and expose the error for pages to show.
    tenantStore.setError('Não foi possível carregar o contexto da plataforma. Tente novamente.');
  }
});
