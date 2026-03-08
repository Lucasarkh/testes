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
    const hostWithPort = window.location.host;
    const isLocalDev = host === 'localhost' || host === '127.0.0.1';

    console.log('[tenant-resolver] start', {
      host,
      hostWithPort,
      origin: window.location.origin,
      configuredApiBase,
      isLocalDev,
    });

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
      console.log('[tenant-resolver] requesting', { url, hostWithPort });
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      }).catch(() => null);

      if (!res) {
        console.log('[tenant-resolver] request failed (no response)', { url });
        return null;
      }

      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      console.log('[tenant-resolver] response meta', {
        url,
        status: res.status,
        ok: res.ok,
        contentType,
      });

      if (!res.ok) return null;
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('application/json')) return null;

      const data = await res.json().catch(() => null);
      console.log('[tenant-resolver] response body', { url, data });
      return data;
    };

    let config = await fetchTenantConfig(primaryUrl);
    if (!config && fallbackUrl && fallbackUrl !== primaryUrl) {
      console.log('[tenant-resolver] trying fallback URL', { fallbackUrl });
      config = await fetchTenantConfig(fallbackUrl);
    }

    if (config) {
      tenantStore.setTenantConfig(config);
      console.log('[tenant-resolver] config set in store', {
        config,
        normalizedStoreConfig: tenantStore.config,
      });
      // BUG-05: redirect to /:slug is handled exclusively by tenant-router.global.ts,
      // which runs reactively after this plugin sets isLoaded. Keeping a second
      // navigateTo here caused a duplicate navigation on every custom-domain visit.
    } else {
      // Main domain or unrecognized host — mark as loaded so pages can proceed.
      tenantStore.isLoaded = true;
      console.log('[tenant-resolver] no tenant config resolved; keeping platform landing');
    }
  } catch (err: any) {
    console.error('[tenant-resolver] Failed to resolve tenant configuration:', err);
    // BUG-08: always call setError (which also sets isLoaded = true) so the UI
    // never hangs on the loading spinner, and expose the error for pages to show.
    tenantStore.setError('Não foi possível carregar o contexto da plataforma. Tente novamente.');
  }
});
