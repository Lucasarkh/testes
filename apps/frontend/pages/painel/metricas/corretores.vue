<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const auth = useAuthStore()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)
const expandedBrokers = ref<Set<string>>(new Set())

async function fetchBrokerMetrics() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/metrics/brokers?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar métricas de corretores')
  } finally {
    loading.value = false
  }
}

function toggleExpand(id: string) {
  const next = new Set(expandedBrokers.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedBrokers.value = next
}

watch([selectedProjectId, startDate, endDate], () => {
  fetchBrokerMetrics()
})

onMounted(async () => {
  await fetchProjects()
  fetchBrokerMetrics()
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
        <h1>Métricas de Corretores</h1>
        <p class="subtitle">Leads, acessos e campanhas por corretor</p>
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

    <div v-if="loading && !data" class="loading">Carregando métricas de corretores...</div>

    <div v-else-if="data" class="dashboard" :class="{ 'loading-overlay': loading }">
      <!-- Summary Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <CommonAppTooltip text="Número de corretores que geraram pelo menos uma sessão ou lead no período selecionado." position="bottom"><span class="stat-label">Corretores Ativos</span></CommonAppTooltip>
          <span class="stat-value text-orange">{{ data.summary.totalBrokers }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Soma de todas as sessões (visitas) geradas pelos links dos corretores." position="bottom"><span class="stat-label">Total de Sessões</span></CommonAppTooltip>
          <span class="stat-value text-blue">{{ data.summary.totalSessions }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Total de leads captados através dos links de todos os corretores." position="bottom"><span class="stat-label">Total de Leads</span></CommonAppTooltip>
          <span class="stat-value text-emerald">{{ data.summary.totalLeads }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Taxa média de conversão de todos os corretores (leads ÷ sessões × 100)." position="bottom"><span class="stat-label">Conversão Média</span></CommonAppTooltip>
          <span class="stat-value text-purple">{{ data.summary.avgConversionRate }}%</span>
        </div>
      </div>

      <!-- Broker Table -->
      <div class="details-card">
        <h3>Corretores</h3>

        <div v-if="!data.brokers?.length" class="no-data-placeholder">
          Nenhum corretor encontrado no período
        </div>

        <table v-else class="broker-table">
          <thead>
            <tr>
              <th class="th-broker">Corretor</th>
              <th><CommonAppTooltip text="Total de contatos gerados pelo corretor." position="bottom">Leads</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Número de visitas geradas através do link do corretor." position="bottom">Sessões</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Percentual de sessões que resultaram em leads (leads ÷ sessões)." position="bottom">Conversão</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Quantidade de campanhas vinculadas ao corretor. Clique na linha para expandir." position="bottom">Campanhas</CommonAppTooltip></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="broker in data.brokers" :key="broker.id">
              <tr class="broker-row" :class="{ 'expanded': expandedBrokers.has(broker.id) }" @click="toggleExpand(broker.id)">
                <td class="td-broker">
                  <div class="broker-identity">
                    <img v-if="broker.photoUrl" :src="broker.photoUrl" :alt="broker.name" class="broker-avatar" />
                    <span v-else class="broker-avatar broker-avatar-letter">{{ broker.name?.charAt(0)?.toUpperCase() }}</span>
                    <div class="broker-info">
                      <span class="broker-name">{{ broker.name }}</span>
                      <span v-if="broker.code" class="broker-code">{{ broker.code }}</span>
                    </div>
                  </div>
                </td>
                <td class="text-emerald td-value">{{ broker.leads }}</td>
                <td class="text-blue td-value">{{ broker.sessions }}</td>
                <td class="text-purple td-value">{{ broker.conversionRate }}%</td>
                <td class="td-value">
                  <span class="campaign-count">{{ broker.campaigns?.length || 0 }}</span>
                  <svg class="expand-icon" :class="{ 'rotated': expandedBrokers.has(broker.id) }" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </td>
              </tr>
              <tr v-if="expandedBrokers.has(broker.id)" class="campaigns-row">
                <td colspan="5">
                  <div class="campaigns-detail">
                    <div v-if="!broker.campaigns?.length" class="no-campaigns">Nenhuma campanha vinculada</div>
                    <table v-else class="campaigns-table">
                      <thead>
                        <tr>
                          <th>Campanha</th>
                          <th>Sessões</th>
                          <th>Leads</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="campaign in broker.campaigns" :key="campaign.id">
                          <td class="campaign-name">{{ campaign.name }}</td>
                          <td class="text-blue">{{ campaign.sessions }}</td>
                          <td class="text-emerald">{{ campaign.leads }}</td>
                          <td>
                            <span class="status-badge" :class="campaign.active ? 'badge-active' : 'badge-inactive'">
                              {{ campaign.active ? 'Ativa' : 'Inativa' }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </template>
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

/* Broker Table */
.broker-table {
  width: 100%;
  border-collapse: collapse;
}

.broker-table thead th {
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--color-surface-400);
  letter-spacing: 0.05em;
  padding: 12px 16px;
  border-bottom: 1px solid var(--glass-border-subtle);
}

.broker-table thead th:not(.th-broker) {
  text-align: center;
}

.broker-row {
  cursor: pointer;
  transition: background 0.15s;
}

.broker-row:hover {
  background: rgba(255,255,255,0.03);
}

.broker-row.expanded {
  background: rgba(255,255,255,0.04);
}

.broker-row td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--glass-border-subtle);
  font-size: 14px;
  color: var(--color-surface-200);
}

.td-value {
  text-align: center;
  font-weight: 600;
}

.td-broker {
  width: 40%;
}

/* Broker Identity */
.broker-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.broker-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.broker-avatar-letter {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(234, 88, 12, 0.2);
  color: #ea580c;
  font-size: 16px;
  font-weight: 700;
}

.broker-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.broker-name {
  font-weight: 600;
  color: var(--color-surface-100);
}

.broker-code {
  font-size: 12px;
  color: var(--color-surface-500);
}

.campaign-count {
  font-weight: 600;
  color: var(--color-surface-200);
  margin-right: 8px;
}

.expand-icon {
  color: var(--color-surface-500);
  transition: transform 0.2s;
  vertical-align: middle;
}

.expand-icon.rotated {
  transform: rotate(180deg);
}

/* Campaigns Detail */
.campaigns-row td {
  padding: 0;
  border-bottom: 1px solid var(--glass-border-subtle);
}

.campaigns-detail {
  background: rgba(0,0,0,0.15);
  padding: 16px 24px 16px 68px;
}

.no-campaigns {
  color: var(--color-surface-500);
  font-size: 13px;
  padding: 12px 0;
}

.campaigns-table {
  width: 100%;
  border-collapse: collapse;
}

.campaigns-table thead th {
  text-align: left;
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--color-surface-500);
  letter-spacing: 0.05em;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.campaigns-table tbody td {
  padding: 10px 12px;
  font-size: 13px;
  color: var(--color-surface-300);
  border-bottom: 1px solid rgba(255,255,255,0.03);
}

.campaign-name {
  font-weight: 500;
  color: var(--color-surface-200);
}

/* Status Badges */
.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.badge-active {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.badge-inactive {
  background: rgba(156, 163, 175, 0.15);
  color: #9ca3af;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 20px;
  }
  .filter-actions {
    width: 100%;
  }
  .campaigns-detail {
    padding-left: 16px;
  }
}
</style>
