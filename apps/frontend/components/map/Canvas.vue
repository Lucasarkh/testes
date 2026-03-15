<template>
  <div
    ref="containerRef"
    class="map-canvas-container"
    :class="cursorClass"
    tabindex="0"
    @contextmenu.prevent
    @keydown="onKeyDown"
    @keyup="onKeyUp"
  >
    <v-stage
      ref="konvaStage"
      :config="stageConfig"
      @wheel="onWheel"
      @mousedown="onStageMouseDown"
      @mousemove="onStageMouseMove"
      @mouseup="onStageMouseUp"
      @click="onStageClick"
    >
      <!-- Background layer -->
      <v-layer>
        <v-line v-for="(line, i) in gridLines" :key="'g-' + i" :config="line" />
      </v-layer>

      <!-- Elements layer -->
      <v-layer>
        <template v-for="el in elements" :key="el.id">
          <v-group
            :config="groupConfig(el)"
            @click="(e: any) => onElementClick(e, el)"
            @dragstart="(e: any) => onDragStart(e, el)"
            @dragmove="(e: any) => onDragMove(e, el)"
            @dragend="(e: any) => onDragEnd(e, el)"
          >
            <!-- Invisible hit area so clicks/drags are detected -->
            <v-rect :config="hitRect(el)" />

            <!-- Tile visual shapes (all listening:false) -->
            <template v-for="(shape, si) in getShapes(el)" :key="si">
              <v-rect v-if="shape.type === 'rect'" :config="shape.config" />
              <v-circle v-if="shape.type === 'circle'" :config="shape.config" />
              <v-line v-if="shape.type === 'line'" :config="shape.config" />
              <v-arc v-if="shape.type === 'arc'" :config="shape.config" />
              <v-text v-if="shape.type === 'text'" :config="shape.config" />
              <v-ellipse v-if="shape.type === 'ellipse'" :config="shape.config" />
              <v-ring v-if="shape.type === 'ring'" :config="shape.config" />
            </template>

            <!-- Label text (only for LABEL tiles or elements with showLabel) -->
            <v-text v-if="el.type === 'LABEL' || el.metaJson?.showLabel" :config="labelTextConfig(el)" />

            <!-- Multi-select highlight -->
            <v-rect
              v-if="selectedIds.has(el.id!) && el.id !== selectedId"
              :config="multiSelectHighlight(el)"
            />
          </v-group>
        </template>

        <!-- Rubber-band selection rectangle -->
        <v-rect v-if="rubberBand" :config="rubberBandConfig" />

        <!-- Ghost preview -->
        <v-group v-if="ghostVisible" :config="ghostGroupConfig">
          <template v-for="(shape, si) in ghostShapes" :key="'ghost-' + si">
            <v-rect v-if="shape.type === 'rect'" :config="{ ...shape.config, opacity: (shape.config.opacity ?? 1) * 0.45 }" />
            <v-circle v-if="shape.type === 'circle'" :config="{ ...shape.config, opacity: (shape.config.opacity ?? 1) * 0.45 }" />
            <v-line v-if="shape.type === 'line'" :config="{ ...shape.config, opacity: (shape.config.opacity ?? 1) * 0.45 }" />
            <v-arc v-if="shape.type === 'arc'" :config="{ ...shape.config, opacity: (shape.config.opacity ?? 1) * 0.45 }" />
            <v-text v-if="shape.type === 'text'" :config="{ ...shape.config, opacity: (shape.config.opacity ?? 1) * 0.45 }" />
            <v-ellipse v-if="shape.type === 'ellipse'" :config="{ ...shape.config, opacity: (shape.config.opacity ?? 1) * 0.45 }" />
            <v-ring v-if="shape.type === 'ring'" :config="{ ...shape.config, opacity: (shape.config.opacity ?? 1) * 0.45 }" />
          </template>
        </v-group>
      </v-layer>
    </v-stage>

    <!-- Zoom controls -->
    <div class="map-zoom-controls">
      <button class="zoom-btn" @click="$emit('zoomIn')" title="Zoom in">+</button>
      <span class="zoom-level">{{ Math.round(stageScale * 100) }}%</span>
      <button class="zoom-btn" @click="$emit('zoomOut')" title="Zoom out">−</button>
      <button class="zoom-btn" @click="$emit('resetView')" title="Reset">⌂</button>
    </div>

    <!-- Coords indicator -->
    <div class="map-coords">
      {{ Math.round(cursorPos.x) }},&nbsp;{{ Math.round(cursorPos.y) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import Konva from 'konva'
import type { MapElementData, EditorMode, Point, TileRenderShape } from '../../composables/map/types'
import { getTileById } from '../../composables/map/types'
import { renderTile } from '../../composables/map/tiles'

/* ── Props & Emits ──────────────────────── */
const props = defineProps<{
  elements: MapElementData[]
  selectedId: string | null
  selectedIds: Set<string>
  editorMode: EditorMode
  stageScale: number
  stagePos: Point
  activeTileId: string | null
  placementRotation: number
  ghostPos: Point | null
  cellSize: number
}>()

const emit = defineEmits<{
  select: [id: string | null, additive: boolean]
  selectRect: [rect: { x: number; y: number; w: number; h: number }]
  elementDrag: [id: string, geometryJson: any]
  groupDrag: [ids: string[], dx: number, dy: number]
  canvasClick: [pos: Point]
  elementClick: [id: string, additive: boolean]
  updateScale: [scale: number]
  updatePos: [pos: Point]
  updateGhostPos: [pos: Point]
  clearGhost: []
  zoomIn: []
  zoomOut: []
  resetView: []
  requestPan: [active: boolean]
}>()

/* ── Local state ─────────────────────────── */
const containerRef = ref<HTMLElement | null>(null)
const konvaStage = ref<any>(null)
const containerW = ref(800)
const containerH = ref(600)
const cursorPos = ref<Point>({ x: 0, y: 0 })
const bgImage = ref<HTMLImageElement | null>(null)
const spaceHeld = ref(false)

/* Panning */
let isPanning = false
let panPointerStart = { x: 0, y: 0 }
let panStageStart = { x: 0, y: 0 }

/* Group-drag bookkeeping */
let dragGroupStartPositions: Map<string, Point> = new Map()
let dragAnchorStart: Point = { x: 0, y: 0 }

/* Rubber-band selection */
const rubberBand = ref<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
let isRubberBanding = false

/* ── Computed cursor class ───────────────── */
const effectiveMode = computed<EditorMode>(() => spaceHeld.value ? 'pan' : props.editorMode)
const cursorClass = computed(() => {
  const m = effectiveMode.value
  if (m === 'pan' || isPanning) return 'cursor-grab'
  if (m === 'select') return 'cursor-default'
  if (m === 'erase') return 'cursor-eraser'
  return 'cursor-crosshair'
})

/* ── Stage config ───────────────────────── */
const stageConfig = computed(() => ({
  width: containerW.value,
  height: containerH.value,
  scaleX: props.stageScale,
  scaleY: props.stageScale,
  x: props.stagePos.x,
  y: props.stagePos.y,
  draggable: false, // we handle panning manually
}))

/* ── Grid ────────────────────────────────── */
const gridLines = computed(() => {
  const lines: any[] = []
  const gs = props.cellSize
  const w = containerW.value / props.stageScale + Math.abs(props.stagePos.x / props.stageScale)
  const h = containerH.value / props.stageScale + Math.abs(props.stagePos.y / props.stageScale)
  const startX = -Math.ceil(props.stagePos.x / props.stageScale / gs) * gs
  const startY = -Math.ceil(props.stagePos.y / props.stageScale / gs) * gs

  for (let x = startX; x < startX + w + gs; x += gs) {
    lines.push({
      points: [x, startY - gs, x, startY + h + gs],
      stroke: '#e2e8f0', strokeWidth: 0.5 / props.stageScale, listening: false,
    })
  }
  for (let y = startY; y < startY + h + gs; y += gs) {
    lines.push({
      points: [startX - gs, y, startX + w + gs, y],
      stroke: '#e2e8f0', strokeWidth: 0.5 / props.stageScale, listening: false,
    })
  }
  return lines
})

/* ── Tile rendering ──────────────────────── */
function getShapes(el: MapElementData): TileRenderShape[] {
  const tileId = el.metaJson?.tileId
  const isSel = el.id === props.selectedId || props.selectedIds.has(el.id!)
  const g = el.geometryJson

  if (tileId) {
    const tile = getTileById(tileId)
    if (tile) {
      const label = el.type === 'LOT' ? (el.code || el.name || '') : ''
      const status = el.metaJson?.lotStatus
      return renderTile(tileId, props.cellSize, isSel, label, status)
    }
  }
  return renderLegacyElement(el, isSel)
}

function renderLegacyElement(el: MapElementData, isSelected: boolean): TileRenderShape[] {
  const g = el.geometryJson
  const s = el.styleJson ?? {}
  const shapes: TileRenderShape[] = []

  if (el.geometryType === 'RECT' && g.width && g.height) {
    shapes.push({
      type: 'rect',
      config: {
        x: 0, y: 0, width: g.width, height: g.height,
        fill: s.fill || '#e2e8f0', stroke: isSelected ? '#2563eb' : (s.stroke || '#94a3b8'),
        strokeWidth: s.strokeWidth || 1, cornerRadius: 2, listening: false,
      },
    })
  } else if (el.geometryType === 'CIRCLE' && g.radius) {
    shapes.push({
      type: 'circle',
      config: {
        x: g.radius, y: g.radius, radius: g.radius,
        fill: s.fill || '#e2e8f0', stroke: isSelected ? '#2563eb' : (s.stroke || '#94a3b8'),
        strokeWidth: s.strokeWidth || 1, listening: false,
      },
    })
  } else if ((el.geometryType === 'POLYGON' || el.geometryType === 'POLYLINE') && g.points?.length) {
    const pts = g.points.map((v: number, i: number) => i % 2 === 0 ? v - (g.x || 0) : v - (g.y || 0))
    shapes.push({
      type: 'line',
      config: {
        points: pts, closed: el.geometryType === 'POLYGON',
        fill: el.geometryType === 'POLYGON' ? (s.fill || '#e2e8f033') : undefined,
        stroke: isSelected ? '#2563eb' : (s.stroke || '#94a3b8'),
        strokeWidth: s.strokeWidth || 1, listening: false,
      },
    })
  }

  if (isSelected) {
    const w = g.width ?? (g.radius ? g.radius * 2 : 50)
    const h = g.height ?? (g.radius ? g.radius * 2 : 50)
    shapes.push({
      type: 'rect',
      config: {
        x: -2, y: -2, width: w + 4, height: h + 4,
        fill: 'transparent', stroke: '#2563eb', strokeWidth: 2, dash: [6, 3], cornerRadius: 3, listening: false,
      },
    })
  }
  return shapes
}

/* ── Hit area (transparent, listening=true) ─ */
function hitRect(el: MapElementData) {
  const g = el.geometryJson
  return {
    x: 0, y: 0,
    width: g.width ?? 50,
    height: g.height ?? 50,
    fill: 'transparent',
    stroke: 'transparent',
    listening: true,
  }
}

/* ── Group config for each element ───────── */
function groupConfig(el: MapElementData) {
  const g = el.geometryJson
  const mode = effectiveMode.value
  return {
    x: g.x ?? 0,
    y: g.y ?? 0,
    rotation: g.rotation ?? 0,
    draggable: mode === 'select',
    name: el.id,
  }
}

/* ── Multi-select highlight ──────────────── */
function multiSelectHighlight(el: MapElementData) {
  const g = el.geometryJson
  return {
    x: -2, y: -2,
    width: (g.width ?? 50) + 4,
    height: (g.height ?? 50) + 4,
    fill: 'transparent',
    stroke: '#6366f1',
    strokeWidth: 1.5,
    dash: [4, 3],
    cornerRadius: 3,
    listening: false,
  }
}

/* ── Label config (only for LABEL type) ──── */
function labelTextConfig(el: MapElementData) {
  const s = el.styleJson ?? {}
  const g = el.geometryJson
  return {
    x: 4, y: (g.height ?? 20) / 2 - 7,
    text: el.name || 'Rótulo',
    fontSize: s.fontSize ?? 14,
    fontFamily: s.fontFamily ?? 'Inter',
    fill: s.fontColor ?? '#1e293b',
    listening: false,
  }
}

/* ── Ghost preview ───────────────────────── */
const ghostVisible = computed(() =>
  props.editorMode === 'place' && props.activeTileId && props.ghostPos,
)
const ghostGroupConfig = computed(() => {
  if (!props.ghostPos) return { x: 0, y: 0 }
  return { x: props.ghostPos.x, y: props.ghostPos.y, rotation: props.placementRotation, listening: false, opacity: 0.55 }
})
const ghostShapes = computed<TileRenderShape[]>(() => {
  if (!props.activeTileId) return []
  return renderTile(props.activeTileId, props.cellSize, false)
})

/* ── Rubber-band config ──────────────────── */
const rubberBandConfig = computed(() => {
  if (!rubberBand.value) return {}
  const r = rubberBand.value
  return {
    x: Math.min(r.x1, r.x2),
    y: Math.min(r.y1, r.y2),
    width: Math.abs(r.x2 - r.x1),
    height: Math.abs(r.y2 - r.y1),
    fill: 'rgba(59,130,246,0.08)',
    stroke: '#3b82f6',
    strokeWidth: 1,
    dash: [4, 3],
    listening: false,
  }
})

/* ── Pointer helper ──────────────────────── */
function getPointerPos(): Point {
  const stage = konvaStage.value?.getNode() as Konva.Stage | undefined
  if (!stage) return { x: 0, y: 0 }
  const ptr = stage.getPointerPosition()
  if (!ptr) return { x: 0, y: 0 }
  const transform = stage.getAbsoluteTransform().copy().invert()
  return transform.point(ptr)
}

function getRawPointerPos(): Point {
  const stage = konvaStage.value?.getNode() as Konva.Stage | undefined
  if (!stage) return { x: 0, y: 0 }
  return stage.getPointerPosition() ?? { x: 0, y: 0 }
}

/* ── Keyboard: spacebar hold for pan ─────── */
function onKeyDown(e: KeyboardEvent) {
  if (e.code === 'Space' && !spaceHeld.value) {
    spaceHeld.value = true
    e.preventDefault()
  }
}
function onKeyUp(e: KeyboardEvent) {
  if (e.code === 'Space') {
    spaceHeld.value = false
    isPanning = false
    e.preventDefault()
  }
}

/* ── Mouse down ──────────────────────────── */
function onStageMouseDown(e: any) {
  const evt = e.evt as MouseEvent
  const mode = effectiveMode.value

  // Middle-mouse or pan-mode or spacebar: start pan
  if (evt.button === 1 || (evt.button === 0 && mode === 'pan')) {
    isPanning = true
    const raw = getRawPointerPos()
    panPointerStart = { ...raw }
    panStageStart = { ...props.stagePos }
    evt.preventDefault()
    return
  }

  // In select mode, left-click on empty space: start rubber-band
  if (evt.button === 0 && mode === 'select') {
    const target = e.target
    const stage = konvaStage.value?.getNode()
    // only if we clicked the stage background (layer rect) — not an element
    if (target === stage || target?.getClassName?.() === 'Layer' || target?.getClassName?.() === 'Rect' && target?.getParent?.() === stage?.findOne?.('Layer')) {
      const pos = getPointerPos()
      rubberBand.value = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y }
      isRubberBanding = true
    }
  }
}

/* ── Mouse move ──────────────────────────── */
function onStageMouseMove() {
  const pos = getPointerPos()
  cursorPos.value = pos

  if (props.editorMode === 'place' && props.activeTileId && !spaceHeld.value) {
    emit('updateGhostPos', pos)
  }

  if (isPanning) {
    const raw = getRawPointerPos()
    emit('updatePos', {
      x: panStageStart.x + (raw.x - panPointerStart.x),
      y: panStageStart.y + (raw.y - panPointerStart.y),
    })
    return
  }

  if (isRubberBanding && rubberBand.value) {
    rubberBand.value = { ...rubberBand.value, x2: pos.x, y2: pos.y }
  }
}

/* ── Mouse up ────────────────────────────── */
function onStageMouseUp(e: any) {
  if (isPanning) {
    isPanning = false
    return
  }

  if (isRubberBanding && rubberBand.value) {
    isRubberBanding = false
    const r = rubberBand.value
    const x = Math.min(r.x1, r.x2)
    const y = Math.min(r.y1, r.y2)
    const w = Math.abs(r.x2 - r.x1)
    const h = Math.abs(r.y2 - r.y1)
    if (w > 5 || h > 5) {
      emit('selectRect', { x, y, w, h })
    }
    rubberBand.value = null
  }
}

/* ── Wheel zoom ──────────────────────────── */
function onWheel(e: any) {
  e.evt.preventDefault()
  const scaleBy = 1.08
  const stage = konvaStage.value?.getNode() as Konva.Stage
  if (!stage) return
  const oldScale = props.stageScale
  const pointer = stage.getPointerPosition()!
  const mousePointTo = {
    x: (pointer.x - props.stagePos.x) / oldScale,
    y: (pointer.y - props.stagePos.y) / oldScale,
  }
  const direction = e.evt.deltaY > 0 ? -1 : 1
  const newScale = Math.max(0.05, Math.min(10, direction > 0 ? oldScale * scaleBy : oldScale / scaleBy))
  emit('updateScale', newScale)
  emit('updatePos', {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  })
}

/* ── Stage click (fires AFTER mousedown/mouseup) */
function onStageClick(e: any) {
  if (isPanning) return
  const mode = effectiveMode.value
  const pos = getPointerPos()

  if (mode === 'place') {
    emit('canvasClick', pos)
    return
  }
  if (mode === 'erase') {
    emit('canvasClick', pos)
    return
  }

  // If click on empty space in select mode → deselect (only if not rubber-band)
  if (mode === 'select' && !isRubberBanding) {
    const target = e.target
    const stageNode = konvaStage.value?.getNode()
    // Check that click was on background, not on a group child
    const isBackground = target === stageNode || target?.getClassName?.() === 'Layer'
    if (isBackground) {
      const additive = e.evt?.ctrlKey || e.evt?.metaKey || e.evt?.shiftKey
      if (!additive) emit('select', null, false)
    }
  }
}

/* ── Element click ───────────────────────── */
function onElementClick(e: any, el: MapElementData) {
  if (isPanning || isRubberBanding) return
  e.cancelBubble = true
  const additive = e.evt?.ctrlKey || e.evt?.metaKey || e.evt?.shiftKey
  emit('elementClick', el.id!, additive)
}

/* ── Drag handling (single + group) ──────── */
function onDragStart(e: any, el: MapElementData) {
  // Record start positions for all selected elements (for group drag)
  dragAnchorStart = { x: e.target.x(), y: e.target.y() }
  dragGroupStartPositions = new Map()
  if (props.selectedIds.has(el.id!)) {
    for (const sid of props.selectedIds) {
      const otherEl = props.elements.find(x => x.id === sid)
      if (otherEl) {
        dragGroupStartPositions.set(sid, {
          x: otherEl.geometryJson.x ?? 0,
          y: otherEl.geometryJson.y ?? 0,
        })
      }
    }
  }
}

function onDragMove(e: any, el: MapElementData) {
  // If group drag, move all other selected elements
  if (dragGroupStartPositions.size > 1 && props.selectedIds.has(el.id!)) {
    const stage = konvaStage.value?.getNode() as Konva.Stage
    if (!stage) return
    const layer = stage.findOne('Layer:nth-child(2)') as Konva.Layer
    if (!layer) return
    const dx = e.target.x() - dragAnchorStart.x
    const dy = e.target.y() - dragAnchorStart.y
    for (const [sid, startPos] of dragGroupStartPositions) {
      if (sid === el.id) continue
      const node = layer.findOne(`[name=${sid}]`)
      if (node) {
        node.x(startPos.x + dx)
        node.y(startPos.y + dy)
      }
    }
  }
}

function onDragEnd(e: any, el: MapElementData) {
  const cs = props.cellSize
  const node = e.target as Konva.Node
  const snappedX = Math.round(node.x() / cs) * cs
  const snappedY = Math.round(node.y() / cs) * cs
  node.x(snappedX)
  node.y(snappedY)

  if (dragGroupStartPositions.size > 1 && props.selectedIds.has(el.id!)) {
    // Group drag: compute delta and emit for all
    const dx = snappedX - (dragGroupStartPositions.get(el.id!)?.x ?? 0)
    const dy = snappedY - (dragGroupStartPositions.get(el.id!)?.y ?? 0)
    const ids = [...props.selectedIds]
    emit('groupDrag', ids, dx, dy)
  } else {
    emit('elementDrag', el.id!, { ...el.geometryJson, x: snappedX, y: snappedY })
  }
  dragGroupStartPositions = new Map()
}

/* ── Resize observer ─────────────────────── */
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (containerRef.value) {
    containerW.value = containerRef.value.clientWidth
    containerH.value = containerRef.value.clientHeight
    containerRef.value.focus()
    resizeObserver = new ResizeObserver(entries => {
      const firstEntry = entries[0]
      if (!firstEntry) return
      const { width, height } = firstEntry.contentRect
      containerW.value = width
      containerH.value = height
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  emit('clearGhost')
})
</script>

<style scoped>
.map-canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f8fafc;
  outline: none;
}
.cursor-crosshair { cursor: crosshair; }
.cursor-default   { cursor: default; }
.cursor-grab      { cursor: grab; }
.cursor-eraser    { cursor: not-allowed; }

.map-zoom-controls {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  z-index: 5;
}
.zoom-btn {
  width: 28px; height: 28px; border: none; background: transparent;
  cursor: pointer; font-size: 1rem; border-radius: 6px;
  display: flex; align-items: center; justify-content: center; color: #374151;
}
.zoom-btn:hover { background: #f3f4f6; }
.zoom-level {
  font-size: 0.75rem; color: #6b7280;
  min-width: 40px; text-align: center;
}
.map-coords {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(255,255,255,0.92);
  font-size: 0.72rem;
  color: #6b7280;
  padding: 3px 8px;
  border-radius: 6px;
  font-family: 'SF Mono', Monaco, monospace;
  z-index: 5;
}
</style>
