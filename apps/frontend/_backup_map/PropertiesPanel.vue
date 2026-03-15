<template>
  <div class="properties-panel">
    <div v-if="!element" class="empty-hint">
      <div class="empty-icon">🎯</div>
      <p>Selecione um elemento no mapa para editar.</p>
      <p class="empty-tip">Dica: Use a ferramenta Selecionar (V) para clicar em elementos.</p>
    </div>

    <template v-else>
      <div class="panel-header">
        <div class="header-left">
          <span class="type-icon">{{ typeIcon }}</span>
          <span class="badge" :class="'badge-' + badgeColor">{{ typeLabel }}</span>
        </div>
        <div class="panel-actions">
          <button class="icon-btn" title="Duplicar" @click="$emit('duplicate')">⧉</button>
          <button class="icon-btn danger" title="Excluir" @click="$emit('delete')">✕</button>
        </div>
      </div>

      <!-- Lot details (LOT type) – shown FIRST for lots since it's the most important -->
      <div v-if="element.type === 'LOT'" class="panel-section lot-section">
        <span class="section-label">🏷️ Dados do Lote</span>

        <!-- Status buttons (big and visual) -->
        <div class="lot-status-group">
          <button
            class="status-btn available"
            :class="{ active: lotStatus === 'AVAILABLE' }"
            @click="patchMeta({ lotStatus: 'AVAILABLE' })"
          >
            🟢 Disponível
          </button>
          <button
            class="status-btn reserved"
            :class="{ active: lotStatus === 'RESERVED' }"
            @click="patchMeta({ lotStatus: 'RESERVED' })"
          >
            🟡 Reservado
          </button>
          <button
            class="status-btn sold"
            :class="{ active: lotStatus === 'SOLD' }"
            @click="patchMeta({ lotStatus: 'SOLD' })"
          >
            🔴 Vendido
          </button>
        </div>

        <!-- Price -->
        <div class="form-group-sm">
          <label>💰 Preço (R$)</label>
          <input
            type="number"
            class="form-input form-input-sm price-input"
            :value="meta.price"
            @change="patchMeta({ price: +($event.target as HTMLInputElement).value || undefined })"
            placeholder="Ex: 150000"
          />
        </div>

        <div class="style-row">
          <div class="form-group-sm" style="flex:1">
            <label>📐 Área (m²)</label>
            <input type="number" class="form-input form-input-sm" :value="meta.areaM2" @change="patchMeta({ areaM2: +($event.target as HTMLInputElement).value || undefined })" placeholder="0" />
          </div>
          <div class="form-group-sm" style="flex:1">
            <label>Frente (m)</label>
            <input type="number" class="form-input form-input-sm" :value="meta.frontage" @change="patchMeta({ frontage: +($event.target as HTMLInputElement).value || undefined })" />
          </div>
        </div>

        <div class="style-row">
          <div class="form-group-sm" style="flex:1">
            <label>Fundo (m)</label>
            <input type="number" class="form-input form-input-sm" :value="meta.depth" @change="patchMeta({ depth: +($event.target as HTMLInputElement).value || undefined })" />
          </div>
          <div class="form-group-sm" style="flex:1">
            <label>⛰️ Inclinação</label>
            <select class="form-input form-input-sm" :value="meta.slope || 'FLAT'" @change="patchMeta({ slope: ($event.target as HTMLSelectElement).value })">
              <option value="FLAT">Plano</option>
              <option value="UPHILL">Aclive</option>
              <option value="DOWNHILL">Declive</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Identity -->
      <div class="panel-section">
        <span class="section-label">Identificação</span>
        <div class="form-group-sm">
          <label>Nome</label>
          <input class="form-input form-input-sm" :value="element.name" @change="patch({ name: ($event.target as HTMLInputElement).value })" placeholder="Ex: Lote 01" />
        </div>
        <div class="form-group-sm">
          <label>Código</label>
          <input class="form-input form-input-sm" :value="element.code" @change="patch({ code: ($event.target as HTMLInputElement).value })" placeholder="Ex: QA-L01" />
        </div>
      </div>

      <!-- Style (collapsible) -->
      <div class="panel-section">
        <div class="section-header-toggle" @click="showStyle = !showStyle">
          <span class="section-label" style="margin:0">🎨 Estilo Visual</span>
          <span class="toggle-icon">{{ showStyle ? '▾' : '▸' }}</span>
        </div>
        <template v-if="showStyle">
          <div class="style-row" style="margin-top: var(--space-2);">
            <div class="form-group-sm" style="flex:1">
              <label>Preenchimento</label>
              <input type="color" class="color-input" :value="fillColor" @input="patchStyle({ fill: ($event.target as HTMLInputElement).value + '33' })" />
            </div>
            <div class="form-group-sm" style="flex:1">
              <label>Borda</label>
              <input type="color" class="color-input" :value="style.stroke || '#22c55e'" @input="patchStyle({ stroke: ($event.target as HTMLInputElement).value })" />
            </div>
          </div>
          <div class="style-row">
            <div class="form-group-sm" style="flex:1">
              <label>Espessura</label>
              <input type="number" class="form-input form-input-sm" :value="style.strokeWidth ?? 2" min="0" max="20" step="0.5" @input="patchStyle({ strokeWidth: +($event.target as HTMLInputElement).value })" />
            </div>
            <div class="form-group-sm" style="flex:1">
              <label>Opacidade</label>
              <input type="range" class="form-range" :value="(style.opacity ?? 1) * 100" min="0" max="100" @input="patchStyle({ opacity: +($event.target as HTMLInputElement).value / 100 })" />
            </div>
          </div>
          <div v-if="element.type === 'LABEL'" class="style-row">
            <div class="form-group-sm" style="flex:1">
              <label>Tamanho fonte</label>
              <input type="number" class="form-input form-input-sm" :value="style.fontSize ?? 16" min="8" max="120" @input="patchStyle({ fontSize: +($event.target as HTMLInputElement).value })" />
            </div>
            <div class="form-group-sm" style="flex:1">
              <label>Cor texto</label>
              <input type="color" class="color-input" :value="style.fontColor || '#1e293b'" @input="patchStyle({ fontColor: ($event.target as HTMLInputElement).value })" />
            </div>
          </div>
        </template>
      </div>

      <!-- Geometry info (read-only, collapsible) -->
      <div class="panel-section">
        <div class="section-header-toggle" @click="showGeometry = !showGeometry">
          <span class="section-label" style="margin:0">📏 Geometria</span>
          <span class="toggle-icon">{{ showGeometry ? '▾' : '▸' }}</span>
        </div>
        <template v-if="showGeometry">
          <div class="info-grid" style="margin-top: var(--space-2);">
            <div class="info-row">
              <span>Tipo:</span><code>{{ geometryLabel }}</code>
            </div>
            <div v-if="element.geometryJson.points" class="info-row">
              <span>Vértices:</span><code>{{ element.geometryJson.points.length / 2 }}</code>
            </div>
            <div v-if="element.geometryJson.width" class="info-row">
              <span>Dimensões:</span><code>{{ Math.round(element.geometryJson.width) }} × {{ Math.round(element.geometryJson.height || 0) }}</code>
            </div>
            <div v-if="element.geometryJson.radius" class="info-row">
              <span>Raio:</span><code>{{ Math.round(element.geometryJson.radius) }}</code>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MapElementData, StyleJson } from './types'
import { MAP_ELEMENT_LABELS } from './types'

const props = defineProps<{ element: MapElementData | null }>()
const emit = defineEmits<{
  update: [patch: Partial<MapElementData>]
  duplicate: []
  delete: []
}>()

const showStyle = ref(false)
const showGeometry = ref(false)

const typeLabel = computed(() => props.element ? MAP_ELEMENT_LABELS[props.element.type] : '')
const style = computed<StyleJson>(() => props.element?.styleJson ?? {})
const meta = computed<Record<string, any>>(() => props.element?.metaJson ?? {})
const lotStatus = computed(() => meta.value.lotStatus || 'AVAILABLE')

const typeIcon = computed(() => {
  const t = props.element?.type
  if (t === 'LOT') return '📐'
  if (t === 'ROAD') return '🛣️'
  if (t === 'ROUNDABOUT') return '⭕'
  if (t === 'LAKE') return '💧'
  if (t === 'GREEN') return '🌳'
  if (t === 'LABEL') return '🏷️'
  if (t === 'PATH') return '🛤️'
  return '⬡'
})

const badgeColor = computed(() => {
  const t = props.element?.type
  if (t === 'LOT') return 'success'
  if (t === 'ROAD') return 'neutral'
  if (t === 'LAKE') return 'info'
  if (t === 'GREEN') return 'success'
  return 'neutral'
})

const fillColor = computed(() => {
  const f = style.value.fill || '#22c55e33'
  // Remove alpha suffix for color picker
  return f.length === 9 ? f.slice(0, 7) : f
})

const geometryLabel = computed(() => {
  const gt = props.element?.geometryType
  if (gt === 'POLYGON') return 'Polígono'
  if (gt === 'POLYLINE') return 'Linha'
  if (gt === 'RECT') return 'Retângulo'
  if (gt === 'CIRCLE') return 'Círculo'
  return gt
})

function patch(p: Partial<MapElementData>) {
  emit('update', p)
}

function patchStyle(p: Partial<StyleJson>) {
  emit('update', { styleJson: { ...style.value, ...p } })
}

function patchMeta(p: Record<string, any>) {
  emit('update', { metaJson: { ...meta.value, ...p } })
}
</script>

<style scoped>
.properties-panel {
  width: 280px;
  border-left: 1px solid var(--gray-200);
  background: white;
  overflow-y: auto;
}

.empty-hint {
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--gray-400);
  font-size: 0.8125rem;
}
.empty-icon { font-size: 2rem; margin-bottom: var(--space-2); }
.empty-tip { font-size: 0.75rem; color: var(--gray-300); margin-top: var(--space-2); }

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--gray-100);
}
.header-left { display: flex; gap: 6px; align-items: center; }
.type-icon { font-size: 1.125rem; }

.panel-actions { display: flex; gap: 4px; }
.icon-btn {
  width: 28px; height: 28px; border: none; background: transparent;
  border-radius: var(--radius-sm); cursor: pointer; font-size: 1rem;
  display: flex; align-items: center; justify-content: center; color: var(--gray-500);
}
.icon-btn:hover { background: var(--gray-100); }
.icon-btn.danger:hover { background: var(--danger-light); color: var(--danger); }

.panel-section {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--gray-100);
}

/* Lot section is highlighted */
.lot-section {
  background: #f0fdf4;
  border-bottom: 2px solid #bbf7d0;
}

.section-label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--gray-400);
  margin-bottom: var(--space-2);
}

.section-header-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 2px 0;
}
.section-header-toggle:hover .section-label { color: var(--gray-600); }
.toggle-icon { font-size: 0.75rem; color: var(--gray-400); }

/* ── Lot status buttons ─── */
.lot-status-group {
  display: flex;
  gap: 4px;
  margin-bottom: var(--space-3);
}
.status-btn {
  flex: 1;
  padding: 8px 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  border: 2px solid var(--gray-200);
  background: white;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}
.status-btn:hover { border-color: var(--gray-300); }
.status-btn.available.active { background: #dcfce7; border-color: #22c55e; color: #166534; }
.status-btn.reserved.active { background: #fef3c7; border-color: #f59e0b; color: #92400e; }
.status-btn.sold.active { background: #fef2f2; border-color: #ef4444; color: #991b1b; }

.price-input {
  font-weight: 600;
  font-size: 0.875rem !important;
}

.form-group-sm {
  margin-bottom: var(--space-2);
}
.form-group-sm label {
  display: block;
  font-size: 0.75rem;
  color: var(--gray-600);
  margin-bottom: 2px;
}

.form-input-sm {
  height: 30px;
  font-size: 0.8125rem;
  padding: 4px 8px;
  width: 100%;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-sm);
  background: white;
}
.form-input-sm:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-light);
}

.style-row {
  display: flex;
  gap: var(--space-2);
}

.color-input {
  width: 100%;
  height: 30px;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-sm);
  padding: 2px;
  cursor: pointer;
}

.form-range {
  width: 100%;
  margin-top: 4px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  padding: 2px 0;
  color: var(--gray-600);
}
.info-row code {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--gray-800);
}
</style>
