<template>
  <div class="layout">
    <!-- Mobile hamburger overlay -->
    <div v-if="mobileMenuOpen && authStore.isLoggedIn" class="mobile-overlay" @click="mobileMenuOpen = false"></div>

    <aside v-if="authStore.isLoggedIn" class="sidebar" :class="{ collapsed: sidebarCollapsed, 'mobile-open': mobileMenuOpen }">
      <div class="sidebar-brand">
        <NuxtLink to="/painel" class="sidebar-logo-link">
          <img v-if="sidebarCollapsed" src="/img/logo-icon.svg" alt="Lotio" class="sidebar-logo-icon" />
          <img v-else src="/img/logo-white.svg" alt="Lotio" class="sidebar-logo" />
        </NuxtLink>
      </div>

      <div v-if="!sidebarCollapsed" class="user-card">
        <div class="user-avatar">{{ initials }}</div>
        <div class="user-details">
          <div class="user-name">{{ authStore.user?.name }}</div>
          <div class="user-role">{{ roleLabel }}</div>
        </div>
        <NuxtLink to="/painel/notificacoes" class="user-bell" title="Notificações">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span v-if="unreadCount > 0" class="bell-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </NuxtLink>
      </div>

      <nav class="sidebar-nav">
        <!-- Dashboard always present -->
        <NuxtLink to="/painel" class="nav-item" :title="sidebarCollapsed ? 'Dashboard' : undefined">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          <span v-if="!sidebarCollapsed">Dashboard</span>
        </NuxtLink>

        <NuxtLink to="/painel/notificacoes" class="nav-item" :title="sidebarCollapsed ? 'Notificações' : undefined">
          <div class="nav-icon-wrapper">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span v-if="unreadCount > 0" class="nav-badge-dot"></span>
          </div>
          <span v-if="!sidebarCollapsed">Notificações</span>
          <span v-if="!sidebarCollapsed && unreadCount > 0" class="nav-unread-chip">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </NuxtLink>

        <!-- SYSADMIN Menu -->
        <template v-if="authStore.isSysAdmin">
          <NuxtLink to="/painel/tenants" class="nav-item" :title="sidebarCollapsed ? 'Loteadoras' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7M4 21v-4m5 4v-4m5 4v-4m5 4v-4m-11-7a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v2z"/></svg>
            <span v-if="!sidebarCollapsed">Loteadoras</span>
          </NuxtLink>
          <NuxtLink to="/painel/mensagens" class="nav-item" :title="sidebarCollapsed ? 'Mensagens' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span v-if="!sidebarCollapsed">Mensagens</span>
          </NuxtLink>
          <NuxtLink to="/painel/cobranca" class="nav-item" :title="sidebarCollapsed ? 'Cobrança' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            <span v-if="!sidebarCollapsed">Cobrança</span>
          </NuxtLink>
          <NuxtLink to="/painel/configuracoes" class="nav-item" :title="sidebarCollapsed ? 'Configurações' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span v-if="!sidebarCollapsed">Configurações</span>
          </NuxtLink>
        </template>

        <!-- LOTEADORA Menu -->
        <template v-if="authStore.isLoteadora">
          <NuxtLink to="/painel/projetos" class="nav-item" :title="sidebarCollapsed ? 'Projetos' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
            <span v-if="!sidebarCollapsed">Projetos</span>
          </NuxtLink>

          <NuxtLink to="/painel/leads" class="nav-item" :title="sidebarCollapsed ? 'Leads' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span v-if="!sidebarCollapsed">Leads</span>
          </NuxtLink>

          <NuxtLink to="/painel/agendamentos" class="nav-item" :title="sidebarCollapsed ? 'Agendamentos' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span v-if="!sidebarCollapsed">Agendamentos</span>
          </NuxtLink>

          <NuxtLink to="/painel/imobiliarias" class="nav-item" :title="sidebarCollapsed ? 'Imobiliárias' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7M4 21v-4m5 4v-4m5 4v-4m5 4v-4m-11-7a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v2z"/></svg>
            <span v-if="!sidebarCollapsed">Imobiliárias</span>
          </NuxtLink>

          <NuxtLink to="/painel/corretores" class="nav-item" :title="sidebarCollapsed ? 'Corretores' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span v-if="!sidebarCollapsed">Corretores</span>
          </NuxtLink>

          <NuxtLink to="/painel/pagamentos" class="nav-item" :title="sidebarCollapsed ? 'Pagamentos' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            <span v-if="!sidebarCollapsed">Pagamentos</span>
          </NuxtLink>

          <NuxtLink to="/painel/campanhas" class="nav-item" :title="sidebarCollapsed ? 'Campanhas' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 10V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h3l-1 5h2l1-5h4l4 4V6l-4 4z"/></svg>
            <span v-if="!sidebarCollapsed">Campanhas</span>
          </NuxtLink>

          <NuxtLink to="/painel/ai" class="nav-item" :title="sidebarCollapsed ? 'Assistente IA' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8zm-1-11a1 1 0 112 0v2a1 1 0 01-2 0V9zm1 7a1 1 0 100-2 1 1 0 000 2z"/></svg>
            <span v-if="!sidebarCollapsed">Assistente IA</span>
          </NuxtLink>

          <NuxtLink to="/painel/links-cadastro" class="nav-item" :title="sidebarCollapsed ? 'Links de Cadastro' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            <span v-if="!sidebarCollapsed">Links de Cadastro</span>
          </NuxtLink>
        </template>

        <!-- CORRETOR Menu -->
        <template v-if="authStore.isCorretor">
           <NuxtLink to="/painel/leads" class="nav-item" :title="sidebarCollapsed ? 'Meus Leads' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span v-if="!sidebarCollapsed">Meus Leads</span>
          </NuxtLink>

          <NuxtLink to="/painel/meus-links" class="nav-item" :title="sidebarCollapsed ? 'Meus Links' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            <span v-if="!sidebarCollapsed">Meus Links</span>
          </NuxtLink>

          <NuxtLink to="/painel/reservar" class="nav-item" :title="sidebarCollapsed ? 'Reservar Lote' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <span v-if="!sidebarCollapsed">Reservar Lote</span>
          </NuxtLink>

          <NuxtLink to="/painel/agendamentos" class="nav-item" :title="sidebarCollapsed ? 'Agendamentos' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span v-if="!sidebarCollapsed">Agendamentos</span>
          </NuxtLink>

          <NuxtLink to="/painel/campanhas" class="nav-item" :title="sidebarCollapsed ? 'Campanhas' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 15h2m-2-4h2m-2-4h2M9 21h6a2 2 0 002-2V5a2 2 0 00-2-2H9a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            <span v-if="!sidebarCollapsed">Campanhas</span>
          </NuxtLink>
        </template>

        <!-- IMOBILIARIA Menu -->
        <template v-if="authStore.isImobiliaria">
          <NuxtLink to="/painel/leads" class="nav-item" :title="sidebarCollapsed ? 'Leads da Equipe' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span v-if="!sidebarCollapsed">Leads da Equipe</span>
          </NuxtLink>

          <NuxtLink to="/painel/corretores" class="nav-item" :title="sidebarCollapsed ? 'Minha Equipe' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span v-if="!sidebarCollapsed">Minha Equipe</span>
          </NuxtLink>

          <NuxtLink to="/painel/reservar" class="nav-item" :title="sidebarCollapsed ? 'Reservar Lote' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <span v-if="!sidebarCollapsed">Reservar Lote</span>
          </NuxtLink>

          <NuxtLink to="/painel/agendamentos" class="nav-item" :title="sidebarCollapsed ? 'Agendamentos' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span v-if="!sidebarCollapsed">Agendamentos</span>
          </NuxtLink>

          <NuxtLink to="/painel/metricas-imobiliaria" class="nav-item" :title="sidebarCollapsed ? 'Métricas da Equipe' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            <span v-if="!sidebarCollapsed">Métricas da Equipe</span>
          </NuxtLink>
        </template>

        <!-- Common items like Metrics if allowed -->
        <NuxtLink v-if="!authStore.isSysAdmin && !authStore.isImobiliaria" to="/painel/metricas" class="nav-item" :title="sidebarCollapsed ? 'Métricas' : undefined">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span v-if="!sidebarCollapsed">Métricas</span>
        </NuxtLink>

        <!-- User Management -->
        <template v-if="authStore.canManageUsers">
          <div class="nav-group-label" v-if="!sidebarCollapsed">Configurações</div>
          <NuxtLink to="/painel/usuarios" class="nav-item" :title="sidebarCollapsed ? 'Usuários' : undefined">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span v-if="!sidebarCollapsed">Gerenciar Usuários</span>
          </NuxtLink>
        </template>
        <NuxtLink v-if="authStore.isLoteadora" to="/painel/assinatura" class="nav-item" :title="sidebarCollapsed ? 'Minha Assinatura' : undefined">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          <span v-if="!sidebarCollapsed">Minha Assinatura</span>
        </NuxtLink>
        <NuxtLink to="/painel/suporte" class="nav-item" :title="sidebarCollapsed ? 'Suporte' : undefined">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span v-if="!sidebarCollapsed">Suporte</span>
        </NuxtLink>
        <NuxtLink to="/painel/perfil" class="nav-item" :title="sidebarCollapsed ? 'Perfil' : undefined">
           <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
           <span v-if="!sidebarCollapsed">Meu Perfil</span>
        </NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <button class="nav-item logout-btn" @click="handleLogout" :title="sidebarCollapsed ? 'Sair' : undefined">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span v-if="!sidebarCollapsed">Sair</span>
        </button>
        <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :style="{ transform: sidebarCollapsed ? 'rotate(180deg)' : '' }"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
        </button>
      </div>
    </aside>

    <main class="main-content" :class="{ 'no-sidebar': !authStore.isLoggedIn, 'sidebar-collapsed': authStore.isLoggedIn && sidebarCollapsed }">
      <!-- Mobile hamburger button -->
      <button v-if="authStore.isLoggedIn" class="mobile-hamburger" @click="mobileMenuOpen = !mobileMenuOpen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <PainelBillingWarningBanner v-if="authStore.isLoteadora" />
      <slot />
    </main>

    <!-- Terms Acceptance Modal -->
    <CommonTermsAcceptanceModal
      :visible="showTermsModal"
      @accepted="onTermsAccepted"
      @declined="onTermsDeclined"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const { success: toastSuccess } = useToast()
const sidebarCollapsed = ref(false)
const mobileMenuOpen = ref(false)

const { unreadCount, startPolling, stopPolling } = useNotifications()

onMounted(() => {
  if (authStore.isLoggedIn) startPolling(60000)
})
onUnmounted(() => stopPolling())

// Terms acceptance modal
const showTermsModal = computed(() => {
  return authStore.isLoggedIn && !authStore.hasAcceptedTerms
})

const onTermsAccepted = () => {
  toastSuccess('Termos aceitos com sucesso!')
}

const onTermsDeclined = async () => {
  const { fetchApi } = useApi()
  try { await fetchApi('/auth/logout', { method: 'POST' }) } catch {}
  authStore.logout()
  toastSuccess('Sessão encerrada')
  router.push('/login')
}

const initials = computed(() => {
  const n = authStore.user?.name ?? ''
  if (!n) return '?'
  const parts = n.split(' ').filter(Boolean)
  return parts.length > 1 
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0][0].toUpperCase()
})

const roleLabel = computed(() => {
  const map = { 
    SYSADMIN: 'System Admin', 
    LOTEADORA: 'Loteadora', 
    IMOBILIARIA: 'Imobiliária',
    CORRETOR: 'Corretor' 
  }
  return map[authStore.user?.role] ?? 'Usuário'
})

const handleLogout = async () => {
  const { fetchApi } = useApi()
  try { await fetchApi('/auth/logout', { method: 'POST' }) } catch {}
  authStore.logout()
  toastSuccess('Sessão encerrada')
  mobileMenuOpen.value = false
  router.push('/login')
}
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; background: var(--color-surface-950); }

.sidebar {
  width: 260px;
  background: rgba(10, 15, 13, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(52, 211, 153, 0.1);
  display: flex;
  flex-direction: column;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 100;
  overflow-y: auto;
  overflow-x: hidden;
}
.sidebar.collapsed { width: 68px; }

.sidebar-brand {
  display: flex;
  align-items: center;
  padding: 20px 16px;
  border-bottom: 1px solid rgba(52, 211, 153, 0.1);
}
.sidebar-logo-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  width: 100%;
}
.sidebar-logo { height: 30px; }
.sidebar-logo-icon { height: 30px; width: 30px; }

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  margin: 12px 12px 0;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-md);
  border: 1px solid rgba(52, 211, 153, 0.1);
}

.user-bell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm, 6px);
  color: var(--color-surface-400);
  text-decoration: none;
  flex-shrink: 0;
  transition: background 150ms, color 150ms;
  margin-left: auto;
}
.user-bell:hover { background: rgba(255,255,255,0.08); color: var(--color-surface-100); }
.bell-badge {
  position: absolute;
  top: 0px; right: 0px;
  min-width: 15px; height: 15px;
  background: #ef4444;
  color: #fff;
  border-radius: 8px;
  font-size: 0.6rem;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  padding: 0 3px;
  border: 1.5px solid rgba(10, 15, 13, 0.9);
  line-height: 1;
}
.user-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.15);
  color: var(--color-primary-400);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700;
  flex-shrink: 0;
  border: 1.5px solid var(--color-primary-600);
}
.user-details { flex: 1; min-width: 0; overflow: hidden; }
.user-name { font-size: 0.8125rem; font-weight: 600; color: var(--color-surface-50); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role { font-size: 0.6875rem; color: var(--color-surface-200); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 500; }

.sidebar-nav { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 2px; }
.nav-group-label { padding: 12px 12px 4px; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-surface-400); margin-top: 12px; }

.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  color: var(--color-surface-200);
  font-size: 0.875rem; font-weight: 500;
  text-decoration: none;
  transition: all 150ms ease;
  cursor: pointer; border: none; background: none; width: 100%; text-align: left;
  font-family: inherit;
}
.nav-item:hover { background: rgba(255, 255, 255, 0.05); color: var(--color-surface-50); }
.nav-item.router-link-active {
  background: rgba(16, 185, 129, 0.12);
  color: var(--color-primary-400);
  font-weight: 600;
  border-left: 3px solid var(--color-primary-500);
  margin-left: -3px;
}
.nav-icon { width: 20px; height: 20px; flex-shrink: 0; }

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid rgba(52, 211, 153, 0.1);
  display: flex; flex-direction: column; gap: 2px;
}
.logout-btn:hover { color: #f87171; background: rgba(239, 68, 68, 0.1); }
.collapse-btn {
  display: flex; align-items: center; justify-content: center;
  padding: 8px;
  border: none; background: none; cursor: pointer;
  color: var(--color-surface-400); border-radius: var(--radius-md);
  transition: all 150ms ease;
}
.collapse-btn:hover { background: rgba(255, 255, 255, 0.06); color: var(--color-surface-200); }

.main-content {
  flex: 1; margin-left: 260px;
  padding: 32px;
  transition: margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 100vh;
  max-width: 100%;
  overflow-x: hidden;
  background:
    linear-gradient(rgba(10, 15, 13, 1), rgba(10, 15, 13, 0.62)),
    url('/img/banner-hero.jpg') center / cover fixed;
  background-attachment: fixed;
  position: relative;
}
.main-content > :deep(*) {
  position: relative;
}
.main-content.sidebar-collapsed { margin-left: 68px; }
.main-content.no-sidebar { margin-left: 0; }

@media (max-width: 768px) {
  .sidebar { width: 260px; left: -260px; transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .sidebar.mobile-open { left: 0; }
  .sidebar .brand-text,
  .sidebar .user-card,
  .sidebar .nav-group-label,
  .sidebar .nav-item span,
  .sidebar .logout-btn span { display: revert; }
  .main-content { margin-left: 0 !important; padding: 20px; padding-top: 60px; }
  .mobile-hamburger { display: flex; }
}

@media (max-width: 480px) {
  .main-content { padding: 16px; padding-top: 56px; }
}

.mobile-overlay { display: none; }

.mobile-hamburger {
  display: none;
  position: fixed; top: 12px; left: 12px; z-index: 99;
  background: rgba(10, 15, 13, 0.85); border: 1px solid rgba(52, 211, 153, 0.12);
  border-radius: var(--radius-md);
  padding: 8px; cursor: pointer; color: var(--color-surface-200);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  align-items: center; justify-content: center;
  transition: all 150ms ease;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
.mobile-hamburger:hover { background: rgba(10, 15, 13, 0.95); color: var(--color-surface-50); }

.nav-icon-wrapper { position: relative; display: flex; align-items: center; flex-shrink: 0; }
.nav-badge-dot {
  position: absolute; top: -3px; right: -3px;
  width: 8px; height: 8px; border-radius: 50%;
  background: #ef4444;
  border: 1.5px solid rgba(10, 15, 13, 0.9);
}
.nav-unread-chip {
  margin-left: auto;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 20px;
  font-size: 0.6875rem; font-weight: 700;
  padding: 1px 7px;
  min-width: 20px; text-align: center;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .mobile-overlay {
    display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99;
    backdrop-filter: blur(4px);
  }
  .sidebar.mobile-open { z-index: 200; }
  .mobile-hamburger { display: flex; }
}
</style>
