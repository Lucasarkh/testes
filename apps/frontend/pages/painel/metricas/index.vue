<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const auth = useAuthStore()
const { projects, selectedProjectId, startDate, endDate, fetchProjects, buildQueryString } = useMetricsFilters()

const metrics = ref<any>(null)
const loadingMetrics = ref(false)

async function fetchMetrics() {
  loadingMetrics.value = true
  try {
    metrics.value = await fetchApi(`/tracking/metrics?${buildQueryString()}`)
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

const bounceRate = computed(() => {
  return metrics.value?.engagement?.bounceRate?.toFixed(1) || '0'
})

const topicCards = computed(() => [
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
    highlight: metrics.value?.topRealtors?.length ? `${metrics.value.topRealtors.length} corretores ativos` : null
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

    <div v-if="loadingMetrics && !metrics" class="loading">Carregando métricas...</div>

    <div v-else-if="metrics" class="dashboard" :class="{ 'loading-overlay': loadingMetrics }">
      <!-- Summary Cards -->
      <div class="stats-grid">
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon sessions">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Número de visitas únicas ao site. Cada sessão representa um visitante acessando o site em um período de tempo." position="bottom"><span class="stat-label">Total de Sessões</span></CommonAppTooltip>
            <span class="stat-value text-blue">{{ metrics.summary.totalSessions }}</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon avg-pages">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Média de páginas visualizadas por cada visitante durante uma sessão. Valores altos indicam maior engajamento." position="bottom"><span class="stat-label">Páginas por Sessão</span></CommonAppTooltip>
            <span class="stat-value text-teal">{{ pagesPerSession }}</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon views">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Total de vezes que qualquer página do site foi carregada ou visualizada, incluindo recarregamentos." position="bottom"><span class="stat-label">Visualizações de Página</span></CommonAppTooltip>
            <span class="stat-value text-indigo">{{ metrics.summary.totalPageViews }}</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon duration">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Duração média que um visitante permanece navegando no site por sessão." position="bottom"><span class="stat-label">Tempo Médio/Sessão</span></CommonAppTooltip>
            <span class="stat-value text-cyan">{{ avgSessionDuration }}</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon bounce">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Percentual de visitantes que saíram do site após visualizar apenas uma página, sem interagir. Valores menores são melhores." position="bottom"><span class="stat-label">Taxa de Rejeição</span></CommonAppTooltip>
            <span class="stat-value text-rose">{{ bounceRate }}%</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon leads">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Total de leads gerados e a taxa de conversão (leads / sessões). Indica a eficiência do site em captar contatos." position="bottom"><span class="stat-label">Leads: Taxa de Conv.</span></CommonAppTooltip>
            <span class="stat-value text-emerald">{{ metrics.summary.totalLeads }} ({{ conversionRate }}%)</span>
          </div>
        </div>
        <div v-if="!auth.isCorretor" class="stat-card">
          <div class="stat-icon realtor">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>
          </div>
          <div class="stat-content">
            <CommonAppTooltip text="Total de acessos que vieram através de links de corretores. Mostra quantos visitantes os corretores estão trazendo." position="bottom"><span class="stat-label">Acessos via Corretor</span></CommonAppTooltip>
            <span class="stat-value text-orange">{{ metrics.summary.totalRealtorClicks }}</span>
          </div>
        </div>
      </div>

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
            <CommonAppTooltip text="Cada sessão representa uma visita única. Um mesmo visitante pode gerar múltiplas sessões em dias diferentes." position="top" :no-icon="true"><strong>Sessões</strong> (Visitantes únicos)</CommonAppTooltip>
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
            <!-- Globe -->
            <svg v-if="card.icon === 'globe'" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
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
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon svg {
  width: 22px;
  height: 22px;
}

.stat-icon.sessions { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
.stat-icon.views { background: rgba(79, 70, 229, 0.12); color: #4f46e5; }
.stat-icon.avg-pages { background: rgba(13, 148, 136, 0.12); color: #0d9488; }
.stat-icon.leads { background: rgba(16, 185, 129, 0.12); color: #059669; }
.stat-icon.realtor { background: rgba(249, 115, 22, 0.12); color: #ea580c; }
.stat-icon.duration { background: rgba(6, 182, 212, 0.12); color: #06b6d4; }
.stat-icon.bounce { background: rgba(244, 63, 94, 0.12); color: #f43f5e; }

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
}

.text-blue { color: #2563eb; }
.text-indigo { color: #4f46e5; }
.text-teal { color: #0d9488; }
.text-emerald { color: #059669; }
.text-orange { color: #ea580c; }
.text-cyan { color: #06b6d4; }
.text-rose { color: #f43f5e; }

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

.bar-value.views { color: #4f46e5; }
.bar-value.sessions-val { color: #2563eb; }

.bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 2px;
}

.views-bar { background: #4f46e5; opacity: 0.85; }
.sessions-bar { background: #3b82f6; opacity: 0.6; }

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
.legend-color.views { background: #4f46e5; }
.legend-color.sessions { background: #3b82f6; opacity: 0.7; }

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

.topic-card.topic-blue:hover { border-color: rgba(59, 130, 246, 0.5); }
.topic-card.topic-emerald:hover { border-color: rgba(16, 185, 129, 0.5); }
.topic-card.topic-orange:hover { border-color: rgba(249, 115, 22, 0.5); }
.topic-card.topic-purple:hover { border-color: rgba(139, 92, 246, 0.5); }
.topic-card.topic-indigo:hover { border-color: rgba(79, 70, 229, 0.5); }

.topic-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.topic-icon.lot { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
.topic-icon.trend { background: rgba(16, 185, 129, 0.12); color: #10b981; }
.topic-icon.users { background: rgba(249, 115, 22, 0.12); color: #f97316; }
.topic-icon.building { background: rgba(139, 92, 246, 0.12); color: #8b5cf6; }
.topic-icon.globe { background: rgba(79, 70, 229, 0.12); color: #6366f1; }

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
  color: var(--color-primary-400);
  background: rgba(16, 185, 129, 0.1);
  padding: 2px 10px;
  border-radius: 20px;
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
