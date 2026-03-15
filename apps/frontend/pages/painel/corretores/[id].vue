<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { get } = useApi()
const toast = useToast()

// Guard
if (!auth.isLoteadora && !auth.isImobiliaria && !auth.isSysAdmin) {
  router.replace(auth.getDashboardRoute())
}

const id = computed(() => route.params.id as string)
const loading = ref(true)
const stats = ref<any>(null)

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  NEW:         { label: 'Novo',        color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  QUALIFIED:   { label: 'Qualificado', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  RESERVATION: { label: 'Reserva',     color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  SOLD:        { label: 'Vendido',     color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  LOST:        { label: 'Perdido',     color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  CANCELED:    { label: 'Cancelado',   color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
}

function statusLabel(s: string | number) { return statusConfig[String(s)]?.label ?? String(s) }
function statusColor(s: string | number) { return statusConfig[String(s)]?.color ?? '#9ca3af' }
function statusBg(s: string | number)    { return statusConfig[String(s)]?.bg    ?? 'rgba(156,163,175,0.12)' }

function formatDate(d: string) {
  if (!d) return '-'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
}

async function fetchStats() {
  loading.value = true
  try {
    stats.value = await get(`/realtor-links/${id.value}/stats`)
  } catch {
    toast.error('Erro ao carregar dados do corretor')
    router.replace('/painel/corretores')
  } finally {
    loading.value = false
  }
}

// View all leads of this corretor
function viewAllLeads() {
  router.push({ path: '/painel/leads', query: { realtorLinkId: id.value } })
}

onMounted(fetchStats)

definePageMeta({ layout: 'default' })
</script>

<template>
  <div class="page-container">

    <!-- Back + header -->
    <div class="page-header">
      <NuxtLink to="/painel/corretores" class="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
        Voltar
      </NuxtLink>

      <div v-if="!loading && stats" class="header-row">
        <div class="header-left">
          <div class="avatar-lg">{{ stats.name?.[0]?.toUpperCase() ?? '?' }}</div>
          <div>
            <div class="realtor-title">{{ stats.name }}</div>
            <div class="realtor-sub">Código: <span class="code-chip">{{ stats.code }}</span></div>
          </div>
        </div>
        <div class="header-right">
          <span :class="['status-badge', stats.enabled ? 'active' : 'inactive']">
            {{ stats.enabled ? 'Ativo' : 'Inativo' }}
          </span>
          <button class="btn btn-primary" @click="viewAllLeads">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
            Ver todos os leads
          </button>
        </div>
      </div>

      <div v-if="loading" class="skeleton-header"></div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="skeleton-card"></div>
    </div>

    <template v-else-if="stats">
      <!-- Info card -->
      <div class="info-card">
        <div class="info-grid">
          <div class="info-item" v-if="stats.email">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span>{{ stats.email }}</span>
          </div>
          <div class="info-item" v-if="stats.phone">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 010 .22 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92"/></svg>
            <span>{{ stats.phone }}</span>
          </div>
          <div class="info-item" v-if="stats.creci">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
            <span>CRECI: {{ stats.creci }}</span>
          </div>
          <div class="info-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
            <span>Cadastrado em {{ formatDate(stats.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Stats grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(96,165,250,0.1); color: #60a5fa;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div class="stat-value">{{ stats.totalLeads }}</div>
          <div class="stat-label">Total de Leads</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(251,191,36,0.1); color: #fbbf24;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <div class="stat-value">{{ stats.leadsByStatus?.RESERVATION ?? 0 }}</div>
          <div class="stat-label">Reservas</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(52,211,153,0.1); color: #34d399;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="stat-value">{{ stats.leadsByStatus?.SOLD ?? 0 }}</div>
          <div class="stat-label">Vendas</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(167,139,250,0.1); color: #a78bfa;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div class="stat-value">{{ stats.schedulingCount }}</div>
          <div class="stat-label">Visitas Agendadas</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(251,146,60,0.1); color: #fb923c;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div class="stat-value">{{ stats.sessionCount }}</div>
          <div class="stat-label">Sessões via Link</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(248,113,113,0.1); color: #f87171;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <div class="stat-value">{{ stats.leadsByStatus?.LOST ?? 0 }}</div>
          <div class="stat-label">Leads Perdidos</div>
        </div>
      </div>

      <!-- Status breakdown -->
      <div v-if="stats.totalLeads > 0" class="section-card">
        <h2 class="section-title">Distribuição por Status</h2>
        <div class="status-breakdown">
          <template v-for="(count, status) in stats.leadsByStatus" :key="status">
            <div v-if="count > 0" class="status-row">
              <div class="status-info">
                <span class="status-dot" :style="{ background: statusColor(status) }"></span>
                <span class="status-name">{{ statusLabel(status) }}</span>
              </div>
              <div class="status-bar-wrap">
                <div class="status-bar" :style="{ width: (count / stats.totalLeads * 100) + '%', background: statusColor(status) }"></div>
              </div>
              <span class="status-count">{{ count }}</span>
            </div>
          </template>
        </div>
      </div>

      <!-- Recent leads -->
      <div v-if="stats.recentLeads?.length" class="section-card">
        <div class="section-header">
          <h2 class="section-title">Leads Recentes</h2>
          <button class="btn btn-ghost btn-sm" @click="viewAllLeads">
            Ver todos
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Projeto</th>
              <th>Status</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lead in stats.recentLeads" :key="lead.id">
              <td>
                <div class="lead-name">{{ lead.name }}</div>
                <div class="lead-email">{{ lead.email }}</div>
              </td>
              <td>{{ lead.project?.name ?? '-' }}</td>
              <td>
                <span class="status-chip" :style="{ color: statusColor(lead.status), background: statusBg(lead.status) }">
                  {{ statusLabel(lead.status) }}
                </span>
              </td>
              <td>{{ formatDate(lead.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page-container { padding: 24px; display: flex; flex-direction: column; gap: 24px; }

.back-link {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--color-surface-400); font-size: 0.875rem; text-decoration: none;
  transition: color 150ms; margin-bottom: 8px;
}
.back-link:hover { color: var(--color-surface-200); }

.page-header { display: flex; flex-direction: column; gap: 4px; }

.header-row {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  flex-wrap: wrap;
}
.header-left { display: flex; align-items: center; gap: 16px; }
.header-right { display: flex; align-items: center; gap: 12px; }

.avatar-lg {
  width: 52px; height: 52px; border-radius: 50%;
  background: rgba(16,185,129,0.15);
  color: var(--color-primary-400);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.25rem; font-weight: 700;
  border: 2px solid var(--color-primary-600);
  flex-shrink: 0;
}
.realtor-title { font-size: 1.25rem; font-weight: 700; color: var(--color-surface-50); }
.realtor-sub { font-size: 0.8125rem; color: var(--color-surface-400); margin-top: 2px; }
.code-chip {
  display: inline-block; padding: 1px 8px; border-radius: 20px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  font-size: 0.75rem; font-family: monospace; color: var(--color-surface-200);
}

.status-badge {
  display: inline-flex; align-items: center;
  padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;
}
.status-badge.active { background: rgba(52,211,153,0.12); color: #34d399; border: 1px solid rgba(52,211,153,0.2); }
.status-badge.inactive { background: rgba(156,163,175,0.12); color: #9ca3af; border: 1px solid rgba(156,163,175,0.2); }

.skeleton-header { height: 52px; border-radius: 8px; background: rgba(255,255,255,0.05); animation: pulse 1.5s infinite; }
.skeleton-card { height: 200px; border-radius: 12px; background: rgba(255,255,255,0.05); animation: pulse 1.5s infinite; }
@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }

/* Info card */
.info-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: var(--radius-lg, 12px);
  padding: 20px 24px;
}
.info-grid { display: flex; flex-wrap: wrap; gap: 16px 32px; }
.info-item { display: flex; align-items: center; gap: 8px; color: var(--color-surface-300); font-size: 0.875rem; }
.info-item svg { color: var(--color-surface-500); flex-shrink: 0; }

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}
.stat-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: var(--radius-lg, 12px);
  padding: 20px;
  display: flex; flex-direction: column; gap: 8px;
  transition: border-color 150ms;
}
.stat-card:hover { border-color: rgba(255,255,255,0.12); }
.stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.stat-value { font-size: 1.75rem; font-weight: 700; color: var(--color-surface-50); line-height: 1; }
.stat-label { font-size: 0.8125rem; color: var(--color-surface-400); }

/* Section cards */
.section-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: var(--radius-lg, 12px);
  padding: 24px;
}
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.section-title { font-size: 1rem; font-weight: 600; color: var(--color-surface-100); margin: 0 0 16px; }
.section-header .section-title { margin: 0; }

/* Status breakdown */
.status-breakdown { display: flex; flex-direction: column; gap: 10px; }
.status-row { display: flex; align-items: center; gap: 12px; }
.status-info { display: flex; align-items: center; gap: 8px; width: 120px; flex-shrink: 0; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.status-name { font-size: 0.875rem; color: var(--color-surface-300); white-space: nowrap; }
.status-bar-wrap { flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
.status-bar { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
.status-count { font-size: 0.875rem; font-weight: 600; color: var(--color-surface-200); width: 40px; text-align: right; flex-shrink: 0; }

/* Table */
.table { width: 100%; border-collapse: collapse; }
.table th { text-align: left; padding: 10px 16px; color: var(--color-surface-400); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid rgba(255,255,255,0.06); }
.table td { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 0.875rem; color: var(--color-surface-200); }
.table tr:last-child td { border-bottom: none; }

.lead-name { font-weight: 500; color: var(--color-surface-50); }
.lead-email { font-size: 0.75rem; color: var(--color-surface-500); margin-top: 2px; }

.status-chip {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;
}

/* Buttons */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 18px; border-radius: var(--radius-md, 8px);
  font-size: 0.875rem; font-weight: 600;
  cursor: pointer; border: none; transition: all 150ms ease;
  text-decoration: none; font-family: inherit;
}
.btn-sm { padding: 6px 12px; font-size: 0.8125rem; }
.btn-primary { background: var(--color-primary-600); color: #fff; }
.btn-primary:hover { background: var(--color-primary-500); }
.btn-ghost {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: var(--color-surface-400);
}
.btn-ghost:hover { background: rgba(255,255,255,0.08); color: var(--color-surface-200); }

@media (max-width: 640px) {
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .header-row { flex-direction: column; align-items: flex-start; }
  .info-grid { flex-direction: column; gap: 10px; }
}
</style>
