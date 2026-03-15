<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const auth = useAuthStore()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)

async function fetchData() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/metrics/lots?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar métricas de lotes')
  } finally {
    loading.value = false
  }
}

watch([selectedProjectId, startDate, endDate], () => {
  fetchData()
})

onMounted(async () => {
  await fetchProjects()
  fetchData()
})

definePageMeta({
  layout: 'default'
})

const maxViews = computed(() => {
  if (!data.value?.lots?.length) return 1
  const max = Math.max(...data.value.lots.map((l: any) => l.views || 0))
  return max > 0 ? max : 1
})

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    AVAILABLE: 'Disponível',
    RESERVED: 'Reservado',
    SOLD: 'Vendido'
  }
  return map[status] || status
}

const statusClass = (status: string) => {
  const map: Record<string, string> = {
    AVAILABLE: 'badge-emerald',
    RESERVED: 'badge-amber',
    SOLD: 'badge-red'
  }
  return map[status] || ''
}
</script>

<template>
  <div class="metrics-page">
    <NuxtLink to="/painel/metricas" class="back-link">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Voltar às Métricas
    </NuxtLink>

    <div class="header">
      <div>
        <h1>Métricas de Lotes</h1>
        <p class="subtitle">Visualizações, reservas e leads detalhados por lote</p>
      </div>

      <div class="filter-actions">
        <div class="filter-group">
          <label>Data Início:</label>
          <input type="date" v-model="startDate" :max="startDateMax" class="date-input" />
        </div>
        <div class="filter-group">
          <label>Data Fim:</label>
          <input type="date" v-model="endDate" :min="endDateMin" :max="endDateMax" class="date-input" />
        </div>
        <div class="filter-group">
          <label>Empreendimento:</label>
          <select v-model="selectedProjectId" class="project-select">
            <option value="all">Todos os Projetos</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="loading && !data" class="loading">Carregando métricas de lotes...</div>

    <div v-else-if="data" class="dashboard" :class="{ 'loading-overlay': loading }">
      <!-- Summary Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon icon-blue">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <CommonAppTooltip text="Total de vezes que as páginas de lotes individuais foram visualizadas pelos visitantes." position="bottom"><span class="stat-label">Visualizações de Lotes</span></CommonAppTooltip>
          <span class="stat-value text-blue">{{ data.summary.totalViews }}</span>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-emerald">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <CommonAppTooltip text="Quantidade de leads (contatos) gerados a partir de páginas de lotes específicos." position="bottom"><span class="stat-label">Leads em Lotes</span></CommonAppTooltip>
          <span class="stat-value text-emerald">{{ data.summary.totalLeads }}</span>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-purple">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
          </div>
          <CommonAppTooltip text="Total de lotes que foram reservados por interessados no período selecionado." position="bottom"><span class="stat-label">Reservas</span></CommonAppTooltip>
          <span class="stat-value text-purple">{{ data.summary.totalReservations }}</span>
        </div>
      </div>

      <!-- Ranking Table -->
      <div class="details-card">
        <h3>Ranking de Lotes</h3>
        <div class="table-wrapper">
          <table class="ranking-table">
            <thead>
              <tr>
                <th class="col-rank">#</th>
                <th class="col-lot">Lote</th>
                <th class="col-project">Empreendimento</th>
                <th class="col-views"><CommonAppTooltip text="Quantidade de vezes que este lote foi visualizado." position="bottom">Visualizações</CommonAppTooltip></th>
                <th class="col-leads"><CommonAppTooltip text="Leads gerados a partir da página deste lote." position="bottom">Leads</CommonAppTooltip></th>
                <th class="col-reservations"><CommonAppTooltip text="Número de reservas feitas para este lote." position="bottom">Reservas</CommonAppTooltip></th>
                <th class="col-status"><CommonAppTooltip text="Status atual do lote: Disponível, Reservado ou Vendido." position="bottom">Status</CommonAppTooltip></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(lot, idx) in data.lots" :key="lot.code">
                <td class="col-rank">{{ idx + 1 }}</td>
                <td class="col-lot">
                  <span class="lot-code">{{ lot.code }}</span>
                  <span class="lot-name">{{ lot.name }}</span>
                </td>
                <td class="col-project">{{ lot.project }}</td>
                <td class="col-views">
                  <div class="views-cell">
                    <span class="views-count">{{ lot.views }}</span>
                    <div class="views-bar-track">
                      <div class="views-bar-fill" :style="{ width: `${(lot.views / maxViews) * 100}%` }"></div>
                    </div>
                  </div>
                </td>
                <td class="col-leads">{{ lot.leads }}</td>
                <td class="col-reservations">{{ lot.reservations }}</td>
                <td class="col-status">
                  <span class="status-badge" :class="statusClass(lot.status)">{{ statusLabel(lot.status) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="!data.lots?.length" class="empty-state">Nenhum lote encontrado no período</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metrics-page {
  padding: 24px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-surface-400);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 24px;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--color-primary-400);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

h1 {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-surface-50);
  margin: 0 0 8px 0;
}

.subtitle {
  color: var(--color-surface-400);
  font-size: 16px;
  margin: 0;
}

.filter-actions {
  display: flex;
  gap: 16px;
  background: var(--glass-bg);
  padding: 16px 24px;
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 2px rgba(0,0,0,0.3);
  border: 1px solid var(--glass-border-subtle);
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group label {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--color-surface-400);
  letter-spacing: 0.05em;
}

.project-select, .date-input {
  padding: 10px 14px;
  border: 1px solid var(--glass-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-surface-900);
  color: var(--color-surface-100);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  -webkit-appearance: none;
  appearance: none;
  color-scheme: dark;
}

.project-select:focus,
.date-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

.project-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%239cb3a5' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.project-select option {
  background: var(--color-surface-800);
  color: var(--color-surface-50);
}

.dashboard {
  display: flex;
  flex-direction: column;
  gap: 32px;
  transition: opacity 0.2s;
}

.loading-overlay {
  opacity: 0.7;
}

/* Stats Cards */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--glass-bg);
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  border: 1px solid var(--glass-border-subtle);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.icon-blue { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
.stat-icon.icon-emerald { background: rgba(16, 185, 129, 0.12); color: #059669; }
.stat-icon.icon-purple { background: rgba(139, 92, 246, 0.12); color: #8b5cf6; }

.stat-label {
  color: var(--color-surface-200);
  font-size: 14px;
  font-weight: 500;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
}

.text-blue { color: #2563eb; }
.text-emerald { color: #059669; }
.text-purple { color: #8b5cf6; }

/* Details Card */
.details-card {
  background: var(--glass-bg);
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
  border: 1px solid var(--glass-border-subtle);
}

.details-card h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: var(--color-surface-100);
}

/* Ranking Table */
.table-wrapper {
  overflow-x: auto;
}

.ranking-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.ranking-table thead th {
  text-align: left;
  padding: 12px 16px;
  color: var(--color-surface-400);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  border-bottom: 1px solid var(--glass-border-subtle);
  white-space: nowrap;
}

.ranking-table tbody tr {
  transition: background 0.15s;
}

.ranking-table tbody tr:hover {
  background: rgba(255,255,255,0.02);
}

.ranking-table tbody td {
  padding: 14px 16px;
  color: var(--color-surface-200);
  border-bottom: 1px solid rgba(255,255,255,0.04);
  vertical-align: middle;
}

.col-rank {
  width: 48px;
  font-weight: 700;
  color: var(--color-surface-500);
  text-align: center;
}

.col-lot {
  min-width: 140px;
}

.lot-code {
  display: block;
  font-weight: 700;
  color: var(--color-surface-100);
  font-size: 14px;
}

.lot-name {
  display: block;
  font-size: 12px;
  color: var(--color-surface-500);
  margin-top: 2px;
}

.col-project {
  min-width: 140px;
  color: var(--color-surface-300);
}

.col-views {
  min-width: 200px;
}

.views-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.views-count {
  font-weight: 700;
  color: var(--color-surface-100);
  min-width: 36px;
  text-align: right;
}

.views-bar-track {
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,0.06);
  border-radius: 4px;
  overflow: hidden;
}

.views-bar-fill {
  height: 100%;
  background: #2563eb;
  border-radius: 4px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 2px;
}

.col-leads, .col-reservations {
  text-align: center;
  font-weight: 600;
  white-space: nowrap;
}

.col-status {
  text-align: center;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.badge-emerald {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.badge-amber {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.badge-red {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

/* Loading & Empty */
.loading {
  padding: 48px;
  text-align: center;
  color: var(--color-surface-400);
}

.empty-state {
  padding: 48px;
  text-align: center;
  color: var(--color-surface-500);
  font-weight: 600;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 20px;
  }
  .filter-actions {
    width: 100%;
  }
}
</style>
