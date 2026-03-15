<template>
  <div ref="containerRef" class="map-canvas-container" @contextmenu.prevent>
    <v-stage
      ref="konvaStage"
      :config="stageConfig"
      @wheel="onWheel"
      @mousedown="onStageMouseDown"
      @mousemove="onStageMouseMove"
      @mouseup="onStageMouseUp"
      @click="onStageClick"
      @dblclick="onStageDblClick"
    >
      <!-- Background image layer -->
      <v-layer>
        <v-image
          v-if="bgImage"
          :config="{ image: bgImage, x: 0, y: 0, listening: false }"
        />
        <!-- Grid -->
        <v-line
          v-for="(line, i) in gridLines"
          :key="'grid-' + i"
          :config="line"
        />
      </v-layer>

      <!-- Elements layer -->
      <v-layer>
        <template v-for="el in elements" :key="el.id">
          <!-- POLYGON / closed shape -->
          <v-line
            v-if="el.geometryType === 'POLYGON' && el.geometryJson.points"
            :config="polygonConfig(el)"
            @click="(e: any) => onElementClick(e, el)"
            @dragend="(e: any) => onDragEnd(e, el)"
            @transformend="(e: any) => onTransformEnd(e, el)"
          />
          <!-- POLYLINE (open path) -->
          <v-line
            v-else-if="el.geometryType === 'POLYLINE' && el.geometryJson.points"
            :config="polylineConfig(el)"
            @click="(e: any) => onElementClick(e, el)"
            @dragend="(e: any) => onDragEnd(e, el)"
          />
          <!-- RECT -->
          <v-rect
            v-else-if="el.geometryType === 'RECT'"
            :config="rectConfig(el)"
            @click="(e: any) => onElementClick(e, el)"
            @dragend="(e: any) => onDragEnd(e, el)"
            @transformend="(e: any) => onTransformEnd(e, el)"
          />
          <!-- CIRCLE -->
          <v-circle
            v-else-if="el.geometryType === 'CIRCLE'"
            :config="circleConfig(el)"
            @click="(e: any) => onElementClick(e, el)"
            @dragend="(e: any) => onDragEnd(e, el)"
            @transformend="(e: any) => onTransformEnd(e, el)"
          />

          <!-- Label text on top of shapes -->
          <v-text
            v-if="el.type === 'LABEL'"
            :config="labelConfig(el)"
            @click="(e: any) => onElementClick(e, el)"
            @dragend="(e: any) => onLabelDragEnd(e, el)"
          />
          <v-text
            v-else-if="el.code || el.name"
            :config="elementLabelConfig(el)"
          />
        </template>

        <!-- Active drawing preview -->
        <v-line
          v-if="isDrawing && drawingPoints.length >= 4"
          :config="drawingPreviewConfig"
        />
        <v-circle
          v-for="(pt, idx) in drawingVertices"
          :key="'dv-' + idx"
          :config="{ x: pt.x, y: pt.y, radius: 4 / stageScale, fill: '#2563eb', stroke: '#fff', strokeWidth: 1 / stageScale }"
        />
      </v-layer>

      <!-- Transformer layer -->
      <v-layer>
        <v-transformer
          ref="transformerRef"
          :config="transformerConfig"
        />
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
      {{ Math.round(cursorPos.x) }}, {{ Math.round(cursorPos.y) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import Konva from 'konva'
import type { MapElementData, EditorTool, Point } from './types'

const props = defineProps<{
  elements: MapElementData[]
  selectedId: string | null
  activeTool: EditorTool
  stageScale: number
  stagePos: Point
  isDrawing: boolean
  drawingPoints: number[]
  mapBaseImageUrl: string | null
}>()

const emit = defineEmits<{
  select: [id: string | null]
  elementDrag: [id: string, geometryJson: any]
  elementTransform: [id: string, geometryJson: any]
  stageClick: [pos: Point]
  stageDblClick: [pos: Point]
  updateScale: [scale: number]
  updatePos: [pos: Point]
  zoomIn: []
  zoomOut: []
  resetView: []
}>()

const containerRef = ref<HTMLElement | null>(null)
const konvaStage = ref<any>(null)
const transformerRef = ref<any>(null)
const containerW = ref(800)
const containerH = ref(600)
const cursorPos = ref<Point>({ x: 0, y: 0 })
const bgImage = ref<HTMLImageElement | null>(null)

/* ── Stage config ──────────────────────────── */
const stageConfig = computed(() => ({
  width: containerW.value,
  height: containerH.value,
  scaleX: props.stageScale,
  scaleY: props.stageScale,
  x: props.stagePos.x,
  y: props.stagePos.y,
  draggable: props.activeTool === 'pan',
}))

const transformerConfig = {
  rotateEnabled: true,
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center'],
  boundBoxFunc: (oldBox: any, newBox: any) => newBox,
}

/* ── Grid ──────────────────────────────────── */
const gridLines = computed(() => {
  const lines: any[] = []
  const gridSize = 50
  const w = containerW.value / props.stageScale + Math.abs(props.stagePos.x / props.stageScale)
  const h = containerH.value / props.stageScale + Math.abs(props.stagePos.y / props.stageScale)
  const startX = -Math.ceil(props.stagePos.x / props.stageScale / gridSize) * gridSize
  const startY = -Math.ceil(props.stagePos.y / props.stageScale / gridSize) * gridSize

  for (let x = startX; x < startX + w + gridSize; x += gridSize) {
    lines.push({
      points: [x, startY - gridSize, x, startY + h + gridSize],
      stroke: '#e2e8f0',
      strokeWidth: 0.5 / props.stageScale,
      listening: false,
    })
  }
  for (let y = startY; y < startY + h + gridSize; y += gridSize) {
    lines.push({
      points: [startX - gridSize, y, startX + w + gridSize, y],
      stroke: '#e2e8f0',
      strokeWidth: 0.5 / props.stageScale,
      listening: false,
    })
  }
  return lines
})

/* ── Background image ─────────────────────── */
watch(() => props.mapBaseImageUrl, (url) => {
  if (!url) { bgImage.value = null; return }
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => { bgImage.value = img }
  img.src = url
}, { immediate: true })

/* ── Drawing helpers ─────────────────────── */
const drawingVertices = computed(() => {
  const pts: Point[] = []
  for (let i = 0; i < props.drawingPoints.length; i += 2) {
    const x = props.drawingPoints[i]
    const y = props.drawingPoints[i + 1]
    if (x == null || y == null) continue
    pts.push({ x, y })
  }
  return pts
})

const drawingPreviewConfig = computed(() => ({
  points: props.drawingPoints,
  stroke: '#2563eb',
  strokeWidth: 2 / props.stageScale,
  dash: [6 / props.stageScale, 4 / props.stageScale],
  closed: props.activeTool === 'polygon',
  fill: props.activeTool === 'polygon' ? 'rgba(37, 99, 235, 0.1)' : undefined,
  listening: false,
}))

/* ── Element configs ─────────────────────── */
function isSelected(el: MapElementData) {
  return el.id === props.selectedId
}

function baseDraggable(el: MapElementData) {
  return props.activeTool === 'select'
}

function polygonConfig(el: MapElementData) {
  const s = el.styleJson ?? {}
  return {
    points: el.geometryJson.points ?? [],
    closed: true,
    fill: s.fill ?? '#22c55e33',
    stroke: isSelected(el) ? '#2563eb' : (s.stroke ?? '#22c55e'),
    strokeWidth: (s.strokeWidth ?? 2) / props.stageScale,
    opacity: s.opacity ?? 1,
    draggable: baseDraggable(el),
    hitStrokeWidth: 10 / props.stageScale,
    name: el.id,
  }
}

function polylineConfig(el: MapElementData) {
  const s = el.styleJson ?? {}
  return {
    points: el.geometryJson.points ?? [],
    closed: false,
    stroke: isSelected(el) ? '#2563eb' : (s.stroke ?? '#fb923c'),
    strokeWidth: (s.strokeWidth ?? 3) / props.stageScale,
    opacity: s.opacity ?? 1,
    draggable: baseDraggable(el),
    hitStrokeWidth: 12 / props.stageScale,
    dash: s.dash,
    name: el.id,
  }
}

function rectConfig(el: MapElementData) {
  const s = el.styleJson ?? {}
  const g = el.geometryJson
  return {
    x: g.x ?? 0,
    y: g.y ?? 0,
    width: g.width ?? 100,
    height: g.height ?? 60,
    rotation: g.rotation ?? 0,
    fill: s.fill ?? '#e2e8f033',
    stroke: isSelected(el) ? '#2563eb' : (s.stroke ?? '#e2e8f0'),
    strokeWidth: (s.strokeWidth ?? 2) / props.stageScale,
    opacity: s.opacity ?? 1,
    draggable: baseDraggable(el),
    name: el.id,
  }
}

function circleConfig(el: MapElementData) {
  const s = el.styleJson ?? {}
  const g = el.geometryJson
  return {
    x: g.x ?? 0,
    y: g.y ?? 0,
    radius: g.radius ?? 30,
    fill: s.fill ?? '#a78bfa33',
    stroke: isSelected(el) ? '#2563eb' : (s.stroke ?? '#a78bfa'),
    strokeWidth: (s.strokeWidth ?? 2) / props.stageScale,
    opacity: s.opacity ?? 1,
    draggable: baseDraggable(el),
    name: el.id,
  }
}

function labelConfig(el: MapElementData) {
  const s = el.styleJson ?? {}
  const g = el.geometryJson
  return {
    x: g.x ?? 0,
    y: g.y ?? 0,
    text: el.name || 'Rótulo',
    fontSize: (s.fontSize ?? 16),
    fontFamily: s.fontFamily ?? 'Inter',
    fill: s.fontColor ?? '#1e293b',
    draggable: baseDraggable(el),
    name: el.id,
  }
}

function elementLabelConfig(el: MapElementData) {
  const center = getCenter(el)
  const text = el.code || el.name || ''
  return {
    x: center.x - text.length * 3,
    y: center.y - 6,
    text,
    fontSize: 12 / props.stageScale,
    fontFamily: 'Inter',
    fill: '#1e293b',
    listening: false,
  }
}

function getCenter(el: MapElementData): Point {
  const g = el.geometryJson
  if (g.points && g.points.length >= 4) {
    let sx = 0, sy = 0, n = g.points.length / 2
    for (let i = 0; i < g.points.length; i += 2) {
      const x = g.points[i]
      const y = g.points[i + 1]
      if (x == null || y == null) continue
      sx += x
      sy += y
    }
    return { x: sx / n, y: sy / n }
  }
  return { x: g.x ?? 0, y: g.y ?? 0 }
}

/* ── Event handlers ──────────────────────── */
function getPointerPos(): Point {
  const stage = konvaStage.value?.getNode() as Konva.Stage | undefined
  if (!stage) return { x: 0, y: 0 }
  const ptr = stage.getPointerPosition()
  if (!ptr) return { x: 0, y: 0 }
  const transform = stage.getAbsoluteTransform().copy().invert()
  return transform.point(ptr)
}

function onStageMouseMove() {
  cursorPos.value = getPointerPos()
}

let isPanning = false
let panStart = { x: 0, y: 0 }
let panStageStart = { x: 0, y: 0 }

function onStageMouseDown(e: any) {
  // Middle mouse button pan
  const evt = e.evt as MouseEvent
  if (evt.button === 1 || props.activeTool === 'pan') {
    isPanning = true
    panStart = { x: evt.clientX, y: evt.clientY }
    panStageStart = { ...props.stagePos }
    e.evt.preventDefault()
  }
}

function onStageMouseUp(e: any) {
  if (isPanning) {
    const evt = e.evt as MouseEvent
    emit('updatePos', {
      x: panStageStart.x + (evt.clientX - panStart.x),
      y: panStageStart.y + (evt.clientY - panStart.y),
    })
    isPanning = false
  }
}

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
  const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy
  const clampedScale = Math.max(0.05, Math.min(10, newScale))

  emit('updateScale', clampedScale)
  emit('updatePos', {
    x: pointer.x - mousePointTo.x * clampedScale,
    y: pointer.y - mousePointTo.y * clampedScale,
  })
}

function onStageClick(e: any) {
  const pos = getPointerPos()
  
  // Emit click position so tools can handle it (drawing, creating rects, etc)
  emit('stageClick', pos)

  // If clicked on empty area and not currently drawing, deselect active element
  if (!props.isDrawing && e.target === konvaStage.value?.getNode()) {
    emit('select', null)
  }
}

function onStageDblClick() {
  const pos = getPointerPos()
  emit('stageDblClick', pos)
}

function onElementClick(e: any, el: MapElementData) {
  e.cancelBubble = true
  if (props.activeTool === 'select') {
    emit('select', el.id!)
  }
}

function onDragEnd(e: any, el: MapElementData) {
  const node = e.target as Konva.Node
  if (el.geometryJson.points) {
    // For Line shapes, delta from drag
    const dx = node.x()
    const dy = node.y()
    node.x(0)
    node.y(0)
    const newPoints = el.geometryJson.points.map((v: number, i: number) =>
      i % 2 === 0 ? v + dx : v + dy,
    )
    emit('elementDrag', el.id!, { ...el.geometryJson, points: newPoints })
  } else {
    emit('elementDrag', el.id!, { ...el.geometryJson, x: node.x(), y: node.y() })
  }
}

function onLabelDragEnd(e: any, el: MapElementData) {
  const node = e.target as Konva.Node
  emit('elementDrag', el.id!, { ...el.geometryJson, x: node.x(), y: node.y() })
}

function onTransformEnd(e: any, el: MapElementData) {
  const node = e.target as Konva.Node
  if (el.geometryType === 'RECT') {
    emit('elementTransform', el.id!, {
      x: node.x(),
      y: node.y(),
      width: node.width() * node.scaleX(),
      height: node.height() * node.scaleY(),
      rotation: node.rotation(),
    })
    node.scaleX(1)
    node.scaleY(1)
  } else if (el.geometryType === 'CIRCLE') {
    const avgScale = (node.scaleX() + node.scaleY()) / 2
    emit('elementTransform', el.id!, {
      x: node.x(),
      y: node.y(),
      radius: (el.geometryJson.radius ?? 30) * avgScale,
    })
    node.scaleX(1)
    node.scaleY(1)
  }
}

/* ── Transformer ─────────────────────────── */
watch(() => props.selectedId, async () => {
  await nextTick()
  const transformer = transformerRef.value?.getNode() as Konva.Transformer | undefined
  if (!transformer) return
  const stage = konvaStage.value?.getNode() as Konva.Stage | undefined
  if (!stage) return

  if (props.selectedId && props.activeTool === 'select') {
    const nodes = stage.find(`.${props.selectedId}`)
    if (nodes.length) {
      transformer.nodes(nodes)
    } else {
      transformer.nodes([])
    }
  } else {
    transformer.nodes([])
  }
  transformer.getLayer()?.batchDraw()
})

/* ── Resize observer ─────────────────────── */
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (containerRef.value) {
    containerW.value = containerRef.value.clientWidth
    containerH.value = containerRef.value.clientHeight
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
})
</script>

<style scoped>
.map-canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--gray-50);
}

.map-zoom-controls {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  padding: 4px;
  box-shadow: var(--shadow-sm);
}

.zoom-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1rem;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-700);
}
.zoom-btn:hover { background: var(--gray-100); }

.zoom-level {
  font-size: 0.75rem;
  color: var(--gray-500);
  min-width: 40px;
  text-align: center;
}

.map-coords {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(255,255,255,0.9);
  font-size: 0.75rem;
  color: var(--gray-500);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
}
</style>
