<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const route = useRoute()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)

async function fetchVisitor() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/report/visitors/${route.params.id}?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar detalhe do visitante')
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

watch([selectedProjectId, startDate, endDate], fetchVisitor)

onMounted(async () => {
  await fetchProjects()
  fetchVisitor()
})

definePageMeta({
  layout: 'default'
})
</script>

<template>
  <div class="metrics-page">
    <NuxtLink :to="{ path: '/painel/metricas/visitantes', query: { ...route.query } }" class="back-link">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Voltar aos Visitantes
    </NuxtLink>

    <div class="header">
      <div>
        <h1>Detalhe do Visitante</h1>
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

    <div v-if="loading && !data" class="loading">Carregando visitante...</div>

    <div v-else-if="data" class="dashboard" :class="{ 'loading-overlay': loading }">
      <div class="stats-grid">
        <div class="stat-card">
          <CommonAppTooltip text="Quantidade total de sessões atribuídas a este visitante no período." position="bottom"><span class="stat-label">Sessões</span></CommonAppTooltip>
          <span class="stat-value text-blue">{{ data.summary.totalSessions }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Total de leads atribuídos a este visitante no período." position="bottom"><span class="stat-label">Leads</span></CommonAppTooltip>
          <span class="stat-value text-emerald">{{ data.summary.totalLeads }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Origem principal de atribuição do visitante." position="bottom"><span class="stat-label">Origem</span></CommonAppTooltip>
          <span class="stat-value text-cyan">{{ data.summary.utmSource || '(Direto)' }}</span>
        </div>
        <div class="stat-card">
          <CommonAppTooltip text="Momento mais recente em que este visitante foi visto no site." position="bottom"><span class="stat-label">Última atividade</span></CommonAppTooltip>
          <span class="stat-value text-indigo small">{{ formatDateTime(data.summary.lastSeenAt) }}</span>
        </div>
      </div>

      <div class="details-grid">
        <div class="details-card">
          <CommonAppTooltip text="Contexto geral do visitante: projeto, origem, campanha e janela de atividade." position="bottom"><h3>Resumo</h3></CommonAppTooltip>
          <dl class="info-list">
            <div><dt>Projeto</dt><dd>{{ data.summary.projectName || '---' }}</dd></div>
            <div><dt>Corretor</dt><dd>{{ data.summary.realtorName || '---' }}</dd></div>
            <div><dt>Campanha</dt><dd>{{ data.summary.utmCampaign || '(Nenhuma)' }}</dd></div>
            <div><dt>Landing</dt><dd>{{ data.summary.landingPage || '---' }}</dd></div>
            <div><dt>Referrer</dt><dd>{{ data.summary.referrer || '---' }}</dd></div>
            <div><dt>Primeira visita</dt><dd>{{ formatDateTime(data.summary.firstSeenAt) }}</dd></div>
            <div><dt>Última visita</dt><dd>{{ formatDateTime(data.summary.lastSeenAt) }}</dd></div>
          </dl>
        </div>

        <div class="details-card">
          <CommonAppTooltip text="Lotes mais acessados ou interagidos por este visitante ao longo das sessões." position="bottom"><h3>Lotes de Interesse</h3></CommonAppTooltip>
          <div v-if="data.lots?.length" class="stack-list">
            <div v-for="lot in data.lots" :key="lot.label" class="stack-item">
              <span>{{ lot.label }}</span>
              <strong>{{ lot.count }}</strong>
            </div>
          </div>
          <div v-else class="no-data-placeholder">Nenhum lote interagido no período.</div>
        </div>
      </div>

      <div class="details-card">
        <CommonAppTooltip text="Lista das sessões pertencentes a este visitante, com navegação e duração." position="bottom"><h3>Sessões do Visitante</h3></CommonAppTooltip>
        <div v-if="data.sessions?.length" class="stack-list">
          <NuxtLink v-for="session in data.sessions" :key="session.id" :to="{ path: `/painel/metricas/sessoes/${session.id}`, query: { ...route.query } }" class="stack-item session-link">
            <div>
              <strong>{{ session.id.slice(-8) }}</strong>
              <div class="table-muted">{{ session.projectName || '---' }} · {{ session.realtorName || 'Sem corretor' }}</div>
            </div>
            <div class="lead-meta">
              <span>{{ session.pageViews }} páginas</span>
              <span>{{ formatDuration(session.durationSec) }}</span>
            </div>
          </NuxtLink>
        </div>
        <div v-else class="no-data-placeholder">Nenhuma sessão disponível para este visitante.</div>
      </div>

      <div class="details-card">
        <CommonAppTooltip text="Leads gerados por este visitante, independentemente da sessão em que surgiram." position="bottom"><h3>Leads do Visitante</h3></CommonAppTooltip>
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
        <div v-else class="no-data-placeholder">Nenhum lead associado a este visitante.</div>
      </div>

      <div class="details-card">
        <CommonAppTooltip text="Eventos mais recentes registrados para este visitante em todas as sessões listadas." position="bottom"><h3>Eventos Recentes</h3></CommonAppTooltip>
        <div v-if="data.events?.length" class="timeline">
          <div v-for="event in data.events" :key="event.id" class="timeline-item">
            <div class="timeline-time">{{ formatDateTime(event.timestamp) }}</div>
            <div class="timeline-body">
              <strong>{{ event.type }}</strong>
              <div>{{ event.action || event.label || event.path || 'Sem descrição' }}</div>
              <div class="table-muted">Sessão {{ event.sessionId.slice(-8) }}</div>
            </div>
          </div>
        </div>
        <div v-else class="no-data-placeholder">Nenhum evento recente encontrado.</div>
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
.stat-value.small { font-size: 18px; line-height: 1.4; }
.info-list { display: grid; gap: 12px; margin: 0; }
.info-list div { display: flex; justify-content: space-between; gap: 16px; }
dd { margin: 0; color: var(--color-surface-50); text-align: right; }
.stack-list { display: grid; gap: 10px; }
.stack-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 12px 14px; border-radius: 14px; background: rgba(15, 23, 42, 0.45); color: inherit; text-decoration: none; }
.session-link:hover { border-color: rgba(96, 165, 250, 0.3); }
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
  .header, .timeline-item, .info-list div { grid-template-columns: 1fr; flex-direction: column; align-items: stretch; }
}
</style>