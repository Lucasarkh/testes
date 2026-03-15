/* ─── LEGO-Style Map Editor Composable ─────────────────── */
import { ref, computed } from 'vue'
import { useApi } from '../useApi'
import type {
  GeometryJson,
  MapElementData, MapElementType, Point,
  EditorMode, EditorStep, LotGridConfig, TileDefinition,
} from './types'
import { DEFAULT_STYLE, getTileById } from './types'

export function useMapEditor(projectId: string) {
  const { fetchApi } = useApi()

  /* ── Core State ────────────────────────────── */
  const elements       = ref<MapElementData[]>([])
  const selectedId     = ref<string | null>(null)
  const selectedIds    = ref<Set<string>>(new Set())
  const editorMode     = ref<EditorMode>('place')
  const editorStep     = ref<EditorStep>('build')
  const dirty          = ref(false)
  const saving         = ref(false)
  const loading        = ref(true)

  /* ── Tile placement state ──────────────────── */
  const activeTileId    = ref<string | null>('road-straight')
  const placementRotation = ref(0)
  const ghostPos        = ref<Point | null>(null) // grid-snapped cursor position
  const cellSize        = ref(50)

  /* ── Lot grid modal ────────────────────────── */
  const showLotGrid = ref(false)
  const lotGridConfig = ref<LotGridConfig>({
    rows: 4, cols: 6, tileId: 'lot-small',
    blockName: 'Quadra A', startNumber: 1,
  })

  /* ── Stage (canvas) ────────────────────────── */
  const stageScale = ref(1)
  const stagePos   = ref<Point>({ x: 0, y: 0 })

  /* ── History (undo/redo) ───────────────────── */
  const history      = ref<string[]>([])
  const historyIndex = ref(-1)
  const maxHistory   = 50

  /* ── Computed ──────────────────────────────── */
  const selected = computed(() =>
    elements.value.find(e => e.id === selectedId.value) ?? null,
  )

  const lotElements = computed(() => elements.value.filter(e => e.type === 'LOT'))

  const stats = computed(() => ({
    total: elements.value.length,
    lots: lotElements.value.length,
    available: lotElements.value.filter(e => (e.metaJson?.lotStatus || 'AVAILABLE') === 'AVAILABLE').length,
    reserved: lotElements.value.filter(e => e.metaJson?.lotStatus === 'RESERVED').length,
    sold: lotElements.value.filter(e => e.metaJson?.lotStatus === 'SOLD').length,
  }))

  const activeTile = computed<TileDefinition | null>(() =>
    activeTileId.value ? (getTileById(activeTileId.value) ?? null) : null,
  )

  /** Hint text for current mode / tile */
  const drawingHint = computed(() => {
    if (editorMode.value === 'select') return 'Clique em uma peça para selecionar. Arraste para mover.'
    if (editorMode.value === 'pan') return 'Arraste o mapa para navegar. Roda do mouse = zoom.'
    if (editorMode.value === 'erase') return 'Clique em uma peça para removê-la.'
    if (editorMode.value === 'place' && activeTile.value) {
      const t = activeTile.value
      return `Clique no mapa para colocar "${t.name}". ${t.rotatable ? 'R = girar. ' : ''}ESC = cancelar.`
    }
    return 'Escolha uma peça na paleta para começar a montar.'
  })

  /* ── Mode / Tile Selection ─────────────────── */
  function setMode(mode: EditorMode) {
    editorMode.value = mode
    if (mode !== 'place') activeTileId.value = null
  }

  function setStep(step: EditorStep) {
    editorStep.value = step
  }

  function selectTile(tileId: string) {
    activeTileId.value = tileId
    placementRotation.value = 0
    editorMode.value = 'place'
  }

  function rotatePlacement() {
    const tile = activeTile.value
    if (!tile?.rotatable) return
    placementRotation.value = (placementRotation.value + tile.rotationStep) % 360
  }

  /* ── Grid helpers ──────────────────────────── */
  function snapToGrid(pos: Point): Point {
    const cs = cellSize.value
    return {
      x: Math.round(pos.x / cs) * cs,
      y: Math.round(pos.y / cs) * cs,
    }
  }

  function updateGhostPos(canvasPos: Point) {
    ghostPos.value = snapToGrid(canvasPos)
  }

  function clearGhost() {
    ghostPos.value = null
  }

  /* ── History ───────────────────────────────── */
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

  function mergeMapElement(
    current: MapElementData,
    patch: Partial<MapElementData>,
  ): MapElementData {
    return {
      ...current,
      ...patch,
      type: patch.type ?? current.type,
      geometryType: patch.geometryType ?? current.geometryType,
      geometryJson: (patch.geometryJson ?? current.geometryJson) as GeometryJson,
      styleJson: patch.styleJson ?? current.styleJson,
      metaJson: patch.metaJson ?? current.metaJson,
    }
  }

  /* ── CRUD ──────────────────────────────────── */
  function generateId() {
    return `_new_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  /** Place a tile at a grid-snapped position */
  function placeTile(canvasPos: Point) {
    const tile = activeTile.value
    if (!tile) return null

    const snapped = snapToGrid(canvasPos)
    const cs = cellSize.value
    const rot = placementRotation.value

    // Compute actual width/height considering rotation
    const isRotated90 = rot === 90 || rot === 270
    const w = isRotated90 ? tile.gridH * cs : tile.gridW * cs
    const h = isRotated90 ? tile.gridW * cs : tile.gridH * cs

    // Check collision with existing elements
    const newRect = { x: snapped.x, y: snapped.y, w, h }
    const collides = elements.value.some(el => {
      const g = el.geometryJson
      if (g.x == null || g.y == null || g.width == null || g.height == null) return false
      const elRect = { x: g.x, y: g.y, w: g.width, h: g.height }
      return rectsOverlap(newRect, elRect)
    })

    // Allow overlapping — user requested free placement
    // if (collides) return null

    const style = { ...DEFAULT_STYLE[tile.mapType], ...tile.defaultStyle }

    const el: MapElementData = {
      id: generateId(),
      type: tile.mapType,
      name: tile.mapType === 'LOT' ? '' : tile.name,
      code: '',
      geometryType: tile.geometryType,
      geometryJson: {
        x: snapped.x, y: snapped.y,
        width: w, height: h,
        rotation: rot,
      },
      styleJson: style,
      metaJson: {
        tileId: tile.id,
        ...(tile.mapType === 'LOT' ? { lotStatus: 'AVAILABLE' } : {}),
      },
    }

    elements.value = [...elements.value, el]
    pushHistory()
    return el
  }

  function rectsOverlap(a: {x:number,y:number,w:number,h:number}, b: {x:number,y:number,w:number,h:number}): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  }

  function addElement(data: Partial<MapElementData>): MapElementData {
    const type = data.type ?? 'POLYGON'
    const style = { ...DEFAULT_STYLE[type], ...data.styleJson }
    const el: MapElementData = {
      id: generateId(), type,
      name: data.name ?? '', code: data.code ?? '',
      geometryType: data.geometryType ?? 'RECT',
      geometryJson: data.geometryJson ?? {},
      styleJson: style, metaJson: data.metaJson ?? {},
    }
    elements.value = [...elements.value, el]
    pushHistory()
    return el
  }

  function addElements(dataList: Partial<MapElementData>[]): MapElementData[] {
    const created: MapElementData[] = []
    for (const data of dataList) {
      const type = data.type ?? 'LOT'
      const style = { ...DEFAULT_STYLE[type], ...data.styleJson }
      const el: MapElementData = {
        id: generateId(), type,
        name: data.name ?? '', code: data.code ?? '',
        geometryType: data.geometryType ?? 'RECT',
        geometryJson: data.geometryJson ?? {},
        styleJson: style, metaJson: data.metaJson ?? {},
      }
      elements.value.push(el)
      created.push(el)
    }
    elements.value = [...elements.value]
    pushHistory()
    return created
  }

  function updateElement(id: string, patch: Partial<MapElementData>) {
    const idx = elements.value.findIndex(e => e.id === id)
    if (idx < 0) return
    const current = elements.value[idx]
    if (!current) return
    elements.value[idx] = mergeMapElement(current, patch)
    elements.value = [...elements.value]
    pushHistory()
  }

  function updateElements(updates: { id: string; patch: Partial<MapElementData> }[]) {
    for (const { id, patch } of updates) {
      const idx = elements.value.findIndex(e => e.id === id)
      if (idx < 0) continue
      const current = elements.value[idx]
      if (!current) continue
      elements.value[idx] = mergeMapElement(current, patch)
    }
    elements.value = [...elements.value]
    pushHistory()
  }

  function removeElement(id: string) {
    elements.value = elements.value.filter(e => e.id !== id)
    if (selectedId.value === id) selectedId.value = null
    const next = new Set(selectedIds.value)
    next.delete(id)
    selectedIds.value = next
    pushHistory()
  }

  function duplicateElement(id: string) {
    const src = elements.value.find(e => e.id === id)
    if (!src) return
    const clone: MapElementData = {
      ...JSON.parse(JSON.stringify(src)),
      id: generateId(),
      name: (src.name || '') + ' (cópia)',
      code: '',
    }
    const cs = cellSize.value
    if (clone.geometryJson.x != null) {
      clone.geometryJson.x! += cs
      clone.geometryJson.y! += cs
    }
    elements.value = [...elements.value, clone]
    selectedId.value = clone.id!
    pushHistory()
  }

  /* ── Lot Grid Generator ────────────────────── */
  function generateLotGrid(config: LotGridConfig, anchorPos?: Point): MapElementData[] {
    const tile = getTileById(config.tileId)
    if (!tile) return []

    const cs = cellSize.value
    const startX = anchorPos?.x ?? cs
    const startY = anchorPos?.y ?? cs
    const lotW = tile.gridW * cs
    const lotH = tile.gridH * cs
    const lots: Partial<MapElementData>[] = []
    let num = config.startNumber

    for (let row = 0; row < config.rows; row++) {
      for (let col = 0; col < config.cols; col++) {
        const x = startX + col * lotW
        const y = startY + row * lotH
        const code = `${config.blockName} - Lote ${String(num).padStart(2, '0')}`
        lots.push({
          type: 'LOT',
          name: `Lote ${String(num).padStart(2, '0')}`,
          code,
          geometryType: 'RECT',
          geometryJson: { x, y, width: lotW, height: lotH, rotation: 0 },
          styleJson: { ...tile.defaultStyle },
          metaJson: { tileId: config.tileId, lotStatus: 'AVAILABLE' },
        })
        num++
      }
    }
    return addElements(lots)
  }

  function autoNameLots(prefix: string, startNum: number = 1) {
    const lots = elements.value.filter(e => e.type === 'LOT')
    const updates: { id: string; patch: Partial<MapElementData> }[] = []
    let num = startNum
    for (const lot of lots) {
      if (!lot.id) continue
      updates.push({
        id: lot.id,
        patch: {
          name: `Lote ${String(num).padStart(2, '0')}`,
          code: `${prefix} ${String(num).padStart(2, '0')}`,
        },
      })
      num++
    }
    updateElements(updates)
  }

  /* ── Canvas navigation ─────────────────────── */
  function zoomIn() { stageScale.value = Math.min(stageScale.value * 1.2, 5) }
  function zoomOut() { stageScale.value = Math.max(stageScale.value / 1.2, 0.1) }
  function resetView() { stageScale.value = 1; stagePos.value = { x: 0, y: 0 } }

  /* ── Click handling on canvas ──────────────── */
  function handleCanvasClick(canvasPos: Point) {
    if (editorMode.value === 'place') {
      return placeTile(canvasPos)
    }
    if (editorMode.value === 'erase') {
      const hit = findElementAt(canvasPos)
      if (hit) removeElement(hit.id!)
      return null
    }
    return null
  }

  function handleElementClick(id: string, additive: boolean = false) {
    if (editorMode.value === 'select') {
      toggleSelectId(id, additive)
    } else if (editorMode.value === 'erase') {
      removeElement(id)
    }
  }

  /* ── Multi-select helpers ───────────────── */
  function toggleSelectId(id: string, additive: boolean) {
    if (additive) {
      const next = new Set(selectedIds.value)
      if (next.has(id)) {
        next.delete(id)
        if (selectedId.value === id) selectedId.value = Array.from(next)[0] ?? null
      } else {
        next.add(id)
        selectedId.value = id
      }
      selectedIds.value = next
    } else {
      selectedId.value = id
      selectedIds.value = new Set([id])
    }
  }

  function clearSelection() {
    selectedId.value = null
    selectedIds.value = new Set()
  }

  function selectByRect(rect: { x: number; y: number; w: number; h: number }) {
    const matched = elements.value.filter(el => {
      const g = el.geometryJson
      if (g.x == null || g.y == null || g.width == null || g.height == null) return false
      return rectsOverlap(
        { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
        { x: g.x, y: g.y, w: g.width, h: g.height },
      )
    })
    const ids = new Set(matched.map(e => e.id!).filter(Boolean))
    selectedIds.value = ids
    selectedId.value = Array.from(ids)[0] ?? null
  }

  function moveElements(ids: string[], dx: number, dy: number) {
    const cs = cellSize.value
    for (const id of ids) {
      const idx = elements.value.findIndex(e => e.id === id)
      if (idx < 0) continue
      const el = elements.value[idx]
      if (!el) continue
      const g = el.geometryJson
      const newX = Math.round(((g.x ?? 0) + dx) / cs) * cs
      const newY = Math.round(((g.y ?? 0) + dy) / cs) * cs
      elements.value[idx] = mergeMapElement(el, {
        geometryJson: { ...g, x: newX, y: newY },
      })
    }
    elements.value = [...elements.value]
    pushHistory()
  }

  function removeSelected() {
    if (selectedIds.value.size > 0) {
      elements.value = elements.value.filter(e => !selectedIds.value.has(e.id!))
      clearSelection()
      pushHistory()
    } else if (selectedId.value) {
      removeElement(selectedId.value)
    }
  }

  function findElementAt(pos: Point): MapElementData | null {
    for (let i = elements.value.length - 1; i >= 0; i--) {
      const el = elements.value[i]
      if (!el) continue
      const g = el.geometryJson
      if (g.x != null && g.y != null && g.width != null && g.height != null) {
        if (pos.x >= g.x && pos.x <= g.x + g.width && pos.y >= g.y && pos.y <= g.y + g.height) {
          return el
        }
      }
    }
    return null
  }

  /* ── API: Load ─────────────────────────────── */
  async function loadElements() {
    loading.value = true
    try {
      const [project, raw] = await Promise.all([
        fetchApi(`/projects/${projectId}`),
        fetchApi(`/projects/${projectId}/map-elements`),
      ])
      elements.value = (raw || []).map((e: any) => ({
        id: e.id, type: e.type,
        name: e.name ?? '', code: e.code ?? '',
        geometryType: e.geometryType,
        geometryJson: e.geometryJson,
        styleJson: e.styleJson ?? DEFAULT_STYLE[e.type as MapElementType],
        metaJson: e.metaJson ?? {},
      }))
      
      // Removed mapBaseImageUrl logic and image step check
      editorStep.value = 'build'

      history.value = [JSON.stringify(elements.value)]
      historyIndex.value = 0
      dirty.value = false
    } catch (err) {
      console.error('Failed to load map elements', err)
    }
    loading.value = false
  }

  /* ── API: Save ─────────────────────────────── */
  async function saveElements() {
    saving.value = true
    try {
      const payload = elements.value.map(e => ({
        id: e.id?.startsWith('_new_') ? undefined : e.id,
        type: e.type, name: e.name || undefined, code: e.code || undefined,
        geometryType: e.geometryType, geometryJson: e.geometryJson,
        styleJson: e.styleJson, metaJson: e.metaJson,
      }))
      const saved = await fetchApi(`/projects/${projectId}/map-elements/bulk`, {
        method: 'PUT',
        body: JSON.stringify({ elements: payload }),
      })
      elements.value = (saved || []).map((e: any) => ({
        id: e.id, type: e.type,
        name: e.name ?? '', code: e.code ?? '',
        geometryType: e.geometryType, geometryJson: e.geometryJson,
        styleJson: e.styleJson ?? DEFAULT_STYLE[e.type as MapElementType],
        metaJson: e.metaJson ?? {},
      }))
      history.value = [JSON.stringify(elements.value)]
      historyIndex.value = 0
      dirty.value = false
    } catch (err) {
      console.error('Failed to save', err)
      throw err
    } finally {
      saving.value = false
    }
  }

  return {
    // State
    elements, selectedId, selectedIds, selected, editorMode, editorStep,
    dirty, saving, loading,
    activeTileId, activeTile, placementRotation, ghostPos, cellSize,
    stageScale, stagePos, lotElements, stats, drawingHint,

    // Tile actions
    selectTile, setMode, setStep, rotatePlacement,
    updateGhostPos, clearGhost,

    // Lot grid
    showLotGrid, lotGridConfig, generateLotGrid, autoNameLots,

    // Element CRUD
    addElement, addElements, updateElement, updateElements,
    removeElement, duplicateElement, placeTile,
    deleteElement: removeElement,

    // Multi-select
    toggleSelectId, clearSelection, selectByRect, moveElements, removeSelected,

    // Canvas interaction
    handleCanvasClick, handleElementClick, snapToGrid,

    // Navigation
    zoomIn, zoomOut, resetView,

    // History
    undo, redo, pushHistory, history, historyIndex,

    // API
    loadElements, saveElements,
  }
}
