<script setup lang="ts">
const { fetchApi } = useApi()
const toast = useToast()
const auth = useAuthStore()
const { projects, selectedProjectId, startDate, endDate, fetchProjects, buildQueryString } = useMetricsFilters()

const data = ref<any>(null)
const loading = ref(false)

async function fetchData() {
  loading.value = true
  try {
    data.value = await fetchApi(`/tracking/metrics/trends?${buildQueryString()}`)
  } catch {
    toast.error('Erro ao carregar tendências')
  } finally {
    loading.value = false
  }
}

watch([selectedProjectId, startDate, endDate], () => {
  fetchData()
})

onMounted(async () => {
  await fetchProjects()
  fetchData()
})

definePageMeta({
  layout: 'default'
})

const sortedLotTrends = computed(() => {
  if (!data.value?.lotTrends?.length) return []
  return [...data.value.lotTrends].sort((a: any, b: any) => (b.growth || 0) - (a.growth || 0))
})

const maxPeakCount = computed(() => {
  if (!data.value?.peakHours?.length) return 1
  const max = Math.max(...data.value.peakHours.map((h: any) => h.count || 0))
  return max > 0 ? max : 1
})

const maxDeviceCount = computed(() => {
  if (!data.value?.deviceBreakdown?.length) return 1
  const max = Math.max(...data.value.deviceBreakdown.map((d: any) => d.count || 0))
  return max > 0 ? max : 1
})

const formatGrowth = (value: number | null) => {
  if (value === null || value === undefined) return '---'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

const deviceLabel = (type: string) => {
  const map: Record<string, string> = {
    desktop: 'Desktop',
    mobile: 'Mobile',
    tablet: 'Tablet'
  }
  return map[type.toLowerCase()] || type
}

const formatHour = (hour: number) => {
  return `${String(hour).padStart(2, '0')}h`
}

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds < 1) return '0s'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

const avgSessionDuration = computed(() => {
  return formatDuration(data.value?.engagement?.avgSessionDurationSec || 0)
})

const maxEngagementTime = computed(() => {
  if (!data.value?.engagement?.topEngagementPages?.length) return 1
  const max = Math.max(...data.value.engagement.topEngagementPages.map((p: any) => p.avgTime || 0))
  return max > 0 ? max : 1
})

const maxDurationBucket = computed(() => {
  if (!data.value?.engagement?.durationDistribution?.length) return 1
  const max = Math.max(...data.value.engagement.durationDistribution.map((b: any) => b.count || 0))
  return max > 0 ? max : 1
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
        <h1>Tendência de Vendas</h1>
        <p class="subtitle">Crescimento de interesse, regiões quentes e comportamento dos clientes</p>
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

    <div v-if="loading && !data" class="loading">Carregando tendências...</div>

    <div v-else-if="data" class="dashboard" :class="{ 'loading-overlay': loading }">
      <!-- Summary Cards -->
      <div class="stats-grid stats-grid-4">
        <div class="stat-card">
          <div class="stat-icon icon-blue">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <CommonAppTooltip text="Total de sessões (visitas) registradas no período selecionado." position="bottom"><span class="stat-label">Sessões no Período</span></CommonAppTooltip>
          <span class="stat-value text-blue">{{ data.summary.currentSessions }}</span>
        </div>
        <div class="stat-card">
          <div class="stat-icon" :class="data.summary.sessionGrowth !== null && data.summary.sessionGrowth >= 0 ? 'icon-emerald' : 'icon-red'">
            <svg v-if="data.summary.sessionGrowth !== null && data.summary.sessionGrowth >= 0" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <svg v-else-if="data.summary.sessionGrowth !== null && data.summary.sessionGrowth < 0" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
            <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <CommonAppTooltip text="Variação percentual de sessões comparando o período atual com o anterior de mesma duração." position="bottom"><span class="stat-label">Crescimento Sessões</span></CommonAppTooltip>
          <span class="stat-value" :class="data.summary.sessionGrowth !== null && data.summary.sessionGrowth >= 0 ? 'text-emerald' : 'text-red'">
            {{ formatGrowth(data.summary.sessionGrowth) }}
          </span>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-emerald">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </div>
          <CommonAppTooltip text="Total de leads captados no período selecionado." position="bottom"><span class="stat-label">Leads no Período</span></CommonAppTooltip>
          <span class="stat-value text-emerald">{{ data.summary.currentLeads }}</span>
        </div>
        <div class="stat-card">
          <div class="stat-icon" :class="data.summary.leadGrowth !== null && data.summary.leadGrowth >= 0 ? 'icon-emerald' : 'icon-red'">
            <svg v-if="data.summary.leadGrowth !== null && data.summary.leadGrowth >= 0" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            <svg v-else-if="data.summary.leadGrowth !== null && data.summary.leadGrowth < 0" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
            <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <CommonAppTooltip text="Variação percentual de leads comparando o período atual com o anterior de mesma duração." position="bottom"><span class="stat-label">Crescimento Leads</span></CommonAppTooltip>
          <span class="stat-value" :class="data.summary.leadGrowth !== null && data.summary.leadGrowth >= 0 ? 'text-emerald' : 'text-red'">
            {{ formatGrowth(data.summary.leadGrowth) }}
          </span>
        </div>
      </div>

      <!-- Lotes em Alta -->
      <div class="details-card">
        <h3><CommonAppTooltip text="Lotes com maior crescimento de visualizações comparando o período atual com o anterior." position="right">Lotes em Alta</CommonAppTooltip></h3>
        <div v-if="sortedLotTrends.length" class="lot-trends-list">
          <div v-for="lot in sortedLotTrends" :key="lot.label" class="lot-trend-row">
            <span class="lot-trend-label">{{ lot.label }}</span>
            <div class="lot-trend-stats">
              <span class="lot-trend-current">{{ lot.current }} views</span>
              <span class="lot-trend-separator">vs</span>
              <span class="lot-trend-previous">{{ lot.previous }} views</span>
            </div>
            <span class="growth-badge" :class="lot.growth >= 0 ? 'growth-positive' : 'growth-negative'">
              <svg v-if="lot.growth >= 0" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
              <svg v-else viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              {{ lot.growth >= 0 ? '+' : '' }}{{ lot.growth.toFixed(1) }}%
            </span>
          </div>
        </div>
        <div v-else class="empty-state">Nenhum dado de tendência disponível</div>
      </div>

      <div class="two-col-grid">
        <!-- Dispositivos -->
        <div class="details-card">
          <h3><CommonAppTooltip text="Distribuição dos acessos por tipo de dispositivo utilizado pelos visitantes." position="right">Dispositivos</CommonAppTooltip></h3>
          <div v-if="data.deviceBreakdown?.length" class="device-list">
            <div v-for="device in data.deviceBreakdown" :key="device.type" class="device-row">
              <div class="device-info">
                <div class="device-icon">
                  <!-- Desktop -->
                  <svg v-if="device.type.toLowerCase() === 'desktop'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                  <!-- Mobile -->
                  <svg v-else-if="device.type.toLowerCase() === 'mobile'" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  <!-- Tablet -->
                  <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                </div>
                <span class="device-label">{{ deviceLabel(device.type) }}</span>
                <span class="device-percentage">{{ device.percentage.toFixed(1) }}%</span>
              </div>
              <div class="device-bar-track">
                <div class="device-bar-fill" :style="{ width: `${(device.count / maxDeviceCount) * 100}%` }"></div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">Nenhum dado de dispositivo</div>
        </div>

        <!-- Horarios de Pico -->
        <div class="details-card">
          <h3><CommonAppTooltip text="Horários do dia com maior volume de acessos. Útil para planejar ações de marketing." position="right">Horários de Pico</CommonAppTooltip></h3>
          <div v-if="data.peakHours?.length" class="peak-hours-chart">
            <div v-for="hour in data.peakHours" :key="hour.hour" class="peak-col">
              <span class="peak-count">{{ hour.count }}</span>
              <div class="peak-bar-wrapper">
                <div class="peak-bar" :style="{ height: `${(hour.count / maxPeakCount) * 100}%` }"></div>
              </div>
              <span class="peak-label">{{ formatHour(hour.hour) }}</span>
            </div>
          </div>
          <div v-else class="empty-state">Nenhum dado de horários</div>
        </div>
      </div>

      <!-- Engagement Section -->
      <div class="engagement-header">
        <h2>Engajamento</h2>
        <div class="engagement-summary">
          <div class="engagement-stat">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <CommonAppTooltip text="Média de tempo que os visitantes permanecem ativos no site por sessão." position="bottom"><span class="engagement-stat-label">Tempo médio por sessão:</span></CommonAppTooltip>
            <span class="engagement-stat-value">{{ avgSessionDuration }}</span>
          </div>
        </div>
      </div>

      <div class="two-col-grid">
        <!-- Duration Distribution -->
        <div class="details-card">
          <h3><CommonAppTooltip text="Como as sessões se distribuem por faixas de duração. Mostra o engajamento dos visitantes." position="right">Distribuição de Duração das Sessões</CommonAppTooltip></h3>
          <div v-if="data.engagement?.durationDistribution?.length" class="duration-chart">
            <div v-for="bucket in data.engagement.durationDistribution" :key="bucket.label" class="duration-row">
              <span class="duration-label">{{ bucket.label }}</span>
              <div class="duration-bar-track">
                <div class="duration-bar-fill" :style="{ width: `${(bucket.count / maxDurationBucket) * 100}%` }"></div>
              </div>
              <span class="duration-count">{{ bucket.count }}</span>
              <span class="duration-percent">{{ bucket.percentage.toFixed(1) }}%</span>
            </div>
          </div>
          <div v-else class="empty-state">Nenhum dado de duração disponível</div>
        </div>

        <!-- Top Engagement Pages -->
        <div class="details-card">
          <h3><CommonAppTooltip text="Páginas onde os visitantes passam mais tempo em média, indicando maior interesse no conteúdo." position="right">Páginas com Maior Engajamento</CommonAppTooltip></h3>
          <div v-if="data.engagement?.topEngagementPages?.length" class="engagement-pages-list">
            <div v-for="page in data.engagement.topEngagementPages" :key="page.path" class="engagement-page-row">
              <div class="engagement-page-info">
                <span class="engagement-page-path">{{ page.path }}</span>
                <span class="engagement-page-views">{{ page.views }} views</span>
              </div>
              <div class="engagement-bar-track">
                <div class="engagement-bar-fill" :style="{ width: `${(page.avgTime / maxEngagementTime) * 100}%` }"></div>
              </div>
              <span class="engagement-time">{{ formatDuration(page.avgTime) }}</span>
            </div>
          </div>
          <div v-else class="empty-state">Nenhum dado de engajamento disponível</div>
        </div>
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stats-grid-4 {
  grid-template-columns: repeat(4, 1fr);
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

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.icon-blue { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
.stat-icon.icon-emerald { background: rgba(16, 185, 129, 0.12); color: #059669; }
.stat-icon.icon-red { background: rgba(239, 68, 68, 0.12); color: #dc2626; }

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
.text-indigo { color: #4f46e5; }
.text-red { color: #dc2626; }

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

/* Two column layout */
.two-col-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* Lot Trends */
.lot-trends-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lot-trend-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
}

.lot-trend-row:hover {
  background: rgba(255,255,255,0.04);
}

.lot-trend-label {
  font-weight: 700;
  color: var(--color-surface-100);
  font-size: 14px;
  min-width: 120px;
}

.lot-trend-stats {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-surface-400);
}

.lot-trend-current {
  color: var(--color-surface-200);
  font-weight: 600;
}

.lot-trend-separator {
  color: var(--color-surface-500);
  font-size: 11px;
}

.lot-trend-previous {
  color: var(--color-surface-500);
}

.growth-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.growth-positive {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.growth-negative {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}

/* Device Breakdown */
.device-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.device-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.device-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.device-icon {
  color: var(--color-surface-400);
  display: flex;
  align-items: center;
}

.device-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-surface-200);
  flex: 1;
}

.device-percentage {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-surface-100);
}

.device-bar-track {
  height: 10px;
  background: rgba(255,255,255,0.06);
  border-radius: 5px;
  overflow: hidden;
}

.device-bar-fill {
  height: 100%;
  background: var(--color-primary-500);
  border-radius: 5px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 2px;
}

/* Peak Hours */
.peak-hours-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 200px;
  padding-top: 24px;
}

.peak-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  min-width: 0;
}

.peak-count {
  font-size: 9px;
  font-weight: 700;
  color: var(--color-surface-400);
  margin-bottom: 4px;
}

.peak-bar-wrapper {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.peak-bar {
  width: 80%;
  max-width: 24px;
  background: #2563eb;
  border-radius: 3px 3px 0 0;
  min-height: 2px;
  transition: height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.8;
}

.peak-bar:hover {
  opacity: 1;
}

.peak-label {
  font-size: 9px;
  color: var(--color-surface-500);
  font-weight: 600;
  margin-top: 6px;
  white-space: nowrap;
}

/* Loading & Empty */
.loading {
  padding: 48px;
  text-align: center;
  color: var(--color-surface-400);
}

.empty-state {
  padding: 48px;
  text-align: center;
  color: var(--color-surface-500);
  font-weight: 600;
}

/* Engagement Section */
.engagement-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--glass-border-subtle);
}

.engagement-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-surface-100);
}

.engagement-summary {
  display: flex;
  gap: 24px;
}

.engagement-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-surface-400);
}

.engagement-stat svg {
  color: #06b6d4;
}

.engagement-stat-label {
  font-size: 13px;
}

.engagement-stat-value {
  font-size: 14px;
  font-weight: 700;
  color: #06b6d4;
}

/* Duration Distribution */
.duration-chart {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.duration-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.duration-label {
  min-width: 80px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-surface-300);
}

.duration-bar-track {
  flex: 1;
  height: 10px;
  background: rgba(255,255,255,0.06);
  border-radius: 5px;
  overflow: hidden;
}

.duration-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #06b6d4, #0ea5e9);
  border-radius: 5px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 2px;
}

.duration-count {
  min-width: 40px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-surface-200);
  text-align: right;
}

.duration-percent {
  min-width: 50px;
  font-size: 12px;
  color: var(--color-surface-500);
  text-align: right;
}

/* Top Engagement Pages */
.engagement-pages-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.engagement-page-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.engagement-page-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.engagement-page-path {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-surface-200);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70%;
}

.engagement-page-views {
  font-size: 12px;
  color: var(--color-surface-500);
}

.engagement-bar-track {
  height: 8px;
  background: rgba(255,255,255,0.06);
  border-radius: 4px;
  overflow: hidden;
}

.engagement-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #06b6d4, #22d3ee);
  border-radius: 4px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 2px;
}

.engagement-time {
  font-size: 14px;
  font-weight: 700;
  color: #06b6d4;
  align-self: flex-end;
}

@media (max-width: 1024px) {
  .two-col-grid {
    grid-template-columns: 1fr;
  }
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 20px;
  }
  .filter-actions {
    width: 100%;
  }
  .stats-grid-4 {
    grid-template-columns: 1fr;
  }
}
</style>
