<script setup lang="ts">
import ProjectHeatmapReport from '~/components/painel/metrics/ProjectHeatmapReport.vue'

const { fetchApi } = useApi()
const toast = useToast()
const auth = useAuthStore()
const { projects, selectedProjectId, startDate, startDateMax, endDate, endDateMin, endDateMax, fetchProjects, buildQueryString } = useMetricsFilters()

const metrics = ref<any>(null)
const brokerMetrics = ref<any>(null)
const audienceMetrics = ref<any>(null)
const projectHeatmap = ref<any>(null)
const loadingMetrics = ref(false)

const hasSpecificProjectSelected = computed(() => selectedProjectId.value && selectedProjectId.value !== 'all')
const selectedProject = computed(() => projects.value.find((project: any) => project.id === selectedProjectId.value) || null)
const canAggregateAllProjects = computed(() => projects.value.length !== 1)

async function fetchMetrics() {
  loadingMetrics.value = true
  try {
    const [metricsRes, brokersRes, audienceRes, heatmapRes] = await Promise.all([
      fetchApi(`/tracking/metrics?${buildQueryString()}`),
      fetchApi(`/tracking/metrics/brokers?${buildQueryString()}`),
      fetchApi(`/tracking/metrics/audience?${buildQueryString()}`),
      hasSpecificProjectSelected.value
        ? fetchApi(`/tracking/metrics/project-heatmap?${buildQueryString()}`)
        : Promise.resolve(null)
    ])
    metrics.value = metricsRes
    brokerMetrics.value = brokersRes
    audienceMetrics.value = audienceRes
    projectHeatmap.value = heatmapRes
  } catch {
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

const formatDuration = (seconds: number) => {
  if (!seconds || seconds < 1) return '0s'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

const avgSessionDuration = computed(() => {
  return formatDuration(metrics.value?.engagement?.avgSessionDurationSec || 0)
})

const searchMetrics = computed(() => metrics.value?.search || null)
const searchSummary = computed(() => metrics.value?.summary || {})
const searchIntentRows = computed(() => searchMetrics.value?.intents?.slice(0, 5) || [])
const searchSourceRows = computed(() => searchMetrics.value?.sources?.slice(0, 5) || [])
const averageSearchResults = computed(() => {
  const value = searchMetrics.value?.avgResultsPerSearch || 0
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })
})

const bounceRate = computed(() => {
  return metrics.value?.engagement?.bounceRate?.toFixed(1) || '0'
})

const returningRate = computed(() => {
  if (!audienceMetrics.value?.summary?.totalVisitors) return '0'
  return ((audienceMetrics.value.summary.returningVisitors / audienceMetrics.value.summary.totalVisitors) * 100).toFixed(1)
})

const selectedProjectHeatmapTitle = computed(() => {
  if (!selectedProject.value) return 'Mapa de calor por projeto'
  return `Mapa de calor · ${selectedProject.value.name}`
})

const topicCards = computed(() => [
  {
    title: 'Explorador de Sessões',
    subtitle: 'Jornada por visita, páginas, lotes e leads da sessão',
    route: '/painel/metricas/sessoes',
    icon: 'pulse',
    color: 'cyan',
    highlight: audienceMetrics.value?.summary?.avgVisitsPerVisitor !== undefined
      ? `${audienceMetrics.value.summary.avgVisitsPerVisitor} visitas por visitante`
      : null
  },
  {
    title: 'Explorador de Visitantes',
    subtitle: 'Recorrência, origem e histórico consolidado por visitante',
    route: '/painel/metricas/visitantes',
    icon: 'personas',
    color: 'amber',
    highlight: audienceMetrics.value?.summary?.returningVisitors !== undefined
      ? `${audienceMetrics.value.summary.returningVisitors} recorrentes`
      : null
  },
  {
    title: 'Métricas de Lotes',
    subtitle: 'Visualizações, reservas e leads por lote',
    route: '/painel/metricas/lotes',
    icon: 'lot',
    color: 'blue',
    highlight: metrics.value?.topLots?.[0]?.label ? `Top: ${metrics.value.topLots[0].label}` : null
  },
  {
    title: 'Tendência de Vendas',
    subtitle: 'Crescimento de interesse, regiões quentes, comportamento',
    route: '/painel/metricas/tendencias',
    icon: 'trend',
    color: 'emerald',
    highlight: null
  },
  {
    title: 'Métricas de Corretores',
    subtitle: 'Leads, acessos e campanhas por corretor',
    route: '/painel/metricas/corretores',
    icon: 'users',
    color: 'orange',
    highlight: brokerMetrics.value?.summary?.totalBrokers !== undefined
      ? `${brokerMetrics.value.summary.totalBrokers} corretores ativos`
      : null
  },
  {
    title: 'Empreendimentos',
    subtitle: 'Acessos e leads por projeto, ranking de lotes',
    route: '/painel/metricas/empreendimentos',
    icon: 'building',
    color: 'purple',
    highlight: metrics.value?.topProjects?.length ? `${metrics.value.topProjects.length} projetos` : null
  },
  {
    title: 'Pré-lançamento',
    subtitle: 'Fila ativa, conversão, pressão por lote e ritmo de contato',
    route: '/painel/metricas/pre-lancamento',
    icon: 'queue',
    color: 'rose',
    highlight: null
  },
  {
    title: 'Performance por Imobiliárias',
    subtitle: 'Ranking de imobiliárias por sessões, leads e conversão',
    route: '/painel/metricas/imobiliarias',
    icon: 'office',
    color: 'slate',
    highlight: null
  },
  {
    title: 'Origens de Tráfego',
    subtitle: 'Campanhas, fontes UTM, conversão por origem',
    route: '/painel/metricas/trafego',
    icon: 'globe',
    color: 'indigo',
    highlight: metrics.value?.topUtmSources?.length ? `${metrics.value.topUtmSources.length} fontes` : null
  }
])
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
          <input type="date" v-model="startDate" :max="startDateMax" class="date-input" />
        </div>
        <div class="filter-group">
          <label>Data Fim:</label>
          <input type="date" v-model="endDate" :min="endDateMin" :max="endDateMax" class="date-input" />
        </div>
        <div class="filter-group">
          <label>Empreendimento:</label>
          <select v-model="selectedProjectId" class="project-select">
            <option v-if="canAggregateAllProjects" value="all">Todos os Projetos</option>
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
            <CommonAppTooltip text="Número de sessões reais iniciadas no período. Uma nova sessão surge após 30 minutos de inatividade ou quando a visita é retomada em uma nova janela de navegação." position="bottom"><span class="stat-label">Total de Sessões</span></CommonAppTooltip>
            <span class="stat-value stat-value--default">{{ metrics.summary.totalSessions }}</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon sessions">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Visitantes únicos identificados no período, mesmo quando retornam em várias sessões." position="bottom"><span class="stat-label">Total de Visitantes</span></CommonAppTooltip>
            <span class="stat-value stat-value--default">{{ metrics.summary.totalVisitors }}</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon duration">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 7a4 4 0 1 1 8 0c0 1.4-.67 2.64-1.71 3.37A5 5 0 0 1 18 15v1a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-1a5 5 0 0 1 3.71-4.83A3.98 3.98 0 0 1 8 7Z"/></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Quantidade e taxa de visitantes que voltaram em mais de uma sessão dentro do período." position="bottom"><span class="stat-label">Visitantes Retornantes</span></CommonAppTooltip>
            <span class="stat-value stat-value--default">{{ metrics.summary.returningVisitors }} ({{ returningRate }}%)</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon avg-pages">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Média de páginas vistas por sessão ativa. Leituras longas sem nova navegação não inflacionam esse número com page views artificiais." position="bottom"><span class="stat-label">Páginas por Sessão</span></CommonAppTooltip>
            <span class="stat-value stat-value--default">{{ pagesPerSession }}</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon views">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Total de vezes que qualquer página do site foi carregada ou visualizada, incluindo recarregamentos." position="bottom"><span class="stat-label">Visualizações de Página</span></CommonAppTooltip>
            <span class="stat-value stat-value--default">{{ metrics.summary.totalPageViews }}</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon duration">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Tempo médio observado entre o primeiro e o último sinal real de atividade da sessão. A aba visível mantém a sessão viva; períodos longos de ausência não são reaproveitados como se fossem navegação contínua." position="bottom"><span class="stat-label">Tempo Médio/Sessão</span></CommonAppTooltip>
            <span class="stat-value stat-value--default">{{ avgSessionDuration }}</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon bounce">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Percentual de sessões sem engajamento relevante: uma página apenas, sem interações adicionais com lotes, ferramentas ou envio de lead. Valores menores são melhores." position="bottom"><span class="stat-label">Taxa de Rejeição</span></CommonAppTooltip>
            <span class="stat-value stat-value--warning">{{ bounceRate }}%</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon leads">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Total de leads gerados e a taxa de conversão (leads / sessões). Indica a eficiência do site em captar contatos." position="bottom"><span class="stat-label">Leads: Taxa de Conv.</span></CommonAppTooltip>
            <span class="stat-value stat-value--success">{{ metrics.summary.totalLeads }} ({{ conversionRate }}%)</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon realtor">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Total de acessos que vieram através de links de corretores. Mostra quantos visitantes os corretores estão trazendo." position="bottom"><span class="stat-label">Acessos via Corretor</span></CommonAppTooltip>
            <span class="stat-value stat-value--muted">{{ metrics.summary.totalRealtorClicks }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon sessions">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Total de buscas registradas no modal após 7 segundos, no modal inteligente e na página de busca por preferência, respeitando o filtro de empreendimento atual." position="bottom"><span class="stat-label">Buscas Guiadas</span></CommonAppTooltip>
            <span class="stat-value stat-value--default">{{ searchSummary.totalSearches || 0 }}</span>
          </div>
        </div>
        <div v-if="hasSpecificProjectSelected" class="stat-card">
          <div class="stat-icon sessions">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18"/><path d="M12 3v18"/></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Quantidade de buscas originadas pelo modal guiado que aparece após alguns segundos de permanência na landing do projeto." position="bottom"><span class="stat-label">Modal após 7s</span></CommonAppTooltip>
            <span class="stat-value stat-value--default">{{ searchSummary.timedOnboardingSearches || 0 }}</span>
          </div>
        </div>
        <div v-if="hasSpecificProjectSelected" class="stat-card">
          <div class="stat-icon sessions">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Buscas disparadas na página de unidades usando o fluxo de busca por preferência, dentro do projeto filtrado." position="bottom"><span class="stat-label">Busca por Preferência</span></CommonAppTooltip>
            <span class="stat-value stat-value--default">{{ searchSummary.preferencePageSearches || 0 }}</span>
          </div>
        </div>
      </div>

      <section class="details-card search-intelligence-card full-width">
        <div class="search-intelligence-card__header">
          <div>
            <h3>Busca Inteligente</h3>
            <p class="search-intelligence-card__subtitle">
              Leituras da intenção declarada do usuário nas buscas do projeto{{ hasSpecificProjectSelected && selectedProject ? ` · ${selectedProject.name}` : '' }}.
            </p>
          </div>
          <div v-if="hasSpecificProjectSelected && selectedProject" class="heatmap-dashboard-card__project-pill">
            {{ selectedProject.name }}
          </div>
        </div>

        <div v-if="hasSpecificProjectSelected" class="search-intelligence-grid">
          <div class="search-intelligence-panel">
            <span class="search-intelligence-panel__label">Resumo</span>
            <div class="search-intelligence-stats">
              <div>
                <span>Total de buscas</span>
                <strong>{{ searchSummary.totalSearches || 0 }}</strong>
              </div>
              <div>
                <span>Modal inteligente</span>
                <strong>{{ searchSummary.smartModalSearches || 0 }}</strong>
              </div>
              <div>
                <span>Modal após 7s</span>
                <strong>{{ searchSummary.timedOnboardingSearches || 0 }}</strong>
              </div>
              <div>
                <span>Média de resultados</span>
                <strong>{{ averageSearchResults }}</strong>
              </div>
            </div>
          </div>

          <div class="search-intelligence-panel">
            <span class="search-intelligence-panel__label">Intenções mais frequentes</span>
            <div v-if="searchIntentRows.length" class="search-intelligence-list">
              <div v-for="item in searchIntentRows" :key="item.value" class="search-intelligence-list__item">
                <strong>{{ item.label }}</strong>
                <span>{{ item.count }}</span>
              </div>
            </div>
            <p v-else class="search-intelligence-empty">Nenhuma intenção de busca registrada no período.</p>
          </div>

          <div class="search-intelligence-panel">
            <span class="search-intelligence-panel__label">Origem das buscas</span>
            <div v-if="searchSourceRows.length" class="search-intelligence-list">
              <div v-for="item in searchSourceRows" :key="item.value" class="search-intelligence-list__item">
                <strong>{{ item.label }}</strong>
                <span>{{ item.count }}</span>
              </div>
            </div>
            <p v-else class="search-intelligence-empty">Nenhuma origem de busca registrada no período.</p>
          </div>
        </div>

        <div v-else class="heatmap-dashboard-card__empty">
          <div class="heatmap-dashboard-card__empty-icon">
            <i class="bi bi-search" aria-hidden="true"></i>
          </div>
          <div>
            <h4>Selecione um empreendimento para abrir as métricas de busca</h4>
            <p>
              As métricas de intenção e origem da busca são exibidas aqui usando o filtro de empreendimento no topo da página.
            </p>
          </div>
        </div>
      </section>

      <section class="details-card heatmap-dashboard-card full-width">
        <div class="heatmap-dashboard-card__header">
          <div>
            <h3>{{ selectedProjectHeatmapTitle }}</h3>
            <p class="heatmap-dashboard-card__subtitle">
              Visualize a planta com concentração de acessos, leads e reservas do empreendimento filtrado.
            </p>
          </div>
          <div v-if="selectedProject" class="heatmap-dashboard-card__project-pill">
            {{ selectedProject.name }}
          </div>
        </div>

        <ProjectHeatmapReport v-if="projectHeatmap" :report="projectHeatmap" />

        <div v-else class="heatmap-dashboard-card__empty">
          <div class="heatmap-dashboard-card__empty-icon">
            <i class="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i>
          </div>
          <div>
            <h4>Selecione um empreendimento para abrir o mapa de calor</h4>
            <p>
              O relatório visual usa a planta do projeto. Quando um projeto estiver selecionado no filtro, a tela mostra automaticamente o heatmap dele.
            </p>
          </div>
        </div>
      </section>

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
                <span class="bar-value sessions-val">{{ h.sessions }}</span>
                <div class="bar sessions-bar" :style="{ height: `${(h.sessions / maxHistoryValue) * 100}%` }"></div>
              </div>
            </div>
            <span class="label">{{ formatDate(h.date) }}</span>
          </div>
          <div v-if="!metrics.history?.length" class="no-data">Nenhum dado no período</div>
        </div>
        <div class="chart-legend">
          <div class="legend-item">
            <span class="legend-color views"></span>
            <CommonAppTooltip text="Número total de vezes que as páginas foram carregadas, incluindo recarregamentos e navegação interna." position="top" :no-icon="true"><strong>Visualizações</strong> (Cliques em links/páginas)</CommonAppTooltip>
          </div>
          <div class="legend-item">
            <span class="legend-color sessions"></span>
            <CommonAppTooltip text="Cada sessão representa uma janela real de visita. Um mesmo visitante pode gerar múltiplas sessões quando volta depois de um período relevante de inatividade." position="top" :no-icon="true"><strong>Sessões</strong> (Janelas de visita)</CommonAppTooltip>
          </div>
        </div>
      </div>

      <!-- Topic Cards -->
      <div v-if="!auth.isCorretor" class="topics-grid">
        <NuxtLink v-for="card in topicCards" :key="card.route" :to="card.route" class="topic-card" :class="`topic-${card.color}`">
          <div class="topic-icon" :class="card.icon">
            <!-- Lot -->
            <svg v-if="card.icon === 'lot'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            <!-- Trend -->
            <svg v-if="card.icon === 'trend'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <!-- Users -->
            <svg v-if="card.icon === 'users'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <!-- Building -->
            <svg v-if="card.icon === 'building'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
            <!-- Queue -->
            <svg v-if="card.icon === 'queue'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h7"/><circle cx="19" cy="12" r="2"/><circle cx="16" cy="18" r="2"/></svg>
            <!-- Globe -->
            <svg v-if="card.icon === 'globe'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <!-- Office -->
            <svg v-if="card.icon === 'office'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 20v-8h10v8"/><path d="M7 8h.01"/><path d="M12 8h.01"/><path d="M17 8h.01"/></svg>
            <!-- Pulse -->
            <svg v-if="card.icon === 'pulse'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 7-4-14-3 7H2"/></svg>
            <!-- Personas -->
            <svg v-if="card.icon === 'personas'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="topic-content">
            <h3>{{ card.title }}</h3>
            <p>{{ card.subtitle }}</p>
            <span v-if="card.highlight" class="topic-highlight">{{ card.highlight }}</span>
          </div>
          <svg class="topic-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metrics-page {
  padding: 24px;
  --metrics-accent: #86efac;
  --metrics-accent-strong: #34d399;
  --metrics-accent-surface: rgba(16, 185, 129, 0.1);
  --metrics-accent-border: rgba(16, 185, 129, 0.18);
  --metrics-success-strong: #4ade80;
  --metrics-success-surface: rgba(34, 197, 94, 0.14);
  --metrics-success-border: rgba(34, 197, 94, 0.24);
  --metrics-warning: #fb7185;
  --metrics-warning-surface: rgba(244, 63, 94, 0.14);
  --metrics-warning-border: rgba(244, 63, 94, 0.24);
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

.heatmap-dashboard-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.search-intelligence-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.search-intelligence-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.search-intelligence-card__subtitle {
  margin: 8px 0 0;
  color: var(--color-surface-400);
}

.search-intelligence-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.search-intelligence-panel {
  border: 1px solid var(--glass-border-subtle);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.28);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-intelligence-panel__label {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--color-surface-400);
  letter-spacing: 0.05em;
}

.search-intelligence-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.search-intelligence-stats span,
.search-intelligence-list__item span,
.search-intelligence-empty {
  color: var(--color-surface-400);
}

.search-intelligence-stats strong,
.search-intelligence-list__item strong {
  color: var(--color-surface-50);
}

.search-intelligence-stats div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.search-intelligence-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-intelligence-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.heatmap-dashboard-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.heatmap-dashboard-card__subtitle {
  margin: 8px 0 0;
  color: var(--color-surface-400);
}

.heatmap-dashboard-card__project-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  border-radius: 999px;
  background: var(--metrics-accent-surface);
  color: var(--metrics-accent);
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid var(--metrics-accent-border);
}

.heatmap-dashboard-card__empty {
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 220px;
  padding: 24px;
  border-radius: 22px;
  border: 1px dashed rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.28);
}

.heatmap-dashboard-card__empty h4 {
  margin: 0;
  color: var(--color-surface-50);
}

.heatmap-dashboard-card__empty p {
  margin: 8px 0 0;
  color: var(--color-surface-400);
  max-width: 560px;
}

.heatmap-dashboard-card__empty-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: var(--metrics-accent-surface);
  color: var(--metrics-accent);
  font-size: 1.25rem;
  flex-shrink: 0;
  border: 1px solid var(--metrics-accent-border);
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  align-items: stretch;
}

.stat-card {
  background: var(--glass-bg);
  padding: 18px 20px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 122px;
  border: 1px solid var(--glass-border-subtle);
  transition: border-color 0.2s ease, background 0.2s ease;
}

.stat-card:hover {
  border-color: var(--metrics-accent-border);
  background: rgba(15, 23, 42, 0.34);
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-icon svg {
  width: 22px;
  height: 22px;
}

.stat-icon.sessions,
.stat-icon.views,
.stat-icon.avg-pages,
.stat-icon.realtor,
.stat-icon.duration {
  background: var(--metrics-accent-surface);
  color: var(--metrics-accent);
  border-color: var(--metrics-accent-border);
}

.stat-icon.leads {
  background: var(--metrics-success-surface);
  color: var(--metrics-success-strong);
  border-color: var(--metrics-success-border);
}

.stat-icon.bounce {
  background: var(--metrics-warning-surface);
  color: var(--metrics-warning);
  border-color: var(--metrics-warning-border);
}

.stat-label {
  display: block;
  color: var(--color-surface-200);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  text-wrap: balance;
}

.stat-value {
  display: block;
  font-size: clamp(1.55rem, 2vw, 2rem);
  font-weight: 700;
  line-height: 1.1;
  color: var(--color-surface-100);
  overflow-wrap: anywhere;
}

.stat-value--default {
  color: var(--color-surface-50);
}

.stat-value--success {
  color: var(--metrics-success-strong);
}

.stat-value--warning {
  color: var(--metrics-warning);
}

.stat-value--muted {
  color: #e2e8f0;
}

.stat-content {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  justify-content: center;
}

.text-emerald {
  font-size: clamp(1.3rem, 1.8vw, 1.7rem);
}

@media (max-width: 1400px) {
  .stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .search-intelligence-grid {
    grid-template-columns: 1fr;
  }
}

.text-blue,
.text-indigo,
.text-teal,
.text-emerald,
.text-orange,
.text-cyan,
.text-rose,
.text-sky {
  color: var(--color-surface-100);
}

/* History Chart */
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
  position: relative;
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

.bar-value.views { color: var(--metrics-accent); }
.bar-value.sessions-val { color: #e2e8f0; }

.bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 2px;
}

.views-bar { background: rgba(16, 185, 129, 0.58); opacity: 1; }
.sessions-bar { background: rgba(134, 239, 172, 0.42); opacity: 1; }

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
.legend-color.views { background: rgba(16, 185, 129, 0.82); }
.legend-color.sessions { background: rgba(134, 239, 172, 0.72); opacity: 1; }

/* Topic Cards Grid */
.topics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 20px;
}

.topic-card {
  background: var(--glass-bg);
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  border: 1px solid var(--glass-border-subtle);
  display: flex;
  align-items: center;
  gap: 20px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
}

.topic-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}

.topic-card.topic-blue:hover,
.topic-card.topic-emerald:hover,
.topic-card.topic-orange:hover,
.topic-card.topic-purple:hover,
.topic-card.topic-indigo:hover,
.topic-card.topic-slate:hover,
.topic-card.topic-cyan:hover,
.topic-card.topic-amber:hover {
  border-color: var(--metrics-accent-border);
}

.topic-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.topic-icon.lot,
.topic-icon.trend,
.topic-icon.users,
.topic-icon.building,
.topic-icon.globe,
.topic-icon.office,
.topic-icon.pulse,
.topic-icon.personas {
  background: var(--metrics-accent-surface);
  color: var(--metrics-accent);
  border: 1px solid var(--metrics-accent-border);
}

.topic-content {
  flex: 1;
  min-width: 0;
}

.topic-content h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-surface-50);
}

.topic-content p {
  margin: 0;
  font-size: 13px;
  color: var(--color-surface-400);
  line-height: 1.4;
}

.topic-highlight {
  display: inline-block;
  margin-top: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--metrics-accent);
  background: var(--metrics-accent-surface);
  padding: 2px 10px;
  border-radius: 20px;
  border: 1px solid var(--metrics-accent-border);
}

.topic-arrow {
  color: var(--color-surface-500);
  flex-shrink: 0;
  transition: transform 0.2s;
}

.topic-card:hover .topic-arrow {
  transform: translateX(4px);
  color: var(--color-surface-200);
}

.loading {
  padding: 48px;
  text-align: center;
  color: var(--color-surface-400);
}

.no-data {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--color-surface-500);
  font-weight: 600;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 20px;
  }
  .filter-actions {
    width: 100%;
  }
  .stats-grid {
    grid-template-columns: 1fr;
  }
  .stat-card {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
    min-height: 0;
  }
  .stat-content {
    align-items: center;
    gap: 8px;
  }
  .stat-label {
    min-height: 0;
  }
  .topics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
