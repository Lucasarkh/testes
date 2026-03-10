<template>
  <div class="dashboard-imobiliaria">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>Olá, {{ auth.user?.name?.split(' ')[0] }} <i class="bi bi-hand-index-thumb-fill" aria-hidden="true"></i></h1>
        <p>Resumo da performance da sua equipe.</p>
      </div>
      <NuxtLink to="/painel/corretores" class="btn btn-primary">
        <i class="pi pi-user-plus me-2"></i>Novo Corretor
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Carregando painel...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-primary" style="margin-top: 16px;" @click="loadData">Tentar novamente</button>
    </div>

    <template v-else>
      <!-- Stats -->
      <div class="grid grid-cols-4">
        <div class="stat-card stat-card--accent">
          <div class="stat-icon-wrap stat-icon--blue"><i class="pi pi-users"></i></div>
          <div class="stat-value">{{ stats.totalRealtors || 0 }}</div>
          <CommonAppTooltip text="Número de corretores vinculados e ativos na sua equipe." position="bottom"><div class="stat-label">Corretores ativos</div></CommonAppTooltip>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon--green"><i class="pi pi-target"></i></div>
          <div class="stat-value stat-value--success">{{ stats.totalLeads || 0 }}</div>
          <CommonAppTooltip text="Total de leads gerados por toda a equipe desde o início." position="bottom"><div class="stat-label">Leads acumulados</div></CommonAppTooltip>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon--amber"><i class="pi pi-calendar"></i></div>
          <div class="stat-value">{{ stats.totalSchedulings || 0 }}</div>
          <CommonAppTooltip text="Total de agendamentos de visitas ao stand de vendas registrados." position="bottom"><div class="stat-label">Visitas ao stand</div></CommonAppTooltip>
        </div>
        <div class="stat-card">
          <div class="stat-icon-wrap stat-icon--purple"><i class="pi pi-chart-bar"></i></div>
          <div class="stat-value">{{ stats.totalSessions || 0 }}</div>
          <CommonAppTooltip text="Total de sessões (visitas ao site) nos últimos 30 dias geradas pela equipe." position="bottom"><div class="stat-label">Acessos (30 dias)</div></CommonAppTooltip>
        </div>
      </div>

      <!-- Main content: two columns -->
      <div class="dashboard-grid">
        <!-- Left column -->
        <div class="dashboard-main">
          <!-- Recent Leads -->
          <div class="card" style="padding: 0;">
            <div class="card-header" style="padding: 20px 24px;">
              <div>
                <h3 class="card-title">Leads Recentes</h3>
                <p class="card-subtitle">Últimos leads gerados pela equipe</p>
              </div>
              <NuxtLink to="/painel/leads" class="btn btn-ghost btn-sm">
                Ver todos <i class="pi pi-arrow-right" style="margin-left: 4px; font-size: 0.75rem;"></i>
              </NuxtLink>
            </div>

            <div class="table-wrapper" style="border: none; border-radius: 0;">
              <table>
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Corretor</th>
                    <th>Contato</th>
                    <th>Status</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="lead in recentLeads" :key="lead.id">
                    <td>
                      <div class="lead-cell">
                        <div class="lead-avatar">{{ lead.name?.charAt(0) || '?' }}</div>
                        <strong>{{ lead.name }}</strong>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-neutral">{{ lead.realtorLink?.name || 'Direto' }}</span>
                    </td>
                    <td class="text-secondary-cell">{{ lead.phone || '—' }}</td>
                    <td><LeadsLeadStatusBadge :status="lead.status" /></td>
                    <td class="text-secondary-cell">{{ formatDate(lead.createdAt) }}</td>
                  </tr>
                  <tr v-if="!recentLeads.length">
                    <td colspan="5">
                      <div class="empty-state" style="padding: 32px;">
                        <div class="empty-state-icon"><i class="bi bi-inbox-fill" aria-hidden="true"></i></div>
                        <h3>Nenhum lead registrado</h3>
                        <p>Os leads aparecerão aqui quando seus corretores começarem a indicar.</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Top Performance -->
          <div style="margin-top: 32px;">
            <h2 style="margin-bottom: 20px;">Top Performance</h2>
            <div v-if="topRealtors.length" class="grid grid-cols-2">
              <div v-for="(r, i) in topRealtors" :key="r.id" class="realtor-perf-card">
                <div class="realtor-perf-left">
                  <div class="rank-num" :class="'rank-' + (i + 1)">#{{ i + 1 }}</div>
                  <div>
                    <div class="realtor-perf-name">{{ r.name }}</div>
                    <div class="realtor-perf-meta">{{ r.sessions }} acessos · {{ r.leads }} leads</div>
                  </div>
                </div>
                <div class="realtor-perf-conv">
                  <span class="conv-value">{{ r.conversionRate }}%</span>
                  <span class="conv-label">conv.</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state" style="padding: 32px; background: var(--glass-bg); border-radius: var(--radius-lg); border: 1px solid var(--glass-border);">
              <div class="empty-state-icon"><i class="bi bi-bar-chart-line-fill" aria-hidden="true"></i></div>
              <h3>Aguardando dados</h3>
              <p>A performance aparecerá quando seus corretores tiverem atividade.</p>
            </div>
          </div>
        </div>

        <!-- Right column (sidebar) -->
        <div class="dashboard-sidebar">
          <h4 class="sidebar-section-title">Atalhos</h4>
          <div class="shortcut-grid">
            <NuxtLink to="/painel/corretores" class="shortcut-item">
              <div class="shortcut-icon shortcut-icon--blue"><i class="pi pi-users"></i></div>
              <span>Equipe</span>
            </NuxtLink>
            <NuxtLink to="/painel/leads" class="shortcut-item">
              <div class="shortcut-icon shortcut-icon--green"><i class="pi pi-list"></i></div>
              <span>Leads</span>
            </NuxtLink>
            <NuxtLink to="/painel/metricas-imobiliaria" class="shortcut-item">
              <div class="shortcut-icon shortcut-icon--purple"><i class="pi pi-chart-line"></i></div>
              <span>Métricas</span>
            </NuxtLink>
            <div class="shortcut-item" @click="showSchedulingModal = true" style="cursor: pointer;">
              <div class="shortcut-icon shortcut-icon--amber"><i class="pi pi-calendar-plus"></i></div>
              <span>Agendar</span>
            </div>
          </div>

          <!-- Upcoming Schedulings -->
          <h4 class="sidebar-section-title" style="margin-top: 32px;">Próximos Agendamentos</h4>
          <div class="card" style="padding: 20px;">
            <div v-if="upcomingSchedulings.length === 0" class="empty-state" style="padding: 24px;">
              <div class="empty-state-icon"><i class="bi bi-calendar-event-fill" aria-hidden="true"></i></div>
              <p>Nenhum agendamento próximo.</p>
            </div>
            <div v-for="(s, idx) in upcomingSchedulings" :key="s.id" class="schedule-preview-item" :style="idx > 0 ? 'margin-top: 12px' : ''">
              <div class="schedule-date-pill">
                <div class="schedule-month">{{ getMonthShort(s.scheduledAt) }}</div>
                <div class="schedule-day">{{ getDay(s.scheduledAt) }}</div>
              </div>
              <div style="flex: 1; min-width: 0;">
                <div class="schedule-title">{{ s.lead?.name || 'Agendamento Manual' }}</div>
                <div class="schedule-meta">{{ s.project?.name }} · {{ formatTime(s.scheduledAt) }}</div>
                <span class="schedule-status" :class="s.status?.toLowerCase()">{{ translateStatus(s.status) }}</span>
              </div>
            </div>
            <NuxtLink v-if="upcomingSchedulings.length > 0" to="/painel/agendamentos" class="btn btn-ghost btn-sm" style="margin-top: 16px; width: 100%; justify-content: center;">
              Ver agenda completa <i class="pi pi-arrow-right" style="margin-left: 4px; font-size: 0.75rem;"></i>
            </NuxtLink>
          </div>
        </div>
      </div>
    </template>

    <!-- Scheduling Modal -->
    <PainelSchedulingModal
      v-if="showSchedulingModal"
      @close="showSchedulingModal = false"
      @success="loadData"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const { fetchApi } = useApi()
const toast = useToast()

const loading = ref(true)
const error = ref('')
const stats = ref({})
const recentLeads = ref([])
const topRealtors = ref([])
const upcomingSchedulings = ref([])
const showSchedulingModal = ref(false)

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [statsRes, leadsRes, metricsRes, schedulingsRes] = await Promise.all([
      fetchApi('/tracking/stats').catch(() => ({})),
      fetchApi('/leads?limit=6').catch(() => ({ data: [] })),
      fetchApi('/agencies/metrics').catch(() => ({ team: [] })),
      fetchApi('/scheduling').catch(() => []),
    ])

    stats.value = {
      totalRealtors: statsRes.totalRealtors || metricsRes.totalRealtors || 0,
      totalLeads: statsRes.totalLeads || 0,
      totalSchedulings: statsRes.totalSchedulings || 0,
      totalSessions: statsRes.totalSessions || 0,
    }

    recentLeads.value = leadsRes.data || leadsRes || []
    if (Array.isArray(recentLeads.value)) {
      recentLeads.value = recentLeads.value.slice(0, 6)
    }

    if (metricsRes && metricsRes.team) {
      topRealtors.value = metricsRes.team
        .sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0))
        .slice(0, 6)
        .map(r => ({
          id: r.id,
          name: r.name,
          sessions: r.sessions || 0,
          leads: r.leads || 0,
          conversionRate: r.conversionRate || 0,
          code: r.code,
        }))
    }

    const now = new Date()
    const allSchedulings = Array.isArray(schedulingsRes) ? schedulingsRes : []
    upcomingSchedulings.value = allSchedulings
      .filter(s => new Date(s.scheduledAt) >= now && ['PENDING', 'CONFIRMED'].includes(s.status))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 4)

  } catch (err) {
    error.value = 'Erro ao carregar dashboard'
    console.error('Error loading dashboard data:', err)
  } finally {
    loading.value = false
  }
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  })
}

function getMonthShort(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '').toUpperCase()
}

function getDay(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'America/Sao_Paulo' })
}

function translateStatus(status) {
  const map = { PENDING: 'Pendente', CONFIRMED: 'Confirmado', CANCELLED: 'Cancelado', COMPLETED: 'Concluído' }
  return map[status] || status
}

onMounted(loadData)
</script>

<style scoped>
/* Page animation */
.dashboard-imobiliaria {
  animation: fadeSlideIn 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Stat card accent variant */
.stat-card--accent {
  border-color: var(--color-primary-500) !important;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, var(--glass-bg) 100%);
}

.stat-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  margin-bottom: 12px;
}

.stat-icon--blue { background: rgba(59, 130, 246, 0.12); color: var(--color-primary-500); }
.stat-icon--green { background: rgba(16, 185, 129, 0.12); color: #16a34a; }
.stat-icon--amber { background: rgba(245, 158, 11, 0.12); color: #d97706; }
.stat-icon--purple { background: rgba(147, 51, 234, 0.12); color: #9333ea; }

.stat-value--success { color: var(--color-success); }

/* Dashboard two-column layout */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 32px;
  margin-top: 32px;
}

@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .dashboard-sidebar {
    order: -1;
  }
}

/* Lead cell in table */
.lead-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lead-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: rgba(16, 185, 129, 0.15);
  color: var(--color-primary-500);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.8125rem;
  flex-shrink: 0;
}

.text-secondary-cell {
  color: var(--color-surface-200);
  font-size: 0.8125rem;
}

/* Realtor performance cards */
.realtor-perf-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  transition: all 150ms ease;
}
.realtor-perf-card:hover {
  border-color: var(--color-primary-500);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.realtor-perf-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.rank-num {
  width: 28px;
  height: 20px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 800;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-surface-200);
}
.rank-1 { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
.rank-2 { background: rgba(245, 158, 11, 0.12); color: #d97706; }
.rank-3 { background: rgba(16, 185, 129, 0.12); color: #059669; }

.realtor-perf-name {
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--color-surface-50);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.realtor-perf-meta {
  font-size: 0.75rem;
  color: var(--color-surface-200);
  font-weight: 500;
}

.realtor-perf-conv {
  text-align: right;
  flex-shrink: 0;
}

.conv-value {
  font-weight: 800;
  font-size: 1rem;
  color: var(--color-primary-500);
}
.conv-label {
  display: block;
  font-size: 0.6875rem;
  color: var(--color-surface-400);
  font-weight: 600;
}

/* Sidebar */
.sidebar-section-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-surface-200);
  margin-bottom: 16px;
}

/* Shortcuts */
.shortcut-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.shortcut-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 12px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: all 150ms ease;
}
.shortcut-item:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary-500);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.shortcut-item span {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-surface-100);
}

.shortcut-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  margin-bottom: 8px;
}
.shortcut-icon--blue { background: rgba(59, 130, 246, 0.12); color: var(--color-primary-500); }
.shortcut-icon--green { background: rgba(16, 185, 129, 0.12); color: #16a34a; }
.shortcut-icon--purple { background: rgba(147, 51, 234, 0.12); color: #9333ea; }
.shortcut-icon--amber { background: rgba(245, 158, 11, 0.12); color: #d97706; }

/* Schedule preview items */
.schedule-preview-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.schedule-date-pill {
  min-width: 40px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  text-align: center;
  flex-shrink: 0;
}
.schedule-month {
  font-size: 0.5625rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--color-surface-200);
  letter-spacing: 0.04em;
}
.schedule-day {
  font-size: 1.0625rem;
  font-weight: 900;
  line-height: 1;
  color: var(--color-surface-50);
}

.schedule-title {
  font-weight: 700;
  font-size: 0.8125rem;
  color: var(--color-surface-50);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.schedule-meta {
  font-size: 0.6875rem;
  color: var(--color-surface-200);
  font-weight: 500;
}

.schedule-status {
  display: inline-block;
  font-size: 0.5625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 8px;
  border-radius: 9999px;
  margin-top: 2px;
}
.schedule-status.pending { background: rgba(245, 158, 11, 0.12); color: #fbbf24; }
.schedule-status.confirmed { background: rgba(16, 185, 129, 0.12); color: #34d399; }
.schedule-status.cancelled { background: rgba(239, 68, 68, 0.12); color: #f87171; }
.schedule-status.completed { background: rgba(59, 130, 246, 0.12); color: #38bdf8; }

/* Utilities used locally */
.me-2 { margin-right: 0.5rem; }
</style>
