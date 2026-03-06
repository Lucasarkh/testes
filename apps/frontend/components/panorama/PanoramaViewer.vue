<template>
  <div class="panorama-viewer" ref="containerRef" @wheel.prevent="onWheel">
    <!-- Image container with zoom/pan (FLAT projection) -->
    <div
      v-if="panorama.projection === 'FLAT'"
      class="panorama-content"
      ref="contentRef"
      :style="contentStyle"
      @mousedown.prevent="onPanStart"
      @touchstart.prevent="onTouchStart"
    >
      <!-- Active snapshot image -->
      <img
        v-if="activeSnapshot"
        :src="activeSnapshot.imageUrl"
        class="panorama-image"
        draggable="false"
        @load="onImageLoad"
        decoding="async"
      />

      <!-- Beacons layer -->
      <div v-if="showBeacons" class="panorama-beacons-layer">
        <PanoramaBeaconPin
          v-for="b in panorama.beacons"
          :key="b.id"
          :beacon="b"
          :container-width="imgW"
          :container-height="imgH"
          @click="handleBeaconClick"
        />
      </div>
    </div>

    <!-- 360 Viewer (EQUIRECTANGULAR projection) -->
    <div
      v-else
      class="panorama-360-container"
      ref="panorama360Ref"
    >
      <div :id="`panorama-360-view-${panorama.id}`" style="width: 100%; height: 100%;"></div>
      <div v-if="!activeSnapshot" class="panorama-360-placeholder">
        Aguardando imagem 360°...
      </div>
    </div>

    <!-- UI Overlay -->
    <div class="panorama-ui-overlay">
      <!-- Top left: logo area + title -->
      <div class="panorama-top-left">
        <div class="panorama-title-box">
          <span class="panorama-view-label">{{ panorama.title }}</span>
          <span v-if="activeSnapshot" class="panorama-date-label">{{ activeSnapshot.label }}</span>
        </div>
      </div>

      <!-- Top right: buttons -->
      <div class="panorama-top-right">
        <button
          class="panorama-ui-btn"
          title="Alternar Tela Cheia"
          @click="toggleFullscreen"
        >
          {{ isFullscreen ? '🗗 Sair Fullscreen' : '🗖 Tela Cheia' }}
        </button>
      </div>

      <!-- Beacon details -->
      <div
        v-if="props.showBeaconInfo && selectedBeacon"
        class="panorama-beacon-details"
        role="dialog"
        :aria-label="`Detalhes: ${selectedBeacon.title}`"
      >
        <button class="panorama-beacon-details__close" aria-label="Fechar" @click="selectedBeacon = null">
          ✕
        </button>
        <div class="panorama-beacon-details__title">{{ selectedBeacon.title }}</div>
        <p v-if="selectedBeacon.description" class="panorama-beacon-details__description">
          {{ selectedBeacon.description }}
        </p>
      </div>

      <!-- Bottom center: timeline -->
      <div v-if="panorama.snapshots.length > 1" class="panorama-bottom-center">
        <PanoramaTimeline
          :snapshots="panorama.snapshots"
          :active-snapshot-id="activeSnapshot?.id"
          @select="activeSnapshot = $event"
        />
      </div>

      <!-- Bottom right: implantation toggle -->
      <div class="panorama-bottom-right">
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useHead } from '#imports'
import type { Panorama, PanoramaSnapshot, PanoramaBeacon } from '~/composables/panorama/types'
import PanoramaBeaconPin from './PanoramaBeaconPin.vue'
import PanoramaTimeline from './PanoramaTimeline.vue'

const props = withDefaults(defineProps<{
  panorama: Panorama
  editable?: boolean // can clicking create a beacon?
  activeSnapshotId?: string | null // externally control the active snapshot
  showBeaconInfo?: boolean
}>(), {
  editable: false,
  activeSnapshotId: null,
  showBeaconInfo: true,
})

const emit = defineEmits<{
  beaconClick: [beacon: PanoramaBeacon]
  viewClick: [pos: { x: number; y: number }]
}>()

// ── State ────────────────────────────────────────────

const containerRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const panorama360Ref = ref<HTMLElement | null>(null)
let pviewer: any = null

const scale = ref(1)

const panX = ref(0)
const panY = ref(0)
const imgW = ref(1200)
const imgH = ref(800)

const showBeacons = ref(true)
const isFullscreen = ref(false)
const selectedBeacon = ref<PanoramaBeacon | null>(null)

const activeSnapshot = ref<PanoramaSnapshot | null>(null)

// ── Fullscreen ──────────────────────────────────────

async function toggleFullscreen() {
  if (!containerRef.value) return
  if (!document.fullscreenElement) {
    try {
      await containerRef.value.requestFullscreen()
      isFullscreen.value = true
    } catch (err) {
      console.error('Fullscreen error', err)
    }
  } else {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
        isFullscreen.value = false
      }
    } catch (err) {
      console.error('Exit fullscreen error', err)
    }
  }
}

// ── Pannellum Logic ─────────────────────────────────

useHead({
  link: [
    { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css' }
  ],
  script: [
    { src: 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js' }
  ]
})

function initPannellum() {
  if (typeof window === 'undefined' || !(window as any).pannellum) return

  if (pviewer) {
    try {
      pviewer.destroy()
    } catch (e) {}
    pviewer = null
  }

  if (!activeSnapshot.value || props.panorama.projection !== 'EQUIRECTANGULAR') return

  const elementId = `panorama-360-view-${props.panorama.id}`
  const el = document.getElementById(elementId)
  if (!el) return

  pviewer = (window as any).pannellum.viewer(elementId, {
    type: 'equirectangular',
    panorama: activeSnapshot.value.imageUrl + (activeSnapshot.value.imageUrl.includes('?') ? '&' : '?') + 'nocache=' + Date.now(),
    autoLoad: true,
    showControls: false,
    compass: false,
    autoRotate: -2, // move slowly
    autoRotateInactivityDelay: 3000, // wait 3s after user stops interacting
    hotSpots: props.panorama.beacons.map(b => ({
      pitch: (b.y - 0.5) * -180,
      yaw: (b.x - 0.5) * 360,
      cssClass: 'custom-hotspot',
      createTooltipFunc: (hotSpotDiv: HTMLElement) => {
        hotSpotDiv.classList.add('custom-hotspot');
        hotSpotDiv.classList.add(`beacon-style--${b.style}`);
        
        const stem = document.createElement('div');
        stem.className = 'beacon-stem';
        
        const label = document.createElement('div');
        label.className = 'beacon-label';
        
        const text = document.createElement('span');
        text.className = 'beacon-text';
        text.innerText = b.title;
        
        label.appendChild(text);
        hotSpotDiv.appendChild(stem);
        hotSpotDiv.appendChild(label);
      },
      clickHandlerFunc: () => handleBeaconClick(b)
    }))
  })

  // Listener for beacon placement in 360 view
  const viewerContainer = pviewer.getContainer()
  viewerContainer.addEventListener('mousedown', (e: MouseEvent) => {
    if (!props.editable) return
    if (e.button !== 0) return
    
    const startX = e.clientX
    const startY = e.clientY
    
    const onUp = (upEv: MouseEvent) => {
      viewerContainer.removeEventListener('mouseup', onUp)
      
      const dx = Math.abs(upEv.clientX - startX)
      const dy = Math.abs(upEv.clientY - startY)
      if (dx < 10 && dy < 10) {
        const [pitch, yaw] = pviewer.mouseEventToCoords(upEv)
        emit('viewClick', {
          x: (yaw / 360) + 0.5,
          y: (pitch / -180) + 0.5
        })
      }
    }
    viewerContainer.addEventListener('mouseup', onUp)
  })
}

watch([activeSnapshot, () => props.panorama.projection, () => props.panorama.beacons.length, () => props.editable], () => {
  if (props.panorama.projection === 'EQUIRECTANGULAR') {
    setTimeout(initPannellum, 500)
  }
})

// Pan state
let isPanning = false
let panStartX = 0
let panStartY = 0
let panOriginX = 0
let panOriginY = 0

// Pinch state
let lastPinchDist = 0

// ── Computed ─────────────────────────────────────────

const contentStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0',
  width: `${imgW.value}px`,
  height: `${imgH.value}px`,
}))

const sunLine = computed(() => {
  const rad = (props.panorama.sunPathAngleDeg * Math.PI) / 180
  const cx = imgW.value / 2
  const cy = imgH.value / 2
  const halfDiag = Math.sqrt(imgW.value ** 2 + imgH.value ** 2) / 2
  return {
    x1: cx + halfDiag * Math.cos(rad),
    y1: cy - halfDiag * Math.sin(rad),
    x2: cx - halfDiag * Math.cos(rad),
    y2: cy + halfDiag * Math.sin(rad),
  }
})

// ── Init ─────────────────────────────────────────────

watch(
  () => props.panorama.snapshots,
  (snaps) => {
    // 1. If currently selected snapshot no longer exists, clear it
    if (activeSnapshot.value && !snaps.find(s => s.id === activeSnapshot.value?.id)) {
      activeSnapshot.value = null
    }

    // 2. If we have an external override, use it
    if (props.activeSnapshotId) {
      const found = snaps.find(s => s.id === props.activeSnapshotId)
      if (found) {
        activeSnapshot.value = found
        return
      }
    }

    // 3. Fallback: if no active snapshot or it was just cleared, pick the last one
    if (snaps.length && (!activeSnapshot.value || !snaps.find(s => s.id === activeSnapshot.value?.id))) {
      activeSnapshot.value = snaps[snaps.length - 1] ?? null
    }
  },
  { immediate: true, deep: true },
)

// Also watch for direct prop changes to activeSnapshotId
watch(
  () => props.activeSnapshotId,
  (newId) => {
    if (newId) {
      const found = props.panorama.snapshots.find(s => s.id === newId)
      if (found) activeSnapshot.value = found
    } else {
      activeSnapshot.value = null
    }
  },
)

onMounted(() => {
  window.addEventListener('mousemove', onPanMove)
  window.addEventListener('mouseup', onPanEnd)
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd)

  document.addEventListener('fullscreenchange', onFullscreenChange)

  if (props.panorama.projection === 'EQUIRECTANGULAR') {
    setTimeout(initPannellum, 1000)
  }

  // Fit image to container on mount
  resetView()
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onPanMove)
  window.removeEventListener('mouseup', onPanEnd)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  
  if (pviewer) {
    pviewer.destroy()
  }
})

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
  if (pviewer) {
    // Delay slightly to let the browser adjust the container size
    setTimeout(() => pviewer.resize(), 100)
  }
}

// ── Image load ───────────────────────────────────────

function onImageLoad(e: Event) {
  const img = e.target as HTMLImageElement
  imgW.value = img.naturalWidth
  imgH.value = img.naturalHeight
  resetView()
}

// ── Zoom ─────────────────────────────────────────────

function clampScale(s: number) {
  return Math.min(Math.max(s, 0.3), 5)
}

function onWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newScale = clampScale(scale.value + delta)

  // Zoom toward cursor position
  const rect = containerRef.value!.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  const ratio = newScale / scale.value
  panX.value = mx - (mx - panX.value) * ratio
  panY.value = my - (my - panY.value) * ratio
  scale.value = newScale
}

function zoomIn() {
  const newScale = clampScale(scale.value + 0.2)
  const rect = containerRef.value!.getBoundingClientRect()
  const cx = rect.width / 2
  const cy = rect.height / 2
  const ratio = newScale / scale.value
  panX.value = cx - (cx - panX.value) * ratio
  panY.value = cy - (cy - panY.value) * ratio
  scale.value = newScale
}

function zoomOut() {
  const newScale = clampScale(scale.value - 0.2)
  const rect = containerRef.value!.getBoundingClientRect()
  const cx = rect.width / 2
  const cy = rect.height / 2
  const ratio = newScale / scale.value
  panX.value = cx - (cx - panX.value) * ratio
  panY.value = cy - (cy - panY.value) * ratio
  scale.value = newScale
}

function resetView() {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const wR = rect.width / imgW.value
  const hR = rect.height / imgH.value
  const fit = Math.min(wR, hR, 1)
  scale.value = fit
  panX.value = (rect.width - imgW.value * fit) / 2
  panY.value = (rect.height - imgH.value * fit) / 2
}

// ── Pan ──────────────────────────────────────────────

function onPanStart(e: MouseEvent) {
  isPanning = true
  panStartX = e.clientX
  panStartY = e.clientY
  panOriginX = panX.value
  panOriginY = panY.value
}

function onPanMove(e: MouseEvent) {
  if (!isPanning) return
  panX.value = panOriginX + (e.clientX - panStartX)
  panY.value = panOriginY + (e.clientY - panStartY)
}

function onPanEnd() {
  isPanning = false
}

// ── Touch ────────────────────────────────────────────

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    isPanning = true
    panStartX = e.touches[0]!.clientX
    panStartY = e.touches[0]!.clientY
    panOriginX = panX.value
    panOriginY = panY.value
  } else if (e.touches.length === 2) {
    lastPinchDist = pinchDist(e.touches)
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 1 && isPanning) {
    e.preventDefault()
    panX.value = panOriginX + (e.touches[0]!.clientX - panStartX)
    panY.value = panOriginY + (e.touches[0]!.clientY - panStartY)
  } else if (e.touches.length === 2) {
    e.preventDefault()
    const dist = pinchDist(e.touches)
    const delta = (dist - lastPinchDist) * 0.005
    scale.value = clampScale(scale.value + delta)
    lastPinchDist = dist
  }
}

function onTouchEnd() {
  isPanning = false
  lastPinchDist = 0
}

function pinchDist(touches: TouchList) {
  const dx = touches[0]!.clientX - touches[1]!.clientX
  const dy = touches[0]!.clientY - touches[1]!.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

// ── Beacon click ─────────────────────────────────────

function handleBeaconClick(beacon: PanoramaBeacon) {
  if (props.showBeaconInfo) {
    selectedBeacon.value = beacon
  }
  emit('beaconClick', beacon)
}
</script>

<style scoped>
.panorama-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #111;
  border-radius: var(--radius-lg, 12px);
  user-select: none;
}

.panorama-content {
  position: absolute;
  top: 0;
  left: 0;
  cursor: grab;
  will-change: transform;
}

.panorama-360-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #001;
}

.panorama-360-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  z-index: 10;
}

.panorama-content:active {
  cursor: grabbing;
}

.panorama-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.panorama-implantation {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  opacity: 0.65;
  mix-blend-mode: multiply;
}

.panorama-beacons-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.panorama-sun-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* ─── UI Overlay ──────────────────────────────────── */

.panorama-ui-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 50;
}

.panorama-ui-overlay > * {
  pointer-events: auto;
}

.panorama-top-left {
  position: absolute;
  top: 16px;
  left: 16px;
}

.panorama-title-box {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.panorama-view-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(255,255,255,0.7);
}

.panorama-date-label {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
}

.panorama-top-right {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
}

.panorama-beacon-details {
  position: absolute;
  left: 16px;
  bottom: 72px;
  max-width: min(380px, calc(100% - 32px));
  background: rgba(10, 16, 30, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 12px 14px;
  color: #f8fafc;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px);
}

.panorama-beacon-details__close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}

.panorama-beacon-details__close:hover {
  background: rgba(255, 255, 255, 0.28);
}

.panorama-beacon-details__title {
  font-size: 0.95rem;
  font-weight: 700;
  margin-right: 24px;
}

.panorama-beacon-details__description {
  margin: 8px 0 0;
  font-size: 0.84rem;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.9);
}

.panorama-bottom-left {
  position: absolute;
  bottom: 16px;
  left: 16px;
}

.panorama-bottom-center {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
}

.panorama-bottom-right {
  position: absolute;
  bottom: 16px;
  right: 16px;
}

/* ─── Sun Compass ─────────────────────────────────── */

.sun-compass {
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: 10px 16px;
  color: #FFD700;
}

.sun-compass-labels {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.sun-compass-ns {
  color: rgba(255,255,255,0.6);
  font-size: 0.7rem;
  text-align: center;
  line-height: 1.1;
}

/* ─── UI Buttons ──────────────────────────────────── */

.panorama-ui-btn {
  padding: 8px 18px;
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 8px;
  background: rgba(8, 19, 38, 0.9);
  color: #f8fafc;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: all 0.15s ease;
  white-space: nowrap;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.25);
}

.panorama-ui-btn:hover {
  background: rgba(18, 39, 72, 0.95);
  border-color: rgba(255, 255, 255, 0.55);
  transform: translateY(-1px);
}

/* ─── Zoom Controls ───────────────────────────────── */

.panorama-zoom-controls {
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panorama-zoom-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: rgba(0,0,0,0.45);
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
  transition: background 0.15s ease;
}

.panorama-zoom-btn:hover {
  background: rgba(0,0,0,0.7);
}

.panorama-zoom-btn--reset {
  font-size: 0.9rem;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .panorama-top-left {
    top: 12px;
    left: 12px;
    right: 92px;
  }

  .panorama-view-label {
    font-size: 0.72rem;
  }

  .panorama-date-label {
    font-size: 0.88rem;
  }

  .panorama-top-right {
    top: 12px;
    right: 12px;
  }

  .panorama-ui-btn {
    padding: 7px 10px;
    font-size: 0.72rem;
    border-radius: 10px;
  }

  .panorama-bottom-center {
    left: 12px;
    right: 12px;
    bottom: 12px;
    transform: none;
    display: flex;
    justify-content: center;
  }

  .panorama-beacon-details {
    left: 12px;
    right: 12px;
    bottom: 64px;
    max-width: none;
  }
}
</style>
