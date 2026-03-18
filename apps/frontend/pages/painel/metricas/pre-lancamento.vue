<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const {
  projects,
  selectedProjectId,
  startDate,
  startDateMax,
  endDate,
  endDateMin,
  endDateMax,
  fetchProjects,
  buildQueryString
} = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)

const canAggregateAllProjects = computed(() => projects.value.length !== 1)
const selectedProject = computed(() => projects.value.find((project: any) => project.id === selectedProjectId.value) || null)
const selectedProjectLabel = computed(() => selectedProject.value?.name || 'todos os empreendimentos')

async function fetchPreLaunchMetrics() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/metrics/prelaunch?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar métricas de pré-lançamento')
  } finally {
    loading.value = false
  }
}

watch([selectedProjectId, startDate, endDate], () => {
  fetchPreLaunchMetrics()
})

onMounted(async () => {
  await fetchProjects()
  fetchPreLaunchMetrics()
})

definePageMeta({
  layout: 'default'
})

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('pt-BR')
}

function formatPercent(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}`
}

function formatHours(value: number | null | undefined) {
  const hours = Number(value || 0)
  if (!hours) return '0h'
  if (hours < 24) return `${formatPercent(hours)}h`

  const days = hours / 24
  return `${formatPercent(days)}d`
}

const summaryCards = computed(() => {
  const summary = data.value?.summary || {}

  return [
    {
      label: 'Novas entradas',
      value: formatNumber(summary.totalEntries),
      hint: `Leads que entraram na fila de preferência em ${selectedProjectLabel.value}.`,
      tone: 'rose'
    },
    {
      label: 'Fila ativa agora',
      value: formatNumber(summary.activeEntries),
      hint: 'Backlog atual ainda aguardando contato ou conversão.',
      tone: 'amber'
    },
    {
      label: 'Contatados',
      value: `${formatNumber(summary.contactedEntries)} (${formatPercent(summary.contactRate)}%)`,
      hint: 'Entradas que já receberam devolutiva dentro do período filtrado.',
      tone: 'cyan'
    },
    {
      label: 'Convertidos',
      value: `${formatNumber(summary.convertedEntries)} (${formatPercent(summary.conversionRate)}%)`,
      hint: 'Fila que virou avanço comercial dentro do recorte.',
      tone: 'emerald'
    },
    {
      label: 'Removidos',
      value: `${formatNumber(summary.removedEntries)} (${formatPercent(summary.removalRate)}%)`,
      hint: 'Registros descartados ou encerrados fora da conversão.',
      tone: 'slate'
    },
    {
      label: 'Tempo médio até contato',
      value: formatHours(summary.avgHoursToContact),
      hint: 'Velocidade média de primeira abordagem após a entrada na fila.',
      tone: 'purple'
    },
    {
      label: 'Tempo médio até conversão',
      value: formatHours(summary.avgHoursToConversion),
      hint: 'Tempo médio do ingresso na fila até a conversão.',
      tone: 'indigo'
    },
    {
      label: 'Pressão da fila',
      value: `Pos. média ${formatPercent(summary.avgQueuePosition)} · pico ${formatNumber(summary.maxQueuePosition)}`,
      hint: 'Profundidade média e maior posição aberta no período.',
      tone: 'orange'
    }
  ]
})

const queueHealth = computed(() => {
  const summary = data.value?.summary || {}
  const meta = data.value?.meta || {}

  return [
    {
      label: 'Empreendimentos com fila ativa',
      value: formatNumber(summary.activeProjects)
    },
    {
      label: 'Lotes com fila ativa',
      value: formatNumber(summary.activeLots)
    },
    {
      label: 'Projetos com histórico pré-lançamento',
      value: formatNumber(meta.preLaunchProjects)
    },
    {
      label: 'Projetos ainda com modo ativo',
      value: formatNumber(meta.enabledProjects)
    }
  ]
})

const visibleHistory = computed(() => {
  const history = data.value?.history || []
  const firstMovementIndex = history.findIndex((item: any) => item.entries || item.contacted || item.converted || item.removed)

  if (firstMovementIndex === -1) return []
  return history.slice(firstMovementIndex)
})

const historyMaxValue = computed(() => {
  const history = visibleHistory.value || []
  if (!history.length) return 1

  const max = Math.max(...history.map((item: any) => Math.max(item.entries || 0, item.contacted || 0, item.converted || 0, item.removed || 0)))
  return max > 0 ? max : 1
})

const hasHistory = computed(() => visibleHistory.value.length > 0)
</script>

<template>
  <div class="metrics-page prelaunch-metrics-page">
    <NuxtLink to="/painel/metricas" class="back-link">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Voltar às Métricas
    </NuxtLink>

    <div class="header">
      <div>
        <p class="eyebrow">Pré-lançamento</p>
        <h1>Fila de preferência</h1>
        <p class="subtitle">Métricas exclusivas do acesso antecipado: entrada na fila, ritmo de contato, conversão e pressão por lote.</p>
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
            <option v-if="canAggregateAllProjects" value="all">Todos os Projetos</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option>
          </select>
        </div>
      </div>
    </div>

    <section class="prelaunch-intro-card">
      <div>
        <strong>PRÉ-LANÇAMENTO, ACESSO ANTECIPADO EXCLUSIVO</strong>
        <p>Esse painel não mistura sessões, pageviews ou reservas do fluxo padrão. Aqui entram apenas sinais da fila de preferência e seus desdobramentos operacionais.</p>
      </div>

      <NuxtLink to="/painel/leads?view=prelaunch" class="intro-action">
        Abrir gestão da fila
      </NuxtLink>
    </section>

    <div v-if="loading && !data" class="loading">Carregando métricas de pré-lançamento...</div>

    <div v-else-if="data" class="dashboard" :class="{ 'loading-overlay': loading }">
      <div class="stats-grid">
        <article v-for="card in summaryCards" :key="card.label" class="stat-card" :class="`stat-card--${card.tone}`">
          <span class="stat-label">{{ card.label }}</span>
          <strong class="stat-value">{{ card.value }}</strong>
          <p class="stat-hint">{{ card.hint }}</p>
        </article>
      </div>

      <section class="details-card full-width">
        <div class="section-header">
          <div>
            <h2>Ritmo diário da fila</h2>
            <p>Entradas, contatos, conversões e saídas acompanhados dia a dia para {{ selectedProjectLabel }}.</p>
          </div>
        </div>

        <div v-if="hasHistory" class="history-chart-container history-chart-container--prelaunch">
          <div v-for="item in visibleHistory" :key="item.date" class="chart-col chart-col--quad">
            <div class="bars bars--quad">
              <div class="bar-group">
                <span v-if="item.entries" class="bar-value rose">{{ item.entries }}</span>
                <div v-if="item.entries" class="bar bar-rose" :style="{ height: `${(item.entries / historyMaxValue) * 100}%` }"></div>
              </div>
              <div class="bar-group">
                <span v-if="item.contacted" class="bar-value cyan">{{ item.contacted }}</span>
                <div v-if="item.contacted" class="bar bar-cyan" :style="{ height: `${(item.contacted / historyMaxValue) * 100}%` }"></div>
              </div>
              <div class="bar-group">
                <span v-if="item.converted" class="bar-value emerald">{{ item.converted }}</span>
                <div v-if="item.converted" class="bar bar-emerald" :style="{ height: `${(item.converted / historyMaxValue) * 100}%` }"></div>
              </div>
              <div class="bar-group">
                <span v-if="item.removed" class="bar-value slate">{{ item.removed }}</span>
                <div v-if="item.removed" class="bar bar-slate" :style="{ height: `${(item.removed / historyMaxValue) * 100}%` }"></div>
              </div>
            </div>
            <span class="label">{{ formatDate(item.date) }}</span>
          </div>
        </div>
        <div v-else class="empty-note">Nenhum movimento de fila registrado no período.</div>

        <div class="chart-legend chart-legend--prelaunch">
          <div class="legend-item"><span class="legend-color rose"></span><strong>Entradas</strong></div>
          <div class="legend-item"><span class="legend-color cyan"></span><strong>Contatados</strong></div>
          <div class="legend-item"><span class="legend-color emerald"></span><strong>Convertidos</strong></div>
          <div class="legend-item"><span class="legend-color slate"></span><strong>Removidos</strong></div>
        </div>
      </section>

      <div class="report-grid">
        <section class="details-card">
          <div class="section-header">
            <div>
              <h2>Status atual da fila</h2>
              <p>Distribuição viva do estoque de pré-lançamento.</p>
            </div>
          </div>

          <div v-if="data.statusDistribution?.length" class="status-list">
            <div v-for="item in data.statusDistribution" :key="item.status" class="status-list__item">
              <div>
                <strong>{{ item.label }}</strong>
                <span>{{ formatPercent((item.count / Math.max(data.meta?.totalTrackedEntries || 1, 1)) * 100) }}% do total monitorado</span>
              </div>
              <strong>{{ formatNumber(item.count) }}</strong>
            </div>
          </div>
          <p v-else class="empty-note">Sem distribuição disponível.</p>
        </section>

        <section class="details-card">
          <div class="section-header">
            <div>
              <h2>Saúde operacional</h2>
              <p>Capilaridade e disponibilidade atual da fila.</p>
            </div>
          </div>

          <div class="health-grid">
            <div v-for="item in queueHealth" :key="item.label" class="health-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </section>

        <section class="details-card full-width">
          <div class="section-header">
            <div>
              <h2>Empreendimentos com maior pressão</h2>
              <p>Entradas no período combinadas com backlog ativo atual.</p>
            </div>
          </div>

          <div v-if="data.topProjects?.length" class="metric-table">
            <div class="metric-table__row metric-table__row--head">
              <span>Empreendimento</span>
              <span>Entradas</span>
              <span>Fila ativa</span>
              <span>Contatados</span>
              <span>Convertidos</span>
              <span>Pos. média</span>
            </div>
            <div v-for="item in data.topProjects" :key="item.projectId" class="metric-table__row">
              <span>{{ item.label }}</span>
              <span>{{ formatNumber(item.entries) }}</span>
              <span>{{ formatNumber(item.active) }}</span>
              <span>{{ formatNumber(item.contacted) }}</span>
              <span>{{ formatNumber(item.converted) }}</span>
              <span>{{ formatPercent(item.avgQueuePosition) }}</span>
            </div>
          </div>
          <p v-else class="empty-note">Sem empreendimentos com fila no período.</p>
        </section>

        <section class="details-card">
          <div class="section-header">
            <div>
              <h2>Lotes mais disputados</h2>
              <p>Onde a fila está concentrando pressão comercial.</p>
            </div>
          </div>

          <div v-if="data.topLots?.length" class="ranking-list">
            <div v-for="item in data.topLots" :key="item.key" class="ranking-list__item">
              <div>
                <strong>{{ item.label }}</strong>
                <span>{{ item.projectName }}</span>
              </div>
              <div class="ranking-list__metrics">
                <span>{{ formatNumber(item.entries) }} entradas</span>
                <span>{{ formatNumber(item.active) }} ativos</span>
                <span>{{ formatNumber(item.converted) }} convertidos</span>
              </div>
            </div>
          </div>
          <p v-else class="empty-note">Nenhum lote entrou na fila de preferência neste período.</p>
        </section>

        <section class="details-card">
          <div class="section-header">
            <div>
              <h2>Velocidade por corretor</h2>
              <p>Quem está recebendo e avançando melhor a fila.</p>
            </div>
          </div>

          <div v-if="data.topRealtors?.length" class="ranking-list">
            <div v-for="item in data.topRealtors" :key="item.realtorLinkId" class="ranking-list__item">
              <div>
                <strong>{{ item.label }}</strong>
                <span>{{ item.code ? `Código ${item.code}` : 'Sem código público' }}</span>
              </div>
              <div class="ranking-list__metrics">
                <span>{{ formatNumber(item.entries) }} entradas</span>
                <span>{{ formatNumber(item.active) }} ativos</span>
                <span>{{ formatNumber(item.converted) }} convertidos</span>
              </div>
            </div>
          </div>
          <p v-else class="empty-note">Nenhum corretor vinculado foi encontrado nesse recorte.</p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metrics-page {
  padding: 24px;
}

.prelaunch-metrics-page {
  --rose-surface: rgba(244, 63, 94, 0.12);
  --rose-border: rgba(244, 63, 94, 0.22);
  --rose-strong: #fb7185;
  --cyan-surface: rgba(34, 211, 238, 0.12);
  --cyan-border: rgba(34, 211, 238, 0.22);
  --cyan-strong: #67e8f9;
  --emerald-surface: rgba(16, 185, 129, 0.12);
  --emerald-border: rgba(16, 185, 129, 0.22);
  --emerald-strong: #6ee7b7;
  --slate-surface: rgba(148, 163, 184, 0.12);
  --slate-border: rgba(148, 163, 184, 0.2);
  --slate-strong: #cbd5e1;
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
  gap: 24px;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rose-strong);
}

h1 {
  font-size: 30px;
  font-weight: 800;
  color: var(--color-surface-50);
  margin: 0 0 8px;
}

.subtitle {
  color: var(--color-surface-400);
  font-size: 16px;
  margin: 0;
  max-width: 780px;
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

.prelaunch-intro-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  padding: 20px 24px;
  border-radius: 18px;
  margin-bottom: 24px;
  background:
    linear-gradient(135deg, rgba(244, 63, 94, 0.16), rgba(251, 191, 36, 0.08)),
    var(--glass-bg);
  border: 1px solid var(--rose-border);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18);
}

.prelaunch-intro-card strong {
  display: block;
  color: var(--color-surface-50);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.prelaunch-intro-card p {
  margin: 0;
  color: var(--color-surface-300);
  max-width: 780px;
}

.intro-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 700;
  color: #fff7ed;
  background: linear-gradient(135deg, #f43f5e, #f97316);
  box-shadow: 0 16px 28px rgba(244, 63, 94, 0.24);
}

.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
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
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.stat-card,
.details-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
  border-radius: 18px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.35);
}

.stat-card {
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stat-card--rose {
  border-color: var(--rose-border);
  background: linear-gradient(180deg, var(--rose-surface), transparent), var(--glass-bg);
}

.stat-card--amber,
.stat-card--orange {
  border-color: rgba(251, 191, 36, 0.24);
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.12), transparent), var(--glass-bg);
}

.stat-card--cyan {
  border-color: var(--cyan-border);
  background: linear-gradient(180deg, var(--cyan-surface), transparent), var(--glass-bg);
}

.stat-card--emerald {
  border-color: var(--emerald-border);
  background: linear-gradient(180deg, var(--emerald-surface), transparent), var(--glass-bg);
}

.stat-card--slate {
  border-color: var(--slate-border);
  background: linear-gradient(180deg, var(--slate-surface), transparent), var(--glass-bg);
}

.stat-card--purple,
.stat-card--indigo {
  border-color: rgba(129, 140, 248, 0.22);
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.12), transparent), var(--glass-bg);
}

.stat-label {
  color: var(--color-surface-400);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.stat-value {
  color: var(--color-surface-50);
  font-size: 26px;
  line-height: 1.15;
}

.stat-hint {
  margin: 0;
  color: var(--color-surface-400);
  font-size: 13px;
  line-height: 1.5;
}

.full-width {
  width: 100%;
}

.details-card {
  padding: 22px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.section-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--color-surface-50);
}

.section-header p {
  margin: 8px 0 0;
  color: var(--color-surface-400);
}

.history-chart-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(34px, 1fr));
  gap: 12px;
  align-items: end;
  min-height: 260px;
}

.bars {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
  min-height: 220px;
}

.bars--quad {
  gap: 4px;
}

.chart-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.bar-group {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
  min-height: 220px;
  width: 100%;
}

.bar {
  width: 100%;
  border-radius: 999px 999px 0 0;
}

.chart-col--quad {
  min-width: 36px;
}

.chart-col--quad .bar-group {
  width: 7px;
}

.bar-value {
  font-size: 11px;
  color: var(--color-surface-400);
}

.bar-value.rose,
.legend-color.rose,
.bar-rose {
  color: var(--rose-strong);
  background: linear-gradient(180deg, #fb7185, #e11d48);
}

.bar-value.cyan,
.legend-color.cyan,
.bar-cyan {
  color: var(--cyan-strong);
  background: linear-gradient(180deg, #67e8f9, #0891b2);
}

.bar-value.emerald,
.legend-color.emerald,
.bar-emerald {
  color: var(--emerald-strong);
  background: linear-gradient(180deg, #6ee7b7, #059669);
}

.bar-value.slate,
.legend-color.slate,
.bar-slate {
  color: var(--slate-strong);
  background: linear-gradient(180deg, #cbd5e1, #64748b);
}

.label {
  font-size: 11px;
  color: var(--color-surface-400);
}

.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 18px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-surface-300);
  font-size: 13px;
}

.legend-color {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.status-list,
.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-list__item,
.ranking-list__item,
.health-card,
.metric-table__row {
  display: grid;
  gap: 12px;
  align-items: center;
  border: 1px solid var(--glass-border-subtle);
  border-radius: 14px;
  padding: 14px 16px;
  background: rgba(10, 14, 28, 0.42);
}

.status-list__item {
  grid-template-columns: minmax(0, 1fr) auto;
}

.status-list__item span,
.ranking-list__item span {
  display: block;
  margin-top: 4px;
  color: var(--color-surface-400);
  font-size: 13px;
}

.health-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.health-card {
  grid-template-columns: 1fr;
}

.health-card span {
  color: var(--color-surface-400);
  font-size: 13px;
}

.health-card strong {
  color: var(--color-surface-50);
  font-size: 24px;
}

.metric-table {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metric-table__row {
  grid-template-columns: minmax(180px, 1.8fr) repeat(5, minmax(0, 1fr));
  font-size: 14px;
  color: var(--color-surface-200);
}

.metric-table__row--head {
  background: rgba(30, 41, 59, 0.52);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 11px;
  color: var(--color-surface-400);
}

.ranking-list__item {
  grid-template-columns: minmax(0, 1fr) auto;
}

.ranking-list__metrics {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.empty-note {
  margin: 0;
  color: var(--color-surface-400);
}

@media (max-width: 1024px) {
  .header,
  .prelaunch-intro-card {
    flex-direction: column;
    align-items: stretch;
  }

  .report-grid {
    grid-template-columns: 1fr;
  }

  .metric-table__row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .metric-table__row span:first-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .metrics-page {
    padding: 18px;
  }

  .filter-actions,
  .health-grid {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    display: grid;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .chart-legend,
  .ranking-list__metrics {
    align-items: flex-start;
  }

  .ranking-list__item,
  .status-list__item {
    grid-template-columns: 1fr;
  }

  .metric-table__row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>