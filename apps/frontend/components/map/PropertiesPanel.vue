<template>
  <aside class="properties-panel" v-if="element">
    <h3 class="panel-title">Propriedades</h3>

    <!-- Tile info -->
    <div class="prop-section">
      <div class="prop-row">
        <span class="prop-label">Tipo</span>
        <span class="prop-value">{{ tileName }}</span>
      </div>
      <div class="prop-row">
        <span class="prop-label">ID</span>
        <span class="prop-value mono">{{ element.id?.slice(0, 8) }}</span>
      </div>
    </div>

    <!-- Position -->
    <div class="prop-section">
      <h4 class="section-title">Posição</h4>
      <div class="prop-grid">
        <div class="prop-field">
          <label>X</label>
          <input type="number" :value="element.geometryJson.x" @change="updateGeometry('x', $event)" />
        </div>
        <div class="prop-field">
          <label>Y</label>
          <input type="number" :value="element.geometryJson.y" @change="updateGeometry('y', $event)" />
        </div>
      </div>
      <div class="prop-grid">
        <div class="prop-field">
          <label>Rotação</label>
          <input type="number" :value="element.geometryJson.rotation ?? 0" step="90" @change="updateGeometry('rotation', $event)" />
        </div>
      </div>
    </div>

    <!-- Size -->
    <div class="prop-section">
      <h4 class="section-title">Tamanho</h4>
      <div class="prop-grid">
        <div class="prop-field">
          <label>Largura</label>
          <input type="number" :value="element.geometryJson.width" step="50" min="50" @change="updateGeometry('width', $event)" />
        </div>
        <div class="prop-field">
          <label>Altura</label>
          <input type="number" :value="element.geometryJson.height" step="50" min="50" @change="updateGeometry('height', $event)" />
        </div>
      </div>
    </div>

    <!-- Display options -->
    <div class="prop-section">
      <h4 class="section-title">Exibição</h4>
      <div class="prop-field full">
        <label class="toggle-label">
          <input type="checkbox" :checked="element.metaJson?.showLabel ?? false" @change="updateMeta('showLabel', ($event.target as HTMLInputElement).checked)" />
          Mostrar rótulo no mapa
        </label>
      </div>
      <div v-if="element.metaJson?.showLabel" class="prop-field full">
        <label>Texto do rótulo</label>
        <input type="text" :value="element.name" @change="updateField('name', ($event.target as HTMLInputElement).value)" />
      </div>
    </div>

    <!-- Lot-specific fields -->
    <div v-if="element.type === 'LOT'" class="prop-section">
      <h4 class="section-title">Dados do lote</h4>
      <div class="prop-field full">
        <label>Código</label>
        <input type="text" :value="element.code" @change="updateField('code', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="prop-field full">
        <label>Nome</label>
        <input type="text" :value="element.name" @change="updateField('name', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="prop-field full">
        <label>Status</label>
        <select :value="element.metaJson?.lotStatus ?? 'AVAILABLE'" @change="updateMeta('lotStatus', ($event.target as HTMLSelectElement).value)">
          <option value="AVAILABLE">Disponível</option>
          <option value="RESERVED">Reservado</option>
          <option value="SOLD">Vendido</option>
        </select>
      </div>
      <div class="prop-grid">
        <div class="prop-field">
          <label>Preço (R$)</label>
          <input type="number" :value="element.metaJson?.price ?? 0" @change="updateMeta('price', Number(($event.target as HTMLInputElement).value))" />
        </div>
        <div class="prop-field">
          <label>Área (m²)</label>
          <input type="number" :value="element.metaJson?.area ?? 0" @change="updateMeta('area', Number(($event.target as HTMLInputElement).value))" />
        </div>
      </div>
      <div class="prop-grid">
        <div class="prop-field">
          <label>Frente (m)</label>
          <input type="number" :value="element.metaJson?.frontage ?? 0" @change="updateMeta('frontage', Number(($event.target as HTMLInputElement).value))" />
        </div>
        <div class="prop-field">
          <label>Fundo (m)</label>
          <input type="number" :value="element.metaJson?.depth ?? 0" @change="updateMeta('depth', Number(($event.target as HTMLInputElement).value))" />
        </div>
      </div>
      <div class="prop-field full">
        <label>Inclinação</label>
        <select :value="element.metaJson?.slope ?? 'flat'" @change="updateMeta('slope', ($event.target as HTMLSelectElement).value)">
          <option value="flat">Plano</option>
          <option value="gentle">Suave</option>
          <option value="moderate">Moderado</option>
          <option value="steep">Acentuado</option>
        </select>
      </div>
    </div>

    <!-- Label field -->
    <div v-if="element.type === 'LABEL'" class="prop-section">
      <h4 class="section-title">Rótulo</h4>
      <div class="prop-field full">
        <label>Texto</label>
        <input type="text" :value="element.name" @change="updateField('name', ($event.target as HTMLInputElement).value)" />
      </div>
      <div class="prop-grid">
        <div class="prop-field">
          <label>Tamanho fonte</label>
          <input type="number" :value="element.styleJson?.fontSize ?? 14" @change="updateStyle('fontSize', Number(($event.target as HTMLInputElement).value))" />
        </div>
        <div class="prop-field">
          <label>Cor</label>
          <input type="color" :value="element.styleJson?.fontColor ?? '#1e293b'" @change="updateStyle('fontColor', ($event.target as HTMLInputElement).value)" />
        </div>
      </div>
    </div>

    <!-- Delete -->
    <div class="prop-section">
      <button class="delete-btn" @click="element.id && $emit('delete', element.id)">Excluir elemento</button>
    </div>
  </aside>

  <!-- Empty state -->
  <aside class="properties-panel empty" v-else>
    <div class="empty-msg">
      <span class="empty-icon">?</span>
      <p>Selecione um elemento no mapa para ver suas propriedades</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MapElementData } from '../../composables/map/types'
import { getTileById } from '../../composables/map/types'

const props = defineProps<{
  element: MapElementData | null
}>()

const emit = defineEmits<{
  update: [id: string, patch: Partial<MapElementData>]
  delete: [id: string]
}>()

const tileName = computed(() => {
  if (!props.element) return ''
  const tileId = props.element.metaJson?.tileId
  if (tileId) {
    const tile = getTileById(tileId)
    return tile?.name ?? tileId
  }
  return props.element.type
})

function updateGeometry(key: string, event: Event) {
  if (!props.element?.id) return
  const val = Number((event.target as HTMLInputElement).value)
  emit('update', props.element.id, {
    geometryJson: { ...props.element.geometryJson, [key]: val },
  })
}

function updateField(key: keyof MapElementData, value: any) {
  if (!props.element?.id) return
  emit('update', props.element.id, { [key]: value } as any)
}

function updateMeta(key: string, value: any) {
  if (!props.element?.id) return
  emit('update', props.element.id, {
    metaJson: { ...props.element.metaJson, [key]: value },
  })
}

function updateStyle(key: string, value: any) {
  if (!props.element?.id) return
  emit('update', props.element.id, {
    styleJson: { ...props.element.styleJson, [key]: value },
  })
}
</script>

<style scoped>
.properties-panel {
  width: 260px;
  min-width: 260px;
  background: #fff;
  border-left: 1px solid var(--gray-200, #e5e7eb);
  overflow-y: auto;
  padding: 12px;
  font-size: 0.8rem;
}
.properties-panel.empty {
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-msg {
  text-align: center;
  color: var(--gray-400);
  padding: 20px;
}
.empty-icon { font-size: 2rem; }
.empty-msg p { margin-top: 8px; font-size: 0.75rem; }

.panel-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--gray-800, #1f2937);
  margin-bottom: 12px;
}

.prop-section {
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--gray-100, #f3f4f6);
}
.prop-section:last-child { border-bottom: none; }

.section-title {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--gray-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.prop-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
}
.prop-label { color: var(--gray-500); font-size: 0.72rem; }
.prop-value { color: var(--gray-800); font-weight: 500; }
.prop-value.mono { font-family: monospace; font-size: 0.7rem; color: var(--gray-400); }

.prop-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 6px;
}

.prop-field { display: flex; flex-direction: column; gap: 2px; }
.prop-field.full { margin-bottom: 6px; }
.prop-field label {
  font-size: 0.68rem;
  color: var(--gray-500);
  font-weight: 500;
}
.prop-field input,
.prop-field select {
  border: 1px solid var(--gray-200, #e5e7eb);
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 0.75rem;
  color: var(--gray-800);
  background: white;
}
.prop-field input:focus,
.prop-field select:focus {
  outline: none;
  border-color: var(--color-primary, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59,130,246,0.15);
}
.prop-field input[type="color"] {
  height: 28px;
  padding: 2px;
  cursor: pointer;
}

.delete-btn {
  width: 100%;
  padding: 8px;
  background: var(--red-50, #fef2f2);
  color: var(--red-600, #dc2626);
  border: 1px solid var(--red-200, #fecaca);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.15s;
}
.delete-btn:hover {
  background: var(--red-100, #fee2e2);
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  color: var(--gray-600, #4b5563);
  cursor: pointer;
}
.toggle-label input[type="checkbox"] {
  accent-color: var(--color-primary, #3b82f6);
  width: 14px;
  height: 14px;
  cursor: pointer;
}
</style>
