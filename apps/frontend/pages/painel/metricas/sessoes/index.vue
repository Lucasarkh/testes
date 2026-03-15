<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)
const page = ref(Number(route.query.page || 1))
const limit = 25

const visibleResultsLabel = computed(() => {
  if (!data.value?.pagination?.total || !data.value?.items?.length) return null
  const start = (data.value.pagination.page - 1) * data.value.pagination.limit + 1
  const end = start + data.value.items.length - 1
  return `Mostrando ${start}-${end} de ${data.value.pagination.total} sessões`
})

async function fetchSessions() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/report/sessions?${buildQueryString()}&page=${page.value}&limit=${limit}`)
  } catch {
    toast.error('Erro ao carregar sessões')
  } finally {
    loading.value = false
  }
}

function syncPageQuery() {
  router.replace({
    query: {
      ...route.query,
      page: String(page.value)
    }
  })
}

function previousPage() {
  if (page.value <= 1) return
  page.value -= 1
}

function nextPage() {
  if (!data.value?.pagination?.totalPages || page.value >= data.value.pagination.totalPages) return
  page.value += 1
}

function openSession(sessionId: string) {
  router.push({
    path: `/painel/metricas/sessoes/${sessionId}`,
    query: {
      ...route.query
    }
  })
}

function formatDateTime(value?: string) {
  if (!value) return '---'
  return new Date(value).toLocaleString('pt-BR')
}

function formatDuration(seconds: number) {
  if (!seconds) return '0s'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (!remainingSeconds) return `${minutes}m`
  return `${minutes}m ${remainingSeconds}s`
}

watch([selectedProjectId, startDate, endDate], () => {
  page.value = 1
  fetchSessions()
})

watch(page, () => {
  syncPageQuery()
  fetchSessions()
})

onMounted(async () => {
  await fetchProjects()
  syncPageQuery()
  fetchSessions()
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
        <h1>Explorador de Sessões</h1>
        <p class="subtitle">Entenda cada visita: origem, engajamento, lotes acessados e leads gerados</p>
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
            <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="loading && !data" class="loading">Carregando sessões...</div>

    <div v-else-if="data" class="dashboard" :class="{ 'loading-overlay': loading }">
      <div class="stats-grid compact">
        <div class="stat-card">
          <CommonAppTooltip text="Quantidade total de sessões reais registradas no período filtrado." position="bottom"><span class="stat-label">Sessões no período</span></CommonAppTooltip>
          <span class="stat-value text-blue">{{ data.summary.totalSessions }}</span>
        </div>
      </div>

      <div class="details-card">
        <div class="section-head">
          <div>
            <h3>Sessões Recentes</h3>
            <p v-if="visibleResultsLabel" class="section-caption">{{ visibleResultsLabel }}</p>
            <p v-else class="section-caption">Período sem sessões encontradas.</p>
          </div>
          <div v-if="data.pagination.totalPages > 1" class="pagination-actions">
            <button class="page-button" :disabled="page <= 1" @click="previousPage">Anterior</button>
            <button class="page-button" :disabled="page >= data.pagination.totalPages" @click="nextPage">Próxima</button>
          </div>
        </div>

        <div v-if="!data.items?.length" class="no-data-placeholder">Nenhuma sessão encontrada no período.</div>

        <table v-else class="simple-table">
          <thead>
            <tr>
              <th><CommonAppTooltip text="Identificador da sessão individual. Cada linha representa uma visita distinta." position="bottom">Sessão</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Visitante persistente associado à sessão, permitindo ver recorrência entre visitas." position="bottom">Visitante</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Projeto e corretor atribuídos à sessão filtrada." position="bottom">Projeto</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Origem e campanha atribuídas à visita no momento da sessão." position="bottom">Origem</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Total de page views registrados dentro da sessão." position="bottom">Páginas</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Total de interações relacionadas a lotes durante a sessão." position="bottom">Lotes</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Quantidade de leads gerados dentro da sessão." position="bottom">Leads</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Tempo entre o primeiro e o último evento registrados na sessão." position="bottom">Duração</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Momento de início e última atividade observada na sessão." position="bottom">Última atividade</CommonAppTooltip></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="session in data.items"
              :key="session.id"
              class="table-row-link"
              tabindex="0"
              @click="openSession(session.id)"
              @keydown.enter.prevent="openSession(session.id)"
              @keydown.space.prevent="openSession(session.id)"
            >
              <td>
                <span class="table-link">{{ session.id.slice(-8) }}</span>
                <span class="table-muted">{{ session.deviceType || '---' }}</span>
              </td>
              <td>
                <div>{{ session.visitorId ? session.visitorId.slice(-8) : '---' }}</div>
                <span class="table-muted">{{ session.visitorSessions || 1 }} visita(s)</span>
              </td>
              <td>
                <div>{{ session.projectName || '---' }}</div>
                <span class="table-muted">{{ session.realtorName || 'Sem corretor' }}</span>
              </td>
              <td>
                <div>{{ session.utmSource || '(Direto)' }}</div>
                <span class="table-muted">{{ session.utmCampaign || '(Nenhuma)' }}</span>
              </td>
              <td>{{ session.pageViews }}</td>
              <td>{{ session.lotInteractions }}</td>
              <td>{{ session.totalLeads }}</td>
              <td>
                <div>{{ formatDuration(session.durationSec) }}</div>
                <span class="table-muted">{{ session.isBounce ? 'Bounce' : 'Engajada' }}</span>
              </td>
              <td>
                <div>{{ formatDateTime(session.lastSeenAt) }}</div>
                <span class="table-muted">Entrada: {{ formatDateTime(session.firstSeenAt) }}</span>
              </td>
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
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 32px;
}

h1 {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-surface-50);
  margin: 0 0 8px;
}

.subtitle {
  margin: 0;
  color: var(--color-surface-400);
}

.filter-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-surface-500);
}

.date-input,
.project-select,
.page-button {
  border: 1px solid var(--glass-border-subtle);
  background: rgba(15, 23, 42, 0.55);
  color: var(--color-surface-50);
  border-radius: 12px;
  padding: 10px 12px;
}

.dashboard {
  display: grid;
  gap: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.stat-card,
.details-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
  border-radius: var(--radius-lg);
  padding: 20px;
}

.stat-label,
.table-muted {
  color: var(--color-surface-400);
  font-size: 12px;
}

.stat-value {
  display: block;
  margin-top: 8px;
  font-size: 28px;
  font-weight: 800;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.section-caption {
  margin: 6px 0 0;
  color: var(--color-surface-400);
  font-size: 13px;
}

.pagination-actions {
  display: flex;
  gap: 8px;
}

.page-button:disabled {
  opacity: 0.45;
}

.simple-table {
  width: 100%;
  border-collapse: collapse;
}

.simple-table th,
.simple-table td {
  padding: 14px 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  text-align: left;
  vertical-align: top;
}

.simple-table th {
  color: var(--color-surface-400);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.table-link {
  color: var(--color-primary-400);
  font-weight: 700;
}

.table-row-link {
  cursor: pointer;
}

.table-row-link:hover td,
.table-row-link:focus-visible td {
  background: rgba(15, 23, 42, 0.38);
}

.table-row-link:focus-visible {
  outline: none;
}

.loading,
.no-data-placeholder {
  color: var(--color-surface-400);
}

.text-blue { color: #60a5fa; }
.text-cyan { color: #22d3ee; }
.text-indigo { color: #818cf8; }

@media (max-width: 960px) {
  .header,
  .section-head {
    flex-direction: column;
    align-items: stretch;
  }

  .simple-table {
    display: block;
    overflow-x: auto;
  }
}
</style>