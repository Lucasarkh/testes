<template>
  <div class="pme">
    <!-- Toolbar -->
    <div class="pme__toolbar">
      <div class="pme__toolbar-left">
        <span class="pme__toolbar-title"><i class="bi bi-map" aria-hidden="true"></i> Planta Interativa</span>

        <div class="pme__mode-toggle">
          <button
            class="pme__mode-btn"
            :class="{ active: editorMode === 'view' }"
            @click="editorMode = 'view'"
          ><i class="bi bi-eye-fill" aria-hidden="true"></i> Visualizar</button>
          <button
            class="pme__mode-btn"
            :class="{ active: editorMode === 'add' }"
            @click="editorMode = 'add'"
            :disabled="!plantMap"
          >+ Adicionar</button>
          <button
            class="pme__mode-btn"
            :class="{ active: editorMode === 'batch' }"
            @click="editorMode = 'batch'"
            :disabled="!plantMap"
          ><i class="bi bi-stars" aria-hidden="true"></i> Adicionar vários</button>
          <button
            class="pme__mode-btn"
            :class="{ active: editorMode === 'move' }"
            @click="editorMode = 'move'"
            :disabled="!plantMap"
          ><i class="bi bi-arrows-move" aria-hidden="true"></i> Mover</button>
        </div>
      </div>

      <div class="pme__toolbar-right">
        <!-- Beacons toggle -->
        <label v-if="plantMap" class="pme__toggle-label">
          <input type="checkbox" v-model="showBeacons" />
          <i class="bi bi-geo-alt-fill" aria-hidden="true"></i> Exibir pontos
        </label>

        <!-- Sun path toggle -->
        <label v-if="plantMap" class="pme__toggle-label">
          <input type="checkbox" :checked="localSunPath.enabled" @change="toggleSunPath" />
          <i class="bi bi-sun-fill" aria-hidden="true"></i> Trajetória solar
        </label>

        <!-- Upload image button -->
        <button class="pme__btn pme__btn--outline" @click="triggerImageUpload" :disabled="uploadingImage">
          <span v-if="uploadingImage"><i class="bi bi-hourglass-split" aria-hidden="true"></i> Enviando...</span>
          <span v-else><i class="bi bi-image-fill" aria-hidden="true"></i> Trocar imagem</span>
        </button>
        <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="handleImageUpload" />
        <span class="pme__upload-tip">Dica: 2000 x 2000 px ou maior, com JPG/WebP otimizado.</span>

        <!-- Save button -->
        <button
          v-if="plantMap"
          class="pme__btn pme__btn--primary"
          :disabled="saving"
          @click="saveAll"
        >
          <span v-if="saving"><i class="bi bi-hourglass-split" aria-hidden="true"></i> Salvando...</span>
          <span v-else><i class="bi bi-floppy-fill" aria-hidden="true"></i> Salvar</span>
        </button>
      </div>
    </div>

    <!-- Sun path controls (shown when enabled) -->
    <div v-if="plantMap && localSunPath.enabled" class="pme__sun-controls">
      <label class="pme__sun-label">
        Ângulo (0°=L → 90°=S → 180°=O → 270°=N):
      </label>
      <input
        type="range"
        min="0"
        max="359"
        :value="localSunPath.angleDeg"
        @input="localSunPath.angleDeg = +($event.target as HTMLInputElement).value"
        style="width: 180px;"
      />
      <span class="pme__sun-value">{{ localSunPath.angleDeg }}°</span>
      <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer;">
        <input type="checkbox" v-model="localSunPath.showLabels" />
        Mostrar Nasce/Põe
      </label>
    </div>

    <!-- No image state -->
    <div v-if="!plantMap" class="pme__empty">
      <div class="pme__empty-card">
        <div style="font-size:48px; margin-bottom:12px;"><i class="bi bi-map" aria-hidden="true"></i></div>
        <h3>Nenhuma planta cadastrada</h3>
        <p>Faça upload de uma imagem da planta para começar a adicionar hotspots.</p>
        <button class="pme__btn pme__btn--primary" @click="triggerImageUpload" :disabled="uploadingImage">
          <span v-if="uploadingImage"><i class="bi bi-hourglass-split" aria-hidden="true"></i> Enviando...</span>
          <span v-else><i class="bi bi-upload" aria-hidden="true"></i> Upload da planta</span>
        </button>
        <p class="pme__upload-tip pme__upload-tip--empty">Para melhor nitidez com arquivo leve, recomendamos 2000 x 2000 px ou maior.</p>
      </div>
    </div>

    <!-- Map area -->
    <div v-else class="pme__canvas-area">
      <!-- Left: canvas -->
      <div
        class="pme__canvas-wrap"
        ref="canvasWrapEl"
        :class="{
          'mode-add': editorMode === 'add',
          'mode-move': editorMode === 'move',
          'mode-pan': canPanMap || isPanning,
        }"
        tabindex="0"
        @click="handleCanvasClick"
        @wheel.prevent="onWheel"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @keydown="onKeyDown"
        @keyup="onKeyUp"
        @touchstart.prevent="onTouchStart"
        @touchmove.prevent="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div
          ref="canvasContentEl"
          class="pme__canvas-content"
          :style="canvasContentStyle"
        >
          <!-- Image -->
          <img
            :src="plantMap.imageUrl"
            class="pme__canvas-image"
            alt="Planta"
            draggable="false"
            @load="onImageLoad"
            decoding="async"
          />

          <!-- SVG overlay -->
          <svg
            v-if="imgLoaded"
            class="pme__canvas-svg"
            :viewBox="`0 0 ${imgW} ${imgH}`"
            :width="imgW"
            :height="imgH"
            xmlns="http://www.w3.org/2000/svg"
          >
            <!-- Sun path -->
            <SunPathLine
              :enabled="localSunPath.enabled"
              :angle-deg="localSunPath.angleDeg"
              :show-labels="localSunPath.showLabels"
              :width="imgW"
              :height="imgH"
              :scale="scale"
            />

            <!-- Hotspot pins -->
            <g v-if="showBeacons">
              <g
                v-for="hs in renderedVisibleHotspots"
                :key="hs.id"
                class="pme__hs-group"
              >
                <HotspotPin
                  :hotspot="hs"
                  :container-width="imgW"
                  :container-height="imgH"
                  :selected="isHotspotSelected(hs.id)"
                  :show-label="true"
                  :pin-radius="Math.min(30, Math.max(8, 14 / canvasScale))"
                  @click="selectHotspot(hs.id)"
                  @hover-start="setHoveredHotspot"
                  @hover-end="clearHoveredHotspot"
                />

                <!-- Drag handle (invisible larger hit area in move mode) -->
                <circle
                  v-if="editorMode === 'move'"
                  :cx="hs.x * imgW"
                  :cy="hs.y * imgH"
                  :r="22 / canvasScale"
                  fill="transparent"
                  class="pme__drag-handle"
                  @mousedown.stop="startDrag(hs.id, $event)"
                  @touchstart.stop.prevent="startDragTouch(hs.id, $event)"
                />
              </g>
            </g>

            <!-- Batch markers -->
            <g v-if="editorMode === 'batch'">
              <g v-for="(m, i) in batchMarkers" :key="i" class="pme__batch-marker">
                <circle
                  :cx="m.x * imgW"
                  :cy="m.y * imgH"
                  :r="8 / canvasScale"
                  fill="#3b82f6"
                  stroke="white"
                  stroke-width="1.5"
                />
                <text
                  :x="m.x * imgW"
                  :y="m.y * imgH - (12 / canvasScale)"
                  text-anchor="middle"
                  fill="#3b82f6"
                  font-weight="bold"
                  :font-size="12 / canvasScale"
                  style="paint-order: stroke; stroke: #fff; stroke-width: 3px;"
                >#{{ i + 1 }}</text>
              </g>
            </g>
          </svg>
        </div>

        <!-- Toast hint -->
        <div v-if="editorMode === 'add'" class="pme__canvas-hint">
          Clique na planta para adicionar um hotspot. Segure Espaço para mover o mapa.
        </div>
        <div v-if="editorMode === 'batch'" class="pme__canvas-hint">
          Marque os pontos para criacao em massa. Segure Espaco para mover o mapa.
        </div>
        <div v-if="editorMode === 'move'" class="pme__canvas-hint">
          Arraste um hotspot para reposiciona-lo. Segure Espaco para mover o mapa.
        </div>
      </div>

      <!-- Right: hotspot list -->
      <div class="pme__sidebar">
        <!-- Batch UI -->
        <div v-if="editorMode === 'batch'" class="pme__batch-sidebar">
          <div class="pme__sidebar-header">
            <span><i class="bi bi-stars" aria-hidden="true"></i> Criação em massa ({{ batchMarkers.length }})</span>
            <button class="pme__btn pme__btn--sm" @click="clearBatch" :disabled="!batchMarkers.length">Limpar</button>
          </div>
          
          <div class="pme__batch-form">
            <p class="pme__batch-hint">
              1. Clique na planta para marcar vários terrenos.<br/>
              2. Defina o padrão de nome (ex: L-01).<br/>
              3. Clique em "Gerar" para criar tudo.
            </p>

            <div class="pme__field">
              <label class="pme__label">Padrão de nome:</label>
              <input v-model="batchConfig.pattern" class="pme__input" placeholder="Ex: L-01" />
            </div>

            <div class="pme__field">
              <label class="pme__label">Tipo:</label>
              <select v-model="batchConfig.type" class="pme__input pme__select">
                <option value="LOTE">Lote</option>
                <option value="QUADRA">Quadra</option>
                <option value="PORTARIA">Portaria</option>
                <option value="AREA_COMUM">Área Comum</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>

            <div class="pme__field--row">
              <label class="pme__toggle-label">
                <input type="checkbox" v-model="batchConfig.labelEnabled" />
                <span>Exibir rótulos nos pinos</span>
              </label>
            </div>

            <button
              class="pme__btn pme__btn--primary pme__btn--full"
              :disabled="!batchMarkers.length || savingBatch"
              @click="generateBatch"
            >
              <span v-if="savingBatch"><i class="bi bi-hourglass-split" aria-hidden="true"></i> Gerando...</span>
              <span v-else><i class="bi bi-box-seam-fill" aria-hidden="true"></i> Gerar {{ batchMarkers.length }} Hotspots</span>
            </button>
          </div>

          <div v-if="batchMarkers.length" class="pme__batch-list">
            <div v-for="(m, i) in batchMarkers" :key="i" class="pme__batch-item">
              <span>Ponto #{{ i + 1 }}</span>
              <button class="pme__batch-del" @click="batchMarkers.splice(i, 1)">✕</button>
            </div>
          </div>
        </div>

        <template v-else>
          <div class="pme__sidebar-header">
            <span>Hotspots ({{ localHotspots.length }})</span>
            <button
              v-if="selectedHotspotIds.length"
              class="pme__btn pme__btn--sm pme__btn--danger"
              @click="deleteSelectedHotspots"
            >Excluir ({{ selectedHotspotIds.length }})</button>
          </div>

          <!-- Quick Search -->
          <div class="pme__sidebar-search" v-if="localHotspots.length > 10">
            <input 
              v-model="hotspotSearch" 
              class="pme__input pme__input--sm" 
              placeholder="Buscar hotspot..."
              style="margin-bottom: 12px; font-size: 13px;"
            />
          </div>

          <div v-if="localHotspots.length" class="pme__sidebar-tools">
            <label class="pme__toggle-label" :style="!hasLotHotspots ? 'opacity:0.6; cursor:not-allowed;' : ''">
              <input type="checkbox" v-model="groupByBlock" :disabled="!hasLotHotspots" />
              Agrupar lotes por quadra
            </label>
            <div class="pme__sidebar-actions">
              <button class="pme__btn pme__btn--sm pme__btn--outline" @click="selectAllFiltered" :disabled="!filteredHotspots.length">
                Selecionar filtrados
              </button>
              <button class="pme__btn pme__btn--sm pme__btn--outline" @click="clearSelection" :disabled="!selectedHotspotIds.length">
                Limpar
              </button>
            </div>
            <p class="pme__sidebar-tip">Use Ctrl/Cmd + clique para seleção múltipla.</p>

            <div v-if="selectedLotHotspotsCount > 0" class="pme__bulk-card">
              <div class="pme__bulk-title">
                Quadra em lote ({{ selectedLotHotspotsCount }})
              </div>

              <div class="pme__bulk-row">
                <select v-model="bulkBlockExisting" class="pme__input pme__select pme__input--sm" :disabled="savingBulkBlock || !existingBlocks.length">
                  <option value="">Selec. quadra</option>
                  <option v-for="block in existingBlocks" :key="block" :value="block">{{ block }}</option>
                </select>
                <button
                  class="pme__btn pme__btn--sm pme__btn--primary"
                  :disabled="savingBulkBlock || !bulkBlockExisting"
                  @click="applyExistingBlockToSelected"
                >Aplicar quadra</button>
              </div>

              <div class="pme__bulk-row">
                <input
                  v-model="bulkBlockNew"
                  class="pme__input pme__input--sm"
                  placeholder="Nova quadra (ex: Q2)"
                  :disabled="savingBulkBlock"
                />
                <button
                  class="pme__btn pme__btn--sm pme__btn--primary"
                  :disabled="savingBulkBlock || !bulkBlockNew.trim()"
                  @click="applyNewBlockToSelected"
                >Criar e aplicar</button>
              </div>

              <p class="pme__sidebar-tip" v-if="selectedNonLotHotspotsCount > 0">
                {{ selectedNonLotHotspotsCount }} selecionado(s) nao-lote sera(ao) ignorado(s).
              </p>
            </div>
          </div>

          <div v-if="!localHotspots.length" class="pme__sidebar-empty">
            Nenhum hotspot ainda.<br/>Use o modo "+ Adicionar".
          </div>

          <div class="pme__hs-list" v-else>
            <template v-for="group in groupedFilteredHotspots" :key="group.key">
              <div v-if="groupByBlock" class="pme__hs-group-header">
                {{ group.label }} ({{ group.items.length }})
              </div>

              <div
                v-for="hs in group.items"
                :key="hs.id"
                class="pme__hs-item"
                :class="{ selected: isHotspotSelected(hs.id) }"
                @click="selectHotspot(hs.id, $event)"
              >
                <span class="pme__hs-icon">{{ typeIcon(hs.type) }}</span>
                <div class="pme__hs-info">
                  <span class="pme__hs-title">{{ hs.label || hs.title }}</span>
                  <span class="pme__hs-type">{{ typeLabel(hs.type) }}</span>
                </div>
                <div class="pme__hs-actions">
                  <button
                    class="pme__hs-action-btn"
                    @click.stop="duplicateHotspot(hs)"
                    title="Duplicar"
                  ><i class="bi bi-people-fill" aria-hidden="true"></i></button>
                  <button
                    class="pme__hs-action-btn"
                    @click.stop="editHotspot(hs)"
                    title="Editar"
                  ><i class="bi bi-pencil-fill" aria-hidden="true"></i></button>
                </div>
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>

    <!-- Error / success banners -->
    <div v-if="errorMsg" class="pme__banner pme__banner--error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="pme__banner pme__banner--success">{{ successMsg }}</div>

    <!-- Hotspot modal -->
    <HotspotModal
      v-model="showModal"
      :hotspot="editingHotspot"
      :initial-x="newHotspotPos.x"
      :initial-y="newHotspotPos.y"
      :saving="savingHotspot"
      :error="hotspotError"
      @save="handleHotspotSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { PlantMap, PlantHotspot, CreateHotspotPayload } from '~/composables/plantMap/types'
import { HOTSPOT_TYPE_ICONS, HOTSPOT_TYPE_LABELS } from '~/composables/plantMap/types'
import { usePlantMapApi } from '~/composables/plantMap/usePlantMapApi'
import HotspotPin from './HotspotPin.vue'
import SunPathLine from './SunPathLine.vue'
import HotspotModal from './HotspotModal.vue'

const props = defineProps<{
  projectId: string
  initialPlantMap?: PlantMap | null
}>()

const emit = defineEmits<{
  (e: 'updated', plantMap: PlantMap): void
}>()

const api = usePlantMapApi()

// ── State ─────────────────────────────────────────────────
const plantMap = ref<PlantMap | null>(props.initialPlantMap ?? null)
const localHotspots = ref<PlantHotspot[]>([...(props.initialPlantMap?.hotspots ?? [])])

const localSunPath = reactive({
  enabled: props.initialPlantMap?.sunPathEnabled ?? false,
  angleDeg: props.initialPlantMap?.sunPathAngleDeg ?? 0,
  showLabels: props.initialPlantMap?.sunPathLabelEnabled ?? true,
})

watch(
  () => props.initialPlantMap,
  (pm) => {
    // Only reset image load state if URL changed
    if (pm?.imageUrl !== plantMap.value?.imageUrl) {
      imgLoaded.value = false
    }
    
    plantMap.value = pm ?? null
    localHotspots.value = [...(pm?.hotspots ?? [])]
    localSunPath.enabled = pm?.sunPathEnabled ?? false
    localSunPath.angleDeg = pm?.sunPathAngleDeg ?? 0
    localSunPath.showLabels = pm?.sunPathLabelEnabled ?? true
  },
)

onMounted(() => {
  // Try to fit on mount if image might be cached
  if (imgLoaded.value) {
    fitImageToContainer()
  }
})

// ── UI state ──────────────────────────────────────────────
const showBeacons = ref(true)
const editorMode = ref<'view' | 'add' | 'move' | 'batch'>('view')
const selectedHotspotId = ref<string | null>(null)
const selectedHotspotIds = ref<string[]>([])
const hoveredHotspotId = ref<string | null>(null)
const batchMarkers = ref<{ x: number; y: number }[]>([])
const batchConfig = reactive({
  pattern: 'L-01',
  type: 'LOTE' as PlantHotspot['type'],
  labelEnabled: true,
})
const saving = ref(false)
const uploadingImage = ref(false)
const savingHotspot = ref(false)
const savingBatch = ref(false)
const hotspotError = ref<string | null>(null)
const errorMsg = ref<string | null>(null)
const successMsg = ref<string | null>(null)
const hotspotSearch = ref('')
const groupByBlock = ref(true)
const savingBulkBlock = ref(false)
const bulkBlockExisting = ref('')
const bulkBlockNew = ref('')
const showModal = ref(false)
const editingHotspot = ref<PlantHotspot | null>(null)
const newHotspotPos = reactive({ x: 0.5, y: 0.5 })
const fileInput = ref<HTMLInputElement | null>(null)

// ── Search & Filters ──────────────────────────────────────
const filteredHotspots = computed(() => {
  const search = hotspotSearch.value.toLowerCase().trim()
  if (!search) return localHotspots.value
  return localHotspots.value.filter(h => 
    (h.label?.toLowerCase().includes(search)) || 
    (h.title?.toLowerCase().includes(search)) ||
    (h.id.toLowerCase().includes(search))
  )
})

const hasLotHotspots = computed(() => localHotspots.value.some((h) => h.type === 'LOTE'))

const getHotspotBlock = (hs: PlantHotspot): string => {
  if (hs.type !== 'LOTE') return ''
  const lotInfo = hs.metaJson?.lotInfo
  if (!lotInfo || typeof lotInfo !== 'object' || Array.isArray(lotInfo)) return ''
  return typeof lotInfo.block === 'string' ? lotInfo.block.trim() : ''
}

const normalizeBlockName = (value: string) => value.trim()

const selectedHotspots = computed(() => {
  const selectedIds = new Set(selectedHotspotIds.value)
  return localHotspots.value.filter((h) => selectedIds.has(h.id))
})

const selectedLotHotspots = computed(() => selectedHotspots.value.filter((h) => h.type === 'LOTE'))
const selectedLotHotspotsCount = computed(() => selectedLotHotspots.value.length)
const selectedNonLotHotspotsCount = computed(() => selectedHotspots.value.length - selectedLotHotspots.value.length)

const existingBlocks = computed(() => {
  const blocks = new Set<string>()
  for (const hs of localHotspots.value) {
    const block = getHotspotBlock(hs)
    if (block) blocks.add(block)
  }

  return Array.from(blocks).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
})

const setHotspotBlockInMeta = (hs: PlantHotspot, nextBlock: string): Record<string, any> | undefined => {
  const baseMeta =
    hs.metaJson && typeof hs.metaJson === 'object' && !Array.isArray(hs.metaJson)
      ? { ...hs.metaJson }
      : {}

  const currentLotInfo =
    baseMeta.lotInfo && typeof baseMeta.lotInfo === 'object' && !Array.isArray(baseMeta.lotInfo)
      ? { ...baseMeta.lotInfo }
      : {}

  if (nextBlock) {
    currentLotInfo.block = nextBlock
  } else {
    delete currentLotInfo.block
  }

  if (Object.keys(currentLotInfo).length > 0) {
    baseMeta.lotInfo = currentLotInfo
  } else {
    delete baseMeta.lotInfo
  }

  return Object.keys(baseMeta).length > 0 ? baseMeta : undefined
}

const applyBlockToSelectedLots = async (rawBlock: string) => {
  const nextBlock = normalizeBlockName(rawBlock)
  if (!nextBlock) return

  const targets = selectedLotHotspots.value
  if (!targets.length) {
    showError('Selecione ao menos um hotspot de lote para vincular quadra.')
    return
  }

  savingBulkBlock.value = true
  try {
    const operations = targets.map((hs) => {
      const nextMeta = setHotspotBlockInMeta(hs, nextBlock)
      return api.updateHotspot(hs.id, { metaJson: nextMeta })
    })

    const results = await Promise.allSettled(operations)
    const updatedHotspots = results
      .filter((res): res is PromiseFulfilledResult<PlantHotspot> => res.status === 'fulfilled')
      .map((res) => res.value)
    const failedCount = results.length - updatedHotspots.length

    if (updatedHotspots.length > 0) {
      const updatedById = new Map(updatedHotspots.map((h) => [h.id, h]))
      localHotspots.value = localHotspots.value.map((h) => updatedById.get(h.id) || h)
      bulkBlockExisting.value = nextBlock
      bulkBlockNew.value = ''
    }

    if (failedCount === 0) {
      showSuccess(`Quadra ${nextBlock} aplicada em ${updatedHotspots.length} lote(s).`)
    } else {
      showError(`Quadra aplicada em ${updatedHotspots.length}, mas ${failedCount} falharam.`)
    }
  } catch (e: any) {
    showError(e.message ?? 'Erro ao vincular quadra em lote.')
  } finally {
    savingBulkBlock.value = false
  }
}

const applyExistingBlockToSelected = async () => {
  if (!bulkBlockExisting.value) return
  await applyBlockToSelectedLots(bulkBlockExisting.value)
}

const applyNewBlockToSelected = async () => {
  if (!bulkBlockNew.value.trim()) return
  await applyBlockToSelectedLots(bulkBlockNew.value)
}

const groupedFilteredHotspots = computed(() => {
  if (!groupByBlock.value) {
    return [{ key: '__all__', label: 'Todos', items: filteredHotspots.value }]
  }

  const groups = new Map<string, { key: string; label: string; items: PlantHotspot[]; order: number }>()

  for (const hs of filteredHotspots.value) {
    if (hs.type === 'LOTE') {
      const block = getHotspotBlock(hs)
      const key = block ? `block:${block.toUpperCase()}` : 'block:__sem_quadra__'
      const label = block ? `Quadra ${block}` : 'Sem quadra'
      if (!groups.has(key)) groups.set(key, { key, label, items: [], order: 1 })
      groups.get(key)!.items.push(hs)
      continue
    }

    const key = `type:${hs.type}`
    const label = typeLabel(hs.type)
    if (!groups.has(key)) groups.set(key, { key, label, items: [], order: 2 })
    groups.get(key)!.items.push(hs)
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    if (a.key === 'block:__sem_quadra__') return 1
    if (b.key === 'block:__sem_quadra__') return -1
    return a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })
  })
})

// ── Performance optimization (Viewport Culling) ──────────
const visibleHotspots = computed(() => {
  if (!canvasWrapEl.value || !localHotspots.value.length) return localHotspots.value
  
  const rect = canvasWrapEl.value.getBoundingClientRect()
  const cw = rect.width
  const ch = rect.height
  const currentScale = scale.value
  const currentOffset = offset.value
  
  const margin = 100 

  return localHotspots.value.filter(hs => {
    const vx = hs.x * imgW.value * currentScale + currentOffset.x
    const vy = hs.y * imgH.value * currentScale + currentOffset.y
    
    return (
      vx >= -margin &&
      vy >= -margin &&
      vx <= cw + margin &&
      vy <= ch + margin
    )
  })
})

const renderedVisibleHotspots = computed(() => {
  if (!hoveredHotspotId.value) return visibleHotspots.value
  const idx = visibleHotspots.value.findIndex((hs) => hs.id === hoveredHotspotId.value)
  if (idx === -1) return visibleHotspots.value
  const ordered = visibleHotspots.value.slice()
  const [hovered] = ordered.splice(idx, 1)
  ordered.push(hovered)
  return ordered
})

const setHoveredHotspot = (hotspot: PlantHotspot) => {
  hoveredHotspotId.value = hotspot.id
}

const clearHoveredHotspot = (hotspot: PlantHotspot) => {
  if (hoveredHotspotId.value === hotspot.id) {
    hoveredHotspotId.value = null
  }
}

// ── Image / canvas ────────────────────────────────────────
const imgLoaded = ref(false)
const imgW = ref(1200)
const imgH = ref(800)
const canvasWrapEl = ref<HTMLElement | null>(null)
const canvasContentEl = ref<HTMLElement | null>(null)

// Zoom/pan state (manual, to avoid event conflicts with drag)
const scale = ref(1)
const offset = ref({ x: 0, y: 0 })
const canvasScale = computed(() => scale.value)
const canvasContentStyle = computed(() => ({
  transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})`,
  transformOrigin: '0 0',
}))

let isPanning = false
let panStart = { x: 0, y: 0 }
let panOffsetStart = { x: 0, y: 0 }
let panMoved = false
let isDraggingHotspot = false
let draggingHotspotId: string | null = null
const isSpacePressed = ref(false)
let skipNextCanvasClick = false

const canPanMap = computed(() => isSpacePressed.value || editorMode.value === 'view' || editorMode.value === 'move')

const onImageLoad = (e: Event) => {
  const img = e.target as HTMLImageElement
  imgW.value = img.naturalWidth || plantMap.value?.imageWidth || 1200
  imgH.value = img.naturalHeight || plantMap.value?.imageHeight || 800
  imgLoaded.value = true
  
  // Fit to container on load
  nextTick(() => {
    fitImageToContainer()
  })
}

const fitImageToContainer = () => {
  if (!canvasWrapEl.value || !imgW.value || !imgH.value) return
  
  const rect = canvasWrapEl.value.getBoundingClientRect()
  const cw = rect.width
  const ch = rect.height
  
  if (cw <= 0 || ch <= 0) return

  // Calculate scale to "cover" the container
  const scaleX = cw / imgW.value
  const scaleY = ch / imgH.value
  const newScale = Math.max(scaleX, scaleY)
  
  scale.value = newScale
  
  // Center it
  offset.value = {
    x: (cw - imgW.value * newScale) / 2,
    y: (ch - imgH.value * newScale) / 2
  }
}

// ── Constraints ───────────────────────────────────────────
const clampOffset = (newScale: number, newX: number, newY: number) => {
  if (!canvasWrapEl.value) return { x: newX, y: newY }
  const rect = canvasWrapEl.value.getBoundingClientRect()
  const cw = rect.width
  const ch = rect.height
  
  const contentW = imgW.value * newScale
  const contentH = imgH.value * newScale
  
  let x = newX
  let y = newY
  
  // If image is wider than container, don't let edges leave
  if (contentW > cw) {
    x = Math.min(0, Math.max(cw - contentW, x))
  } else {
    // Keep centered
    x = (cw - contentW) / 2
  }
  
  // If image is taller than container
  if (contentH > ch) {
    y = Math.min(0, Math.max(ch - contentH, y))
  } else {
    // Keep centered
    y = (ch - contentH) / 2
  }
  
  return { x, y }
}

// ── Wheel zoom ─────────────────────────────────────────────
const onWheel = (e: WheelEvent) => {
  e.preventDefault()
  const rect = canvasWrapEl.value!.getBoundingClientRect()
  const ox = e.clientX - rect.left
  const oy = e.clientY - rect.top
  const delta = e.deltaY > 0 ? -0.15 : 0.15
  
  // Calculate minimum scale to keep image covering area
  const minS = Math.max(rect.width / imgW.value, rect.height / imgH.value)
  const newScale = Math.min(10, Math.max(minS, scale.value + delta * scale.value))
  
  const ratio = newScale / scale.value
  const newX = ox - ratio * (ox - offset.value.x)
  const newY = oy - ratio * (oy - offset.value.y)
  
  const clamped = clampOffset(newScale, newX, newY)
  offset.value = clamped
  scale.value = newScale
}

// ── Mouse events ───────────────────────────────────────────
const onMouseDown = (e: MouseEvent) => {
  if (e.button !== 0 && e.button !== 1) return

  if (canPanMap.value) {
    isPanning = true
    panMoved = false
    panStart = { x: e.clientX, y: e.clientY }
    panOffsetStart = { ...offset.value }
    canvasWrapEl.value?.focus()
    e.preventDefault()
  }
}

const onMouseMove = (e: MouseEvent) => {
  if (isPanning) {
    const dx = e.clientX - panStart.x
    const dy = e.clientY - panStart.y
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      panMoved = true
    }
    const newX = panOffsetStart.x + e.clientX - panStart.x
    const newY = panOffsetStart.y + e.clientY - panStart.y
    offset.value = clampOffset(scale.value, newX, newY)
    return
  }
  if (isDraggingHotspot && draggingHotspotId) {
    updateHotspotPosByMouse(e.clientX, e.clientY)
  }
}

const onMouseUp = () => {
  if (isPanning && panMoved) {
    skipNextCanvasClick = true
  }
  if (isDraggingHotspot && draggingHotspotId) {
    commitHotspotPosition(draggingHotspotId)
  }
  isPanning = false
  isDraggingHotspot = false
  draggingHotspotId = null
}

// ── Touch events ────────────────────────────────────────────
let lastTouchDist = 0

const onTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 2) {
    lastTouchDist = Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY,
    )
  } else if (e.touches.length === 1 && (editorMode.value === 'view' || editorMode.value === 'move')) {
    isPanning = true
    panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    panOffsetStart = { ...offset.value }
  }
}

const onTouchMove = (e: TouchEvent) => {
  if (e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[1].clientX - e.touches[0].clientX,
      e.touches[1].clientY - e.touches[0].clientY,
    )
    const delta = (dist - lastTouchDist) / 200
    lastTouchDist = dist
    const rect = canvasWrapEl.value!.getBoundingClientRect()
    const cx = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left
    const cy = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top
    const minS = Math.max(rect.width / imgW.value, rect.height / imgH.value)
    const newScale = Math.min(10, Math.max(minS, scale.value + delta * scale.value))
    const ratio = newScale / scale.value
    const newX = cx - ratio * (cx - offset.value.x)
    const newY = cy - ratio * (cy - offset.value.y)
    offset.value = clampOffset(newScale, newX, newY)
    scale.value = newScale
  } else if (e.touches.length === 1 && isPanning) {
    const newX = panOffsetStart.x + e.touches[0].clientX - panStart.x
    const newY = panOffsetStart.y + e.touches[0].clientY - panStart.y
    offset.value = clampOffset(scale.value, newX, newY)
  }
}

const onTouchEnd = () => {
  isPanning = false
}

// ── Drag hotspot ────────────────────────────────────────────
const startDrag = (id: string, e: MouseEvent) => {
  if (editorMode.value !== 'move' || isSpacePressed.value) return
  isDraggingHotspot = true
  draggingHotspotId = id
  selectedHotspotId.value = id
  selectedHotspotIds.value = [id]
  e.preventDefault()
}

const startDragTouch = (id: string, e: TouchEvent) => {
  if (editorMode.value !== 'move' || isSpacePressed.value) return
  isDraggingHotspot = true
  draggingHotspotId = id
  selectedHotspotId.value = id
  selectedHotspotIds.value = [id]
}

const clientToNormalized = (clientX: number, clientY: number) => {
  const rect = canvasWrapEl.value!.getBoundingClientRect()
  const localX = (clientX - rect.left - offset.value.x) / (scale.value * imgW.value)
  const localY = (clientY - rect.top - offset.value.y) / (scale.value * imgH.value)
  return {
    x: Math.min(1, Math.max(0, localX)),
    y: Math.min(1, Math.max(0, localY)),
  }
}

const updateHotspotPosByMouse = (clientX: number, clientY: number) => {
  if (!draggingHotspotId) return
  const { x, y } = clientToNormalized(clientX, clientY)
  const idx = localHotspots.value.findIndex((h) => h.id === draggingHotspotId)
  if (idx !== -1) {
    localHotspots.value[idx] = { ...localHotspots.value[idx], x, y }
  }
}

const commitHotspotPosition = async (id: string) => {
  const hs = localHotspots.value.find((h) => h.id === id)
  if (!hs) return
  try {
    await api.updateHotspot(id, { x: hs.x, y: hs.y })
  } catch (e: any) {
    showError(e.message)
  }
}

// ── Canvas click (add/batch mode) ─────────────────────────
const handleCanvasClick = (e: MouseEvent) => {
  if (skipNextCanvasClick) {
    skipNextCanvasClick = false
    return
  }
  if (isSpacePressed.value) return
  if (editorMode.value === 'view' || editorMode.value === 'move') return
  if (isDraggingHotspot) return
  const { x, y } = clientToNormalized(e.clientX, e.clientY)

  if (editorMode.value === 'batch') {
    batchMarkers.value.push({ x, y })
    return
  }

  newHotspotPos.x = x
  newHotspotPos.y = y
  editingHotspot.value = null
  hotspotError.value = null
  showModal.value = true
}

// ── Hotspot selection ──────────────────────────────────────
const isHotspotSelected = (id: string) => selectedHotspotIds.value.includes(id)

const selectHotspot = (id: string, event?: MouseEvent) => {
  const additive = !!event && (event.ctrlKey || event.metaKey)

  if (additive) {
    if (isHotspotSelected(id)) {
      selectedHotspotIds.value = selectedHotspotIds.value.filter((item) => item !== id)
    } else {
      selectedHotspotIds.value = [...selectedHotspotIds.value, id]
    }
  } else if (selectedHotspotIds.value.length === 1 && selectedHotspotIds.value[0] === id) {
    selectedHotspotIds.value = []
  } else {
    selectedHotspotIds.value = [id]
  }

  selectedHotspotId.value = selectedHotspotIds.value[0] ?? null
}

const clearSelection = () => {
  selectedHotspotIds.value = []
  selectedHotspotId.value = null
}

const selectAllFiltered = () => {
  selectedHotspotIds.value = filteredHotspots.value.map((h) => h.id)
  selectedHotspotId.value = selectedHotspotIds.value[0] ?? null
}

const editHotspot = (hs: PlantHotspot) => {
  selectedHotspotIds.value = [hs.id]
  selectedHotspotId.value = hs.id
  editingHotspot.value = hs
  hotspotError.value = null
  showModal.value = true
}

const duplicateHotspot = async (hs: PlantHotspot) => {
  if (!plantMap.value) return
  savingHotspot.value = true
  try {
    const payload: CreateHotspotPayload = {
      type: hs.type,
      title: `${hs.title} (cópia)`,
      description: hs.description || '',
      x: Math.min(0.99, hs.x + 0.02),
      y: Math.min(0.99, hs.y + 0.02),
      label: hs.label ? `${hs.label} (cópia)` : '',
      labelEnabled: hs.labelEnabled,
      labelOffsetX: hs.labelOffsetX,
      labelOffsetY: hs.labelOffsetY,
      loteStatus: hs.loteStatus || 'AVAILABLE',
      metaJson: hs.metaJson || {},
    }
    const created = await api.createHotspot(plantMap.value.id, payload)
    localHotspots.value.push(created)
    showSuccess('Hotspot duplicado!')
  } catch (e: any) {
    showError(e.message ?? 'Erro ao duplicar hotspot.')
  } finally {
    savingHotspot.value = false
  }
}

// ── Hotspot CRUD ───────────────────────────────────────────
const handleHotspotSave = async (payload: CreateHotspotPayload) => {
  if (!plantMap.value) return
  savingHotspot.value = true
  hotspotError.value = null
  try {
    if (editingHotspot.value) {
      // Update existing
      const updated = await api.updateHotspot(editingHotspot.value.id, payload)
      const idx = localHotspots.value.findIndex((h) => h.id === editingHotspot.value!.id)
      if (idx !== -1) localHotspots.value[idx] = updated
      showSuccess('Hotspot atualizado!')
    } else {
      // Create new
      const created = await api.createHotspot(plantMap.value.id, payload)
      localHotspots.value.push(created)
      showSuccess('Hotspot criado!')
    }
    showModal.value = false
    editorMode.value = 'view'
  } catch (e: any) {
    hotspotError.value = e.message ?? 'Erro ao salvar hotspot.'
  } finally {
    savingHotspot.value = false
  }
}

// ── Batch Generation ──────────────────────────────────────
const clearBatch = () => {
  batchMarkers.value = []
}

const generateBatch = async () => {
  if (!plantMap.value || !batchMarkers.value.length) return
  savingBatch.value = true
  
  try {
    // Parse pattern e.g., "L-01" or "Q-001"
    const match = batchConfig.pattern.match(/^(.+?)(\d+)$/)
    let prefix = batchConfig.pattern
    let nextNum = 1
    let padding = 0

    if (match) {
      prefix = match[1]
      padding = match[2].length
      nextNum = parseInt(match[2], 10)
    }

    // Check existing hotspots to continue sequence if needed
    const existingNums = localHotspots.value
      .map(hs => {
        const hsLabel = hs.label || hs.title
        const m = hsLabel.match(new RegExp(`^${prefix}(\\d+)$`))
        return m ? parseInt(m[1], 10) : null
      })
      .filter((n): n is number => n !== null)

    if (existingNums.length > 0) {
      const maxExisting = Math.max(...existingNums)
      nextNum = Math.max(nextNum, maxExisting + 1)
    }

    // Build all payloads locally (no async needed here)
    const payloads: CreateHotspotPayload[] = []
    for (const marker of batchMarkers.value) {
      const currentLabel = `${prefix}${nextNum.toString().padStart(padding, '0')}`

      payloads.push({
        type: batchConfig.type,
        title: currentLabel,
        label: currentLabel,
        description: '',
        x: marker.x,
        y: marker.y,
        labelEnabled: batchConfig.labelEnabled,
        labelOffsetX: 0,
        labelOffsetY: 0,
        loteStatus: 'AVAILABLE',
        metaJson: {},
      })

      nextNum++
    }

    // Single request — all hotspots created in one DB transaction
    const newHotspots = await api.createHotspotsBulk(plantMap.value.id, payloads)

    localHotspots.value.push(...newHotspots)
    showSuccess(`${newHotspots.length} hotspots criados com sucesso!`)
    clearBatch()
    editorMode.value = 'view'
  } catch (e: any) {
    showError(e.message ?? 'Erro ao gerar hotspots em lote.')
  } finally {
    savingBatch.value = false
  }
}

const deleteSelectedHotspots = async () => {
  const ids = [...selectedHotspotIds.value]
  if (!ids.length) return

  const confirmText =
    ids.length === 1
      ? 'Excluir este hotspot?'
      : `Excluir ${ids.length} hotspots selecionados?`

  if (!confirm(confirmText)) return

  const results = await Promise.allSettled(ids.map((id) => api.deleteHotspot(id)))
  const deletedIds = ids.filter((_, idx) => results[idx].status === 'fulfilled')
  const failedCount = results.length - deletedIds.length

  if (deletedIds.length) {
    localHotspots.value = localHotspots.value.filter((h) => !deletedIds.includes(h.id))
  }

  selectedHotspotIds.value = []
  selectedHotspotId.value = null

  if (failedCount === 0) {
    showSuccess(deletedIds.length === 1 ? 'Hotspot excluído.' : `${deletedIds.length} hotspots excluídos.`)
  } else {
    showError(`Foram excluídos ${deletedIds.length}, mas ${failedCount} falharam.`)
  }
}

watch(
  () => localHotspots.value.map((h) => h.id),
  (ids) => {
    const currentIds = new Set(ids)
    selectedHotspotIds.value = selectedHotspotIds.value.filter((id) => currentIds.has(id))
    selectedHotspotId.value = selectedHotspotIds.value[0] ?? null
    if (hoveredHotspotId.value && !currentIds.has(hoveredHotspotId.value)) {
      hoveredHotspotId.value = null
    }
  },
)

// ── Save all (sun path + plant map) ────────────────────────
const saveAll = async () => {
  if (!plantMap.value) return
  saving.value = true
  try {
    const updated = await api.updatePlantMap(plantMap.value.id, {
      sunPathEnabled: localSunPath.enabled,
      sunPathAngleDeg: localSunPath.angleDeg,
      sunPathLabelEnabled: localSunPath.showLabels,
    })
    plantMap.value = { ...updated, hotspots: localHotspots.value }
    emit('updated', plantMap.value)
    showSuccess('Configurações salvas!')
  } catch (e: any) {
    showError(e.message)
  } finally {
    saving.value = false
  }
}

// ── Sun path toggle ────────────────────────────────────────
const toggleSunPath = () => {
  localSunPath.enabled = !localSunPath.enabled
}

// ── Image upload ───────────────────────────────────────────
const triggerImageUpload = () => fileInput.value?.click()

const MIN_RECOMMENDED_RESOLUTION = 2000
const MAX_RECOMMENDED_SIZE_MB = 6

const readImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const tempUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      const width = img.naturalWidth || 0
      const height = img.naturalHeight || 0
      URL.revokeObjectURL(tempUrl)
      resolve({ width, height })
    }

    img.onerror = () => {
      URL.revokeObjectURL(tempUrl)
      reject(new Error('Nao foi possivel ler as dimensoes da imagem.'))
    }

    img.src = tempUrl
  })

const handleImageUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const { width, height } = await readImageDimensions(file)
    const fileSizeMb = file.size / (1024 * 1024)

    if (width < MIN_RECOMMENDED_RESOLUTION || height < MIN_RECOMMENDED_RESOLUTION) {
      showSuccess(`Dica: imagem com ${width}x${height}px. Recomendado: 2000x2000px ou maior.`)
    } else if (fileSizeMb > MAX_RECOMMENDED_SIZE_MB) {
      showSuccess(`Dica: arquivo com ${fileSizeMb.toFixed(1)}MB. Se possivel, comprima para upload mais rapido.`)
    }
  } catch {
    // Se nao for possivel ler metadados da imagem, seguimos com o upload normalmente.
  }

  uploadingImage.value = true
  try {
    const { imageUrl } = await api.uploadPlantImage(props.projectId, file)
    if (plantMap.value) {
      // Update existing plant map
      const updated = await api.updatePlantMap(plantMap.value.id, { imageUrl })
      plantMap.value = { ...updated, hotspots: localHotspots.value }
    } else {
      // Create new plant map
      const created = await api.createPlantMap(props.projectId, { imageUrl })
      plantMap.value = created
      localHotspots.value = []
    }
    imgLoaded.value = false // force re-load
    emit('updated', plantMap.value!)
    showSuccess('Imagem atualizada!')
  } catch (e: any) {
    showError(e.message ?? 'Erro no upload.')
  } finally {
    uploadingImage.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

// ── Utils ──────────────────────────────────────────────────
const typeIcon = (type: PlantHotspot['type']) => HOTSPOT_TYPE_ICONS[type]
const typeLabel = (type: PlantHotspot['type']) => HOTSPOT_TYPE_LABELS[type]

const showSuccess = (msg: string) => {
  successMsg.value = msg
  errorMsg.value = null
  setTimeout(() => (successMsg.value = null), 3000)
}

const showError = (msg: string) => {
  errorMsg.value = msg
  setTimeout(() => (errorMsg.value = null), 5000)
}

const onKeyDown = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement | null
  const tag = target?.tagName
  const isTypingField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!target?.isContentEditable
  if (isTypingField) return

  if (e.code === 'Space') {
    isSpacePressed.value = true
    e.preventDefault()
  }
}

const onKeyUp = (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    isSpacePressed.value = false
    e.preventDefault()
  }
}

const onWindowBlur = () => {
  isSpacePressed.value = false
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onWindowBlur)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onWindowBlur)
})
</script>

<style scoped>
/* ── Layout ────────────────────────────────────────────── */
.pme {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0f172a;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  min-height: 500px;
  color: #e2e8f0;
}

/* ── Toolbar ───────────────────────────────────────────── */
.pme__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
}
.pme__toolbar-left,
.pme__toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.pme__toolbar-title {
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
}

.pme__mode-toggle {
  display: flex;
  background: #0f172a;
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}
.pme__mode-btn {
  padding: 5px 12px;
  border: none;
  background: transparent;
  color: #94a3b8;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.pme__mode-btn:hover:not(:disabled) { color: #e2e8f0; background: #1e293b; }
.pme__mode-btn.active { background: #3b82f6; color: white; }
.pme__mode-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.pme__toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
  color: #94a3b8;
}
.pme__toggle-label input { cursor: pointer; }

.pme__upload-tip {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.25;
  max-width: 320px;
}

.pme__upload-tip--empty {
  margin: 12px 0 0;
  text-align: center;
}

/* ── Sun path controls ─────────────────────────────────── */
.pme__sun-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: #1e2a3a;
  border-bottom: 1px solid #334155;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.pme__sun-label {
  font-size: 12px;
  color: #94a3b8;
}
.pme__sun-value {
  font-size: 13px;
  font-weight: 700;
  color: #fbbf24;
  min-width: 36px;
}

/* ── Empty state ───────────────────────────────────────── */
.pme__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}
.pme__empty-card {
  text-align: center;
  background: #1e293b;
  border-radius: 16px;
  padding: 40px;
  max-width: 360px;
}
.pme__empty-card h3 { margin: 0 0 8px; font-size: 18px; color: #f1f5f9; }
.pme__empty-card p { font-size: 14px; color: #64748b; margin: 0 0 20px; }

/* ── Canvas area ───────────────────────────────────────── */
.pme__canvas-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.pme__canvas-wrap {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #0f172a;
}
.pme__canvas-wrap.mode-add { cursor: crosshair; }
.pme__canvas-wrap.mode-move { cursor: default; }
.pme__canvas-wrap.mode-pan { cursor: grab; }
.pme__canvas-wrap.mode-pan:active { cursor: grabbing; }

.pme__canvas-content {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  will-change: transform;
}
.pme__canvas-image {
  display: block;
  max-width: none;
  -webkit-user-drag: none;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: high-quality;
  transform: translateZ(0); /* Force GPU acceleration */
}
.pme__canvas-svg {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: all;
}

.pme__drag-handle { cursor: grab; }
.pme__drag-handle:active { cursor: grabbing; }

.pme__canvas-hint {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.7);
  color: #fbbf24;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
  white-space: nowrap;
}

/* ── Sidebar ────────────────────────────────────────────── */
.pme__sidebar {
  width: 280px;
  flex-shrink: 0;
  background: #1e293b;
  border-left: 1px solid #334155;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.pme__sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 8px;
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #334155;
  flex-shrink: 0;
}
.pme__sidebar-empty {
  padding: 20px 12px;
  font-size: 12px;
  color: #475569;
  text-align: center;
  line-height: 1.5;
}
.pme__hs-list { 
  overflow-y: auto; 
  flex: 1; 
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #475569 transparent;
}
.pme__hs-list::-webkit-scrollbar {
  width: 5px;
}
.pme__hs-list::-webkit-scrollbar-track {
  background: transparent;
}
.pme__hs-list::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 10px;
}
.pme__hs-list::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.pme__sidebar-tools {
  padding: 10px 12px;
  border-bottom: 1px solid #334155;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pme__sidebar-actions {
  display: flex;
  gap: 6px;
}

.pme__sidebar-actions .pme__btn {
  flex: 1;
}

.pme__sidebar-tip {
  margin: 0;
  font-size: 11px;
  color: #64748b;
}

.pme__bulk-card {
  background: #172033;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pme__bulk-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #93c5fd;
}

.pme__bulk-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
  align-items: stretch;
}

.pme__bulk-row .pme__btn {
  width: auto;
  min-width: 110px;
}

.pme__hs-group-header {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #94a3b8;
  background: #172033;
  border-bottom: 1px solid #334155;
}

.pme__hs-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #1e293b;
  transition: background 0.1s;
}
.pme__hs-item:hover { background: #0f172a; }
.pme__hs-item.selected { background: #172554; border-left: 3px solid #3b82f6; }
.pme__hs-icon { font-size: 18px; flex-shrink: 0; }
.pme__hs-info { flex: 1; min-width: 0; }
.pme__hs-title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pme__hs-type { font-size: 11px; color: #64748b; }
.pme__hs-actions {
  display: flex;
  gap: 4px;
}
.pme__hs-action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px 6px;
  border-radius: 4px;
  opacity: 0.5;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pme__hs-action-btn:hover {
  opacity: 1;
  background: #334155;
}

/* ── Batch Sidebar & Forms ────────────────────────────── */
.pme__batch-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.pme__batch-form {
  padding: 16px;
  border-bottom: 1px solid #1e293b;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pme__batch-hint {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
  margin: 0;
  background: #0f172a;
  padding: 8px;
  border-radius: 6px;
}
.pme__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pme__field--row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.pme__label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.pme__input {
  background: #0f172a !important;
  border: 1px solid #334155 !important;
  border-radius: 6px !important;
  padding: 8px 10px !important;
  color: #f1f5f9 !important;
  font-size: 13px !important;
  transition: border-color 0.2s;
  width: 100%;
}
.pme__input:focus {
  outline: none;
  border-color: #3b82f6 !important;
}
.pme__select {
  appearance: listbox;
  cursor: pointer;
}
.pme__batch-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  scrollbar-width: thin;
  scrollbar-color: #475569 transparent;
}
.pme__batch-list::-webkit-scrollbar {
  width: 5px;
}
.pme__batch-list::-webkit-scrollbar-track {
  background: transparent;
}
.pme__batch-list::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 10px;
}
.pme__batch-list::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.pme__batch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1e293b;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  color: #cbd5e1;
}
.pme__batch-del {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 2px 5px;
  border-radius: 4px;
}
.pme__batch-del:hover {
  background: #334155;
  color: #ef4444;
}

.pme__btn--full {
  width: 100%;
}

/* ── Buttons ────────────────────────────────────────────── */
.pme__btn {
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
  white-space: nowrap;
}
.pme__btn--primary { background: #2563eb; color: white; }
.pme__btn--primary:hover:not(:disabled) { background: #1d4ed8; }
.pme__btn--outline {
  background: transparent;
  color: #94a3b8;
  border: 1.5px solid #334155;
}
.pme__btn--outline:hover:not(:disabled) { border-color: #94a3b8; color: #e2e8f0; }
.pme__btn--danger { background: #ef4444; color: white; }
.pme__btn--danger:hover { background: #dc2626; }
.pme__btn--sm { padding: 4px 10px; font-size: 11px; }
.pme__btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Banners ────────────────────────────────────────────── */
.pme__banner {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  z-index: 100;
  pointer-events: none;
  white-space: nowrap;
  animation: fadeInBanner 0.2s ease;
}
.pme__banner--error { background: #fee2e2; color: #b91c1c; }
.pme__banner--success { background: #dcfce7; color: #166534; }
@keyframes fadeInBanner {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@media (max-width: 640px) {
  .pme__sidebar { width: 200px; }
  .pme__toolbar { flex-direction: column; align-items: flex-start; }
  .pme__bulk-row {
    grid-template-columns: 1fr;
  }
  .pme__bulk-row .pme__btn {
    width: 100%;
  }
}
</style>
