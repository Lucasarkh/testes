/* ─── Main Map Editor Composable ───────────────── */
import { ref, computed, shallowRef, watch, type Ref } from 'vue'
import { useApi } from '../composables/useApi'
import type Konva from 'konva'
import type {
  MapElementData,
  EditorTool,
  MapElementType,
  GeometryType,
  Point,
  StyleJson,
  SmartTool,
  EditorStep,
  LotGridConfig,
} from './types'
import { DEFAULT_STYLE, MAP_ELEMENT_COLORS, SMART_TOOLS } from './types'

export function useMapEditor(projectId: string) {
  const { fetchApi } = useApi()

  /* ── State ─────────────────────────────────── */
  const elements = ref<MapElementData[]>([])
  const selectedId = ref<string | null>(null)
  const activeTool = ref<EditorTool>('select')
  const activeType = ref<MapElementType>('LOT')
  const smartTool = ref<SmartTool>('select')
  const editorStep = ref<EditorStep>('draw')
  const dirty = ref(false)
  const saving = ref(false)
  const loading = ref(true)
  const mapBaseImageUrl = ref<string | null>(null)
  const showGrid = ref(true)
  const snapEnabled = ref(true)

  /* Drawing state */
  const drawingPoints = ref<number[]>([])
  const isDrawing = ref(false)

  /* Lot grid modal state */
  const showLotGrid = ref(false)
  const lotGridConfig = ref<LotGridConfig>({
    rows: 4,
    cols: 6,
    lotWidth: 80,
    lotHeight: 50,
    gap: 4,
    startX: 100,
    startY: 100,
    blockName: 'Quadra A',
    startNumber: 1,
    rotation: 0,
  })

  /* Stage refs */
  const stageRef = shallowRef<Konva.Stage | null>(null)
  const stageScale = ref(1)
  const stagePos = ref<Point>({ x: 0, y: 0 })

  /* History (undo/redo) */
  const history = ref<string[]>([])
  const historyIndex = ref(-1)
  const maxHistory = 50

  /* ── Computed ──────────────────────────────── */
  const selected = computed(() =>
    elements.value.find(e => e.id === selectedId.value) ?? null,
  )

  const elementsByType = computed(() => {
    const map: Partial<Record<MapElementType, MapElementData[]>> = {}
    for (const el of elements.value) {
      ;(map[el.type] ??= []).push(el)
    }
    return map
  })

  const lotElements = computed(() => elements.value.filter(e => e.type === 'LOT'))

  const stats = computed(() => ({
    total: elements.value.length,
    lots: lotElements.value.length,
    available: lotElements.value.filter(e => (e.metaJson?.lotStatus || 'AVAILABLE') === 'AVAILABLE').length,
    reserved: lotElements.value.filter(e => e.metaJson?.lotStatus === 'RESERVED').length,
    sold: lotElements.value.filter(e => e.metaJson?.lotStatus === 'SOLD').length,
  }))

  /** The drawing instruction text for the current tool */
  const drawingHint = computed(() => {
    if (isDrawing.value) {
      const pts = drawingPoints.value.length / 2
      return `${pts} ponto${pts !== 1 ? 's' : ''} marcado${pts !== 1 ? 's' : ''}. Clique para adicionar mais. Duplo-clique para finalizar. ESC para cancelar.`
    }
    const tool = SMART_TOOLS.find(t => t.key === smartTool.value)
    if (!tool) return ''
    switch (smartTool.value) {
      case 'select': return 'Clique em um elemento para selecioná-lo. Arraste para mover.'
      case 'pan': return 'Arraste o mapa para navegar. Use a roda do mouse para zoom.'
      case 'lot': case 'green': case 'lake': case 'polygon':
        return 'Clique no mapa para marcar os cantos. Duplo-clique para finalizar a forma.'
      case 'lot-rect':
        return 'Clique no mapa para posicionar o lote retangular.'
      case 'lot-grid':
        return 'Configure a grade no painel e clique no mapa para posicioná-la.'
      case 'road':
        return 'Clique no mapa para traçar o caminho da rua. Duplo-clique para finalizar.'
      case 'roundabout':
        return 'Clique no mapa para posicionar a rotatória.'
      case 'label':
        return 'Clique no mapa para posicionar o texto.'
      default: return ''
    }
  })

  /* ── Smart Tool → Internal mapping ─────────── */
  function setSmartTool(tool: SmartTool) {
    smartTool.value = tool
    const info = SMART_TOOLS.find(t => t.key === tool)
    if (info?.createsType) activeType.value = info.createsType
    if (info?.internalTool) activeTool.value = info.internalTool
    else if (tool === 'select') activeTool.value = 'select'
    else if (tool === 'pan') activeTool.value = 'pan'

    if (tool === 'lot-grid') {
      showLotGrid.value = true
      activeTool.value = 'select'
    } else {
      showLotGrid.value = false
    }
  }

  /* ── History helpers ───────────────────────── */
  function pushHistory() {
    const snapshot = JSON.stringify(elements.value)
    history.value = history.value.slice(0, historyIndex.value + 1)
    history.value.push(snapshot)
    if (history.value.length > maxHistory) history.value.shift()
    historyIndex.value = history.value.length - 1
    dirty.value = true
  }

  function undo() {
    if (historyIndex.value <= 0) return
    historyIndex.value--
    const snapshot = history.value[historyIndex.value]
    if (!snapshot) return
    elements.value = JSON.parse(snapshot)
    dirty.value = true
  }

  function redo() {
    if (historyIndex.value >= history.value.length - 1) return
    historyIndex.value++
    const snapshot = history.value[historyIndex.value]
    if (!snapshot) return
    elements.value = JSON.parse(snapshot)
    dirty.value = true
  }

  /* ── CRUD helpers ──────────────────────────── */
  function generateTempId() {
    return `_new_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  function geometryTypeForTool(tool: EditorTool): GeometryType {
    switch (tool) {
      case 'polygon': return 'POLYGON'
      case 'rect': return 'RECT'
      case 'circle': return 'CIRCLE'
      case 'polyline': return 'POLYLINE'
      case 'label': return 'RECT'
      default: return 'POLYGON'
    }
  }

  function addElement(data: Partial<MapElementData>): MapElementData {
    const type = data.type ?? activeType.value
    const style = { ...DEFAULT_STYLE[type], ...data.styleJson }
    const el: MapElementData = {
      id: generateTempId(),
      type,
      name: data.name ?? '',
      code: data.code ?? '',
      geometryType: data.geometryType ?? 'POLYGON',
      geometryJson: data.geometryJson ?? {},
      styleJson: style,
      metaJson: data.metaJson ?? {},
    }
    elements.value.push(el)
    pushHistory()
    return el
  }

  /** Add multiple elements at once (for lot grid, etc.) - only one history push */
  function addElements(dataList: Partial<MapElementData>[]): MapElementData[] {
    const created: MapElementData[] = []
    for (const data of dataList) {
      const type = data.type ?? activeType.value
      const style = { ...DEFAULT_STYLE[type], ...data.styleJson }
      const el: MapElementData = {
        id: generateTempId(),
        type,
        name: data.name ?? '',
        code: data.code ?? '',
        geometryType: data.geometryType ?? 'POLYGON',
        geometryJson: data.geometryJson ?? {},
        styleJson: style,
        metaJson: data.metaJson ?? {},
      }
      elements.value.push(el)
      created.push(el)
    }
    pushHistory()
    return created
  }

  function updateElement(id: string, patch: Partial<MapElementData>) {
    const idx = elements.value.findIndex(e => e.id === id)
    if (idx < 0) return
    const current = elements.value[idx]
    if (!current) return
    elements.value[idx] = {
      ...current,
      ...patch,
      type: patch.type ?? current.type,
      geometryType: patch.geometryType ?? current.geometryType,
      geometryJson: patch.geometryJson ?? current.geometryJson,
    }
    elements.value = [...elements.value]
    pushHistory()
  }

  /** Batch update multiple elements at once */
  function updateElements(updates: { id: string; patch: Partial<MapElementData> }[]) {
    for (const { id, patch } of updates) {
      const idx = elements.value.findIndex(e => e.id === id)
      if (idx >= 0) {
        const current = elements.value[idx]
        if (!current) continue
        elements.value[idx] = {
          ...current,
          ...patch,
          type: patch.type ?? current.type,
          geometryType: patch.geometryType ?? current.geometryType,
          geometryJson: patch.geometryJson ?? current.geometryJson,
        }
      }
    }
    elements.value = [...elements.value]
    pushHistory()
  }

  function removeElement(id: string) {
    elements.value = elements.value.filter(e => e.id !== id)
    if (selectedId.value === id) selectedId.value = null
    pushHistory()
  }

  function duplicateElement(id: string) {
    const src = elements.value.find(e => e.id === id)
    if (!src) return
    const clone: MapElementData = {
      ...JSON.parse(JSON.stringify(src)),
      id: generateTempId(),
      name: (src.name || '') + ' (cópia)',
      code: '',
    }
    if (clone.geometryJson.points) {
      clone.geometryJson.points = clone.geometryJson.points.map((v: number, i: number) =>
        i % 2 === 0 ? v + 20 : v + 20,
      )
    } else if (clone.geometryJson.x != null) {
      clone.geometryJson.x! += 20
      clone.geometryJson.y! += 20
    }
    elements.value.push(clone)
    selectedId.value = clone.id!
    pushHistory()
  }

  /* ── Lot Grid Generator ────────────────────── */
  function generateLotGrid(config: LotGridConfig, anchorPos?: Point): MapElementData[] {
    const startX = anchorPos?.x ?? config.startX
    const startY = anchorPos?.y ?? config.startY
    const lots: Partial<MapElementData>[] = []
    let num = config.startNumber

    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        const x = startX + col * (config.lotWidth + config.gap)
        const y = startY + row * (config.lotHeight + config.gap)
        const code = `${config.blockName} - Lote ${String(num).padStart(2, '0')}`
        lots.push({
          type: 'LOT',
          name: `Lote ${String(num).padStart(2, '0')}`,
          code,
          geometryType: 'RECT',
          geometryJson: {
            x, y,
            width: config.lotWidth,
            height: config.lotHeight,
            rotation: config.rotation,
          },
          metaJson: { lotStatus: 'AVAILABLE' },
        })
        num++
      }
    }

    return addElements(lots)
  }

  /** Auto-name lots sequentially */
  function autoNameLots(prefix: string, startNum: number = 1) {
    const lots = elements.value.filter(e => e.type === 'LOT')
    const updates: { id: string; patch: Partial<MapElementData> }[] = []
    let num = startNum
    for (const lot of lots) {
      if (!lot.id) continue
      const code = `${prefix} ${String(num).padStart(2, '0')}`
      updates.push({
        id: lot.id,
        patch: {
          name: `Lote ${String(num).padStart(2, '0')}`,
          code,
        },
      })
      num++
    }
    updateElements(updates)
  }

  /** Set status for all lots at once */
  function setAllLotsStatus(status: string) {
    const lots = elements.value.filter(e => e.type === 'LOT')
    const updates = lots.map(lot => ({
      id: lot.id!,
      patch: { metaJson: { ...lot.metaJson, lotStatus: status } },
    }))
    updateElements(updates)
  }

  /* ── Drawing ───────────────────────────────── */
  function startDrawing() {
    drawingPoints.value = []
    isDrawing.value = true
  }

  function addDrawingPoint(p: Point) {
    drawingPoints.value.push(p.x, p.y)
  }

  function finishDrawing() {
    if (drawingPoints.value.length < 4) {
      isDrawing.value = false
      drawingPoints.value = []
      return null
    }
    const gType = geometryTypeForTool(activeTool.value)
    const el = addElement({
      type: activeType.value,
      geometryType: gType,
      geometryJson: { points: [...drawingPoints.value] },
    })
    isDrawing.value = false
    drawingPoints.value = []
    selectedId.value = el.id!
    return el
  }

  function cancelDrawing() {
    isDrawing.value = false
    drawingPoints.value = []
  }

  /* ── Stage helpers ─────────────────────────── */
  function zoomIn() {
    stageScale.value = Math.min(stageScale.value * 1.2, 5)
  }

  function zoomOut() {
    stageScale.value = Math.max(stageScale.value / 1.2, 0.1)
  }

  function resetView() {
    stageScale.value = 1
    stagePos.value = { x: 0, y: 0 }
  }

  function fitToScreen(stageWidth: number, stageHeight: number, contentWidth: number, contentHeight: number) {
    if (!contentWidth || !contentHeight) return
    const scaleX = stageWidth / contentWidth
    const scaleY = stageHeight / contentHeight
    const scale = Math.min(scaleX, scaleY, 1) * 0.9
    stageScale.value = scale
    stagePos.value = {
      x: (stageWidth - contentWidth * scale) / 2,
      y: (stageHeight - contentHeight * scale) / 2,
    }
  }

  /* ── API: Load ─────────────────────────────── */
  async function loadElements() {
    loading.value = true
    try {
      const [project, raw] = await Promise.all([
        fetchApi(`/projects/${projectId}`),
        fetchApi(`/projects/${projectId}/map-elements`),
      ])
      mapBaseImageUrl.value = project.mapBaseImageUrl ?? null
      elements.value = (raw || []).map((e: any) => ({
        id: e.id,
        type: e.type,
        name: e.name ?? '',
        code: e.code ?? '',
        geometryType: e.geometryType,
        geometryJson: e.geometryJson,
        styleJson: e.styleJson ?? DEFAULT_STYLE[e.type as MapElementType],
        metaJson: e.metaJson ?? {},
      }))
      // Auto-detect step
      if (!mapBaseImageUrl.value && elements.value.length === 0) {
        editorStep.value = 'image'
      } else if (elements.value.length === 0) {
        editorStep.value = 'draw'
      }
      history.value = [JSON.stringify(elements.value)]
      historyIndex.value = 0
      dirty.value = false
    } catch (err) {
      console.error('Failed to load map elements', err)
    }
    loading.value = false
  }

  /* ── API: Save (bulk upsert) ───────────────── */
  async function saveElements() {
    saving.value = true
    try {
      const payload = elements.value.map(e => ({
        id: e.id?.startsWith('_new_') ? undefined : e.id,
        type: e.type,
        name: e.name || undefined,
        code: e.code || undefined,
        geometryType: e.geometryType,
        geometryJson: e.geometryJson,
        styleJson: e.styleJson,
        metaJson: e.metaJson,
      }))
      const saved = await fetchApi(`/projects/${projectId}/map-elements/bulk`, {
        method: 'PUT',
        body: JSON.stringify({ elements: payload }),
      })
      elements.value = (saved || []).map((e: any) => ({
        id: e.id,
        type: e.type,
        name: e.name ?? '',
        code: e.code ?? '',
        geometryType: e.geometryType,
        geometryJson: e.geometryJson,
        styleJson: e.styleJson ?? DEFAULT_STYLE[e.type as MapElementType],
        metaJson: e.metaJson ?? {},
      }))
      history.value = [JSON.stringify(elements.value)]
      historyIndex.value = 0
      dirty.value = false
    } catch (err) {
      console.error('Failed to save map elements', err)
      throw err
    } finally {
      saving.value = false
    }
  }

  return {
    // State
    elements,
    selectedId,
    selected,
    activeTool,
    activeType,
    smartTool,
    editorStep,
    dirty,
    saving,
    loading,
    mapBaseImageUrl,
    drawingPoints,
    isDrawing,
    stageRef,
    stageScale,
    stagePos,
    elementsByType,
    lotElements,
    stats,
    showGrid,
    snapEnabled,
    drawingHint,

    // Smart tool
    setSmartTool,

    // Lot grid
    showLotGrid,
    lotGridConfig,
    generateLotGrid,

    // Batch ops
    autoNameLots,
    setAllLotsStatus,

    // Element ops
    addElement,
    addElements,
    updateElement,
    updateElements,
    removeElement,
    duplicateElement,

    // Drawing
    startDrawing,
    addDrawingPoint,
    finishDrawing,
    cancelDrawing,

    // Stage
    zoomIn,
    zoomOut,
    resetView,
    fitToScreen,

    // History
    undo,
    redo,
    pushHistory,
    history,
    historyIndex,

    // API
    loadElements,
    saveElements,
  }
}
