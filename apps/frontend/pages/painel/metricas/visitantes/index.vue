<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const audience = ref<any>(null)
const loading = ref(false)
const page = ref(Number(route.query.page || 1))
const limit = 25

const visibleResultsLabel = computed(() => {
  if (!data.value?.pagination?.total || !data.value?.items?.length) return null
  const start = (data.value.pagination.page - 1) * data.value.pagination.limit + 1
  const end = start + data.value.items.length - 1
  return `Mostrando ${start}-${end} de ${data.value.pagination.total} visitantes`
})

async function fetchVisitors() {
  loading.value = true
  try {
    const [visitorsRes, audienceRes] = await Promise.all([
      fetchApi(`/tracking/report/visitors?${buildQueryString()}&page=${page.value}&limit=${limit}`),
      fetchApi(`/tracking/metrics/audience?${buildQueryString()}`)
    ])
    data.value = visitorsRes
    audience.value = audienceRes
  } catch {
    toast.error('Erro ao carregar visitantes')
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

function openVisitor(visitorId: string) {
  router.push({
    path: `/painel/metricas/visitantes/${visitorId}`,
    query: {
      ...route.query
    }
  })
}

function formatDateTime(value?: string) {
  if (!value) return '---'
  return new Date(value).toLocaleString('pt-BR')
}

watch([selectedProjectId, startDate, endDate], () => {
  page.value = 1
  fetchVisitors()
})

watch(page, () => {
  syncPageQuery()
  fetchVisitors()
})

onMounted(async () => {
  await fetchProjects()
  syncPageQuery()
  fetchVisitors()
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
        <h1>Explorador de Visitantes</h1>
        <p class="subtitle">Recorrência, origem, engajamento e histórico consolidado por visitante</p>
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

    <div v-if="loading && !data" class="loading">Carregando visitantes...</div>

    <div v-else-if="data && audience" class="dashboard" :class="{ 'loading-overlay': loading }">
      <div class="stats-grid">
        <div class="stat-card">
          <CommonAppTooltip text="Total de visitantes únicos identificados no período filtrado." position="bottom"><span class="stat-label">Visitantes</span></CommonAppTooltip>
          <span class="stat-value text-blue">{{ audience.summary.totalVisitors }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Visitantes que tiveram mais de uma sessão no período e portanto retornaram ao site." position="bottom"><span class="stat-label">Retornantes</span></CommonAppTooltip>
          <span class="stat-value text-cyan">{{ audience.summary.returningVisitors }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Média de sessões por visitante dentro do período filtrado." position="bottom"><span class="stat-label">Visitas por visitante</span></CommonAppTooltip>
          <span class="stat-value text-indigo">{{ audience.summary.avgVisitsPerVisitor }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Percentual de visitantes que geraram pelo menos um lead no período." position="bottom"><span class="stat-label">Taxa visitante → lead</span></CommonAppTooltip>
          <span class="stat-value text-emerald">{{ audience.summary.leadRate }}%</span>
        </div>
      </div>

      <div class="details-card">
        <div class="section-head">
          <div>
            <h3>Visitantes Recentes</h3>
            <p v-if="visibleResultsLabel" class="section-caption">{{ visibleResultsLabel }}</p>
            <p v-else class="section-caption">Período sem visitantes encontrados.</p>
          </div>
          <div v-if="data.pagination.totalPages > 1" class="pagination-actions">
            <button class="page-button" :disabled="page <= 1" @click="previousPage">Anterior</button>
            <button class="page-button" :disabled="page >= data.pagination.totalPages" @click="nextPage">Próxima</button>
          </div>
        </div>

        <div v-if="!data.items?.length" class="no-data-placeholder">Nenhum visitante encontrado no período.</div>

        <table v-else class="simple-table">
          <thead>
            <tr>
              <th><CommonAppTooltip text="Identificador do visitante persistente e o dispositivo predominante registrado." position="bottom">Visitante</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Projeto e corretor mais recentes associados a esse visitante." position="bottom">Projeto</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Origem e campanha atribuídas ao visitante." position="bottom">Origem</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Número de sessões atribuídas ao visitante no período." position="bottom">Sessões</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Soma das visualizações de páginas de todas as sessões do visitante." position="bottom">Páginas</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Soma das interações com lotes em todas as sessões do visitante." position="bottom">Lotes</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Total de leads atribuídos ao visitante." position="bottom">Leads</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Atalho para a sessão mais recente do visitante." position="bottom">Última sessão</CommonAppTooltip></th>
              <th><CommonAppTooltip text="Primeiro e último momento em que o visitante foi visto no período." position="bottom">Última atividade</CommonAppTooltip></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="visitor in data.items"
              :key="visitor.id"
              class="table-row-link"
              tabindex="0"
              @click="openVisitor(visitor.id)"
              @keydown.enter.prevent="openVisitor(visitor.id)"
              @keydown.space.prevent="openVisitor(visitor.id)"
            >
              <td>
                <span class="table-link">{{ visitor.id.slice(-8) }}</span>
                <span class="table-muted">{{ visitor.deviceType || '---' }}</span>
              </td>
              <td>
                <div>{{ visitor.projectName || '---' }}</div>
                <span class="table-muted">{{ visitor.realtorName || 'Sem corretor' }}</span>
              </td>
              <td>
                <div>{{ visitor.utmSource || '(Direto)' }}</div>
                <span class="table-muted">{{ visitor.utmCampaign || '(Nenhuma)' }}</span>
              </td>
              <td>{{ visitor.sessions }}</td>
              <td>{{ visitor.pageViews }}</td>
              <td>{{ visitor.lotInteractions }}</td>
              <td>{{ visitor.leads }}</td>
              <td>
                <NuxtLink v-if="visitor.lastSessionId" :to="{ path: `/painel/metricas/sessoes/${visitor.lastSessionId}`, query: { ...route.query } }" class="table-link" @click.stop>
                  {{ visitor.lastSessionId.slice(-8) }}
                </NuxtLink>
                <span v-else>---</span>
              </td>
              <td>
                <div>{{ formatDateTime(visitor.lastSeenAt) }}</div>
                <span class="table-muted">Entrada: {{ formatDateTime(visitor.firstSeenAt) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metrics-page { padding: 24px; }
.back-link { display: inline-flex; align-items: center; gap: 8px; color: var(--color-surface-400); text-decoration: none; margin-bottom: 24px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 32px; }
h1 { margin: 0 0 8px; font-size: 28px; font-weight: 800; color: var(--color-surface-50); }
.subtitle { margin: 0; color: var(--color-surface-400); }
.filter-actions { display: flex; gap: 16px; flex-wrap: wrap; background: var(--glass-bg); border: 1px solid var(--glass-border-subtle); border-radius: var(--radius-lg); padding: 16px 20px; }
.filter-group { display: flex; flex-direction: column; gap: 6px; }
.filter-group label, .table-muted { color: var(--color-surface-400); font-size: 12px; }
.date-input, .project-select, .page-button { border: 1px solid var(--glass-border-subtle); background: rgba(15, 23, 42, 0.55); color: var(--color-surface-50); border-radius: 12px; padding: 10px 12px; }
.dashboard { display: grid; gap: 24px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
.stat-card, .details-card { background: var(--glass-bg); border: 1px solid var(--glass-border-subtle); border-radius: var(--radius-lg); padding: 20px; }
.stat-label { color: var(--color-surface-400); font-size: 12px; }
.stat-value { display: block; margin-top: 8px; font-size: 28px; font-weight: 800; }
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.section-caption { margin: 6px 0 0; color: var(--color-surface-400); font-size: 13px; }
.pagination-actions { display: flex; gap: 8px; }
.page-button:disabled { opacity: 0.45; }
.simple-table { width: 100%; border-collapse: collapse; }
.simple-table th, .simple-table td { padding: 14px 10px; border-bottom: 1px solid rgba(148, 163, 184, 0.12); text-align: left; vertical-align: top; }
.simple-table th { color: var(--color-surface-400); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
.table-link { color: var(--color-primary-400); font-weight: 700; }
.table-row-link { cursor: pointer; }
.table-row-link:hover td, .table-row-link:focus-visible td { background: rgba(15, 23, 42, 0.38); }
.table-row-link:focus-visible { outline: none; }
.loading, .no-data-placeholder { color: var(--color-surface-400); }
.text-blue { color: #60a5fa; }
.text-cyan { color: #22d3ee; }
.text-indigo { color: #818cf8; }
.text-emerald { color: #34d399; }
@media (max-width: 960px) {
  .header, .section-head { flex-direction: column; align-items: stretch; }
  .simple-table { display: block; overflow-x: auto; }
}
</style>