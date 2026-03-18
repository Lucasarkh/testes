<template>
  <div class="heatmap-report">
    <div v-if="!report?.plantMap" class="heatmap-empty">
      <div class="heatmap-empty__icon">
        <i class="bi bi-image-alt" aria-hidden="true"></i>
      </div>
      <div>
        <h3>Planta indisponível</h3>
        <p>Cadastre a planta do empreendimento para visualizar o mapa de calor sobre os lotes.</p>
      </div>
    </div>

    <div v-else class="heatmap-shell">
      <section class="heatmap-stage">
        <div class="heatmap-stage__header">
          <div>
            <p class="eyebrow">Mapa de calor da planta</p>
            <h2>Distribuição visual de interesse por lote</h2>
            <p class="subtitle">Troque a camada para comparar volume de acessos, geração de leads, reservas e eficiência por lote.</p>
          </div>

          <div class="metric-switcher" role="tablist" aria-label="Camadas do mapa de calor">
            <button
              v-for="option in metricOptions"
              :key="option.value"
              type="button"
              class="metric-switcher__button"
              :class="{ 'is-active': selectedMetric === option.value }"
              @click="selectedMetric = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="heatmap-stage__legend">
          <span>{{ currentMetricLabel }}</span>
          <div class="legend-gradient" aria-hidden="true"></div>
          <span>Mais intenso</span>
        </div>

        <div class="heatmap-stage__summary">
          <div class="heat-chip heat-chip--primary">
            <span>Camada ativa</span>
            <strong>{{ currentMetricLabel }}</strong>
          </div>
          <div class="heat-chip" v-if="topLots.length">
            <span>Ponto mais quente</span>
            <strong>{{ topLots[0]?.code }}</strong>
          </div>
          <div class="heat-chip">
            <span>Lotes com calor</span>
            <strong>{{ formatNumber(activeLots.length) }}</strong>
          </div>
          <div class="heat-chip heat-chip--hint">
            <span>Como ler</span>
            <strong>Passe o mouse nos focos</strong>
          </div>
        </div>

        <div class="heatmap-canvas">
          <div class="heatmap-canvas__chrome">
            <span class="heatmap-canvas__badge">Mapa de Calor</span>
            <span class="heatmap-canvas__caption">A concentração aparece diretamente sobre a planta.</span>
          </div>

          <div class="heatmap-canvas__wash" aria-hidden="true"></div>

          <img
            :src="report.plantMap.imageUrl"
            class="heatmap-canvas__image"
            alt="Planta do empreendimento"
          />

          <svg
            class="heatmap-canvas__overlay"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <filter id="lot-heat-blur" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="1.75" />
              </filter>
            </defs>

            <g
              v-for="hotspot in lotHotspots"
              :key="hotspot.id"
              class="heatmap-hotspot"
              @mouseenter="setActiveLot(hotspot.lotMetrics?.mapElementId || null)"
              @mouseleave="setActiveLot(null)"
            >
              <template v-if="hotspot.lotMetrics && metricValue(hotspot.lotMetrics) > 0">
                <circle
                  :cx="hotspot.x * 100"
                  :cy="hotspot.y * 100"
                  :r="glowRadius(hotspot.lotMetrics) * 1.45"
                  :fill="heatColor(hotspot.lotMetrics)"
                  :fill-opacity="0.1 + normalizedMetric(hotspot.lotMetrics) * 0.18"
                  filter="url(#lot-heat-blur)"
                />
                <circle
                  :cx="hotspot.x * 100"
                  :cy="hotspot.y * 100"
                  :r="glowRadius(hotspot.lotMetrics)"
                  :fill="heatColor(hotspot.lotMetrics)"
                  :fill-opacity="0.2 + normalizedMetric(hotspot.lotMetrics) * 0.24"
                  filter="url(#lot-heat-blur)"
                />
                <circle
                  :cx="hotspot.x * 100"
                  :cy="hotspot.y * 100"
                  :r="coreRadius(hotspot.lotMetrics)"
                  :fill="heatColor(hotspot.lotMetrics)"
                  :fill-opacity="0.35 + normalizedMetric(hotspot.lotMetrics) * 0.38"
                />
                <circle
                  :cx="hotspot.x * 100"
                  :cy="hotspot.y * 100"
                  :r="Math.max(0.85, coreRadius(hotspot.lotMetrics) * 0.52)"
                  fill="rgba(255,255,255,0.72)"
                  :fill-opacity="0.28 + normalizedMetric(hotspot.lotMetrics) * 0.34"
                />
              </template>

              <circle
                :cx="hotspot.x * 100"
                :cy="hotspot.y * 100"
                :r="hitRadius(hotspot.lotMetrics)"
                fill="transparent"
              />

              <circle
                :cx="hotspot.x * 100"
                :cy="hotspot.y * 100"
                :r="0.58"
                class="heatmap-hotspot__pin"
                :class="{
                  'is-active': hotspot.lotMetrics?.mapElementId === activeLotId,
                  'is-idle': !hotspot.lotMetrics || metricValue(hotspot.lotMetrics) === 0
                }"
              />

              <text
                v-if="hotspot.lotMetrics && normalizedMetric(hotspot.lotMetrics) >= 0.48"
                :x="hotspot.x * 100"
                :y="hotspot.y * 100 - 1.45"
                class="heatmap-hotspot__label"
                text-anchor="middle"
              >
                {{ hotspot.lotMetrics.code }}
              </text>
            </g>
          </svg>

          <div v-if="activeLot" class="heatmap-tooltip" :style="tooltipStyle">
            <div
              class="heatmap-tooltip__surface"
              :class="{ 'is-expanded': isTooltipExpanded }"
              @mouseenter="handleTooltipMouseEnter"
              @mouseleave="handleTooltipMouseLeave"
            >
              <div class="heatmap-tooltip__header">
                <div class="heatmap-tooltip__identity" :class="{ 'is-compact': !tooltipPrimaryTitle(activeLot) }">
                  <span class="heatmap-tooltip__code">{{ activeLot.code }}</span>
                  <strong v-if="tooltipPrimaryTitle(activeLot)">{{ tooltipPrimaryTitle(activeLot) }}</strong>
                  <p v-if="isTooltipExpanded && tooltipSecondaryText(activeLot)" class="heatmap-tooltip__subtitle">{{ tooltipSecondaryText(activeLot) }}</p>
                </div>
                <span class="status-pill" :class="statusClass(activeLot.status)">{{ statusLabel(activeLot.status) }}</span>
              </div>

              <div v-if="isTooltipExpanded" class="heatmap-tooltip__metrics">
                <div class="heatmap-tooltip__metric-card">
                  <span>Acessos</span>
                  <strong>{{ formatNumber(activeLot.views) }}</strong>
                </div>
                <div class="heatmap-tooltip__metric-card">
                  <span>Leads</span>
                  <strong>{{ formatNumber(activeLot.leads) }}</strong>
                </div>
                <div class="heatmap-tooltip__metric-card">
                  <span>Reservas</span>
                  <strong>{{ formatNumber(activeLot.reservations) }}</strong>
                </div>
                <div class="heatmap-tooltip__metric-card heatmap-tooltip__metric-card--accent">
                  <span class="heatmap-tooltip__metric-label">Conversão</span>
                  <strong :class="{ 'is-empty': !hasConversionData(activeLot) }">{{ formatTooltipConversion(activeLot) }}</strong>
                </div>
              </div>

              <div v-else class="heatmap-tooltip__peek">
                <span>{{ formatNumber(activeLot.views) }} acessos</span>
                <i class="bi bi-arrows-angle-expand" aria-hidden="true"></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside class="heatmap-sidebar">
        <section class="sidebar-card">
          <div class="sidebar-card__header">
            <div>
              <p class="eyebrow">Ranking dinâmico</p>
              <h3>Lotes mais quentes</h3>
            </div>
            <span class="sidebar-card__badge">{{ currentMetricLabel }}</span>
          </div>

          <div v-if="topLots.length" class="ranking-list">
            <button
              v-for="(lot, index) in topLots"
              :key="lot.mapElementId"
              type="button"
              class="ranking-item"
              :class="{ 'is-active': lot.mapElementId === activeLotId }"
              @mouseenter="setActiveLot(lot.mapElementId)"
              @mouseleave="setActiveLot(null)"
            >
              <span class="ranking-item__index">{{ index + 1 }}</span>
              <div class="ranking-item__content">
                <div class="ranking-item__title-row">
                  <div>
                    <strong>{{ lot.code }}</strong>
                    <span v-if="tooltipPrimaryTitle(lot)">{{ tooltipPrimaryTitle(lot) }}</span>
                  </div>
                  <span class="ranking-item__metric">{{ formatMetric(lot) }}</span>
                </div>
                <div class="ranking-item__bar">
                  <span :style="{ width: `${normalizedMetric(lot) * 100}%`, background: heatColor(lot) }"></span>
                </div>
                <div class="ranking-item__meta">
                  <span>{{ formatNumber(lot.views) }} acessos</span>
                  <span>{{ formatNumber(lot.leads) }} leads</span>
                  <span>{{ formatNumber(lot.reservations) }} reservas</span>
                </div>
              </div>
            </button>
          </div>

          <div v-else class="sidebar-card__empty">
            Nenhuma atividade registrada nos lotes para o período selecionado.
          </div>
        </section>

        <section class="sidebar-card sidebar-card--compact">
          <div class="sidebar-card__header">
            <div>
              <p class="eyebrow">Cobertura do mapa</p>
              <h3>Qualidade do espelhamento</h3>
            </div>
          </div>

          <div class="coverage-grid">
            <div>
              <span>Lotes na planta</span>
              <strong>{{ formatNumber(report.summary.totalPlantLots) }}</strong>
            </div>
            <div>
              <span>Lotes com atividade</span>
              <strong>{{ formatNumber(report.summary.totalTrackedLots) }}</strong>
            </div>
            <div>
              <span>Atividade espelhada</span>
              <strong>{{ formatNumber(report.summary.lotsWithHotspot) }}</strong>
            </div>
            <div>
              <span>Média de acessos</span>
              <strong>{{ report.summary.avgViewsPerTrackedLot.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) }}</strong>
            </div>
          </div>
        </section>

        <section v-if="report.unmappedLots.length" class="sidebar-card sidebar-card--compact">
          <div class="sidebar-card__header">
            <div>
              <p class="eyebrow">Pendências</p>
              <h3>Lotes sem hotspot</h3>
            </div>
          </div>

          <ul class="unmapped-list">
            <li v-for="item in report.unmappedLots" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ formatNumber(item.views) }}</strong>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
type MetricMode = 'activity' | 'views' | 'leads' | 'reservations' | 'conversion'

type HeatmapLot = {
  mapElementId: string
  hotspotId: string | null
  code: string
  name: string
  x: number | null
  y: number | null
  hasHotspot: boolean
  views: number
  leads: number
  reservations: number
  status: string | null
  activityScore: number
  conversionRate: number
  label: string
  title: string
}

type HeatmapHotspot = {
  id: string
  type: string
  title: string
  x: number
  y: number
  label?: string | null
  linkType: string
  linkId?: string | null
  loteStatus?: string | null
  lotMetrics?: HeatmapLot | null
}

type HeatmapReport = {
  summary: {
    totalLotViews: number
    totalLotLeads: number
    totalReservations: number
    totalTrackedLots: number
    totalPlantLots: number
    lotsWithHotspot: number
    lotsWithoutHotspot: number
    avgViewsPerTrackedLot: number
    lotLeadConversionRate: number
  }
  plantMap: {
    imageUrl: string
    hotspots: HeatmapHotspot[]
  } | null
  lots: HeatmapLot[]
  unmappedLots: Array<{ label: string; views: number }>
}

const props = defineProps<{
  report: HeatmapReport | null
}>()

const metricOptions: Array<{ value: MetricMode; label: string }> = [
  { value: 'activity', label: 'Atividade geral' },
  { value: 'views', label: 'Acessos' },
  { value: 'leads', label: 'Leads' },
  { value: 'reservations', label: 'Reservas' },
  { value: 'conversion', label: 'Conversão' }
]

const selectedMetric = ref<MetricMode>('activity')
const activeLotId = ref<string | null>(null)
const isTooltipExpanded = ref(false)
let tooltipCloseTimer: ReturnType<typeof setTimeout> | null = null

const lotHotspots = computed(() => {
  return (props.report?.plantMap?.hotspots || []).filter(
    hotspot => hotspot.linkType === 'LOTE_PAGE' && hotspot.linkId,
  )
})

const activeLots = computed(() => {
  return (props.report?.lots || []).filter(
    lot => lot.views > 0 || lot.leads > 0 || lot.reservations > 0,
  )
})

const currentMetricLabel = computed(() => {
  return metricOptions.find(option => option.value === selectedMetric.value)?.label || 'Atividade geral'
})

function metricValue(lot: HeatmapLot, mode = selectedMetric.value) {
  switch (mode) {
    case 'views':
      return lot.views
    case 'leads':
      return lot.leads
    case 'reservations':
      return lot.reservations
    case 'conversion':
      return lot.conversionRate * 100
    default:
      return lot.activityScore
  }
}

const maxMetricValue = computed(() => {
  const values = activeLots.value.map(lot => metricValue(lot))
  return Math.max(...values, 0)
})

function normalizedMetric(lot: HeatmapLot) {
  const max = maxMetricValue.value
  if (!max) return 0
  return metricValue(lot) / max
}

function glowRadius(lot: HeatmapLot) {
  return 1.8 + normalizedMetric(lot) * 5.8
}

function coreRadius(lot: HeatmapLot) {
  return 0.9 + normalizedMetric(lot) * 2.1
}

function hitRadius(lot?: HeatmapLot | null) {
  if (!lot) return 1.5
  return Math.max(1.5, coreRadius(lot) + 0.75)
}

function heatColor(lot: HeatmapLot) {
  const intensity = normalizedMetric(lot)
  const hue = Math.round(46 - intensity * 44)
  const lightness = 62 - intensity * 14
  return `hsl(${hue} 96% ${lightness}%)`
}

const sortedLots = computed(() => {
  return [...activeLots.value].sort((left, right) => {
    const metricDelta = metricValue(right) - metricValue(left)
    if (metricDelta !== 0) return metricDelta
    if (right.activityScore !== left.activityScore) return right.activityScore - left.activityScore
    return right.views - left.views
  })
})

const topLots = computed(() => sortedLots.value.slice(0, 8))

const activeLot = computed(() => {
  if (!activeLotId.value) return null
  return props.report?.lots.find(lot => lot.mapElementId === activeLotId.value) || null
})

const tooltipStyle = computed(() => {
  if (!activeLot.value || activeLot.value.x === null || activeLot.value.y === null) {
    return { left: '24px', top: '24px' }
  }

  const left = Math.min(Math.max(activeLot.value.x * 100, 18), 82)
  const top = Math.min(Math.max(activeLot.value.y * 100, 14), 82)
  const translateX = left > 66 ? '-100%' : '0%'
  const translateY = top > 62 ? '-100%' : '0%'

  return {
    left: `${left}%`,
    top: `${top}%`,
    transform: `translate(${translateX}, ${translateY})`
  }
})

watch(
  () => props.report?.lots,
  () => {
    if (activeLotId.value && !props.report?.lots.some(lot => lot.mapElementId === activeLotId.value)) {
      activeLotId.value = null
      isTooltipExpanded.value = false
    }
  },
  { deep: true },
)

function clearTooltipCloseTimer() {
  if (tooltipCloseTimer) {
    clearTimeout(tooltipCloseTimer)
    tooltipCloseTimer = null
  }
}

function scheduleTooltipClose() {
  clearTooltipCloseTimer()
  tooltipCloseTimer = setTimeout(() => {
    activeLotId.value = null
    isTooltipExpanded.value = false
  }, 120)
}

function setActiveLot(mapElementId: string | null, expand = false) {
  if (!mapElementId) {
    scheduleTooltipClose()
    return
  }

  clearTooltipCloseTimer()
  activeLotId.value = mapElementId
  isTooltipExpanded.value = expand
}

function handleTooltipMouseEnter() {
  clearTooltipCloseTimer()
  isTooltipExpanded.value = true
}

function handleTooltipMouseLeave() {
  isTooltipExpanded.value = false
  scheduleTooltipClose()
}

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR')
}

function normalizeLotText(value?: string | null) {
  if (!value) return null

  const normalized = value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

  return normalized || null
}

function isSameLotText(left?: string | null, right?: string | null) {
  const normalizedLeft = normalizeLotText(left)
  const normalizedRight = normalizeLotText(right)

  if (!normalizedLeft || !normalizedRight) return false
  return normalizedLeft === normalizedRight
}

function tooltipPrimaryTitle(lot: HeatmapLot) {
  const candidates = [lot.name, lot.title, lot.label]
  return candidates.find(candidate => candidate && !isSameLotText(candidate, lot.code)) || null
}

function tooltipSecondaryText(lot: HeatmapLot) {
  const primary = tooltipPrimaryTitle(lot)
  const candidates = [lot.label, lot.title, lot.name]

  return candidates.find(candidate => {
    if (!candidate) return false
    if (isSameLotText(candidate, lot.code)) return false
    if (isSameLotText(candidate, primary)) return false
    return true
  }) || null
}

function hasConversionData(lot: HeatmapLot) {
  return lot.views > 0
}

function formatPercent(value: number) {
  return `${(value * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

function formatTooltipConversion(lot: HeatmapLot) {
  if (!hasConversionData(lot)) return 'N/D'
  return formatPercent(lot.conversionRate)
}

function formatMetric(lot: HeatmapLot) {
  if (selectedMetric.value === 'conversion') {
    return formatPercent(lot.conversionRate)
  }

  return formatNumber(metricValue(lot))
}

function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    AVAILABLE: 'Disponível',
    RESERVED: 'Reservado',
    SOLD: 'Vendido'
  }

  if (!status) return 'Sem status'
  return labels[status] || status
}

function statusClass(status?: string | null) {
  const classes: Record<string, string> = {
    AVAILABLE: 'is-available',
    RESERVED: 'is-reserved',
    SOLD: 'is-sold'
  }

  return status ? classes[status] || '' : ''
}
</script>

<style scoped>
.heatmap-report {
  display: block;
}

.heatmap-empty {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 28px;
  border: 1px solid var(--glass-border-subtle);
  border-radius: var(--radius-lg);
  background: rgba(15, 23, 42, 0.28);
}

.heatmap-empty__icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
  font-size: 1.5rem;
}

.heatmap-empty h3,
.heatmap-stage__header h2,
.sidebar-card h3 {
  margin: 0;
}

.heatmap-empty p,
.subtitle {
  margin: 6px 0 0;
  color: var(--color-surface-400);
}

.heatmap-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(320px, 0.95fr);
  gap: 24px;
}

.heatmap-stage,
.sidebar-card {
  border: 1px solid var(--glass-border-subtle);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.28);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}

.heatmap-stage {
  padding: 24px;
}

.heatmap-stage__header,
.sidebar-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-primary-400);
  font-weight: 700;
}

.metric-switcher {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.metric-switcher__button {
  border: 1px solid var(--glass-border-subtle);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.52);
  color: var(--color-surface-200);
  padding: 10px 14px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.metric-switcher__button:hover,
.metric-switcher__button.is-active {
  transform: translateY(-1px);
  border-color: rgba(16, 185, 129, 0.28);
}

.metric-switcher__button.is-active {
  background: rgba(16, 185, 129, 0.14);
  color: #86efac;
}

.heatmap-stage__legend {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0 20px;
  color: var(--color-surface-400);
  font-size: 0.84rem;
}

.legend-gradient {
  flex: 1;
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(90deg, #22c55e, #facc15 48%, #ef4444);
}

.heatmap-stage__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}

.heat-chip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid var(--glass-border-subtle);
  background: rgba(15, 23, 42, 0.36);
}

.heat-chip span {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-surface-400);
}

.heat-chip strong {
  color: var(--color-surface-50);
}

.heat-chip--primary {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.18);
}

.heat-chip--hint {
  background: rgba(59, 130, 246, 0.08);
}

.heatmap-canvas {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  background: rgba(2, 6, 23, 0.32);
  border: 1px solid var(--glass-border-subtle);
  min-height: 420px;
}

.heatmap-canvas__chrome {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
}

.heatmap-canvas__badge,
.heatmap-canvas__caption {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  backdrop-filter: blur(12px);
  background: rgba(15, 23, 42, 0.62);
  border: 1px solid var(--glass-border-subtle);
  color: var(--color-surface-50);
}

.heatmap-canvas__badge {
  font-size: 0.74rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 800;
  color: #86efac;
}

.heatmap-canvas__caption {
  font-size: 0.78rem;
  color: var(--color-surface-200);
}

.heatmap-canvas__wash {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(circle at center, rgba(16, 185, 129, 0.05), transparent 42%),
    linear-gradient(180deg, rgba(2, 6, 23, 0.12), rgba(2, 6, 23, 0.34));
  pointer-events: none;
}

.heatmap-canvas__image {
  display: block;
  width: 100%;
  height: auto;
  min-height: 420px;
  object-fit: cover;
  filter: saturate(0.88) brightness(0.78) contrast(1.05);
}

.heatmap-canvas__overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.heatmap-hotspot__pin {
  fill: rgba(255, 255, 255, 0.85);
  stroke: rgba(15, 23, 42, 0.8);
  stroke-width: 0.28;
  transition: transform 0.2s ease, fill 0.2s ease;
}

.heatmap-hotspot__pin.is-idle {
  fill: rgba(148, 163, 184, 0.68);
}

.heatmap-hotspot__pin.is-active {
  fill: white;
}

.heatmap-hotspot__label {
  fill: rgba(255, 255, 255, 0.94);
  font-size: 1.45px;
  font-weight: 700;
  paint-order: stroke;
  stroke: rgba(15, 23, 42, 0.82);
  stroke-width: 0.55px;
  letter-spacing: 0.08px;
}

.heatmap-tooltip {
  position: absolute;
  z-index: 3;
  min-width: 180px;
  max-width: min(280px, calc(100% - 24px));
}

.heatmap-tooltip__surface {
  padding: 10px 12px;
  border-radius: 16px;
  background: linear-gradient(165deg, rgba(15, 23, 42, 0.88), rgba(17, 24, 39, 0.92));
  border: 1px solid var(--glass-border-subtle);
  box-shadow: 0 10px 20px rgba(2, 6, 23, 0.22);
  backdrop-filter: blur(10px);
  transition: padding 0.18s ease, width 0.18s ease, background 0.18s ease;
}

.heatmap-tooltip__surface.is-expanded {
  min-width: 220px;
  padding: 14px;
  background: linear-gradient(165deg, rgba(15, 23, 42, 0.94), rgba(17, 24, 39, 0.94));
}

.heatmap-tooltip__surface::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.06), transparent 48%);
  pointer-events: none;
}

.heatmap-tooltip__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.heatmap-tooltip__identity {
  min-width: 0;
}

.heatmap-tooltip__identity.is-compact {
  display: flex;
  align-items: center;
  min-height: 28px;
}

.heatmap-tooltip__code {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #86efac;
}

.heatmap-tooltip__subtitle {
  margin: 4px 0 0;
  font-size: 0.78rem;
  color: var(--color-surface-400);
}

.heatmap-tooltip__peek {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  font-size: 0.76rem;
  color: var(--color-surface-300);
  position: relative;
  z-index: 1;
}

.heatmap-tooltip__peek i {
  font-size: 0.8rem;
  color: #93c5fd;
}

.heatmap-tooltip__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
  position: relative;
  z-index: 1;
}

.heatmap-tooltip__metric-card {
  padding: 10px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.heatmap-tooltip__metric-label {
  display: block;
  white-space: nowrap;
}

.heatmap-tooltip__metric-card--accent {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.14);
}

.heatmap-tooltip__metrics span,
.coverage-grid span,
.ranking-item__meta,
.ranking-item__title-row span {
  color: var(--color-surface-400);
}

.heatmap-tooltip__metrics strong,
.coverage-grid strong {
  display: block;
  margin-top: 3px;
  font-size: 1.02rem;
  white-space: nowrap;
}

.heatmap-tooltip__metrics strong.is-empty {
  font-size: 0.92rem;
  letter-spacing: 0.04em;
  color: var(--color-surface-300);
}

.status-pill,
.sidebar-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(148, 163, 184, 0.12);
  color: var(--color-surface-200);
}

.status-pill.is-available {
  background: rgba(34, 197, 94, 0.14);
  color: #86efac;
}

.status-pill.is-reserved {
  background: rgba(250, 204, 21, 0.16);
  color: #fde68a;
}

.status-pill.is-sold {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}

.heatmap-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar-card {
  padding: 22px;
}

.sidebar-card--compact {
  padding: 18px 20px;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 18px;
}

.ranking-item {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 14px;
  width: 100%;
  padding: 14px;
  text-align: left;
  border: 1px solid var(--glass-border-subtle);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.34);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.ranking-item:hover,
.ranking-item.is-active {
  transform: translateY(-1px);
  border-color: rgba(16, 185, 129, 0.22);
  background: rgba(15, 23, 42, 0.5);
}

.ranking-item__index {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 14px;
  background: rgba(59, 130, 246, 0.12);
  color: #93c5fd;
  font-weight: 700;
}

.ranking-item__content {
  min-width: 0;
}

.ranking-item__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.ranking-item__title-row strong,
.coverage-grid strong {
  color: var(--color-surface-50);
}

.ranking-item__title-row span {
  display: block;
  margin-top: 3px;
  font-size: 0.82rem;
}

.ranking-item__metric {
  flex-shrink: 0;
  font-weight: 700;
  color: var(--color-surface-50);
}

.ranking-item__bar {
  height: 8px;
  margin: 12px 0 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  overflow: hidden;
}

.ranking-item__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.ranking-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 0.76rem;
}

.sidebar-card__empty {
  margin-top: 18px;
  color: var(--color-surface-400);
}

.coverage-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.unmapped-list {
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.unmapped-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.48);
  color: var(--color-surface-300);
}

@media (max-width: 1180px) {
  .heatmap-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .heatmap-stage,
  .sidebar-card {
    padding: 18px;
    border-radius: 24px;
  }

  .heatmap-stage__header,
  .sidebar-card__header {
    flex-direction: column;
  }

  .metric-switcher {
    justify-content: flex-start;
  }

  .heatmap-stage__summary {
    grid-template-columns: 1fr 1fr;
  }

  .heatmap-canvas__chrome {
    flex-direction: column;
    align-items: flex-start;
  }

  .heatmap-tooltip {
    left: 16px !important;
    right: 16px;
    top: auto !important;
    bottom: 16px;
    transform: none !important;
    min-width: 0;
    max-width: none;
  }

  .coverage-grid {
    grid-template-columns: 1fr;
  }

  .ranking-item {
    grid-template-columns: 1fr;
  }
}
</style>