<template>
  <div class="project-metrics-page project-heatmap-page">
    <div v-if="loading && !overview" class="project-metrics-loading-state">
      <div class="loading-spinner"></div>
      <span>Carregando relatório de mapa de calor...</span>
    </div>

    <div v-else-if="error && !overview" class="project-metrics-error-state">
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="loadData">Tentar novamente</button>
    </div>

    <template v-else>
      <NuxtLink :to="`/painel/projetos/${projectId}`" class="project-metrics-back-link">
        <i class="bi bi-arrow-left-short" aria-hidden="true"></i>
        <span>Voltar ao projeto</span>
      </NuxtLink>

      <header class="project-metrics-header">
        <div class="project-metrics-header-copy">
          <p class="eyebrow">Métricas do projeto</p>
          <h1>Relatório de mapa de calor</h1>
          <p class="project-metrics-subtitle">Leitura espacial da planta com foco em interesse por lote, geração de leads e impacto no acesso do projeto.</p>
        </div>

        <div class="project-metrics-filter-actions">
          <div class="project-metrics-filter-group">
            <label for="startDate">Data inicial</label>
            <input id="startDate" v-model="startDate" type="date" :max="startDateMax" class="project-metrics-date-input" />
          </div>
          <div class="project-metrics-filter-group">
            <label for="endDate">Data final</label>
            <input id="endDate" v-model="endDate" type="date" :min="endDateMin" :max="endDateMax" class="project-metrics-date-input" />
          </div>
          <div class="project-metrics-period-chip">
            <span>Período ativo</span>
            <strong>{{ formattedPeriod }}</strong>
          </div>
        </div>
      </header>

      <div class="project-metrics-dashboard" :class="{ 'project-metrics-loading-overlay': loading }">
        <section class="project-metrics-stats-grid">
          <article v-for="card in summaryCards" :key="card.label" class="project-metrics-stat-card" :class="`project-metrics-stat-card--${card.tone}`">
            <span class="project-metrics-stat-label">{{ card.label }}</span>
            <strong class="project-metrics-stat-value">{{ card.value }}</strong>
            <p class="project-metrics-stat-hint">{{ card.hint }}</p>
          </article>
        </section>

        <section class="project-metrics-report-grid">
          <div class="project-metrics-report-main project-metrics-details-card project-metrics-heatmap-card">
            <div class="project-metrics-section-heading">
              <div>
                <p class="eyebrow">Visualização principal</p>
                <h2>Mapa do projeto</h2>
              </div>
              <span class="project-metrics-section-chip">{{ formattedPeriod }}</span>
            </div>

            <ProjectHeatmapReport :report="heatmap" />
          </div>

          <aside class="project-metrics-report-side">
            <section class="project-metrics-details-card project-metrics-side-card">
            <div class="insight-card__header">
              <div>
                <p class="eyebrow">Leitura do período</p>
                <h2>Destaques executivos</h2>
              </div>
            </div>

            <div class="insight-stat-list">
              <div>
                <span>Lote líder</span>
                <strong>{{ topLotHeadline }}</strong>
              </div>
              <div>
                <span>Participação do líder</span>
                <strong>{{ topLotShare }}</strong>
              </div>
              <div>
                <span>Conversão lote → lead</span>
                <strong>{{ heatmap?.summary ? `${formatPercent(heatmap.summary.lotLeadConversionRate)}%` : '0,0%' }}</strong>
              </div>
              <div>
                <span>Engajamento médio</span>
                <strong>{{ averageSessionDuration }}</strong>
              </div>
            </div>
            </section>

            <section class="project-metrics-details-card project-metrics-side-card">
            <div class="insight-card__header">
              <div>
                <p class="eyebrow">Navegação</p>
                <h2>Páginas que puxaram tráfego</h2>
              </div>
            </div>

            <div v-if="topPaths.length" class="insight-list">
              <div v-for="item in topPaths" :key="item.path || item.label" class="insight-list__item">
                <div>
                  <strong>{{ item.label || item.path }}</strong>
                  <span>{{ item.path }}</span>
                </div>
                <span>{{ formatNumber(item.count || 0) }}</span>
              </div>
            </div>
            <p v-else class="empty-note">Sem páginas relevantes registradas no período.</p>
            </section>

            <section class="project-metrics-details-card project-metrics-side-card">
            <div class="insight-card__header">
              <div>
                <p class="eyebrow">Origem da audiência</p>
                <h2>Canais com mais volume</h2>
              </div>
            </div>

            <div v-if="topSources.length" class="insight-list insight-list--compact">
              <div v-for="item in topSources" :key="item.label" class="insight-list__item">
                <strong>{{ item.label }}</strong>
                <span>{{ formatNumber(item.count || 0) }}</span>
              </div>
            </div>
            <p v-else class="empty-note">Nenhuma origem consolidada para o período.</p>
            </section>

            <section class="project-metrics-details-card project-metrics-side-card project-metrics-side-card--warning" v-if="heatmap?.summary?.lotsWithoutHotspot">
            <div class="insight-card__header">
              <div>
                <p class="eyebrow">Cobertura incompleta</p>
                <h2>Há atividade fora da planta</h2>
              </div>
            </div>

            <p class="warning-copy">
              {{ heatmap.summary.lotsWithoutHotspot }} lote(s) tiveram atividade no período, mas ainda não estão refletidos como hotspot na planta. Isso reduz a leitura espacial do heatmap.
            </p>
            </section>
          </aside>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import ProjectHeatmapReport from '~/components/painel/metrics/ProjectHeatmapReport.vue'

const route = useRoute()
const projectId = computed(() => route.params.id as string)

const { fetchApi } = useApi()
const {
  selectedProjectId,
  startDate,
  startDateMax,
  endDate,
  endDateMin,
  endDateMax,
} = useMetricsFilters()

const loading = ref(true)
const error = ref('')
const overview = ref<any>(null)
const heatmap = ref<any>(null)

watch(
  projectId,
  id => {
    if (id && selectedProjectId.value !== id) {
      selectedProjectId.value = id
    }
  },
  { immediate: true },
)

function buildProjectQueryString() {
  const params = new URLSearchParams({
    projectId: projectId.value,
    startDate: startDate.value || '',
    endDate: endDate.value || '',
  })

  return params.toString()
}

async function loadData() {
  if (!projectId.value) return

  loading.value = true
  error.value = ''

  try {
    const query = buildProjectQueryString()

    const [metricsRes, heatmapRes] = await Promise.all([
      fetchApi(`/tracking/metrics?${query}`),
      fetchApi(`/tracking/metrics/project-heatmap?${query}`),
    ])

    overview.value = metricsRes
    heatmap.value = heatmapRes
  } catch (err: any) {
    error.value = `Falha ao carregar o relatório. ${err?.message || ''}`.trim()
  } finally {
    loading.value = false
  }
}

watch([projectId, startDate, endDate], () => {
  loadData()
}, { immediate: true })

definePageMeta({
  layout: 'default',
})

const summaryCards = computed(() => {
  const metricsSummary = overview.value?.summary || {}
  const heatmapSummary = heatmap.value?.summary || {}

  return [
    {
      label: 'Sessões do projeto',
      value: formatNumber(metricsSummary.totalSessions || 0),
      hint: 'Visitas reais abertas no período selecionado.',
      tone: 'accent'
    },
    {
      label: 'Visualizações gerais',
      value: formatNumber(metricsSummary.totalPageViews || 0),
      hint: 'Todas as páginas visitadas dentro do projeto.',
      tone: 'accent'
    },
    {
      label: 'Interações com lotes',
      value: formatNumber(heatmapSummary.totalLotViews || 0),
      hint: 'Eventos e acessos associados a lotes específicos.',
      tone: 'accent'
    },
    {
      label: 'Leads por lote',
      value: formatNumber(heatmapSummary.totalLotLeads || 0),
      hint: 'Leads originados em lotes mapeados.',
      tone: 'accent'
    },
    {
      label: 'Taxa de rejeição',
      value: `${formatPercent(overview.value?.engagement?.bounceRate || 0)}%`,
      hint: 'Sessões curtas sem aprofundamento relevante.',
      tone: 'warning'
    },
    {
      label: 'Páginas por sessão',
      value: (overview.value?.engagement?.avgPagesPerSession || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
      hint: 'Profundidade média da navegação no projeto.',
      tone: 'accent'
    }
  ]
})

const topPaths = computed(() => overview.value?.topPaths?.slice(0, 5) || [])
const topSources = computed(() => overview.value?.topUtmSources?.slice(0, 5) || [])
const topActiveLot = computed(() => heatmap.value?.lots?.find((lot: any) => lot.views || lot.leads || lot.reservations) || null)

const topLotHeadline = computed(() => {
  if (!topActiveLot.value) return 'Nenhum lote com atividade'
  return `${topActiveLot.value.code} · ${topActiveLot.value.name}`
})

const topLotShare = computed(() => {
  const lot = topActiveLot.value
  const totalViews = heatmap.value?.summary?.totalLotViews || 0

  if (!lot || totalViews <= 0) return '0,0% dos acessos de lote'

  return `${formatPercent((lot.views / totalViews) * 100)}% dos acessos de lote`
})

const averageSessionDuration = computed(() => {
  return formatDuration(overview.value?.engagement?.avgSessionDurationSec || 0)
})

const formattedPeriod = computed(() => {
  if (!startDate.value || !endDate.value) return 'Período aberto'
  return `${formatDate(startDate.value)} até ${formatDate(endDate.value)}`
})

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR')
}

function formatPercent(value: number) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function formatDuration(seconds: number) {
  if (!seconds) return '0s'
  if (seconds < 60) return `${seconds}s`

  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60

  if (!remainder) return `${minutes}m`
  return `${minutes}m ${remainder}s`
}
</script>

<style scoped>
.project-metrics-page {
  padding: 24px;
  --project-metrics-accent: #86efac;
  --project-metrics-accent-strong: #34d399;
  --project-metrics-accent-surface: rgba(16, 185, 129, 0.1);
  --project-metrics-accent-border: rgba(16, 185, 129, 0.18);
  --project-metrics-success-strong: #4ade80;
  --project-metrics-warning: #fb7185;
  --project-metrics-warning-surface: rgba(244, 63, 94, 0.14);
  --project-metrics-warning-border: rgba(244, 63, 94, 0.24);
}

.project-heatmap-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.project-metrics-loading-state,
.project-metrics-error-state {
  min-height: 55vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 14px;
}

.project-metrics-back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-surface-400);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.2s;
}

.project-metrics-back-link:hover {
  color: var(--color-primary-400);
}

.project-metrics-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.project-metrics-header-copy {
  max-width: 720px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-primary-400);
  font-weight: 700;
}

h1,
.project-metrics-section-heading h2,
.insight-card__header h2 {
  margin: 0;
}

.project-metrics-subtitle,
.warning-copy,
.empty-note,
.project-metrics-stat-hint,
.project-metrics-period-chip span,
.insight-list__item span,
.insight-stat-list span {
  color: var(--color-surface-400);
}

.project-metrics-subtitle {
  margin: 8px 0 0;
  font-size: 16px;
}

.project-metrics-filter-actions {
  display: flex;
  gap: 16px;
  background: var(--glass-bg);
  padding: 16px 24px;
  border-radius: var(--radius-lg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--glass-border-subtle);
  align-items: flex-end;
  flex-wrap: wrap;
  min-width: min(100%, 460px);
}

.project-metrics-filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.project-metrics-filter-group label {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--color-surface-400);
  letter-spacing: 0.05em;
}

.project-metrics-date-input {
  min-height: 42px;
  padding: 10px 14px;
  border: 1px solid var(--glass-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-surface-900);
  color: var(--color-surface-100);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  color-scheme: dark;
}

.project-metrics-date-input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

.project-metrics-period-chip {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-height: 42px;
  padding: 9px 14px;
  border-radius: var(--radius-md);
  background: var(--project-metrics-accent-surface);
  border: 1px solid var(--project-metrics-accent-border);
}

.project-metrics-period-chip strong,
.project-metrics-stat-value,
.insight-list__item strong,
.insight-stat-list strong {
  color: var(--color-surface-50);
}

.project-metrics-dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
  transition: opacity 0.2s;
}

.project-metrics-loading-overlay {
  opacity: 0.72;
}

.project-metrics-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.project-metrics-stat-card,
.project-metrics-details-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.project-metrics-stat-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 154px;
  padding: 20px;
  border-radius: 16px;
  overflow: hidden;
}

.project-metrics-stat-card::before {
  content: '';
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 3px;
  background: rgba(148, 163, 184, 0.4);
}

.project-metrics-stat-card--accent::before { background: var(--project-metrics-accent-strong); }
.project-metrics-stat-card--warning::before { background: var(--project-metrics-warning); }

.project-metrics-stat-label {
  display: block;
  color: var(--color-surface-300);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.project-metrics-stat-value {
  display: block;
  font-size: clamp(1.7rem, 2vw, 2.25rem);
  font-weight: 700;
  line-height: 1.05;
}

.project-metrics-stat-hint {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.45;
}

.project-metrics-report-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(310px, 0.9fr);
  gap: 24px;
  align-items: start;
}

.project-metrics-report-main,
.project-metrics-report-side {
  min-width: 0;
}

.project-metrics-report-side {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.project-metrics-details-card {
  padding: 20px;
  border-radius: 16px;
}

.project-metrics-heatmap-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.project-metrics-side-card {
  padding: 22px;
}

.project-metrics-side-card--warning {
  border-color: var(--project-metrics-warning-border);
  background: linear-gradient(180deg, rgba(244, 63, 94, 0.08), rgba(15, 23, 42, 0));
}

.project-metrics-section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.project-metrics-section-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  border-radius: 999px;
  background: var(--project-metrics-accent-surface);
  color: var(--project-metrics-accent);
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid var(--project-metrics-accent-border);
}

.insight-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.insight-stat-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.insight-stat-list strong {
  display: block;
  margin-top: 4px;
}

.insight-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 18px;
}

.insight-list__item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.52);
}

.insight-list__item strong {
  display: block;
}

.insight-list__item span {
  font-size: 0.8rem;
}

.insight-list--compact .insight-list__item {
  align-items: center;
}

.empty-note,
.warning-copy {
  margin: 16px 0 0;
  line-height: 1.55;
}

@media (max-width: 1320px) {
  .project-metrics-stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1180px) {
  .project-metrics-header,
  .project-metrics-report-grid {
    grid-template-columns: 1fr;
    display: grid;
  }

  .project-metrics-filter-actions {
    min-width: 0;
  }

  .project-metrics-section-heading {
    flex-direction: column;
  }
}

@media (max-width: 760px) {
  .project-metrics-page {
    padding: 16px;
  }

  .project-metrics-stats-grid,
  .insight-stat-list {
    grid-template-columns: 1fr;
  }

  .project-metrics-filter-actions,
  .project-metrics-header {
    grid-template-columns: 1fr;
    display: grid;
  }

  .project-heatmap-page {
    gap: 22px;
  }

  .project-metrics-stat-card,
  .project-metrics-details-card {
    border-radius: 14px;
  }

  .project-metrics-period-chip,
  .project-metrics-section-chip {
    white-space: normal;
  }
}
</style>