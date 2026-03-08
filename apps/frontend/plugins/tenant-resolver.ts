import { defineNuxtPlugin } from '#app';
import { useTenantStore } from '~/stores/tenant';

export default defineNuxtPlugin(async () => {
  // Only run in client context (SPA).
  if (!process.client) return;

  const tenantStore = useTenantStore();

  try {
    const runtime = useRuntimeConfig();
    const configuredApiBase = (runtime.public.apiBase || '').replace(/\/+$/, '');
    const host = window.location.hostname;
    const isLocalDev = host === 'localhost' || host === '127.0.0.1';

    // On real domains, use current origin so Host is preserved for tenant
    // resolution in reverse proxy. On localhost, prefer configured apiBase so
    // local SPA can consume production/staging backend.
    const primaryUrl = isLocalDev && configuredApiBase
      ? `${configuredApiBase}/api/p/resolve-tenant`
      : `${window.location.origin}/api/p/resolve-tenant`;

    const fallbackUrl = configuredApiBase
      ? `${configuredApiBase}/api/p/resolve-tenant`
      : '';

    const fetchTenantConfig = async (url: string) => {
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      }).catch(() => null);

      if (!res || !res.ok) return null;
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('application/json')) return null;
      return res.json().catch(() => null);
    };

    let config = await fetchTenantConfig(primaryUrl);
    if (!config && fallbackUrl && fallbackUrl !== primaryUrl) {
      config = await fetchTenantConfig(fallbackUrl);
    }

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
