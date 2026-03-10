<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const auth = useAuthStore()
const { startDate, endDate, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)

async function fetchEnterpriseMetrics() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/metrics/enterprise?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar métricas de empreendimentos')
  } finally {
    loading.value = false
  }
}

function getMaxLotCount(topLots: { label: string; count: number }[]): number {
  if (!topLots?.length) return 1
  const max = Math.max(...topLots.map(l => l.count))
  return max > 0 ? max : 1
}

watch([startDate, endDate], () => {
  fetchEnterpriseMetrics()
})

onMounted(async () => {
  await fetchProjects()
  fetchEnterpriseMetrics()
})

definePageMeta({
  layout: 'default'
})
</script>

<template>
  <div class="metrics-page">
    <NuxtLink to="/painel/metricas" class="back-link">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Voltar às Métricas
    </NuxtLink>

    <div class="header">
      <div>
        <h1>Métricas de Empreendimentos</h1>
        <p class="subtitle">Acessos, leads e ranking de lotes por projeto</p>
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
      </div>
    </div>

    <div v-if="loading && !data" class="loading">Carregando métricas de empreendimentos...</div>

    <div v-else-if="data" class="dashboard" :class="{ 'loading-overlay': loading }">
      <!-- Summary Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <CommonAppTooltip text="Total de empreendimentos (projetos) cadastrados na plataforma." position="bottom"><span class="stat-label">Empreendimentos</span></CommonAppTooltip>
          <span class="stat-value text-purple">{{ data.summary.totalProjects }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Soma de todas as visitas recebidas em todos os empreendimentos no período." position="bottom"><span class="stat-label">Total de Sessões</span></CommonAppTooltip>
          <span class="stat-value text-blue">{{ data.summary.totalSessions }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Total de leads captados em todos os empreendimentos no período selecionado." position="bottom"><span class="stat-label">Total de Leads</span></CommonAppTooltip>
          <span class="stat-value text-emerald">{{ data.summary.totalLeads }}</span>
        </div>
      </div>

      <!-- Project Cards Grid -->
      <div v-if="!data.projects?.length" class="no-data-placeholder">
        Nenhum empreendimento encontrado no período
      </div>

      <div v-else class="projects-grid">
        <NuxtLink
          v-for="project in data.projects"
          :key="project.projectId"
          :to="`/painel/projetos/${project.projectId}/metricas`"
          class="project-card"
        >
          <h3>{{ project.name }}</h3>

          <div class="project-stats">
            <div class="project-stat">
              <span class="project-stat-value text-blue">{{ project.sessions }}</span>
              <CommonAppTooltip text="Visitas únicas recebidas neste empreendimento." position="top"><span class="project-stat-label">Sessões</span></CommonAppTooltip>
            </div>
            <div class="project-stat-divider"></div>
            <div class="project-stat">
              <span class="project-stat-value text-emerald">{{ project.leads }}</span>
              <CommonAppTooltip text="Contatos gerados a partir deste empreendimento." position="top"><span class="project-stat-label">Leads</span></CommonAppTooltip>
            </div>
            <div class="project-stat-divider"></div>
            <div class="project-stat">
              <span class="project-stat-value text-purple">{{ project.conversionRate }}%</span>
              <CommonAppTooltip text="Taxa de conversão: percentual de sessões que resultaram em leads." position="top"><span class="project-stat-label">Conversão</span></CommonAppTooltip>
            </div>
          </div>

          <div v-if="project.topLots?.length" class="top-lots-section">
            <span class="top-lots-title">Top Lotes</span>
            <div class="chart-list">
              <div v-for="lot in project.topLots" :key="lot.label" class="chart-item">
                <span class="chart-item-label">{{ lot.label }}</span>
                <div class="chart-item-bar-track">
                  <div
                    class="chart-item-bar"
                    :style="{ width: `${(lot.count / getMaxLotCount(project.topLots)) * 100}%` }"
                  ></div>
                </div>
                <span class="chart-item-value">{{ lot.count }}</span>
              </div>
            </div>
          </div>
        </NuxtLink>
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

.date-input {
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
  appearance: none;
  color-scheme: dark;
}

.date-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
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

.loading {
  padding: 48px;
  text-align: center;
  color: var(--color-surface-400);
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
.text-orange { color: #ea580c; }

.no-data-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  background: var(--glass-bg-heavy, rgba(0,0,0,0.2));
  border: 1px dashed var(--color-surface-600);
  border-radius: 12px;
  color: var(--color-surface-500);
  font-size: 14px;
  font-weight: 500;
}

/* Project Cards Grid */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 20px;
}

.project-card {
  background: var(--glass-bg);
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
  border: 1px solid var(--glass-border-subtle);
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.project-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  border-color: rgba(139, 92, 246, 0.4);
}

.project-card h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-surface-50);
}

/* Project Stats Row */
.project-stats {
  display: flex;
  align-items: center;
  gap: 16px;
}

.project-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.project-stat-value {
  font-size: 20px;
  font-weight: 700;
}

.project-stat-label {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--color-surface-400);
  letter-spacing: 0.03em;
}

.project-stat-divider {
  width: 1px;
  height: 32px;
  background: var(--glass-border-subtle);
}

/* Top Lots Section */
.top-lots-section {
  border-top: 1px solid var(--glass-border-subtle);
  padding-top: 14px;
}

.top-lots-title {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--color-surface-400);
  letter-spacing: 0.05em;
  display: block;
  margin-bottom: 10px;
}

.chart-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chart-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chart-item-label {
  font-size: 13px;
  color: var(--color-surface-300);
  font-weight: 500;
  min-width: 70px;
  flex-shrink: 0;
}

.chart-item-bar-track {
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
  overflow: hidden;
}

.chart-item-bar {
  height: 100%;
  background: #8b5cf6;
  border-radius: 4px;
  min-width: 2px;
  transition: width 0.3s ease;
}

.chart-item-value {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-surface-200);
  min-width: 28px;
  text-align: right;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 20px;
  }
  .filter-actions {
    width: 100%;
  }
  .projects-grid {
    grid-template-columns: 1fr;
  }
}
</style>
