<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)

async function fetchAgencyMetrics() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/metrics/agencies?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar métricas de imobiliárias')
  } finally {
    loading.value = false
  }
}

watch([selectedProjectId, startDate, endDate], () => {
  fetchAgencyMetrics()
})

onMounted(async () => {
  await fetchProjects()
  fetchAgencyMetrics()
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
        <h1>Performance por Imobiliárias</h1>
        <p class="subtitle">Acompanhe sessões, leads e conversão por imobiliária parceira</p>
      </div>

      <div class="filter-actions">
        <div class="filter-group">
          <label>Data Início:</label>
          <input v-model="startDate" type="date" :max="startDateMax" class="date-input" />
        </div>
        <div class="filter-group">
          <label>Data Fim:</label>
          <input v-model="endDate" type="date" :min="endDateMin" :max="endDateMax" class="date-input" />
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

    <div v-if="loading && !data" class="loading">Carregando métricas de imobiliárias...</div>

    <div v-else-if="data" class="dashboard" :class="{ 'loading-overlay': loading }">
      <div class="stats-grid">
        <div class="stat-card">
          <CommonAppTooltip text="Total de imobiliárias parceiras com participação no painel." position="bottom"><span class="stat-label">Imobiliárias</span></CommonAppTooltip>
          <span class="stat-value text-purple">{{ data.summary.totalAgencies }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Quantidade total de corretores ativos vinculados às imobiliárias." position="bottom"><span class="stat-label">Corretores Ativos</span></CommonAppTooltip>
          <span class="stat-value text-orange">{{ data.summary.totalRealtors }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Soma de todas as sessões atribuídas às imobiliárias no período." position="bottom"><span class="stat-label">Sessões</span></CommonAppTooltip>
          <span class="stat-value text-blue">{{ data.summary.totalSessions }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Total de leads captados por imobiliárias no período selecionado." position="bottom"><span class="stat-label">Leads</span></CommonAppTooltip>
          <span class="stat-value text-emerald">{{ data.summary.totalLeads }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Taxa média de conversão das imobiliárias (leads ÷ sessões)." position="bottom"><span class="stat-label">Conversão Média</span></CommonAppTooltip>
          <span class="stat-value text-indigo">{{ data.summary.avgConversionRate }}%</span>
        </div>
      </div>

      <div class="details-card">
        <h3>Ranking de Imobiliárias</h3>

        <div v-if="!data.agencies?.length" class="no-data-placeholder">
          Nenhuma imobiliária com dados no período
        </div>

        <table v-else class="agency-table">
          <thead>
            <tr>
              <th>Imobiliária</th>
              <th><CommonAppTooltip text="Número de corretores ativos com link habilitado na imobiliária." position="bottom">Corretores</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Sessões atribuídas a corretores desta imobiliária." position="bottom">Sessões</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Leads convertidos por sessões atribuídas à imobiliária." position="bottom">Leads</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Percentual de sessões que viraram lead (leads ÷ sessões)." position="bottom">Conversão</CommonAppTooltip></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="agency in data.agencies" :key="agency.id">
              <td>
                <div class="agency-identity">
                  <span class="agency-avatar">{{ agency.name?.charAt(0)?.toUpperCase() }}</span>
                  <div class="agency-info">
                    <span class="agency-name">{{ agency.name }}</span>
                    <span v-if="agency.email" class="agency-email">{{ agency.email }}</span>
                  </div>
                </div>
              </td>
              <td class="text-orange">{{ agency.activeRealtors }}</td>
              <td class="text-blue">{{ agency.sessions }}</td>
              <td class="text-emerald">{{ agency.leads }}</td>
              <td class="text-indigo">{{ agency.conversionRate }}%</td>
            </tr>
          </tbody>
        </table>
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

.loading {
  padding: 48px;
  text-align: center;
  color: var(--color-surface-400);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
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

.agency-table {
  width: 100%;
  border-collapse: collapse;
}

.agency-table th,
.agency-table td {
  padding: 14px 12px;
  border-bottom: 1px solid var(--glass-border-subtle);
  text-align: left;
}

.agency-table th {
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-surface-400);
}

.agency-table td {
  color: var(--color-surface-100);
  font-weight: 600;
}

.agency-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agency-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.18);
  color: #93c5fd;
  font-weight: 800;
}

.agency-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.agency-name {
  color: var(--color-surface-50);
  font-weight: 700;
}

.agency-email {
  color: var(--color-surface-500);
  font-size: 12px;
  font-weight: 500;
}

.text-blue { color: #2563eb; }
.text-emerald { color: #059669; }
.text-purple { color: #8b5cf6; }
.text-orange { color: #ea580c; }
.text-indigo { color: #4f46e5; }

@media (max-width: 992px) {
  .header {
    flex-direction: column;
    gap: 16px;
  }

  .filter-actions {
    width: 100%;
  }

  .agency-table {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
}
</style>
