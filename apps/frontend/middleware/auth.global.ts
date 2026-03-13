import { useAuthStore } from '../stores/auth';

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server && !to.path.startsWith('/painel') && to.path !== '/login') {
    return;
  }

  const authStore = useAuthStore();

  if (!authStore.isLoggedIn) {
    authStore.loadFromStorage();
  } else {
    authStore.ensureSessionIsValid();
  }

  // Public routes: login, root, or any tenant/project page
  const publicRoutes = ['/login'];
  const isPainel = to.path.startsWith('/painel');
  const isPublic = publicRoutes.includes(to.path) || !isPainel;

  if (isPublic) {
    if (authStore.isLoggedIn && ['/login'].includes(to.path)) {
      return navigateTo('/painel');
    }
    return;
  }

  // All /painel routes require auth
  if (!authStore.isLoggedIn) {
    return navigateTo('/login');
  }

  // Terms acceptance enforcement — redirect to lock-screen page before accessing any panel route
  const isTermsPage = to.path === '/painel/aceitar-termos';
  if (!authStore.hasAcceptedTerms && !isTermsPage) {
    return navigateTo('/painel/aceitar-termos');
  }
  // Prevent accessing the terms page after already accepting
  if (authStore.hasAcceptedTerms && isTermsPage) {
    return navigateTo('/painel');
  }

  // Role-based route protection
  if (to.path.startsWith('/painel/tenants') && !authStore.canManageTenants) {
    return navigateTo('/painel');
  }
  if (to.path.startsWith('/painel/backups') && !authStore.isSysAdmin) {
    return navigateTo('/painel');
  }
  if (to.path.startsWith('/painel/usuarios') && !authStore.canManageUsers) {
    return navigateTo('/painel');
  }
  if (to.path.startsWith('/painel/assinatura')) {
    return navigateTo('/painel');
  }
  if (to.path.startsWith('/painel/cobranca')) {
    return navigateTo('/painel');
  }
  if (to.path.startsWith('/painel/reservar') && !authStore.isCorretor && !authStore.isImobiliaria) {
    return navigateTo('/painel');
  }
  if (to.path.startsWith('/painel/distribuicao') && !authStore.isLoteadora && !authStore.isSysAdmin) {
    return navigateTo('/painel');
  }
});

