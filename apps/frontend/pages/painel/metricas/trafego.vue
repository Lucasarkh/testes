<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const { projects, selectedProjectId, startDate, endDate, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)

async function fetchTraffic() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/metrics/traffic?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar origens de tráfego')
  } finally {
    loading.value = false
  }
}

watch([selectedProjectId, startDate, endDate], () => {
  fetchTraffic()
})

onMounted(async () => {
  await fetchProjects()
  fetchTraffic()
})

definePageMeta({
  layout: 'default'
})

const maxSourceSessions = computed(() => {
  if (!data.value?.sources?.length) return 1
  const max = Math.max(...data.value.sources.map((s: any) => s.sessions || 0))
  return max > 0 ? max : 1
})

const maxMediumCount = computed(() => {
  if (!data.value?.mediums?.length) return 1
  const max = Math.max(...data.value.mediums.map((m: any) => m.count || 0))
  return max > 0 ? max : 1
})

function formatCurrency(value: number): string {
  if (!value) return '---'
  return `R$ ${value.toFixed(2)}`
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
        <h1>Origens de Tráfego</h1>
        <p class="subtitle">Campanhas, fontes UTM e conversão por origem</p>
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

    <div v-if="loading && !data" class="loading">Carregando origens de tráfego...</div>

    <div v-else-if="data" class="dashboard" :class="{ 'loading-overlay': loading }">
      <!-- Summary Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <CommonAppTooltip text="Total de visitas recebidas de todas as fontes de tráfego no período." position="bottom"><span class="stat-label">Sessões Totais</span></CommonAppTooltip>
          <span class="stat-value text-blue">{{ data.summary.totalSessions }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Total de leads captados, independente da fonte de origem." position="bottom"><span class="stat-label">Leads Gerados</span></CommonAppTooltip>
          <span class="stat-value text-emerald">{{ data.summary.totalLeads }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Quantidade de fontes de tráfego distintas identificadas (ex: Google, Facebook, direto)." position="bottom"><span class="stat-label">Fontes Únicas</span></CommonAppTooltip>
          <span class="stat-value text-indigo">{{ data.summary.uniqueSources }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Número de campanhas de marketing atualmente ativas e gerando tráfego." position="bottom"><span class="stat-label">Campanhas Ativas</span></CommonAppTooltip>
          <span class="stat-value text-purple">{{ data.summary.activeCampaigns }}</span>
        </div>
      </div>

      <!-- Fontes de Trafego -->
      <div class="details-card">
        <h3>Fontes de Tráfego</h3>
        <div v-if="data.sources?.length">
          <table class="simple-table">
            <thead>
              <tr>
                <th><CommonAppTooltip text="Origem do tráfego identificada pelo parâmetro UTM source ou referrer." position="bottom">Fonte</CommonAppTooltip></th>
                <th><CommonAppTooltip text="Número de visitas vindas desta fonte." position="bottom">Sessões</CommonAppTooltip></th>
                <th><CommonAppTooltip text="Leads gerados por visitantes vindos desta fonte." position="bottom">Leads</CommonAppTooltip></th>
                <th><CommonAppTooltip text="Percentual de sessões desta fonte que resultaram em leads." position="bottom">Conversão %</CommonAppTooltip></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in data.sources" :key="item.source">
                <td>{{ item.source || '(direto)' }}</td>
                <td>
                  <div class="cell-with-bar">
                    <span class="cell-value">{{ item.sessions }}</span>
                    <div class="bar-container">
                      <div
                        class="bar bar-blue"
                        :style="{ width: maxSourceSessions > 0 ? (item.sessions / maxSourceSessions * 100) + '%' : '0%' }"
                      ></div>
                    </div>
                  </div>
                </td>
                <td>{{ item.leads }}</td>
                <td>{{ item.conversionRate.toFixed(1) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="no-data-placeholder">Nenhuma fonte de tráfego no período</div>
      </div>

      <!-- Campanhas -->
      <div class="details-card">
        <h3>Campanhas</h3>
        <div v-if="data.campaigns?.length">
          <table class="simple-table">
            <thead>
              <tr>
                <th><CommonAppTooltip text="Nome da campanha de marketing configurada." position="bottom">Campanha</CommonAppTooltip></th>
                <th><CommonAppTooltip text="Empreendimento vinculado à campanha." position="bottom">Projeto</CommonAppTooltip></th>
                <th>Sessões</th>
                <th>Leads</th>
                <th><CommonAppTooltip text="Valor total investido nesta campanha de marketing." position="bottom">Investido (R$)</CommonAppTooltip></th>
                <th><CommonAppTooltip text="Custo por Lead: valor investido dividido pelo número de leads gerados. Quanto menor, mais eficiente." position="bottom">CPL (R$)</CommonAppTooltip></th>
                <th><CommonAppTooltip text="Taxa de conversão da campanha: percentual de sessões que geraram leads." position="bottom">Conversão %</CommonAppTooltip></th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="campaign in data.campaigns" :key="campaign.utmCampaign">
                <td>{{ campaign.name || campaign.utmCampaign }}</td>
                <td>{{ campaign.projectName || '---' }}</td>
                <td>{{ campaign.sessions }}</td>
                <td>{{ campaign.leads }}</td>
                <td>{{ formatCurrency(campaign.totalSpent) }}</td>
                <td>{{ formatCurrency(campaign.costPerLead) }}</td>
                <td>{{ campaign.conversionRate.toFixed(1) }}%</td>
                <td>
                  <span v-if="campaign.active === true" class="badge badge-success">Ativa</span>
                  <span v-else-if="campaign.active === false" class="badge badge-gray">Inativa</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="no-data-placeholder">Nenhuma campanha encontrada no período</div>
      </div>

      <!-- Canais (Medium) -->
      <div class="details-card">
        <h3>Canais (Medium)</h3>
        <div v-if="data.mediums?.length" class="chart-list">
          <div v-for="medium in data.mediums" :key="medium.medium" class="chart-item">
            <span class="item-label">{{ medium.medium || '(nenhum)' }}</span>
            <div class="bar-container">
              <div
                class="bar bar-indigo"
                :style="{ width: maxMediumCount > 0 ? (medium.count / maxMediumCount * 100) + '%' : '0%' }"
              ></div>
            </div>
            <span class="item-count">{{ medium.count }}</span>
          </div>
        </div>
        <div v-else class="no-data-placeholder">Nenhum canal encontrado no período</div>
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

.project-select,
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

.project-select:focus,
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
.text-indigo { color: #4f46e5; }
.text-purple { color: #8b5cf6; }

/* Details Cards */
.details-card {
  background: var(--glass-bg);
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
  border: 1px solid var(--glass-border-subtle);
  margin-bottom: 24px;
}

.details-card h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: var(--color-surface-100);
}

.no-data-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  background: rgba(0,0,0,0.2);
  border: 1px dashed var(--color-surface-600);
  border-radius: 12px;
  color: var(--color-surface-500);
  font-size: 14px;
  font-weight: 500;
}

/* Table */
.simple-table {
  width: 100%;
  border-collapse: collapse;
}

.simple-table th {
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  color: var(--color-surface-400);
  font-weight: 700;
  padding: 12px 16px;
  border-bottom: 1px solid var(--glass-border-subtle);
}

.simple-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--glass-border-subtle);
  font-size: 14px;
  color: var(--color-surface-200);
}

.simple-table tr:hover td {
  background: rgba(255,255,255,0.02);
}

/* Cell with bar (sources table) */
.cell-with-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cell-value {
  min-width: 36px;
  font-weight: 600;
}

.cell-with-bar .bar-container {
  flex: 1;
  min-width: 60px;
}

/* Bar styles */
.bar-container {
  flex: 1;
  background: rgba(255,255,255,0.06);
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
}

.bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.bar-blue {
  background: #2563eb;
}

.bar-indigo {
  background: #4f46e5;
}

/* Chart list for mediums */
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

.item-count {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-surface-100);
  min-width: 40px;
  text-align: right;
}

/* Badges */
.badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.badge-success {
  background: rgba(16,185,129,0.15);
  color: #10b981;
}

.badge-gray {
  background: rgba(148,163,184,0.15);
  color: #94a3b8;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 20px;
  }
  .filter-actions {
    width: 100%;
  }
  .simple-table {
    display: block;
    overflow-x: auto;
  }
}
</style>
