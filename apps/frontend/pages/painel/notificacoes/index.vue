<template>
  <div class="notifications-page">
    <div class="page-header">
      <div>
        <h1>Notificações</h1>
        <p>Acompanhe novidades, alertas e marcos importantes.</p>
      </div>
      <div class="header-actions">
        <button v-if="unreadCount > 0" class="btn btn-secondary" @click="handleMarkAllAsRead">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Marcar todas como lidas
        </button>
        <NuxtLink v-if="authStore.isSysAdmin" to="/painel/notificacoes/broadcast" class="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
          </svg>
          Enviar notificação
        </NuxtLink>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="filter-tabs">
      <button class="filter-tab" :class="{ active: filter === 'all' }" @click="filter = 'all'">
        Todas
      </button>
      <button class="filter-tab" :class="{ active: filter === 'unread' }" @click="filter = 'unread'">
        Não lidas
        <span v-if="unreadCount > 0" class="tab-badge tab-badge-alert">{{ unreadCount }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredItems.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </div>
      <h3>Nenhuma notificação</h3>
      <p>{{ filter === 'unread' ? 'Você está em dia! Nenhuma notificação não lida.' : 'Você não possui notificações ainda.' }}</p>
    </div>

    <!-- List -->
    <div v-else class="notifications-list">
      <div
        v-for="n in filteredItems"
        :key="n.id"
        class="notification-card"
        :class="{ unread: !n.isRead }"
        @click="handleItemClick(n)"
      >
        <div class="card-left">
          <div class="type-icon" :class="typeIconClass(n.type)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <template v-if="n.type === 'NEW_LEAD'">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </template>
              <template v-else-if="n.type === 'NEW_SCHEDULING'">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </template>
              <template v-else-if="n.type === 'LEAD_MILESTONE' || n.type === 'ACCESS_MILESTONE'">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </template>
              <template v-else>
                <!-- SYSTEM -->
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </template>
            </svg>
          </div>
        </div>
        <div class="card-body">
          <div class="card-title-row">
            <span class="card-title">{{ n.title }}</span>
            <span class="card-time">{{ formatTime(n.createdAt) }}</span>
          </div>
          <p class="card-message">{{ n.message }}</p>
          <div class="card-meta">
            <span class="type-label">{{ typeLabel(n.type) }}</span>
          </div>
        </div>
        <div class="card-right">
          <div v-if="!n.isRead" class="unread-dot" title="Não lida"></div>
          <button
            v-else-if="n.actionUrl"
            class="action-arrow"
            @click.stop="navigateTo(n.actionUrl)"
            title="Ver detalhes"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="notifications.totalPages > 1" class="pagination">
      <button
        class="page-btn"
        :disabled="notifications.page <= 1"
        @click="loadPage(notifications.page - 1)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="page-info">{{ notifications.page }} / {{ notifications.totalPages }}</span>
      <button
        class="page-btn"
        :disabled="notifications.page >= notifications.totalPages"
        @click="loadPage(notifications.page + 1)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead } = useNotifications()

const filter = ref('all')
const pageSize = 20

const filteredItems = computed(() => {
  if (filter.value === 'unread') return notifications.value.items.filter(n => !n.isRead)
  return notifications.value.items
})

async function loadPage(page) {
  await fetchNotifications(page, pageSize)
}

async function handleMarkAllAsRead() {
  await markAllAsRead()
}

async function handleItemClick(n) {
  if (!n.isRead) await markAsRead(n.id)
  if (n.actionUrl) router.push(n.actionUrl)
}

function navigateTo(url) {
  router.push(url)
}

function typeIconClass(type) {
  return {
    NEW_LEAD: 'icon-lead',
    NEW_SCHEDULING: 'icon-scheduling',
    LEAD_MILESTONE: 'icon-milestone',
    ACCESS_MILESTONE: 'icon-milestone',
    SYSTEM: 'icon-system',
  }[type] || 'icon-system'
}

function typeLabel(type) {
  return {
    NEW_LEAD: 'Novo lead',
    NEW_SCHEDULING: 'Agendamento',
    LEAD_MILESTONE: 'Marco de leads',
    ACCESS_MILESTONE: 'Marco de acessos',
    SYSTEM: 'Sistema',
  }[type] || 'Notificação'
}

function formatTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return 'Agora mesmo'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min atrás`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} dias atrás`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

onMounted(() => {
  fetchNotifications(1, pageSize)
})
</script>

<style scoped>
.notifications-page { display: flex; flex-direction: column; gap: 24px; }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-surface-50); margin: 0 0 4px; }
.page-header p  { font-size: 0.875rem; color: var(--color-surface-400); margin: 0; }

.header-actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }

.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 16px; border-radius: var(--radius-md);
  font-size: 0.875rem; font-weight: 600;
  cursor: pointer; border: none; transition: all 150ms ease;
  text-decoration: none; font-family: inherit;
}
.btn-primary { background: var(--color-primary-600); color: #fff; }
.btn-primary:hover { background: var(--color-primary-500); }
.btn-secondary {
  background: rgba(255,255,255,0.06);
  color: var(--color-surface-200);
  border: 1px solid rgba(255,255,255,0.1);
}
.btn-secondary:hover { background: rgba(255,255,255,0.1); }

/* Filter tabs */
.filter-tabs { display: flex; gap: 4px; }
.filter-tab {
  padding: 8px 16px; border-radius: var(--radius-md);
  background: none; border: 1px solid rgba(255,255,255,0.06);
  color: var(--color-surface-400); font-size: 0.875rem; font-weight: 500;
  cursor: pointer; transition: all 150ms ease;
  display: inline-flex; align-items: center; gap: 8px;
  font-family: inherit;
}
.filter-tab:hover { background: rgba(255,255,255,0.06); color: var(--color-surface-200); }
.filter-tab.active { background: rgba(16,185,129,0.1); color: var(--color-primary-400); border-color: rgba(16,185,129,0.2); }
.tab-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; border-radius: 999px; font-size: 0.6875rem; font-weight: 700; padding: 0 6px;
  background: rgba(255,255,255,0.08); color: var(--color-surface-300);
}
.tab-badge-alert { background: rgba(239,68,68,0.2); color: #f87171; }

/* Loading */
.loading-state { display: flex; justify-content: center; padding: 60px; }
.loading-spinner {
  width: 32px; height: 32px;
  border: 3px solid rgba(52, 211, 153, 0.15);
  border-top-color: var(--color-primary-500);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Empty */
.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 60px 16px; color: var(--color-surface-400);
}
.empty-icon { color: var(--color-surface-600); }
.empty-state h3 { font-size: 1rem; font-weight: 600; color: var(--color-surface-300); margin: 0; }
.empty-state p  { font-size: 0.875rem; margin: 0; }

/* Notification list */
.notifications-list { display: flex; flex-direction: column; gap: 2px; }

.notification-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  border-radius: var(--radius-md);
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  cursor: pointer;
  transition: all 150ms ease;
  position: relative;
}
.notification-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.09); }
.notification-card.unread { background: rgba(16,185,129,0.04); border-color: rgba(16,185,129,0.1); }
.notification-card.unread:hover { background: rgba(16,185,129,0.08); }

.card-left { flex-shrink: 0; padding-top: 2px; }
.type-icon {
  width: 40px; height: 40px;
  border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
}
.icon-lead         { background: rgba(16,185,129,0.12); color: var(--color-primary-400); }
.icon-scheduling   { background: rgba(59,130,246,0.12); color: #60a5fa; }
.icon-milestone    { background: rgba(234,179,8,0.12);  color: #fbbf24; }
.icon-system       { background: rgba(139,92,246,0.12); color: #a78bfa; }

.card-body { flex: 1; min-width: 0; }
.card-title-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 4px; flex-wrap: wrap; }
.card-title { font-size: 0.9375rem; font-weight: 600; color: var(--color-surface-50); }
.card-time { font-size: 0.75rem; color: var(--color-surface-500); white-space: nowrap; }
.card-message { font-size: 0.875rem; color: var(--color-surface-300); margin: 0 0 8px; line-height: 1.5; }
.card-meta { display: flex; align-items: center; gap: 8px; }
.type-label {
  font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--color-surface-500);
  background: rgba(255,255,255,0.06);
  padding: 2px 8px; border-radius: var(--radius-sm);
}

.card-right { flex-shrink: 0; display: flex; align-items: center; padding-top: 2px; }
.unread-dot {
  width: 9px; height: 9px; border-radius: 50%; background: var(--color-primary-500);
}
.action-arrow {
  background: none; border: none; cursor: pointer; color: var(--color-surface-500);
  padding: 4px; border-radius: var(--radius-sm); transition: color 150ms;
  display: flex;
}
.action-arrow:hover { color: var(--color-surface-200); }

/* Pagination */
.pagination {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 16px 0;
}
.page-btn {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: var(--radius-md);
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
  color: var(--color-surface-300); cursor: pointer; transition: all 150ms ease;
}
.page-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: var(--color-surface-50); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 0.875rem; color: var(--color-surface-400); }
</style>
