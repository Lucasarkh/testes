import { defineNuxtPlugin } from '#app';
import { useTenantStore } from '~/stores/tenant';
import { isPrivateNetworkHostname } from '~/utils/host';

export default defineNuxtPlugin(async () => {
  // Only run in client context (SPA).
  if (!process.client) return;

  const tenantStore = useTenantStore();

  try {
    const runtime = useRuntimeConfig();
    const configuredApiBase = (runtime.public.apiBase || '').replace(/\/+$/, '');
    const host = window.location.hostname;
    const hostWithPort = window.location.host;
    const hostQuery = `host=${encodeURIComponent(hostWithPort)}`;
    const isLocalDev = isPrivateNetworkHostname(host);

    // On real domains, use current origin so Host is preserved for tenant
    // resolution in reverse proxy. On local dev hosts or LAN IPs, prefer
    // configured apiBase so the SPA can be opened from mobile devices while
    // still consuming production/staging backend.
    const primaryUrl = isLocalDev && configuredApiBase
      ? `${configuredApiBase}/api/p/resolve-tenant?${hostQuery}`
      : `${window.location.origin}/api/p/resolve-tenant?${hostQuery}`;

    const fallbackUrl = configuredApiBase
      ? `${configuredApiBase}/api/p/resolve-tenant?${hostQuery}`
      : '';

    const domainResolverPath = `/api/p/resolve-project-by-domain?domain=${encodeURIComponent(hostWithPort)}`;
    const domainResolverPrimaryUrl = isLocalDev && configuredApiBase
      ? `${configuredApiBase}${domainResolverPath}`
      : `${window.location.origin}${domainResolverPath}`;
    const domainResolverFallbackUrl = configuredApiBase
      ? `${configuredApiBase}${domainResolverPath}`
      : '';

    const fetchTenantConfig = async (url: string) => {
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      }).catch(() => null);

      if (!res) {
        return null;
      }

      const contentType = (res.headers.get('content-type') || '').toLowerCase();

      if (!res.ok) return null;

      if (contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        return data;
      }

      // Some proxies may omit content-type even when body is JSON.
      const rawBody = await res.text().catch(() => '');

      try {
        const parsed = JSON.parse(rawBody);

        return parsed;
      } catch {
        return null;
      }
    };

    const fetchProjectByDomain = async (url: string) => {

      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      }).catch(() => null);

      if (!res || !res.ok) return null;
      const data = await res.json().catch(() => null);
      if (!data?.projectId || !data?.project?.id) return null;
      return data;
    };

    let config = await fetchTenantConfig(primaryUrl);
    if (!config && fallbackUrl && fallbackUrl !== primaryUrl) {
      config = await fetchTenantConfig(fallbackUrl);
    }

    // If host-based tenant resolver is empty, force resolve by full domain.
    if (!config) {
      config = await fetchProjectByDomain(domainResolverPrimaryUrl);
      if (!config && domainResolverFallbackUrl && domainResolverFallbackUrl !== domainResolverPrimaryUrl) {
        config = await fetchProjectByDomain(domainResolverFallbackUrl);
      }
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
