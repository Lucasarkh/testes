<template>
  <div class="layers-panel">
    <h4 class="panel-title">Elementos ({{ elements.length }})</h4>

    <div class="search-bar">
      <input v-model="search" placeholder="Buscar..." class="search-input" />
    </div>

    <div class="layer-groups">
      <div v-for="group in groupedElements" :key="group.label" class="layer-group">
        <button class="group-header" @click="toggleGroup(group.label)">
          <span class="group-chevron" :class="{ open: expandedGroups.has(group.label) }">▸</span>
          <span class="group-icon">{{ group.icon }}</span>
          <span class="group-label">{{ group.label }}</span>
          <span class="group-count">{{ group.items.length }}</span>
        </button>
        <div v-show="expandedGroups.has(group.label)" class="group-items">
          <button
            v-for="el in group.items"
            :key="el.id"
            :class="['layer-item', { selected: el.id === selectedId }]"
            @click="el.id && $emit('select', el.id)"
          >
            <span class="item-name">{{ el.code || el.name || el.metaJson?.tileId || el.type }}</span>
            <span class="item-type">{{ el.metaJson?.tileId ?? el.geometryType }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MapElementData } from '../../composables/map/types'

const props = defineProps<{
  elements: MapElementData[]
  selectedId: string | null
}>()

defineEmits<{ select: [id: string] }>()

const search = ref('')
const expandedGroups = ref(new Set<string>(['Ruas', 'Lotes', 'Natureza', 'Estruturas', 'Outros']))

function toggleGroup(label: string) {
  if (expandedGroups.value.has(label)) expandedGroups.value.delete(label)
  else expandedGroups.value.add(label)
}

const typeGroupMap: Record<string, { label: string; icon: string }> = {
  ROAD: { label: 'Ruas', icon: 'RUA' },
  LOT: { label: 'Lotes', icon: 'LOT' },
  GREEN: { label: 'Natureza', icon: 'NAT' },
  LAKE: { label: 'Natureza', icon: 'NAT' },
  GATE: { label: 'Estruturas', icon: 'STR' },
  PARKING: { label: 'Estruturas', icon: 'STR' },
  ROUNDABOUT: { label: 'Ruas', icon: 'RUA' },
  LABEL: { label: 'Outros', icon: 'OUT' },
}

const groupedElements = computed(() => {
  const q = search.value.toLowerCase()
  const filtered = props.elements.filter(el => {
    if (!q) return true
    return (el.code?.toLowerCase().includes(q) || el.name?.toLowerCase().includes(q) || el.metaJson?.tileId?.toLowerCase().includes(q))
  })
  const groups: Record<string, { label: string; icon: string; items: MapElementData[] }> = {}
  for (const el of filtered) {
    const { label, icon } = typeGroupMap[el.type] ?? { label: 'Outros', icon: 'OUT' }
    if (!groups[label]) groups[label] = { label, icon, items: [] }
    groups[label].items.push(el)
  }
  return Object.values(groups)
})
</script>

<style scoped>
.layers-panel { padding: 8px; font-size: 0.78rem; overflow-y: auto; max-height: 300px; }
.panel-title { font-size: 0.8rem; font-weight: 700; color: var(--gray-800); margin-bottom: 8px; }
.search-bar { margin-bottom: 6px; }
.search-input {
  width: 100%; border: 1px solid var(--gray-200); border-radius: 4px;
  padding: 4px 8px; font-size: 0.72rem;
}
.search-input:focus { outline: none; border-color: var(--color-primary); }
.group-header {
  display: flex; align-items: center; gap: 4px; width: 100%; border: none;
  background: transparent; padding: 4px 2px; cursor: pointer; font-size: 0.72rem;
  font-weight: 600; color: var(--gray-600);
}
.group-header:hover { background: var(--gray-50); }
.group-chevron { font-size: 0.6rem; color: var(--gray-400); transition: transform 0.15s; }
.group-chevron.open { transform: rotate(90deg); }
.group-count { margin-left: auto; color: var(--gray-400); font-weight: 400; font-size: 0.65rem; }
.group-items { padding-left: 12px; }
.layer-item {
  display: flex; justify-content: space-between; width: 100%; border: none;
  background: transparent; padding: 3px 6px; cursor: pointer; border-radius: 3px;
  font-size: 0.7rem; color: var(--gray-700);
}
.layer-item:hover { background: var(--gray-50); }
.layer-item.selected { background: var(--blue-50); color: var(--color-primary); font-weight: 600; }
.item-type { color: var(--gray-400); font-size: 0.6rem; }
</style>
