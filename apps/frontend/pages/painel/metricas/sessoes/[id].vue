<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)

const pageJourney = computed(() => {
  if (!data.value?.events?.length) return []

  const pageViewEvents = data.value.events.filter((event: any) => event.type === 'PAGE_VIEW')

  return pageViewEvents.map((event: any, index: number) => ({
    id: event.id,
    step: index + 1,
    title: event.label || event.path || 'Página sem identificação',
    path: event.path || null,
    timestamp: event.timestamp
  }))
})

const activitySummary = computed(() => {
  if (!data.value?.events?.length) return []

  const counts = new Map<string, number>()

  for (const event of data.value.events) {
    const key =
      event.type === 'PAGE_VIEW'
        ? 'Visualizações de página'
        : event.category === 'LOT'
          ? 'Interações com lotes'
          : event.category === 'WHATSAPP'
            ? 'Cliques em WhatsApp'
            : event.type === 'LEAD_SUBMIT'
              ? 'Conversões em lead'
              : event.category === 'REALTOR_LINK'
                ? 'Cliques em corretor'
                : event.category === 'MAP_TOOL'
                  ? 'Uso de ferramentas'
                  : 'Outras ações'

    counts.set(key, (counts.get(key) || 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
})

async function fetchSession() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/report/sessions/${route.params.id}?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar detalhe da sessão')
  } finally {
    loading.value = false
  }
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
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
}

function formatEventType(event: any) {
  if (event.type === 'PAGE_VIEW') return 'Página vista'
  if (event.type === 'LEAD_SUBMIT') return 'Lead enviado'
  if (event.category === 'LOT') return 'Interação com lote'
  if (event.category === 'WHATSAPP') return 'Clique em WhatsApp'
  if (event.category === 'REALTOR_LINK') return 'Clique em corretor'
  if (event.category === 'MAP_TOOL') return 'Uso de ferramenta'
  return event.type || 'Evento'
}

watch([selectedProjectId, startDate, endDate], fetchSession)

onMounted(async () => {
  await fetchProjects()
  fetchSession()
})

definePageMeta({
  layout: 'default'
})
</script>

<template>
  <div class="metrics-page">
    <NuxtLink :to="{ path: '/painel/metricas/sessoes', query: { ...route.query } }" class="back-link">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Voltar às Sessões
    </NuxtLink>

    <div class="header">
      <div>
        <h1>Detalhe da Sessão</h1>
        <p class="subtitle">{{ data?.summary?.id || route.params.id }}</p>
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

    <div v-if="loading && !data" class="loading">Carregando sessão...</div>

    <div v-else-if="data" class="dashboard" :class="{ 'loading-overlay': loading }">
      <div class="stats-grid">
        <div class="stat-card">
          <CommonAppTooltip text="Tempo total observado entre o primeiro e o último sinal real de atividade desta sessão. Retornos após inatividade longa abrem uma nova sessão, em vez de esticar esta." position="bottom"><span class="stat-label">Duração</span></CommonAppTooltip>
          <span class="stat-value text-blue">{{ formatDuration(data.summary.durationSec) }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Quantidade de visualizações de páginas dentro desta sessão." position="bottom"><span class="stat-label">Páginas</span></CommonAppTooltip>
          <span class="stat-value text-cyan">{{ data.summary.pageViews }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Leads gerados durante esta sessão específica." position="bottom"><span class="stat-label">Leads</span></CommonAppTooltip>
          <span class="stat-value text-emerald">{{ data.summary.totalLeads }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Quantidade de sessões associadas ao mesmo visitante persistente desta sessão." position="bottom"><span class="stat-label">Visitante</span></CommonAppTooltip>
          <span class="stat-value text-indigo">{{ data.summary.visitorSessions || 1 }} sessões</span>
          <NuxtLink v-if="data.summary.visitorId" :to="{ path: `/painel/metricas/visitantes/${data.summary.visitorId}`, query: { ...route.query } }" class="stat-link">
            Ver visitante consolidado
          </NuxtLink>
        </div>
      </div>

      <div class="details-grid">
        <div class="details-card">
          <CommonAppTooltip text="Resumo contextual da sessão: atribuição, origem, landing e janela temporal." position="bottom"><h3>Resumo</h3></CommonAppTooltip>
          <dl class="info-list">
            <div><dt>Projeto</dt><dd>{{ data.summary.projectName || '---' }}</dd></div>
            <div><dt>Corretor</dt><dd>{{ data.summary.realtorName || '---' }}</dd></div>
            <div><dt>Origem</dt><dd>{{ data.summary.utmSource || '(Direto)' }}</dd></div>
            <div><dt>Campanha</dt><dd>{{ data.summary.utmCampaign || '(Nenhuma)' }}</dd></div>
            <div><dt>Landing</dt><dd>{{ data.summary.landingPage || '---' }}</dd></div>
            <div><dt>Entrada</dt><dd>{{ formatDateTime(data.summary.firstSeenAt) }}</dd></div>
            <div><dt>Última atividade</dt><dd>{{ formatDateTime(data.summary.lastSeenAt) }}</dd></div>
          </dl>
        </div>

        <div class="details-card">
          <CommonAppTooltip text="Ranking dos lotes com os quais o visitante interagiu durante esta sessão." position="bottom"><h3>Lotes Interagidos</h3></CommonAppTooltip>
          <div v-if="data.lots?.length" class="stack-list">
            <div v-for="lot in data.lots" :key="lot.label" class="stack-item">
              <span>{{ lot.label }}</span>
              <strong>{{ lot.count }}</strong>
            </div>
          </div>
          <div v-else class="no-data-placeholder">Nenhum lote interagido nesta sessão.</div>
        </div>

        <div class="details-card">
          <CommonAppTooltip text="Resumo do comportamento desta visita, agrupando os principais tipos de interação observados." position="bottom"><h3>Atividade Geral</h3></CommonAppTooltip>
          <div v-if="activitySummary.length" class="stack-list">
            <div v-for="activity in activitySummary" :key="activity.label" class="stack-item">
              <span>{{ activity.label }}</span>
              <strong>{{ activity.count }}</strong>
            </div>
          </div>
          <div v-else class="no-data-placeholder">Nenhuma atividade resumida disponível.</div>
        </div>
      </div>

      <div class="details-card">
        <CommonAppTooltip text="Ordem exata das páginas vistas nesta sessão, facilitando a leitura do percurso do visitante." position="bottom"><h3>Páginas Percorridas</h3></CommonAppTooltip>
        <div v-if="pageJourney.length" class="journey-list">
          <div v-for="page in pageJourney" :key="page.id" class="journey-item">
            <div class="journey-step">{{ page.step }}</div>
            <div class="journey-body">
              <strong>{{ page.title }}</strong>
              <div class="table-muted">{{ page.path || 'Sem rota registrada' }}</div>
            </div>
            <div class="journey-time">{{ formatDateTime(page.timestamp) }}</div>
          </div>
        </div>
        <div v-else class="no-data-placeholder">Nenhuma página percorrida registrada nesta sessão.</div>
      </div>

      <div class="details-card">
        <CommonAppTooltip text="Leads efetivamente gerados nesta sessão, com status e momento de criação." position="bottom"><h3>Leads da Sessão</h3></CommonAppTooltip>
        <div v-if="data.leads?.length" class="stack-list">
          <div v-for="lead in data.leads" :key="lead.id" class="stack-item lead-item">
            <div>
              <strong>{{ lead.name || 'Lead sem nome' }}</strong>
              <div class="table-muted">{{ lead.email || lead.phone || 'Sem contato' }}</div>
            </div>
            <div class="lead-meta">
              <span>{{ lead.status }}</span>
              <span>{{ formatDateTime(lead.createdAt) }}</span>
            </div>
          </div>
        </div>
        <div v-else class="no-data-placeholder">Nenhum lead associado a esta sessão.</div>
      </div>

      <div class="details-card">
        <CommonAppTooltip text="Sequência cronológica dos eventos registrados ao longo da sessão." position="bottom"><h3>Linha do Tempo</h3></CommonAppTooltip>
        <div v-if="data.events?.length" class="timeline">
          <div v-for="event in data.events" :key="event.id" class="timeline-item">
            <div class="timeline-time">{{ formatDateTime(event.timestamp) }}</div>
            <div class="timeline-body">
              <strong>{{ formatEventType(event) }}</strong>
              <div>{{ event.action || event.label || event.path || 'Sem descrição' }}</div>
              <div class="table-muted">{{ event.path || event.category || 'geral' }}</div>
            </div>
          </div>
        </div>
        <div v-else class="no-data-placeholder">Nenhum evento registrado nesta sessão.</div>
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
.filter-group label, .table-muted, dt { color: var(--color-surface-400); font-size: 12px; }
.date-input, .project-select { border: 1px solid var(--glass-border-subtle); background: rgba(15, 23, 42, 0.55); color: var(--color-surface-50); border-radius: 12px; padding: 10px 12px; }
.dashboard, .details-grid { display: grid; gap: 24px; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
.details-grid { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.stat-card, .details-card { background: var(--glass-bg); border: 1px solid var(--glass-border-subtle); border-radius: var(--radius-lg); padding: 20px; }
.stat-label { color: var(--color-surface-400); font-size: 12px; }
.stat-value { display: block; margin-top: 8px; font-size: 28px; font-weight: 800; }
.stat-link { display: inline-flex; margin-top: 10px; color: #93c5fd; text-decoration: none; font-size: 13px; font-weight: 600; }
.info-list { display: grid; gap: 12px; margin: 0; }
.info-list div { display: flex; justify-content: space-between; gap: 16px; }
dd { margin: 0; color: var(--color-surface-50); text-align: right; }
.stack-list { display: grid; gap: 10px; }
.stack-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 12px 14px; border-radius: 14px; background: rgba(15, 23, 42, 0.45); }
.journey-list { display: grid; gap: 10px; }
.journey-item { display: grid; grid-template-columns: 40px 1fr 180px; gap: 14px; align-items: center; padding: 12px 14px; border-radius: 14px; background: rgba(15, 23, 42, 0.45); }
.journey-step { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 999px; background: rgba(34, 211, 238, 0.16); color: #67e8f9; font-weight: 800; }
.journey-body { min-width: 0; }
.journey-time { color: var(--color-surface-400); font-size: 12px; text-align: right; }
.lead-item { align-items: flex-start; }
.lead-meta { display: grid; gap: 4px; text-align: right; }
.timeline { display: grid; gap: 12px; }
.timeline-item { display: grid; grid-template-columns: 180px 1fr; gap: 16px; padding: 12px 0; border-bottom: 1px solid rgba(148, 163, 184, 0.12); }
.timeline-time { color: var(--color-surface-400); font-size: 12px; }
.loading, .no-data-placeholder { color: var(--color-surface-400); }
.text-blue { color: #60a5fa; }
.text-cyan { color: #22d3ee; }
.text-emerald { color: #34d399; }
.text-indigo { color: #818cf8; }
@media (max-width: 960px) {
  .header, .timeline-item, .info-list div, .journey-item { grid-template-columns: 1fr; flex-direction: column; align-items: stretch; }
  .journey-time { text-align: left; }
}
</style>