<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="pm-modal-overlay">
        <div class="pm-modal" role="dialog" aria-modal="true" :aria-label="isEdit ? 'Editar hotspot' : 'Novo hotspot'">
          <div class="pm-modal__header">
            <h3>{{ isEdit ? 'Editar hotspot' : 'Novo hotspot' }}</h3>
            <button class="pm-modal__close" @click="$emit('update:modelValue', false)">✕</button>
          </div>

          <form class="pm-modal__body" @submit.prevent="handleSubmit">
            <!-- Type -->
            <div class="pm-field">
              <label class="pm-label">Tipo *</label>
              <div class="pm-type-grid">
                <button
                  v-for="t in HOTSPOT_TYPES"
                  :key="t.value"
                  type="button"
                  class="pm-type-btn"
                  :class="{ active: form.type === t.value }"
                  :style="form.type === t.value ? { borderColor: t.color, background: t.color + '18' } : {}"
                  @click="form.type = t.value"
                >
                  <span>{{ t.icon }}</span>
                  <span>{{ t.label }}</span>
                </button>
              </div>
            </div>

            <!-- Title -->
            <div class="pm-field">
              <label class="pm-label">Título *</label>
              <input v-model="form.title" class="pm-input" required placeholder="Ex: Lote 12" />
            </div>

            <!-- Label (shown above pin) -->
            <div class="pm-field">
              <label class="pm-label">Rótulo sobre o pino</label>
              <div style="display:flex; gap: 8px; align-items: center;">
                <input v-model="form.label" class="pm-input" placeholder="Ex: L-12" style="flex:1" />
                <label style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer; flex-shrink:0;">
                  <input type="checkbox" v-model="form.labelEnabled" />
                  Exibir
                </label>
              </div>
            </div>

            <!-- Lot status (only for LOTE) -->
            <div v-if="form.type === 'LOTE'" class="pm-field">
              <label class="pm-label">Status do lote</label>
              <select v-model="form.loteStatus" class="pm-input pm-select">
                <option value="AVAILABLE">Disponível</option>
                <option value="RESERVED">Reservado</option>
                <option value="SOLD">Vendido</option>
              </select>
            </div>

            <div v-if="form.type === 'LOTE'" class="pm-field">
              <label class="pm-label">Identificação do lote no painel</label>
              <div class="pm-lot-grid">
                <input
                  v-model="lotInfo.block"
                  class="pm-input"
                  placeholder="Quadra (ex: B)"
                />
                <input
                  v-model="lotInfo.lotNumber"
                  class="pm-input"
                  placeholder="Lote nº (ex: 31)"
                />
              </div>
              <p class="pm-hint" style="color: #2563eb; margin-top: 6px;">
                Esses campos sao sincronizados automaticamente com a ficha do lote no painel.
              </p>
            </div>

            <!-- Hint about automatic creation -->
            <div v-if="!isEdit" class="pm-field">
              <p v-if="form.type === 'LOTE'" class="pm-hint">
                ✨ Hotspots do tipo Lote ganham automaticamente uma página pública e ficha técnica para edição de fotos, preços e detalhes.
              </p>
              <p v-else class="pm-hint" style="color: #6b7280;">
                ℹ️ Hotspots informativos (portarias, áreas comuns, etc) não possuem página individual própria.
              </p>
            </div>

            <!-- Label offsets -->
            <details class="pm-advanced" style="margin-top: 4px;">
              <summary class="pm-label" style="cursor: pointer;">⚙️ Avançado — offset do rótulo</summary>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:8px;">
                <div>
                  <label class="pm-label">Offset X (px)</label>
                  <input v-model.number="form.labelOffsetX" type="number" class="pm-input" />
                </div>
                <div>
                  <label class="pm-label">Offset Y (px)</label>
                  <input v-model.number="form.labelOffsetY" type="number" class="pm-input" />
                </div>
              </div>
            </details>

            <!-- Error -->
            <div v-if="error" class="pm-error">{{ error }}</div>

            <!-- Actions -->
            <div class="pm-modal__footer">
              <button type="button" class="pm-btn pm-btn--ghost" @click="$emit('update:modelValue', false)">
                Cancelar
              </button>
              <button type="submit" class="pm-btn pm-btn--primary" :disabled="saving">
                {{ saving ? 'Salvando...' : (isEdit ? 'Salvar' : 'Criar hotspot') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type {
  PlantHotspot,
  PlantHotspotType,
  PlantHotspotLinkType,
  LotStatus,
  CreateHotspotPayload,
} from '~/composables/plantMap/types'
import {
  HOTSPOT_TYPE_COLORS,
  HOTSPOT_TYPE_ICONS,
  HOTSPOT_TYPE_LABELS,
} from '~/composables/plantMap/types'

const props = defineProps<{
  modelValue: boolean
  hotspot?: PlantHotspot | null
  /** Pre-fill x/y when creating a new hotspot by clicking */
  initialX?: number
  initialY?: number
  saving?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save', payload: CreateHotspotPayload): void
}>()

const isEdit = computed(() => !!props.hotspot)

// ── Form state ────────────────────────────────────────────
const defaultForm = (): CreateHotspotPayload => ({
  type: 'LOTE' as PlantHotspotType,
  title: '',
  x: props.initialX ?? 0.5,
  y: props.initialY ?? 0.5,
  label: '',
  labelEnabled: true,
  labelOffsetX: 0,
  labelOffsetY: -24,
  linkType: 'NONE' as PlantHotspotLinkType,
  linkId: '',
  linkUrl: '',
  loteStatus: undefined,
  metaJson: undefined,
})

const form = ref<CreateHotspotPayload>(defaultForm())
const lotInfo = ref({ block: '', lotNumber: '' })

const extractLotInfoFromMeta = (meta: unknown) => {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return { block: '', lotNumber: '' }
  }

  const maybeLotInfo = (meta as Record<string, any>).lotInfo
  if (!maybeLotInfo || typeof maybeLotInfo !== 'object' || Array.isArray(maybeLotInfo)) {
    return { block: '', lotNumber: '' }
  }

  return {
    block: typeof maybeLotInfo.block === 'string' ? maybeLotInfo.block : '',
    lotNumber: typeof maybeLotInfo.lotNumber === 'string' ? maybeLotInfo.lotNumber : '',
  }
}

const buildMetaJsonWithLotInfo = () => {
  const baseMeta =
    form.value.metaJson && typeof form.value.metaJson === 'object' && !Array.isArray(form.value.metaJson)
      ? { ...form.value.metaJson }
      : {}

  const block = lotInfo.value.block.trim()
  const lotNumber = lotInfo.value.lotNumber.trim()

  if (form.value.type === 'LOTE' && (block || lotNumber)) {
    baseMeta.lotInfo = {
      block: block || undefined,
      lotNumber: lotNumber || undefined,
    }
  } else {
    delete baseMeta.lotInfo
  }

  return Object.keys(baseMeta).length ? baseMeta : undefined
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    if (props.hotspot) {
      const currentLotInfo = extractLotInfoFromMeta(props.hotspot.metaJson)
      form.value = {
        type: props.hotspot.type,
        title: props.hotspot.title,
        x: props.hotspot.x,
        y: props.hotspot.y,
        label: props.hotspot.label ?? '',
        labelEnabled: props.hotspot.labelEnabled,
        labelOffsetX: props.hotspot.labelOffsetX,
        labelOffsetY: props.hotspot.labelOffsetY,
        linkType: props.hotspot.linkType,
        linkId: props.hotspot.linkId ?? '',
        linkUrl: props.hotspot.linkUrl ?? '',
        loteStatus: props.hotspot.loteStatus ?? undefined,
        metaJson: props.hotspot.metaJson ?? undefined,
      }
      lotInfo.value = currentLotInfo
    } else {
      form.value = defaultForm()
      if (props.initialX !== undefined) form.value.x = props.initialX
      if (props.initialY !== undefined) form.value.y = props.initialY
      lotInfo.value = { block: '', lotNumber: '' }
    }
  },
  { immediate: true },
)

const handleSubmit = () => {
  const payload: CreateHotspotPayload = {
    ...form.value,
    label: form.value.label || undefined,
    linkId: form.value.linkId || undefined,
    linkUrl: form.value.linkUrl || undefined,
    loteStatus: (form.value.loteStatus as string) === '' ? undefined : form.value.loteStatus,
    metaJson: buildMetaJsonWithLotInfo(),
  }
  emit('save', payload)
}

// Type selector options
const HOTSPOT_TYPES = Object.entries(HOTSPOT_TYPE_LABELS).map(([value, label]) => ({
  value: value as PlantHotspotType,
  label,
  icon: HOTSPOT_TYPE_ICONS[value as PlantHotspotType],
  color: HOTSPOT_TYPE_COLORS[value as PlantHotspotType],
}))
</script>

<style scoped>
.pm-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(2px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.pm-modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 460px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 64px rgba(0,0,0,0.25);
}

.pm-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 0;
}
.pm-modal__header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
}
.pm-modal__close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #6b7280;
  padding: 4px 8px;
  border-radius: 6px;
}
.pm-modal__close:hover { background: #f3f4f6; }

.pm-modal__body {
  padding: 16px 20px;
}

.pm-hint {
  font-size: 11px;
  color: #10b981;
  margin-top: 4px;
  font-weight: 600;
}

.pm-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
}

.pm-field {
  margin-bottom: 14px;
}
.pm-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}
.pm-input {
  width: 100%;
  padding: 8px 10px;
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.pm-input:focus { border-color: #3b82f6; }
.pm-textarea { resize: vertical; min-height: 56px; }
.pm-select { appearance: auto; background: white; }

.pm-lot-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.pm-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.pm-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 6px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  transition: all 0.15s;
}
.pm-type-btn:hover { border-color: #9ca3af; background: #f9fafb; }
.pm-type-btn.active { font-weight: 700; }
.pm-type-btn span:first-child { font-size: 20px; }

.pm-btn {
  padding: 9px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}
.pm-btn--primary { background: #1d4ed8; color: white; }
.pm-btn--primary:hover:not(:disabled) { background: #1e40af; }
.pm-btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
.pm-btn--ghost { background: #f3f4f6; color: #374151; }
.pm-btn--ghost:hover { background: #e5e7eb; }

.pm-error {
  background: #fee2e2;
  color: #b91c1c;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  margin-top: 8px;
}

.pm-advanced summary::-webkit-details-marker { color: #6b7280; }

/* Transition */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .pm-modal, .modal-leave-active .pm-modal {
  transition: transform 0.2s ease;
}
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .pm-modal, .modal-leave-to .pm-modal { transform: scale(0.95) translateY(-8px); }
</style>
