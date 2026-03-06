<template>
  <div class="panorama-editor">
    <!-- ── Toolbar ─────────────────────────────────────── -->
    <div class="pe-toolbar">
      <div class="pe-toolbar-left">
        <!-- Panorama selector / create -->
        <select
          v-if="panoramas.length"
          v-model="activePanoramaId"
          class="pe-select"
          @change="loadPanorama"
        >
          <option v-for="p in panoramas" :key="p.id" :value="p.id">
            {{ p.title }}
          </option>
        </select>
        <button class="btn btn-sm btn-outline" @click="showCreatePanorama = true">
          + Novo Panorama
        </button>
      </div>

      <div class="pe-toolbar-right">
        <template v-if="activePanorama">
          <!-- Publication button -->
          <button
            class="btn btn-sm"
            :class="activePanorama.published ? 'btn-outline-danger' : 'btn-outline-success'"
            style="margin-right: 8px;"
            :title="activePanorama.published ? 'Clique para despublicar' : 'Clique para publicar'"
            @click="togglePublication"
          >
            {{ activePanorama.published ? 'Despublicar' : 'Publicar' }}
          </button>

          <!-- Mode buttons -->
          <button
            class="btn btn-sm"
            :class="mode === 'view' ? 'btn-primary' : 'btn-ghost'"
            @click="mode = 'view'"
          >
            👁️ Visualizar
          </button>
          <button
            class="btn btn-sm"
            :class="mode === 'add-beacon' ? 'btn-primary' : 'btn-ghost'"
            @click="mode = 'add-beacon'"
          >
            📍 Adicionar Beacon
          </button>
          <button
            class="btn btn-sm"
            :class="mode === 'move' ? 'btn-primary' : 'btn-ghost'"
            @click="mode = 'move'"
          >
            ✋ Mover
          </button>
          <button class="btn btn-sm btn-outline" @click="showSettings = true">
            ⚙️ Configurações
          </button>
        </template>
      </div>
    </div>

    <!-- ── Main Area ───────────────────────────────────── -->
    <div class="pe-main">
      <!-- Sidebar -->
      <div class="pe-sidebar">
        <!-- Snapshots section -->
        <div v-if="activePanorama" class="pe-section">
          <div class="pe-section-header">
            <h3>📷 Snapshots ({{ activePanorama.snapshots.length }})</h3>
            <button class="btn btn-xs btn-outline" @click="showAddSnapshot = true">+ Adicionar</button>
          </div>
          <div class="pe-list">
            <div
              v-for="snap in activePanorama.snapshots"
              :key="snap.id"
              class="pe-list-item"
              :class="{ 'pe-list-item--active': activeSnapshotId === snap.id }"
              @click="activeSnapshotId = snap.id"
            >
              <img :src="snap.imageUrl" class="pe-thumb" />
              <div class="pe-list-item-info">
                <span class="pe-list-item-label">{{ snap.label }}</span>
                <span class="pe-list-item-meta">#{{ snap.sortOrder }}</span>
              </div>
              <button class="btn btn-xs btn-ghost pe-list-item-del" @click.stop="removeSnapshot(snap.id)">
                🗑️
              </button>
            </div>
            <p v-if="!activePanorama.snapshots.length" class="pe-empty">Nenhum snapshot ainda. Adicione imagens de cada período.</p>
          </div>
        </div>

        <!-- Beacons section -->
        <div v-if="activePanorama" class="pe-section">
          <div class="pe-section-header">
            <h3>📌 Beacons ({{ activePanorama.beacons.length }})</h3>
          </div>
          <div class="pe-list">
            <div
              v-for="beacon in activePanorama.beacons"
              :key="beacon.id"
              class="pe-list-item"
              @click="editBeacon(beacon)"
            >
              <div
                class="pe-beacon-color"
                :style="{ background: beaconStyleColor(beacon.style as any) }"
              ></div>
              <div class="pe-list-item-info">
                <span class="pe-list-item-label">{{ beacon.title }}</span>
                <span class="pe-list-item-meta">
                  {{ beacon.visible ? '👁️' : '🚫' }}
                  x={{ beacon.x.toFixed(2) }} y={{ beacon.y.toFixed(2) }}
                </span>
              </div>
              <button class="btn btn-xs btn-ghost pe-list-item-del" @click.stop="removeBeacon(beacon.id)">
                🗑️
              </button>
            </div>
            <p v-if="!activePanorama.beacons.length" class="pe-empty">
              {{ mode === 'add-beacon' ? 'Clique na imagem para posicionar um beacon.' : 'Nenhum beacon. Use o modo "Adicionar Beacon".' }}
            </p>
          </div>
        </div>

        <div v-if="!activePanorama" class="pe-empty" style="padding: 24px;">
          Crie ou selecione um panorama para começar.
        </div>
      </div>

      <!-- Canvas -->
      <div class="pe-canvas-container" ref="canvasContainerRef">
        <div v-if="!activePanorama" class="pe-canvas-empty">
          <p>Nenhum panorama selecionado</p>
        </div>

        <!-- 360 View/Edit Mode -->
        <div v-else-if="activePanorama.projection === 'EQUIRECTANGULAR' && (mode === 'view' || mode === 'add-beacon')" class="pe-canvas-view">
          <PanoramaViewer
            :panorama="activePanorama"
            :active-snapshot-id="activeSnapshotId"
            :editable="mode === 'add-beacon'"
            :show-beacon-info="false"
            @beaconClick="editBeacon"
            @viewClick="on360ViewClick"
          />
        </div>

        <div
          v-else-if="!activeSnapshotUrl"
          class="pe-canvas-empty"
        >
          <p>Adicione um snapshot com imagem para visualizar.</p>
        </div>

        <div
          v-else
          class="pe-canvas"
          ref="canvasRef"
          :style="canvasStyle"
          @wheel.prevent="onWheel"
          @mousedown.prevent="onMouseDown"
        >
          <div v-if="activePanorama.projection === 'EQUIRECTANGULAR'" class="pe-360-badge">
            Vista 360° (Modo Edição Plana)
          </div>
          <img
            :src="activeSnapshotUrl"
            class="pe-canvas-image"
            draggable="false"
            @load="onImageLoad"
          />

          <!-- Beacons -->
          <PanoramaBeaconPin
            v-for="b in activePanorama.beacons"
            :key="b.id"
            :beacon="b"
            :container-width="imgW"
            :container-height="imgH"
            :editable="mode === 'move'"
            :is-dragging="draggingBeaconId === b.id"
            @click="onBeaconClick"
            @drag-start="onBeaconDragStart"
          />

          <!-- Placement preview -->
          <div
            v-if="mode === 'add-beacon' && placementPreview"
            class="pe-placement-preview"
            :style="{ left: `${placementPreview.x * 100}%`, top: `${placementPreview.y * 100}%` }"
          >
            <div class="pe-placement-dot"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Create Panorama Modal ──────────────────────── -->
    <Teleport to="body">
      <div v-if="showCreatePanorama" class="modal-backdrop" @click.self="showCreatePanorama = false">
        <div class="modal-content" style="max-width: 440px;">
          <h2>Novo Panorama</h2>
          <div class="form-group">
            <label>Título</label>
            <input v-model="newPanoramaTitle" class="form-input" placeholder="Vista Geral" />
          </div>
          <div class="form-group">
            <label>Tipo de visualização</label>
            <select v-model="newPanoramaProjection" class="form-input">
              <option value="FLAT">Foto Estática (Plana)</option>
              <option value="EQUIRECTANGULAR">Panorama 360° (Equerretangular)</option>
            </select>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" @click="showCreatePanorama = false">Cancelar</button>
            <button class="btn btn-primary" :disabled="creatingPanorama" @click="doCreatePanorama">
              {{ creatingPanorama ? 'Criando...' : 'Criar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Add Snapshot Modal ─────────────────────────── -->
    <Teleport to="body">
      <div v-if="showAddSnapshot" class="modal-backdrop" @click.self="showAddSnapshot = false">
        <div class="modal-content" style="max-width: 480px;">
          <h2>Adicionar Snapshot</h2>
          <div class="form-group">
            <label>Rótulo do período</label>
            <input v-model="newSnapshotLabel" class="form-input" placeholder="Novembro/25" />
          </div>
          <div class="form-group">
            <label>Imagem</label>
            <input type="file" accept="image/*" class="form-input" @change="onSnapshotFileSelect" />
          </div>
          <p v-if="snapshotUploadProgress" class="pe-upload-progress">{{ snapshotUploadProgress }}</p>
          <div class="modal-actions">
            <button class="btn btn-ghost" @click="showAddSnapshot = false">Cancelar</button>
            <button class="btn btn-primary" :disabled="uploadingSnapshot" @click="doAddSnapshot">
              {{ uploadingSnapshot ? 'Enviando...' : 'Adicionar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Beacon Edit Modal ──────────────────────────── -->
    <Teleport to="body">
      <div v-if="showBeaconModal" class="modal-backdrop" @click.self="closeBeaconModal">
        <div class="modal-content" style="max-width: 480px;">
          <h2>{{ editingBeacon ? 'Editar Beacon' : 'Novo Beacon' }}</h2>
          <div class="form-group">
            <label>Título</label>
            <input v-model="beaconForm.title" class="form-input" placeholder="Av. da Amizade" />
          </div>
          <div class="form-group">
            <label>Descrição (opcional)</label>
            <textarea v-model="beaconForm.description" class="form-input" rows="2" placeholder="Descrição do ponto..."></textarea>
          </div>
          <div class="form-group">
            <label>Estilo</label>
            <div class="pe-style-options">
              <button
                v-for="opt in BEACON_STYLE_OPTIONS"
                :key="opt.value"
                class="pe-style-btn"
                :class="{ 'pe-style-btn--active': beaconForm.style === opt.value }"
                :style="{ '--btn-color': opt.color }"
                @click="beaconForm.style = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          <div class="form-group">
            <label class="pe-checkbox-label">
              <input type="checkbox" v-model="beaconForm.visible" />
              Visível na página pública
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" @click="closeBeaconModal">Cancelar</button>
            <button class="btn btn-primary" :disabled="savingBeacon" @click="doSaveBeacon">
              {{ savingBeacon ? 'Salvando...' : (editingBeacon ? 'Salvar' : 'Criar') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Settings Modal ─────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showSettings" class="modal-backdrop" @click.self="showSettings = false">
        <div class="modal-content" style="max-width: 480px;">
          <h2>Configurações do Panorama</h2>
          <div class="form-group">
            <label>Título</label>
            <input v-model="settingsForm.title" class="form-input" />
          </div>
          <div class="form-group">
            <label>Tipo de visualização</label>
            <select v-model="settingsForm.projection" class="form-input">
              <option value="FLAT">Foto Estática (Plana)</option>
              <option value="EQUIRECTANGULAR">Panorama 360° (Equerretangular)</option>
            </select>
          </div>
          <div class="modal-actions" style="justify-content: space-between;">
            <button class="btn btn-danger btn-sm" @click="doDeletePanorama">🗑️ Excluir Panorama</button>
            <div class="flex gap-2">
              <button class="btn btn-ghost" @click="showSettings = false">Cancelar</button>
              <button class="btn btn-primary" :disabled="savingSettings" @click="doSaveSettings">
                {{ savingSettings ? 'Salvando...' : 'Salvar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, reactive } from 'vue'
import { usePanoramaApi } from '~/composables/panorama/usePanoramaApi'
import {
  BEACON_STYLE_OPTIONS,
  beaconStyleColor,
} from '~/composables/panorama/types'
import type {
  Panorama,
  PanoramaSnapshot,
  PanoramaBeacon,
  BeaconStyle,
  PanoramaProjection,
} from '~/composables/panorama/types'
import PanoramaBeaconPin from './PanoramaBeaconPin.vue'
import PanoramaViewer from './PanoramaViewer.vue'
import { useToast } from '~/composables/useToast'

const props = defineProps<{
  projectId: string
  initialPanoramas?: Panorama[]
}>()

const emit = defineEmits<{
  updated: [panoramas: Panorama[]]
}>()

const api = usePanoramaApi()
const toast = useToast()

// ── Core State ───────────────────────────────────────

const panoramas = ref<Panorama[]>(props.initialPanoramas ?? [])
const activePanoramaId = ref<string | null>(null)
const activeSnapshotId = ref<string | null>(null)
const mode = ref<'view' | 'add-beacon' | 'move'>('view')

const canvasContainerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLElement | null>(null)

// Zoom/pan
const scale = ref(1)
const panX = ref(0)
const panY = ref(0)
const imgW = ref(1200)
const imgH = ref(800)

let isPanning = false
let panStartX = 0
let panStartY = 0
let panOriginX = 0
let panOriginY = 0

// Beacon drag
const draggingBeaconId = ref<string | null>(null)
let dragBeaconStartX = 0
let dragBeaconStartY = 0
let dragBeaconOrigX = 0
let dragBeaconOrigY = 0

// Placement preview
const placementPreview = ref<{ x: number; y: number } | null>(null)

// ── Computed ─────────────────────────────────────────

const activePanorama = computed(() =>
  panoramas.value.find(p => p.id === activePanoramaId.value) ?? null,
)

const activeSnapshotUrl = computed(() => {
  if (!activePanorama.value) return null
  const snap = activePanorama.value.snapshots.find(s => s.id === activeSnapshotId.value)
  return snap?.imageUrl ?? activePanorama.value.snapshots[0]?.imageUrl ?? null
})

const canvasStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
  transformOrigin: '0 0',
  width: `${imgW.value}px`,
  height: `${imgH.value}px`,
}))

// ── Init & Load ──────────────────────────────────────

onMounted(async () => {
  window.addEventListener('mousemove', onGlobalMouseMove)
  window.addEventListener('mouseup', onGlobalMouseUp)

  if (!panoramas.value.length) {
    await loadPanoramas()
  }

  if (panoramas.value.length) {
    activePanoramaId.value = panoramas.value[0]?.id ?? null
    setInitialSnapshot()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onGlobalMouseMove)
  window.removeEventListener('mouseup', onGlobalMouseUp)
})

watch(activePanoramaId, () => setInitialSnapshot())

async function loadPanoramas() {
  try {
    panoramas.value = await api.getPanoramas(props.projectId)
  } catch { /* ignore */ }
}

async function loadPanorama() {
  if (!activePanoramaId.value) return
  try {
    const fresh = await api.getPanorama(activePanoramaId.value)
    const idx = panoramas.value.findIndex(p => p.id === fresh.id)
    if (idx >= 0) panoramas.value[idx] = fresh
    setInitialSnapshot()
  } catch { /* ignore */ }
}

function setInitialSnapshot() {
  const p = activePanorama.value
  if (!p) return
  if (p.snapshots.length) {
    activeSnapshotId.value = p.snapshots[p.snapshots.length - 1]?.id ?? null
  } else {
    activeSnapshotId.value = null
  }
}

function emitUpdate() {
  emit('updated', panoramas.value)
}

// ── Create Panorama ──────────────────────────────────

const showCreatePanorama = ref(false)
const newPanoramaTitle = ref('Vista Geral')
const newPanoramaProjection = ref<PanoramaProjection>('FLAT')
const creatingPanorama = ref(false)

async function doCreatePanorama() {
  creatingPanorama.value = true
  try {
    const created = await api.createPanorama(props.projectId, {
      title: newPanoramaTitle.value || 'Vista Geral',
      projection: newPanoramaProjection.value,
    })
    panoramas.value.push(created)
    activePanoramaId.value = created.id
    showCreatePanorama.value = false
    newPanoramaTitle.value = 'Vista Geral'
    newPanoramaProjection.value = 'FLAT'
    toast.success('Panorama criado!')
    emitUpdate()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao criar panorama')
  } finally {
    creatingPanorama.value = false
  }
}

// ── Add Snapshot ─────────────────────────────────────

const showAddSnapshot = ref(false)
const newSnapshotLabel = ref('')
const snapshotFile = ref<File | null>(null)
const uploadingSnapshot = ref(false)
const snapshotUploadProgress = ref('')

function onSnapshotFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  snapshotFile.value = input.files?.[0] ?? null
}

async function doAddSnapshot() {
  if (!activePanorama.value || !snapshotFile.value || !newSnapshotLabel.value) {
    toast.error('Preencha o rótulo e selecione uma imagem.')
    return
  }
  uploadingSnapshot.value = true
  snapshotUploadProgress.value = 'Enviando imagem...'
  try {
    const { imageUrl } = await api.uploadSnapshotImage(
      props.projectId,
      activePanorama.value.id,
      snapshotFile.value,
    )
    snapshotUploadProgress.value = 'Criando snapshot...'
    const snapshot = await api.createSnapshot(activePanorama.value.id, {
      imageUrl,
      label: newSnapshotLabel.value,
    })
    activePanorama.value.snapshots.push(snapshot)
    activeSnapshotId.value = snapshot.id
    showAddSnapshot.value = false
    newSnapshotLabel.value = ''
    snapshotFile.value = null
    snapshotUploadProgress.value = ''
    toast.success('Snapshot adicionado!')
    emitUpdate()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao adicionar snapshot')
  } finally {
    uploadingSnapshot.value = false
    snapshotUploadProgress.value = ''
  }
}

async function removeSnapshot(snapshotId: string) {
  if (!confirm('Excluir este snapshot?')) return
  try {
    await api.deleteSnapshot(snapshotId)
    const p = activePanorama.value
    if (p) {
      p.snapshots = p.snapshots.filter(s => s.id !== snapshotId)
      if (activeSnapshotId.value === snapshotId) {
        activeSnapshotId.value = p.snapshots[0]?.id ?? null
      }
    }
    toast.success('Snapshot removido.')
    emitUpdate()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao remover snapshot')
  }
}

// ── Beacon CRUD ──────────────────────────────────────

const showBeaconModal = ref(false)
const editingBeacon = ref<PanoramaBeacon | null>(null)
const savingBeacon = ref(false)

const beaconForm = reactive({
  title: '',
  description: '',
  style: 'default' as BeaconStyle,
  visible: true,
  x: 0,
  y: 0,
})

function openNewBeaconModal(x: number, y: number) {
  editingBeacon.value = null
  beaconForm.title = ''
  beaconForm.description = ''
  beaconForm.style = 'default'
  beaconForm.visible = true
  beaconForm.x = x
  beaconForm.y = y
  showBeaconModal.value = true
}

function editBeacon(beacon: PanoramaBeacon) {
  editingBeacon.value = beacon
  beaconForm.title = beacon.title
  beaconForm.description = beacon.description ?? ''
  beaconForm.style = beacon.style as BeaconStyle
  beaconForm.visible = beacon.visible
  beaconForm.x = beacon.x
  beaconForm.y = beacon.y
  showBeaconModal.value = true
}

function closeBeaconModal() {
  showBeaconModal.value = false
  editingBeacon.value = null
}

async function doSaveBeacon() {
  if (!activePanorama.value || !beaconForm.title.trim()) {
    toast.error('Título é obrigatório.')
    return
  }
  savingBeacon.value = true
  try {
    const wasEditing = !!editingBeacon.value
    const normalizedDescription = beaconForm.description.trim()

    if (editingBeacon.value) {
      const updated = await api.updateBeacon(editingBeacon.value.id, {
        title: beaconForm.title,
        description: normalizedDescription || undefined,
        style: beaconForm.style,
        visible: beaconForm.visible,
      })

      const idx = activePanorama.value.beacons.findIndex(b => b.id === updated.id)
      if (idx >= 0) {
        const current = activePanorama.value.beacons[idx]
        activePanorama.value.beacons[idx] = {
          ...current,
          ...updated,
          title: beaconForm.title,
          description: normalizedDescription || null,
          style: beaconForm.style,
          visible: beaconForm.visible,
        }
      }
    } else {
      const created = await api.createBeacon(activePanorama.value.id, {
        title: beaconForm.title,
        description: normalizedDescription || undefined,
        x: beaconForm.x,
        y: beaconForm.y,
        style: beaconForm.style,
        visible: beaconForm.visible,
      })
      activePanorama.value.beacons.push(created)
    }
    closeBeaconModal()
    toast.success(wasEditing ? 'Beacon atualizado!' : 'Beacon criado!')
    emitUpdate()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao salvar beacon')
  } finally {
    savingBeacon.value = false
  }
}

async function removeBeacon(beaconId: string) {
  if (!confirm('Excluir este beacon?')) return
  try {
    await api.deleteBeacon(beaconId)
    const p = activePanorama.value
    if (p) p.beacons = p.beacons.filter(b => b.id !== beaconId)
    toast.success('Beacon removido.')
    emitUpdate()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao remover beacon')
  }
}

function onBeaconClick(beacon: PanoramaBeacon) {
  if (mode.value === 'view' || mode.value === 'add-beacon') {
    editBeacon(beacon)
  }
}

// ── Beacon Drag ──────────────────────────────────────

function onBeaconDragStart(beacon: PanoramaBeacon, e: MouseEvent) {
  if (mode.value !== 'move') return
  draggingBeaconId.value = beacon.id
  dragBeaconStartX = e.clientX
  dragBeaconStartY = e.clientY
  dragBeaconOrigX = beacon.x
  dragBeaconOrigY = beacon.y
}

async function togglePublication() {
  if (!activePanorama.value) return
  const isPublished = activePanorama.value.published
  const message = isPublished
    ? 'Tem certeza que deseja despublicar este panorama? Ele não estará mais visível publicamente.'
    : 'Tem certeza que deseja publicar este panorama? Ele ficará visível no site público.'

  if (!confirm(message)) return

  try {
    const updated = await api.updatePanorama(activePanorama.value.id, {
      published: !isPublished,
    })

    const idx = panoramas.value.findIndex(p => p.id === updated.id)
    if (idx >= 0) panoramas.value[idx] = updated

    toast.success(updated.published ? 'Panorama publicado!' : 'Panorama despublicado.')
    emitUpdate()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao alterar status de publicação')
  }
}

// ── Settings ─────────────────────────────────────────

const showSettings = ref(false)
const savingSettings = ref(false)

const settingsForm = reactive({
  title: '',
  projection: 'FLAT' as PanoramaProjection,
})

watch(showSettings, (v) => {
  if (v && activePanorama.value) {
    settingsForm.title = activePanorama.value.title
    settingsForm.projection = activePanorama.value.projection ?? 'FLAT'
  }
})

async function doSaveSettings() {
  if (!activePanorama.value) return
  savingSettings.value = true
  try {
    const updated = await api.updatePanorama(activePanorama.value.id, {
      title: settingsForm.title,
      projection: settingsForm.projection,
    })

    const idx = panoramas.value.findIndex(p => p.id === updated.id)
    if (idx >= 0) panoramas.value[idx] = updated

    showSettings.value = false
    toast.success('Configurações salvas!')
    emitUpdate()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao salvar configurações')
  } finally {
    savingSettings.value = false
  }
}

async function doDeletePanorama() {
  if (!activePanorama.value) return
  if (!confirm('Excluir este panorama e todos seus snapshots e beacons?')) return
  try {
    await api.deletePanorama(activePanorama.value.id)
    panoramas.value = panoramas.value.filter(p => p.id !== activePanorama.value!.id)
    activePanoramaId.value = panoramas.value[0]?.id ?? null
    showSettings.value = false
    toast.success('Panorama excluído.')
    emitUpdate()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao excluir panorama')
  }
}

// ── Zoom / Pan / Canvas ──────────────────────────────

function onImageLoad(e: Event) {
  const img = e.target as HTMLImageElement
  imgW.value = img.naturalWidth
  imgH.value = img.naturalHeight
  resetView()
}

function clampScale(s: number) {
  return Math.min(Math.max(s, 0.15), 5)
}

function onWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newScale = clampScale(scale.value + delta)

  const rect = canvasContainerRef.value!.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  const ratio = newScale / scale.value
  panX.value = mx - (mx - panX.value) * ratio
  panY.value = my - (my - panY.value) * ratio
  scale.value = newScale
}

function resetView() {
  if (!canvasContainerRef.value) return
  const rect = canvasContainerRef.value.getBoundingClientRect()
  const wR = rect.width / imgW.value
  const hR = rect.height / imgH.value
  const fit = Math.min(wR, hR, 1)
  scale.value = fit
  panX.value = (rect.width - imgW.value * fit) / 2
  panY.value = (rect.height - imgH.value * fit) / 2
}

function on360ViewClick(pos: { x: number; y: number }) {
  if (mode.value === 'add-beacon') {
    placementPreview.value = pos
    openNewBeaconModal(pos.x, pos.y)
  }
}

function onMouseDown(e: MouseEvent) {
  // Adding beacon: calculate normalised position and open modal
  if (mode.value === 'add-beacon') {
    const pos = clientToNormalized(e.clientX, e.clientY)
    if (pos) {
      placementPreview.value = pos
      openNewBeaconModal(pos.x, pos.y)
    }
    return
  }

  // Panning
  if (mode.value === 'view' || mode.value === 'move') {
    isPanning = true
    panStartX = e.clientX
    panStartY = e.clientY
    panOriginX = panX.value
    panOriginY = panY.value
  }
}

function onGlobalMouseMove(e: MouseEvent) {
  // Beacon drag
  if (draggingBeaconId.value && mode.value === 'move' && activePanorama.value) {
    const dx = (e.clientX - dragBeaconStartX) / (imgW.value * scale.value)
    const dy = (e.clientY - dragBeaconStartY) / (imgH.value * scale.value)
    const beacon = activePanorama.value.beacons.find(b => b.id === draggingBeaconId.value)
    if (beacon) {
      beacon.x = Math.min(1, Math.max(0, dragBeaconOrigX + dx))
      beacon.y = Math.min(1, Math.max(0, dragBeaconOrigY + dy))
    }
    return
  }

  // Pan
  if (isPanning) {
    panX.value = panOriginX + (e.clientX - panStartX)
    panY.value = panOriginY + (e.clientY - panStartY)
  }
}

async function onGlobalMouseUp() {
  // Finish beacon drag → persist
  if (draggingBeaconId.value && activePanorama.value) {
    const beacon = activePanorama.value.beacons.find(b => b.id === draggingBeaconId.value)
    if (beacon) {
      try {
        await api.updateBeacon(beacon.id, { x: beacon.x, y: beacon.y })
      } catch { /* ignore */ }
    }
    draggingBeaconId.value = null
    emitUpdate()
  }

  isPanning = false
}

function clientToNormalized(clientX: number, clientY: number) {
  if (!canvasRef.value) return null
  const rect = canvasRef.value.getBoundingClientRect()
  const x = (clientX - rect.left) / rect.width
  const y = (clientY - rect.top) / rect.height
  if (x < 0 || x > 1 || y < 0 || y > 1) return null
  return { x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 }
}
</script>

<style scoped>
.panorama-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--glass-bg-heavy);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--glass-border-subtle);
}

/* ─── Toolbar ─────────────────────────────────────── */

.pe-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border-subtle);
  gap: 12px;
  flex-wrap: wrap;
}

.pe-toolbar-left,
.pe-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pe-select {
  padding: 6px 10px;
  border: 1px solid var(--glass-border-subtle);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  background: var(--glass-bg);
}

/* ─── Main Layout ─────────────────────────────────── */

.pe-main {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.pe-sidebar {
  width: 280px;
  min-width: 280px;
  border-right: 1px solid var(--glass-border-subtle);
  background: var(--glass-bg);
  overflow-y: auto;
}

.pe-section {
  border-bottom: 1px solid var(--glass-border-subtle);
  padding: 12px;
}

.pe-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.pe-section-header h3 {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-surface-200);
}

.pe-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pe-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.1s;
}

.pe-list-item:hover {
  background: var(--glass-bg-heavy);
}

.pe-list-item--active {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid var(--color-primary-500);
}

.pe-thumb {
  width: 40px;
  height: 28px;
  object-fit: cover;
  border-radius: 4px;
}

.pe-list-item-info {
  flex: 1;
  min-width: 0;
}

.pe-list-item-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pe-list-item-meta {
  font-size: 0.72rem;
  color: var(--color-surface-500);
}

.pe-list-item-del {
  opacity: 0;
  font-size: 0.7rem;
}

.pe-list-item:hover .pe-list-item-del {
  opacity: 1;
}

.pe-beacon-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pe-empty {
  font-size: 0.82rem;
  color: var(--color-surface-500);
  padding: 8px 0;
}

/* ─── Canvas ──────────────────────────────────────── */

.pe-canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #1a1a1a;
}

.pe-canvas-view {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.pe-canvas-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-surface-500);
  font-size: 0.9rem;
}

.pe-canvas {
  position: absolute;
  top: 0;
  left: 0;
  cursor: grab;
  will-change: transform;
  user-select: none;
}

.pe-canvas:active {
  cursor: grabbing;
}

.pe-canvas-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.pe-360-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  z-index: 50;
  backdrop-filter: blur(4px);
  pointer-events: none;
}

/* Placement preview dot */
.pe-placement-preview {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 100;
}

.pe-placement-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.7);
  border: 2px solid #fff;
  box-shadow: 0 0 8px rgba(37, 99, 235, 0.5);
  animation: pulse-dot 1s infinite;
}

@keyframes pulse-dot {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}

/* ─── Modals ──────────────────────────────────────── */

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: var(--radius-lg);
  padding: 24px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
}

.modal-content h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.form-group {
  margin-bottom: 14px;
}

.form-group label {
  display: block;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-surface-200);
  margin-bottom: 4px;
}

.form-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  background: rgba(15, 23, 42, 0.88);
  color: #f8fafc;
}

.form-input::placeholder {
  color: rgba(226, 232, 240, 0.62);
}

.form-input:focus {
  outline: none;
  border-color: rgba(96, 165, 250, 0.95);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
}

.form-range {
  width: 100%;
}

/* ─── Style options ───────────────────────────────── */

.pe-style-options {
  display: flex;
  gap: 8px;
}

.pe-style-btn {
  padding: 6px 14px;
  border: 2px solid var(--glass-border-subtle);
  border-radius: var(--radius-sm);
  background: var(--glass-bg);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--btn-color);
  font-weight: 600;
}

.pe-style-btn--active {
  border-color: var(--btn-color);
  background: color-mix(in srgb, var(--btn-color) 10%, var(--glass-bg));
}

.pe-checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.pe-upload-progress {
  font-size: 0.82rem;
  color: var(--color-primary-500);
  margin-top: 4px;
}

.pe-current-file {
  font-size: 0.78rem;
  color: var(--color-success);
  margin-top: 4px;
}

.modal-content .btn {
  border-radius: 10px;
  font-weight: 700;
}

.modal-content .btn-ghost {
  background: rgba(148, 163, 184, 0.24);
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.44);
}

.modal-content .btn-ghost:hover:not(:disabled) {
  background: rgba(148, 163, 184, 0.36);
}

.modal-content .btn-primary {
  background: #2563eb;
  color: #f8fafc;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
}

.modal-content .btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
  box-shadow: 0 10px 22px rgba(29, 78, 216, 0.42);
}
</style>
