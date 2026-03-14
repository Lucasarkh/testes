import { defineStore } from 'pinia';
import {
  hasAssignedPanelPermission,
  hasPanelFeatureAccess,
  PANEL_FEATURE_DEFAULT_ROUTE,
  PANEL_FEATURES,
  type PanelFeatureKey,
  type PanelPermissions,
} from '~/utils/panelPermissions';

type JwtPayload = {
  exp?: number;
};

const parseJwtPayload = (token: string): JwtPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const normalized = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');

    if (import.meta.client) {
      return JSON.parse(atob(normalized));
    }

    const decoded = Buffer.from(normalized, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'SYSADMIN' | 'LOTEADORA' | 'IMOBILIARIA' | 'CORRETOR';
  tenantId?: string;
  agencyId?: string;
  termsAcceptedAt?: string | null;
  panelPermissions?: PanelPermissions | null;
}

const hasManagedPanelRestrictions = (user: User | null): boolean => {
  return user?.role === 'LOTEADORA' && hasAssignedPanelPermission(user.panelPermissions);
};

const canUserAccessFeature = (
  user: User | null,
  feature: PanelFeatureKey,
  required: 'read' | 'write' = 'read',
): boolean => {
  if (!user) return false;
  if (user.role === 'SYSADMIN') return true;
  if (user.role !== 'LOTEADORA') return false;
  if (!hasManagedPanelRestrictions(user)) return true;
  return hasPanelFeatureAccess(user.panelPermissions, feature, required);
};

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    accessToken: null as string | null,
    refreshToken: null as string | null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.accessToken,
    isSysAdmin: (state) => state.user?.role === 'SYSADMIN',
    isLoteadora: (state) => state.user?.role === 'LOTEADORA',
    isImobiliaria: (state) => state.user?.role === 'IMOBILIARIA',
    isCorretor: (state) => state.user?.role === 'CORRETOR',
    hasPanelRestrictions: (state) => hasManagedPanelRestrictions(state.user),
    canManageTenants: (state) => state.user?.role === 'SYSADMIN',
    canManageUsers: (state) => {
      if (!state.user) return false;
      return state.user.role === 'SYSADMIN' || canUserAccessFeature(state.user, 'users', 'read');
    },
    canEdit: (state) => {
      if (!state.user) return false;
      if (state.user.role === 'SYSADMIN') return true;
      return canUserAccessFeature(state.user, 'projects', 'write');
    },
    canReadFeature: (state) => (feature: PanelFeatureKey) => canUserAccessFeature(state.user, feature, 'read'),
    canWriteFeature: (state) => (feature: PanelFeatureKey) => canUserAccessFeature(state.user, feature, 'write'),
    userRole: (state) => state.user?.role ?? null,
    hasAcceptedTerms: (state) => !!state.user?.termsAcceptedAt,
  },

  actions: {
    isTokenExpired(token: string | null, clockSkewSeconds = 30): boolean {
      if (!token) return true;

      const payload = parseJwtPayload(token);
      if (!payload?.exp) return true;

      const nowInSeconds = Math.floor(Date.now() / 1000);
      return payload.exp <= (nowInSeconds + clockSkewSeconds);
    },

    ensureSessionIsValid(): boolean {
      if (!this.accessToken) return false;

      if (this.isTokenExpired(this.accessToken)) {
        this.logout();
        return false;
      }

      return true;
    },

    setAuth(data: { user: User; access_token: string; refresh_token: string }) {
      this.user = data.user;
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;

      if (import.meta.client) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    },

    logout() {
      this.user = null;
      this.accessToken = null;
      this.refreshToken = null;
      if (import.meta.client) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      }
    },

    loadFromStorage() {
      if (import.meta.client) {
        this.accessToken = localStorage.getItem('access_token');
        this.refreshToken = localStorage.getItem('refresh_token');
        const raw = localStorage.getItem('user');
        if (raw) {
          try { this.user = JSON.parse(raw); } catch { this.user = null; }
        }

        this.ensureSessionIsValid();
      }
    },

    getDashboardRoute(): string {
      if (!this.user) return '/painel';
      if (this.user.role === 'SYSADMIN') return '/painel';
      if (this.user.role !== 'LOTEADORA') return '/painel';
      if (!hasManagedPanelRestrictions(this.user)) return '/painel';

      for (const feature of PANEL_FEATURES) {
        if (canUserAccessFeature(this.user, feature, 'read')) {
          return PANEL_FEATURE_DEFAULT_ROUTE[feature];
        }
      }

      return '/painel/perfil';
    },

    setTermsAccepted() {
      if (this.user) {
        this.user.termsAcceptedAt = new Date().toISOString();
        if (import.meta.client) {
          localStorage.setItem('user', JSON.stringify(this.user));
        }
      }
    },
  },
});
