<template>
  <div class="layers-panel">
    <div class="layers-header">
      <span class="layers-title">📑 Camadas ({{ elements.length }})</span>
    </div>

    <div v-for="(group, type) in groupedElements" :key="type" class="layer-group">
      <div class="layer-group-header" @click="toggleGroup(type as string)">
        <span class="type-icon">{{ icons[type as MapElementType] || '⬡' }}</span>
        <span class="group-name">{{ labels[type as MapElementType] }} ({{ group?.length || 0 }})</span>
        <span class="expand-icon">{{ expanded[type as string] ? '▾' : '▸' }}</span>
      </div>
      <div v-if="expanded[type as string]" class="layer-items">
        <div
          v-for="el in group"
          :key="el.id"
          class="layer-item"
          :class="{ selected: el.id === selectedId }"
          @click="$emit('select', el.id!)"
        >
          <span v-if="el.type === 'LOT'" class="lot-dot" :style="{ background: lotStatusColor(el) }"></span>
          <span class="layer-name">{{ el.code || el.name || '(sem nome)' }}</span>
          <button class="icon-btn-xs" title="Excluir" @click.stop="$emit('delete', el.id!)">✕</button>
        </div>
      </div>
    </div>

    <div v-if="elements.length === 0" class="empty-hint">
      <p>Nenhum elemento no mapa.</p>
      <p>Use as ferramentas à esquerda para criar.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { MapElementData, MapElementType } from './types'
import { MAP_ELEMENT_LABELS } from './types'

const props = defineProps<{
  elements: MapElementData[]
  selectedId: string | null
}>()

defineEmits<{
  select: [id: string]
  delete: [id: string]
}>()

const labels = MAP_ELEMENT_LABELS
const icons: Record<MapElementType, string> = {
  LOT: '📐',
  ROAD: '🛣️',
  ROUNDABOUT: '⭕',
  LAKE: '💧',
  GREEN: '🌳',
  LABEL: '🏷️',
  PATH: '🛤️',
  POLYGON: '⬡',
}

const expanded = reactive<Record<string, boolean>>({})

const groupedElements = computed(() => {
  const map: Partial<Record<MapElementType, MapElementData[]>> = {}
  for (const el of props.elements) {
    ;(map[el.type] ??= []).push(el)
  }
  // Initialize expanded state for new groups
  for (const key of Object.keys(map)) {
    if (expanded[key] === undefined) expanded[key] = true
  }
  return map
})

function toggleGroup(type: string) {
  expanded[type] = !expanded[type]
}

function lotStatusColor(el: MapElementData): string {
  const s = el.metaJson?.lotStatus || 'AVAILABLE'
  if (s === 'SOLD') return '#ef4444'
  if (s === 'RESERVED') return '#f59e0b'
  return '#22c55e'
}
</script>

<style scoped>
.layers-panel {
  width: 100%;
  background: white;
  overflow-y: auto;
  border-top: 1px solid var(--gray-200);
  flex: 1;
  min-height: 0;
}

.layers-header {
  padding: var(--space-3) var(--space-3);
  border-bottom: 1px solid var(--gray-100);
}

.layers-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--gray-700);
}

.layer-group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px var(--space-3);
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--gray-700);
  background: var(--gray-50);
  border-bottom: 1px solid var(--gray-100);
}
.layer-group-header:hover { background: var(--gray-100); }

.type-icon {
  font-size: 0.875rem;
  flex-shrink: 0;
}

.group-name { flex: 1; }
.expand-icon { font-size: 0.75rem; color: var(--gray-400); }

.layer-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px var(--space-3) 5px var(--space-5);
  font-size: 0.8125rem;
  cursor: pointer;
  border-bottom: 1px solid var(--gray-50);
  color: var(--gray-600);
}
.layer-item:hover { background: var(--gray-50); }
.layer-item.selected {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 500;
}

.lot-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.layer-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.icon-btn-xs {
  width: 20px; height: 20px;
  border: none; background: transparent;
  border-radius: var(--radius-sm); cursor: pointer;
  font-size: 0.75rem; color: var(--gray-400);
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
}
.layer-item:hover .icon-btn-xs { opacity: 1; }
.icon-btn-xs:hover { background: var(--danger-light); color: var(--danger); }

.empty-hint {
  padding: var(--space-4);
  text-align: center;
  font-size: 0.8125rem;
  color: var(--gray-400);
  line-height: 1.6;
}
</style>
