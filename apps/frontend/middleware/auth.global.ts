import { useAuthStore } from '../stores/auth';
import { resolvePanelFeatureFromPath } from '~/utils/panelPermissions';

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server && !to.path.startsWith('/painel') && to.path !== '/login') {
    return;
  }

  const authStore = useAuthStore();
  const hasValidSession = authStore.isLoggedIn
    ? authStore.ensureSessionIsValid()
    : authStore.loadFromStorage();

  // Public routes: login, root, or any tenant/project page
  const publicRoutes = ['/login'];
  const isPainel = to.path.startsWith('/painel');
  const isPublic = publicRoutes.includes(to.path) || !isPainel;

  if (isPublic) {
    if (hasValidSession && ['/login'].includes(to.path)) {
      return navigateTo(authStore.getDashboardRoute());
    }
    return;
  }

  // All /painel routes require auth
  if (!hasValidSession) {
    return navigateTo('/login');
  }

  const homeRoute = authStore.getDashboardRoute();

  if (to.path === '/painel' && homeRoute !== '/painel') {
    return navigateTo(homeRoute);
  }

  // Terms acceptance enforcement — redirect to lock-screen page before accessing any panel route
  const isTermsPage = to.path === '/painel/aceitar-termos';
  if (!authStore.hasAcceptedTerms && !isTermsPage) {
    return navigateTo('/painel/aceitar-termos');
  }
  // Prevent accessing the terms page after already accepting
  if (authStore.hasAcceptedTerms && isTermsPage) {
    return navigateTo(homeRoute);
  }

  // Role-based route protection
  if (to.path.startsWith('/painel/tenants') && !authStore.canManageTenants) {
    return navigateTo(homeRoute);
  }
  if (to.path.startsWith('/painel/backups') && !authStore.isSysAdmin) {
    return navigateTo(homeRoute);
  }
  if (to.path.startsWith('/painel/usuarios') && !authStore.canManageUsers) {
    return navigateTo(homeRoute);
  }
  const panelFeature = resolvePanelFeatureFromPath(to.path);
  if (
    panelFeature
    && authStore.hasPanelRestrictions
    && authStore.isLoteadora
    && !authStore.canReadFeature(panelFeature)
  ) {
    return navigateTo(homeRoute);
  }
  if (to.path.startsWith('/painel/assinatura')) {
    return navigateTo(homeRoute);
  }
  if (to.path.startsWith('/painel/cobranca')) {
    return navigateTo(homeRoute);
  }
  if (to.path.startsWith('/painel/reservar') && !authStore.isCorretor && !authStore.isImobiliaria) {
    return navigateTo(homeRoute);
  }
  if (to.path.startsWith('/painel/distribuicao') && !authStore.isLoteadora && !authStore.isSysAdmin) {
    return navigateTo(homeRoute);
  }
});

