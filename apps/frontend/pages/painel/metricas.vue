<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const auth = useAuthStore()

const projects = ref<any[]>([])
const selectedProjectId = ref('all')

const startDate = ref(getDaysAgoInBrasilia(30)) // 30 days ago
const endDate = ref(getTodayInBrasilia())

const metrics = ref<any>(null)
const loadingMetrics = ref(false)

async function fetchProjects() {
  try {
    const res = await fetchApi('/projects')
    projects.value = res.data
  } catch (error) {
    toast.error('Erro ao carregar projetos')
  }
}

async function fetchMetrics() {
  loadingMetrics.value = true
  try {
    const params = new URLSearchParams({
      projectId: selectedProjectId.value,
      startDate: startDate.value || '',
      endDate: endDate.value || ''
    })
    
    metrics.value = await fetchApi(`/tracking/metrics?${params.toString()}`)
  } catch (error) {
    toast.error('Erro ao carregar métricas')
  } finally {
    loadingMetrics.value = false
  }
}

watch([selectedProjectId, startDate, endDate], () => {
  fetchMetrics()
})

onMounted(async () => {
  await fetchProjects()
  fetchMetrics()
})

definePageMeta({
  layout: 'default'
})

// Helper for history chart maxHeight
const maxHistoryValue = computed(() => {
  if (!metrics.value?.history?.length) return 1
  const max = Math.max(...metrics.value.history.map((h: any) => Math.max(h.sessions || 0, h.views || 0)))
  return max > 0 ? max : 1
})

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

const pagesPerSession = computed(() => {
  if (!metrics.value?.summary?.totalSessions) return '0'
  return (metrics.value.summary.totalPageViews / metrics.value.summary.totalSessions).toFixed(1)
})

const conversionRate = computed(() => {
  if (!metrics.value?.summary?.totalSessions) return '0'
  return ((metrics.value.summary.totalLeads / metrics.value.summary.totalSessions) * 100).toFixed(1)
})
</script>

<template>
  <div class="metrics-page">
    <div class="header">
      <div>
        <h1>Métricas de Acesso</h1>
        <p class="subtitle">Acompanhe detalhadamente o desempenho dos seus empreendimentos</p>
      </div>
      
      <div class="filter-actions">
        <div class="filter-group">
          <label>Data Início:</label>
          <input type="date" v-model="startDate" class="date-input" />
        </div>
        <div class="filter-group">
          <label>Data Fim:</label>
          <input type="date" v-model="endDate" class="date-input" />
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

    <div v-if="loadingMetrics && !metrics" class="loading">Carregando métricas...</div>

    <div v-else-if="metrics" class="dashboard" :class="{ 'loading-overlay': loadingMetrics }">
      <!-- Summary Cards -->
      <div class="stats-grid">
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon sessions">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="stat-content">
            <span class="stat-label">Total de Sessões</span>
            <span class="stat-value text-blue">{{ metrics.summary.totalSessions }}</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon avg-pages">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
          </div>
          <div class="stat-content">
            <span class="stat-label">Páginas por Sessão</span>
            <span class="stat-value text-teal">{{ pagesPerSession }}</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon views">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div class="stat-content">
            <span class="stat-label">Visualizações de Página</span>
            <span class="stat-value text-indigo">{{ metrics.summary.totalPageViews }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon leads">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          </div>
          <div class="stat-content">
            <span class="stat-label">Leads: Taxa de Conv.</span>
            <span class="stat-value text-emerald">{{ metrics.summary.totalLeads }} ({{ conversionRate }}%)</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon realtor">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
          </div>
          <div class="stat-content">
            <span class="stat-label">Acessos via Corretor</span>
            <span class="stat-value text-orange">{{ metrics.summary.totalRealtorClicks }}</span>
          </div>
        </div>
      </div>

      <!-- History Chart -->
      <div v-if="!auth.isCorretor" class="details-card history-card full-width">
        <h3>Histórico de Acessos</h3>
        <div class="history-chart-container">
          <div v-for="h in metrics.history" :key="h.date" class="chart-col">
            <div class="bars">
              <div class="bar-group">
                <span class="bar-value views">{{ h.views }}</span>
                <div class="bar views-bar" :style="{ height: `${(h.views / maxHistoryValue) * 100}%` }"></div>
              </div>
              <div class="bar-group">
                <span class="bar-value sessions">{{ h.sessions }}</span>
                <div class="bar sessions-bar" :style="{ height: `${(h.sessions / maxHistoryValue) * 100}%` }"></div>
              </div>
            </div>
            <span class="label">{{ formatDate(h.date) }}</span>
          </div>
          <div v-if="!metrics.history?.length" class="no-data">Nenhum dado no período</div>
        </div>
        <div class="chart-legend">
          <div class="legend-item" title="Número total de vezes que as páginas foram visualizadas">
            <span class="legend-color views"></span> 
            <strong>Visualizações</strong> (Cliques em links/páginas)
          </div>
          <div class="legend-item" title="Número de acessos/visitas individuais">
            <span class="legend-color sessions"></span> 
            <strong>Sessões</strong> (Visitantes únicos)
          </div>
        </div>
      </div>

      <div class="details-grid">
        <!-- Projects Breakdown (Only if all projects selected) -->
        <div v-if="!auth.isCorretor && selectedProjectId === 'all'" class="details-card">
          <h3>Acessos por Empreendimento</h3>
          <div v-if="metrics.topProjects?.length" class="chart-list">
            <div v-for="item in metrics.topProjects" :key="item.label" class="chart-item">
              <span class="item-label">{{ item.label }}</span>
              <div class="bar-container">
                <div class="bar bg-indigo" :style="{ width: `${metrics.summary.totalSessions > 0 ? (item.count / metrics.summary.totalSessions) * 100 : 0}%` }"></div>
              </div>
              <span class="item-count">{{ item.count }}</span>
            </div>
          </div>
          <div v-else class="no-data-placeholder">Nenhum acesso registrado</div>
        </div>

        <!-- Page Views Breakdown -->
        <div v-if="!auth.isCorretor" class="details-card">
          <h3>Páginas mais Visitadas</h3>
          <div v-if="metrics.topPaths?.length" class="chart-list">
            <div v-for="item in metrics.topPaths" :key="item.label" class="chart-item">
              <span class="item-label path-label" :title="item.label">{{ item.label }}</span>
              <div class="bar-container">
                <div class="bar bg-blue" :style="{ width: `${metrics.summary.totalPageViews > 0 ? (item.count / metrics.summary.totalPageViews) * 100 : 0}%` }"></div>
              </div>
              <span class="item-count">{{ item.count }}</span>
            </div>
          </div>
          <div v-else class="no-data-placeholder">Nenhuma visualização de página</div>
        </div>

        <!-- Lead Sources -->
        <div v-if="!auth.isCorretor" class="details-card">
          <h3>Origens de Tráfego</h3>
          <div v-if="metrics.topUtmSources?.length" class="chart-list">
            <div v-for="item in metrics.topUtmSources" :key="item.label" class="chart-item">
              <span class="item-label">{{ item.label }}</span>
              <div class="bar-container">
                <div class="bar bg-emerald" :style="{ width: `${metrics.summary.totalSessions > 0 ? (item.count / metrics.summary.totalSessions) * 100 : 0}%` }"></div>
              </div>
              <span class="item-count">{{ item.count }}</span>
            </div>
          </div>
          <div v-else class="no-data-placeholder">Nenhuma origem identificada</div>
        </div>

        <!-- Campaigns -->
        <div v-if="!auth.isCorretor && metrics.topUtmCampaigns?.length" class="details-card">
          <h3>Campanhas Ativas</h3>
          <div class="chart-list">
            <div v-for="item in metrics.topUtmCampaigns" :key="item.utm" class="chart-item">
              <span class="item-label">{{ item.label }}</span>
              <div class="bar-container">
                <div class="bar bg-purple" :style="{ width: `${metrics.summary.totalSessions > 0 ? (item.count / metrics.summary.totalSessions) * 100 : 0}%` }"></div>
              </div>
              <span class="item-count">{{ item.count }}</span>
            </div>
          </div>
        </div>

        <!-- Realtors Breakdown -->
        <div v-if="!auth.isCorretor" class="details-card">
          <h3>Desempenho de Corretores</h3>
          <div v-if="metrics.topRealtors?.length" class="chart-list">
            <div v-for="item in metrics.topRealtors" :key="item.label" class="chart-item">
              <span class="item-label">{{ item.label }}</span>
              <div class="bar-container">
                <div class="bar bg-orange" :style="{ width: `${metrics.summary.totalSessions > 0 ? (item.count / metrics.summary.totalSessions) * 100 : 0}%` }"></div>
              </div>
              <span class="item-count">{{ item.count }}</span>
            </div>
          </div>
          <div v-else class="no-data-placeholder">Nenhum acesso via corretor registrado</div>
        </div>

        <div class="details-card table-card">
          <h3>Cliques em Links e Botões</h3>
          <div class="table-container">
            <table class="simple-table">
              <thead>
                <tr>
                  <th>Link/Ação</th>
                  <th class="text-right">Cliques</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="link in metrics.topLinks" :key="link.label">
                  <td>{{ link.label }}</td>
                  <td class="text-right">{{ link.count }}</td>
                </tr>
                <tr v-if="!metrics.topLinks?.length">
                  <td colspan="2" class="text-center py-8 text-muted">Ainda não há cliques registrados</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metrics-page {
  padding: 32px;
  background: var(--glass-bg-heavy);
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
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
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.stat-card {
  background: var(--glass-bg);
  padding: 32px 24px;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -1px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 16px;
  border: 1px solid var(--glass-border-subtle);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.stat-icon.sessions { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
.stat-icon.views { background: rgba(79, 70, 229, 0.12); color: #4f46e5; }
.stat-icon.avg-pages { background: rgba(13, 148, 136, 0.12); color: #0d9488; }
.stat-icon.leads { background: rgba(16, 185, 129, 0.12); color: #059669; }
.stat-icon.realtor { background: rgba(249, 115, 22, 0.12); color: #ea580c; }

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  color: var(--color-surface-400);
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
}

.text-blue { color: #2563eb; }
.text-indigo { color: #4f46e5; }
.text-teal { color: #0d9488; }
.text-emerald { color: #059669; }
.text-orange { color: #ea580c; }

/* History Chart */
.history-card {
  display: flex;
  flex-direction: column;
}

.full-width {
  grid-column: 1 / -1;
}

.history-chart-container {
  height: 250px;
  display: flex;
  align-items: flex-end;
  gap: 24px;
  margin-top: 32px;
  padding: 0 16px 32px 16px;
  border-bottom: 1px solid var(--glass-border-subtle);
  overflow-x: auto;
}

.chart-col {
  flex: 0 0 80px;
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: flex-end;
}

.bars {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 100%;
  margin-bottom: 8px;
}

.bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 100%;
  position: relative;
}

.bar-value {
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 4px;
}

.bar-value.views { color: #4f46e5; }
.bar-value.sessions { color: #2563eb; }

.bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 2px;
}

.views-bar { background: #4f46e5; opacity: 0.85; }
.sessions-bar { background: #3b82f6; opacity: 0.6; }

.chart-col .label {
  font-size: 10px;
  text-align: center;
  color: var(--color-surface-500);
  font-weight: 600;
}

.chart-legend {
  display: flex;
  gap: 24px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px dashed var(--glass-border-subtle);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-surface-200);
  cursor: help;
}

.legend-color { width: 14px; height: 14px; border-radius: 4px; }
.legend-color.views { background: #4f46e5; }
.legend-color.sessions { background: #3b82f6; opacity: 0.7; }

/* Details Grid */
.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(48%, 1fr));
  gap: 32px;
}

.details-card {
  background: var(--glass-bg);
  padding: 32px;
  border-radius: 20px;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
  border: 1px solid var(--glass-border-subtle);
}

.details-card h3 {
  margin: 0 0 24px 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-surface-100);
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chart-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.item-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-surface-200);
  width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bar-container {
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
}

.bar {
  height: 100%;
  border-radius: 5px;
  transition: width 1s ease-out;
}

.bg-blue { background: #2563eb; }
.bg-indigo { background: #4f46e5; }
.bg-emerald { background: #10b981; }
.bg-purple { background: #8b5cf6; }

.item-count {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-surface-100);
  min-width: 40px;
  text-align: right;
}

/* Tables */
.table-card {
  padding: 24px 0 0 0;
}

.table-card h3 {
  padding-left: 24px;
}

.table-container {
  overflow-x: auto;
}

.simple-table {
  width: 100%;
  border-collapse: collapse;
}

.simple-table th {
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  color: var(--color-surface-500);
  font-weight: 700;
  padding: 12px 24px;
  background: var(--glass-bg-heavy);
  border-bottom: 2px solid var(--glass-border-subtle);
}

.simple-table td {
  padding: 16px 24px;
  border-bottom: 1px solid var(--glass-border-subtle);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-surface-200);
}

.simple-table tr:hover td {
  background: var(--glass-bg-heavy);
}

.text-right { text-align: right; }
.text-center { text-align: center; }
.text-muted { color: var(--color-surface-500); font-size: 12px; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  font-size: 18px;
  color: var(--color-surface-400);
  font-weight: 600;
}

.no-data {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--color-surface-500);
  font-weight: 600;
}

.no-data-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  background: var(--glass-bg-heavy);
  border: 1px dashed var(--color-surface-600);
  border-radius: 12px;
  color: var(--color-surface-500);
  font-size: 14px;
  font-weight: 500;
  text-align: center;
}
</style>

<style scoped>
.metrics-page {
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

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
}

.stat-label {
  color: var(--color-surface-400);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-surface-100);
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

.details-card {
  background: var(--glass-bg);
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}

.details-card h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: var(--color-surface-100);
}

.chart-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.item-label {
  font-size: 13px;
  color: var(--color-surface-200);
  width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.path-label {
  width: 320px;
  font-family: monospace;
  font-size: 11px;
}

.bar-container {
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
}

.bar {
  background: #2563eb;
  height: 100%;
}

.item-count {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-surface-100);
  min-width: 40px;
  text-align: right;
}

.simple-table {
  width: 100%;
  border-collapse: collapse;
}

.simple-table th {
  text-align: left;
  font-size: 12px;
  color: var(--color-surface-400);
  padding-bottom: 12px;
  border-bottom: 1px solid var(--glass-border-subtle);
}

.simple-table td {
  padding: 12px 0;
  border-bottom: 1px solid var(--glass-border-subtle);
  font-size: 14px;
}

.text-right {
  text-align: right;
}

.loading {
  padding: 48px;
  text-align: center;
  color: var(--color-surface-400);
}
</style>
