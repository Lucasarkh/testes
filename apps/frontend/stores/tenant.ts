import { defineStore } from 'pinia';
import { watch } from 'vue';

// Minimal shape returned by GET /api/p/resolve-tenant.
// Full project data is loaded separately via GET /api/p/:slug by the page components.
export interface TenantProjectRef {
  id: string;
  slug: string;
  name: string;
  tenantId: string;
}

export interface TenantConfig {
  tenantId: string;
  projectId?: string | null;
  project?: TenantProjectRef | null;
}

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    config: null as TenantConfig | null,
    isLoaded: false,
    error: null as string | null,
  }),

  actions: {
    setTenantConfig(config: TenantConfig) {
      const normalizedProjectId = config.projectId ?? config.project?.id ?? null;

      this.config = {
        ...config,
        projectId: normalizedProjectId,
      };
      this.isLoaded = true;
      this.error = null;
    },

    setError(message: string) {
      this.error = message;
      this.isLoaded = true;
    },

    // BUG-09: reactive wait — resolves as soon as isLoaded flips to true,
    // with a 5-second safety fallback so the UI never hangs indefinitely.
    waitUntilLoaded(): Promise<void> {
      if (this.isLoaded) return Promise.resolve();
      return new Promise<void>(resolve => {
        const timeout = setTimeout(resolve, 5000);
        const stop = watch(
          () => this.isLoaded,
          (val) => {
            if (val) {
              clearTimeout(timeout);
              stop();
              resolve();
            }
          },
        );
      });
    },
  },
});
