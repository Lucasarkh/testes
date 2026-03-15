<template>
  <div class="plant-map-viewer" ref="containerEl">
    <!-- Loading state -->
    <div v-if="!imageLoaded && !imageError" class="plant-map-viewer__loading">
      <div class="loading-spinner"></div>
      <span>Carregando planta...</span>
    </div>

    <!-- Error state -->
    <div v-if="imageError" class="plant-map-viewer__error">
      Não foi possível carregar a imagem da planta.
    </div>

    <!-- Main content — transform wrapper -->
    <div
      ref="contentEl"
      class="plant-map-viewer__content"
      :style="[contentStyle, { opacity: imageLoaded ? 1 : 0 }]"
      :class="{ 'is-ready': imageLoaded }"
    >
      <!-- Plant image -->
      <img
        v-if="plantMap.imageUrl"
        :src="plantMap.imageUrl"
        class="plant-map-viewer__image"
        alt="Planta do loteamento"
        draggable="false"
        @load="onImageLoad"
        @error="imageError = true"
        decoding="async"
      />

      <!-- SVG overlay (hotspots + sun path) -->
      <svg
        v-if="imageLoaded"
        class="plant-map-viewer__overlay"
        :viewBox="`0 0 ${imgNaturalW} ${imgNaturalH}`"
        :width="imgNaturalW"
        :height="imgNaturalH"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <!-- Sun path line -->
        <SunPathLine
          :enabled="plantMap.sunPathEnabled"
          :angle-deg="effectiveSunPathAngleDeg"
          :show-labels="plantMap.sunPathLabelEnabled"
          :width="imgNaturalW"
          :height="imgNaturalH"
          :scale="transform.scale"
        />

        <!-- Hotspot pins -->
        <template v-if="showBeacons">
          <HotspotPin
            v-for="hs in renderedVisibleHotspots"
            :key="hs.id"
            :hotspot="hs"
            :container-width="imgNaturalW"
            :container-height="imgNaturalH"
            :selected="selectedHotspot?.id === hs.id"
            :hovered="hoveredHotspotId === hs.id"
            :show-label="showLabels"
            :pin-radius="pinRadiusForScale"
            @click="openPopover"
            @hover-start="setHoveredHotspot"
            @hover-end="clearHoveredHotspot"
          />
        </template>
      </svg>
    </div>

    <NorthCompassOverlay :angle-deg="northAngleDeg" />

    <!-- Zoom controls -->
    <div class="plant-map-viewer__controls" v-if="showControls">
      <button 
        class="plant-map-viewer__btn" 
        :style="{ opacity: showBeacons ? 1 : 0.4 }"
        :title="showBeacons ? 'Esconder pontos' : 'Mostrar pontos'"
        @click="showBeacons = !showBeacons"
      >
        <i :class="showBeacons ? 'bi bi-eye-fill' : 'bi bi-eye-slash-fill'" aria-hidden="true"></i>
      </button>
      <button class="plant-map-viewer__btn" aria-label="Zoom in" @click="zoomIn">＋</button>
      <button class="plant-map-viewer__btn" aria-label="Zoom out" @click="zoomOut">－</button>
      <button class="plant-map-viewer__btn" aria-label="Resetar zoom" title="Resetar" @click="resetTransform">⌂</button>
      <button 
        v-if="isFullscreenSupported"
        class="plant-map-viewer__btn" 
        :title="isFullscreen ? 'Sair tela cheia' : 'Tela cheia'"
        @click="toggleFullscreen"
      >
        <i :class="isFullscreen ? 'bi bi-fullscreen-exit' : 'bi bi-fullscreen'" aria-hidden="true"></i>
      </button>
    </div>

    <!-- Legend -->
    <div v-if="showLegend && showBeacons" class="plant-map-viewer__legend">
      <div class="legend-item">
        <span class="legend-dot" style="background:#22c55e"></span> Disponível
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background:#f59e0b"></span> Reservado
      </div>
      <div class="legend-item">
        <span class="legend-dot" style="background:#ef4444"></span> Vendido
      </div>
    </div>

    <!-- Popover -->
    <HotspotPopover
      :hotspot="selectedHotspot"
      :anchor-x="popoverAnchor.x"
      :anchor-y="popoverAnchor.y"
      :teleport-target="isFullscreen ? containerEl : 'body'"
      @close="handlePopoverClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useFullscreen } from '@vueuse/core'
import type { PlantMap, PlantHotspot } from '~/composables/plantMap/types'
import { useZoomPan } from '~/composables/plantMap/useZoomPan'
import { usePublicPlantMap } from '~/composables/plantMap/usePlantMapApi'
import HotspotPin from './HotspotPin.vue'
import HotspotPopover from './HotspotPopover.vue'
import SunPathLine from './SunPathLine.vue'
import NorthCompassOverlay from './NorthCompassOverlay.vue'
import { useTracking } from '~/composables/useTracking'

const props = withDefaults(defineProps<{
  plantMap: PlantMap
  showControls?: boolean
  showLegend?: boolean
  /** Hide labels (useful on mobile or when too many hotspots) */
  hideLabels?: boolean
  /** Disable zoom/pan interaction */
  interactive?: boolean
  /** Lot code to highlight and center on */
  focusLotCode?: string
}>(), {
  showControls: true,
  showLegend: true,
  hideLabels: false,
  interactive: true,
})

const tracking = useTracking()
const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360
const northAngleDeg = computed(() => normalizeAngle(props.plantMap.northAngleDeg ?? (props.plantMap.sunPathAngleDeg - 90)))
const effectiveSunPathAngleDeg = computed(() => normalizeAngle(northAngleDeg.value + 90))

// ── Zoom/pan ─────────────────────────────────────────────
const {
  transform,
  containerEl,
  contentEl,
  resetTransform,
  fitToContainer,
  clampOffset,
  clampScale,
  attach,
  detach
} = useZoomPan({
  minScale: 0.3,
  maxScale: 8,
})

// ── Fullscreen ───────────────────────────────────────────
const { isFullscreen, toggle: toggleFullscreen, isSupported: isFullscreenSupported } = useFullscreen(containerEl)

watch(isFullscreen, () => {
  // Recalculate zoom/pan when entering/exiting fullscreen to fit new viewport size
  setTimeout(() => {
    fitToContainer()
  }, 100)
})

// ── Performance optimization (Viewport Culling — RAF throttled) ──────────
/**
 * Only renders hotspots currently visible in the viewport.
 * Updates are batched via requestAnimationFrame so the filter runs at most
 * once per rendered frame instead of synchronously on every transform change.
 */
const visibleHotspots = ref<PlantHotspot[]>(props.plantMap?.hotspots || [])
let _rafId: number | null = null

function scheduleVisibleUpdate() {
  if (_rafId !== null) return // already scheduled — coalesce into one frame
  _rafId = requestAnimationFrame(() => {
    _rafId = null
    if (!containerEl.value || !props.plantMap?.hotspots?.length) {
      visibleHotspots.value = props.plantMap?.hotspots || []
      return
    }
    const { x, y, scale } = transform.value
    const cw = containerEl.value.clientWidth
    const ch = containerEl.value.clientHeight
    const iw = imgNaturalW.value
    const ih = imgNaturalH.value
    const margin = 100

    visibleHotspots.value = props.plantMap.hotspots.filter(hs => {
      const vx = hs.x * iw * scale + x
      const vy = hs.y * ih * scale + y
      return vx >= -margin && vy >= -margin && vx <= cw + margin && vy <= ch + margin
    })
  })
}

// Initialize on client only (SSR safe)
onMounted(() => {
  if (props.interactive) {
    nextTick(() => attach())
  }

  // Close popover on scroll since it uses position: fixed
  window.addEventListener('scroll', handleContainerClick, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleContainerClick)
  if (_rafId !== null) cancelAnimationFrame(_rafId)
  detach()
})

// Trigger viewport culling whenever the transform changes (RAF-throttled)
watch(transform, scheduleVisibleUpdate, { deep: true })

// Watch for interactive changes
watch(() => props.interactive, (val) => {
  if (val) attach()
  else detach()
})

const zoomToHotspot = (lotCode: string): boolean => {
  // Try matching by label (usually the code like L-01) or linkId (the UUID)
  const hs = props.plantMap.hotspots.find(h => h.label === lotCode || h.linkId === lotCode)
  if (!hs || !containerEl.value || !contentEl.value) return false

  const cw = containerEl.value.clientWidth
  const ch = containerEl.value.clientHeight
  
  // Use natural dimensions to ensure calculation is accurate regardless of current element size
  const iw = imgNaturalW.value
  const ih = imgNaturalH.value

  // We want the image to at least cover the container (no background gaps)
  const coverScale = Math.max(cw / iw, ch / ih)
  
  // Choose a high quality zoom level centered on the lot
  const targetScale = clampScale(Math.max(coverScale, coverScale * 3.5))

  // Center targetX, targetY in the container
  const targetX = hs.x * iw
  const targetY = hs.y * ih

  const newX = (cw / 2) - (targetX * targetScale)
  const newY = (ch / 2) - (targetY * targetScale)

  transform.value = {
    scale: targetScale,
    ...clampOffset(targetScale, newX, newY)
  }
  return true
}

const isInitializing = ref(true)

const zoomIn = () => {
  if (!props.interactive || !containerEl.value) return
  isInitializing.value = false
  const rect = containerEl.value.getBoundingClientRect()
  const cx = rect.width / 2
  const cy = rect.height / 2
  const currentS = transform.value.scale
  const newS = clampScale(currentS * 1.3)
  const ratio = newS / currentS
  const newX = cx - ratio * (cx - transform.value.x)
  const newY = cy - ratio * (cy - transform.value.y)
  
  transform.value = { 
    scale: newS,
    ...clampOffset(newS, newX, newY)
  }
}

const zoomOut = () => {
  if (!props.interactive || !containerEl.value) return
  isInitializing.value = false
  const rect = containerEl.value.getBoundingClientRect()
  const cx = rect.width / 2
  const cy = rect.height / 2
  const currentS = transform.value.scale
  const newS = clampScale(currentS / 1.3)
  const ratio = newS / currentS
  const newX = cx - ratio * (cx - transform.value.x)
  const newY = cy - ratio * (cy - transform.value.y)
  
  transform.value = {
    scale: newS,
    ...clampOffset(newS, newX, newY)
  }
}

const contentStyle = computed(() => ({
  transform: `translate(${transform.value.x}px, ${transform.value.y}px) scale(${transform.value.scale})`,
  transformOrigin: '0 0',
  transition: isInitializing.value ? 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'
}))

// ── Image loading ─────────────────────────────────────────
const imageLoaded = ref(false)
const imageError = ref(false)
const imgNaturalW = ref(props.plantMap.imageWidth ?? 1200)
const imgNaturalH = ref(props.plantMap.imageHeight ?? 800)

const onImageLoad = (e: Event) => {
  const img = e.target as HTMLImageElement
  imgNaturalW.value = img.naturalWidth || props.plantMap.imageWidth || 1200
  imgNaturalH.value = img.naturalHeight || props.plantMap.imageHeight || 800
  
  nextTick(() => {
    imageLoaded.value = true
    let focused = false
    if (props.focusLotCode) {
      focused = zoomToHotspot(props.focusLotCode)
    }

    if (!focused) {
      fitToContainer()
    }

    // Compute initial visible hotspots now that we know the image dimensions
    scheduleVisibleUpdate()

    // Allow interaction after initial zoom transition
    setTimeout(() => {
      isInitializing.value = false
    }, 900)
  })
}

// ── Labels ────────────────────────────────────────────────
const showLabels = computed(() => {
  if (props.hideLabels) return false
  // Auto-hide labels when zoomed out too much
  return transform.value.scale >= 0.6
})

// Scale pin radius inversely to keep consistent hit area
const pinRadiusForScale = computed(() =>
  Math.max(8, Math.min(24, 14 / transform.value.scale)),
)

// ── Popover ───────────────────────────────────────────────
const selectedHotspot = ref<PlantHotspot | null>(null)
const showBeacons = ref(true)
const hydratedHotspotIds = ref<Set<string>>(new Set())
const hoveredHotspotId = ref<string | null>(null)

const renderedVisibleHotspots = computed(() => {
  if (!hoveredHotspotId.value) return visibleHotspots.value
  const idx = visibleHotspots.value.findIndex((hs) => hs.id === hoveredHotspotId.value)
  if (idx === -1) return visibleHotspots.value
  const ordered = visibleHotspots.value.slice()
  const [hovered] = ordered.splice(idx, 1)
  if (!hovered) return visibleHotspots.value
  ordered.push(hovered)
  return ordered
})

const getHotspotViewportAnchor = (hotspot: PlantHotspot) => {
  if (!containerEl.value) return null
  const rect = containerEl.value.getBoundingClientRect()
  const { x, y, scale } = transform.value
  const anchorX = rect.left + (hotspot.x * imgNaturalW.value * scale) + x
  // Pin visual center is above the base dot; anchor the popover there to keep it close to the flag.
  const pinVisualOffset = (pinRadiusForScale.value * 2.5) * scale
  const anchorY = rect.top + (hotspot.y * imgNaturalH.value * scale) + y - pinVisualOffset
  return { x: anchorX, y: anchorY }
}

const setHoveredHotspot = (hotspot: PlantHotspot) => {
  hoveredHotspotId.value = hotspot.id
}

const clearHoveredHotspot = (hotspot: PlantHotspot) => {
  if (hoveredHotspotId.value === hotspot.id) {
    hoveredHotspotId.value = null
  }
}

const { getPublicHotspot } = usePublicPlantMap()

watch(showBeacons, (val) => {
  if (!val) {
    selectedHotspot.value = null
    hoveredHotspotId.value = null
  }
})

// Close popover when map is moved/zoomed
watch(() => transform.value, () => {
  if (selectedHotspot.value) {
    selectedHotspot.value = null
  }
}, { deep: true })

watch(
  () => visibleHotspots.value.map((hs) => hs.id),
  (ids) => {
    if (hoveredHotspotId.value && !ids.includes(hoveredHotspotId.value)) {
      hoveredHotspotId.value = null
    }
  },
)

const popoverAnchor = ref({ x: 0, y: 0 })

const openPopover = (event: MouseEvent | KeyboardEvent | PlantHotspot, hotspot?: PlantHotspot) => {
  const targetHotspot = hotspot || (event instanceof MouseEvent || event instanceof KeyboardEvent ? null : (event as PlantHotspot))

  if (targetHotspot) {
    if (targetHotspot.type === 'LOTE') {
       tracking.trackLotClick(targetHotspot.label || targetHotspot.title, targetHotspot.linkId || undefined)
    } else {
       tracking.trackClick(`Hotspot: ${targetHotspot.title}`, 'MAP_HOTSPOT')
    }
  }

  if (event instanceof MouseEvent || event instanceof KeyboardEvent) {
    // If it's a keyboard event, we might want to center it, or use fixed position
    if (event instanceof MouseEvent) {
      popoverAnchor.value = { x: event.clientX, y: event.clientY }
    } else {
      // Keyboard enter/space - fallback or try to get target rect
      const target = event.target as HTMLElement
      const rect = target?.getBoundingClientRect?.()
      if (rect) {
        popoverAnchor.value = { x: rect.left + rect.width / 2, y: rect.top }
      }
    }
    selectedHotspot.value = hotspot ?? null
  } else {
    // Fallback for direct calls
    selectedHotspot.value = event
  }

  // Lazy-load description + metaJson on first open.
  // Public list responses may return undefined or null for description/metaJson.
  if (
    targetHotspot
    && props.plantMap.projectId
    && !hydratedHotspotIds.value.has(targetHotspot.id)
  ) {
    getPublicHotspot(props.plantMap.projectId, targetHotspot.id)
      .then(detail => {
        hydratedHotspotIds.value.add(targetHotspot.id)
        // Merge only if the same hotspot is still open
        if (detail && selectedHotspot.value?.id === targetHotspot.id) {
          selectedHotspot.value = { ...selectedHotspot.value, ...detail }
        }
      })
      .catch(() => {})
  }
}

const handlePopoverClose = () => {
  selectedHotspot.value = null
}

// ── Close popover on outside click ────────────────────────
const handleContainerClick = () => {
  selectedHotspot.value = null
  hoveredHotspotId.value = null
}

</script>

<style scoped>
.plant-map-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
  overflow: hidden;
  background: #1a1a2e;
  border-radius: 12px;
  user-select: none;
}

.plant-map-viewer:fullscreen {
  border-radius: 0;
  width: 100vw;
  height: 100vh;
}
:fullscreen :deep(.hs-popover) {
  z-index: 2000;
}

.plant-map-viewer__loading,
.plant-map-viewer__error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #9ca3af;
  font-size: 14px;
  z-index: 2;
}

.plant-map-viewer__content {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}

.plant-map-viewer__image {
  display: block;
  max-width: none;
  -webkit-user-drag: none;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: high-quality;
  transform: translateZ(0);
}

.plant-map-viewer__overlay {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: all;
}

/* Controls */
.plant-map-viewer__controls {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}

.plant-map-viewer__btn {
  width: 32px;
  height: 32px;
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transition: background 0.15s;
}
.plant-map-viewer__btn:hover { background: white; }

/* Legend */
.plant-map-viewer__legend {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #e5e7eb;
  font-weight: 500;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
  border: 1.5px solid rgba(255,255,255,0.5);
}

/* Loading spinner (reuse global if available) */
.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255,255,255,0.15);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
