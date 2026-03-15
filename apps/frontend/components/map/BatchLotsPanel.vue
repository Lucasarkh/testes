<template>
  <div class="batch-panel">
    <h4 class="panel-title">Dados dos Lotes</h4>
    <p class="panel-desc">Preencha os dados de todos os lotes de uma vez.</p>

    <div v-if="lots.length === 0" class="empty">
      <p>Nenhum lote no mapa.</p>
    </div>

    <div class="lot-table" v-else>
      <div class="lot-row header">
        <span class="col code">Cód.</span>
        <span class="col status">Status</span>
        <span class="col price">Preço</span>
        <span class="col area">Área</span>
      </div>
      <div
        v-for="lot in lots"
        :key="lot.id"
        :class="['lot-row', { selected: lot.id === selectedId }]"
        @click="lot.id && $emit('select', lot.id)"
      >
        <span class="col code">
          <input
            type="text"
            :value="lot.code || ''"
            placeholder="Q1-L01"
            @change="updateLot(lot.id!, 'code', ($event.target as HTMLInputElement).value)"
          />
        </span>
        <span class="col status">
          <select
            :value="lot.metaJson?.lotStatus ?? 'AVAILABLE'"
            @change="updateLotMeta(lot.id!, 'lotStatus', ($event.target as HTMLSelectElement).value)"
          >
            <option value="AVAILABLE">Disponível</option>
            <option value="RESERVED">Reservado</option>
            <option value="SOLD">Vendido</option>
          </select>
        </span>
        <span class="col price">
          <input
            type="number"
            :value="lot.metaJson?.price ?? ''"
            placeholder="0"
            @change="updateLotMeta(lot.id!, 'price', Number(($event.target as HTMLInputElement).value))"
          />
        </span>
        <span class="col area">
          <input
            type="number"
            :value="lot.metaJson?.area ?? ''"
            placeholder="m²"
            @change="updateLotMeta(lot.id!, 'area', Number(($event.target as HTMLInputElement).value))"
          />
        </span>
      </div>
    </div>

    <div class="batch-actions">
      <button class="batch-btn" @click="$emit('autoName')">
        Numerar automaticamente
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MapElementData } from '../../composables/map/types'

const props = defineProps<{
  elements: MapElementData[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  update: [id: string, patch: Partial<MapElementData>]
  autoName: []
}>()

const lots = computed(() => props.elements.filter((e) => e.type === 'LOT'))

function updateLot(id: string, key: string, value: any) {
  emit('update', id, { [key]: value } as any)
}

function updateLotMeta(id: string, key: string, value: any) {
  const lot = lots.value.find((l) => l.id === id)
  if (!lot) return
  emit('update', id, { metaJson: { ...lot.metaJson, [key]: value } })
}
</script>

<style scoped>
.batch-panel { padding: 8px; font-size: 0.78rem; }
.panel-title { font-size: 0.85rem; font-weight: 700; color: var(--gray-800); margin-bottom: 4px; }
.panel-desc { font-size: 0.72rem; color: var(--gray-500); margin-bottom: 10px; }
.empty { text-align: center; color: var(--gray-400); padding: 20px; font-size: 0.75rem; }
.lot-table { border: 1px solid var(--gray-200); border-radius: 6px; overflow: hidden; }
.lot-row {
  display: grid; grid-template-columns: 80px 100px 80px 60px;
  border-bottom: 1px solid var(--gray-100); align-items: center;
}
.lot-row:last-child { border-bottom: none; }
.lot-row.header {
  background: var(--gray-50); font-weight: 600; font-size: 0.68rem;
  color: var(--gray-500); text-transform: uppercase;
}
.lot-row.selected { background: var(--blue-50); }
.col { padding: 4px 6px; }
.col input, .col select {
  width: 100%; border: 1px solid transparent; background: transparent;
  font-size: 0.72rem; padding: 2px 4px; border-radius: 3px;
}
.col input:focus, .col select:focus {
  border-color: var(--color-primary); outline: none;
  background: white;
}
.batch-actions { margin-top: 10px; }
.batch-btn {
  width: 100%; padding: 7px; border: 1px solid var(--gray-200);
  border-radius: 6px; background: white; cursor: pointer; font-size: 0.75rem;
  color: var(--gray-700);
}
.batch-btn:hover { background: var(--gray-50); }
</style>
