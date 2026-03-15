<template>
  <div class="batch-lots-panel">
    <div class="panel-header-bar">
      <span class="panel-title">📋 Dados dos Lotes ({{ lots.length }})</span>
      <div class="panel-actions">
        <button class="btn btn-ghost btn-xs" @click="expandAll" title="Expandir tudo">▼</button>
        <button class="btn btn-ghost btn-xs" @click="collapseAll" title="Recolher tudo">▲</button>
      </div>
    </div>

    <div v-if="lots.length === 0" class="empty-hint">
      <p>Nenhum lote criado ainda.</p>
      <p>Vá para a aba "Desenhar" e use as ferramentas de lote.</p>
    </div>

    <!-- Lot list (spreadsheet-lite) -->
    <div class="lots-list" v-else>
      <div
        v-for="lot in lots"
        :key="lot.id"
        class="lot-row"
        :class="{
          selected: lot.id === selectedId,
          expanded: expandedIds.has(lot.id!)
        }"
      >
        <!-- Lot header row -->
        <div class="lot-header" @click="selectAndToggle(lot)">
          <span class="lot-status-dot" :style="{ background: statusColor(lot) }"></span>
          <span class="lot-code">{{ lot.code || lot.name || '(sem nome)' }}</span>
          <span class="lot-status-badge" :class="'status-' + getStatus(lot)">{{ statusLabel(lot) }}</span>
          <span class="lot-expand">{{ expandedIds.has(lot.id!) ? '▾' : '▸' }}</span>
        </div>

        <!-- Expanded details -->
        <div v-if="expandedIds.has(lot.id!)" class="lot-details">
          <!-- Name / Code -->
          <div class="detail-row">
            <div class="detail-field">
              <label>Nome</label>
              <input
                class="form-input form-input-sm"
                :value="lot.name"
                @change="patchLot(lot.id!, { name: ($event.target as HTMLInputElement).value })"
                placeholder="Ex: Lote 01"
              />
            </div>
            <div class="detail-field">
              <label>Código</label>
              <input
                class="form-input form-input-sm"
                :value="lot.code"
                @change="patchLot(lot.id!, { code: ($event.target as HTMLInputElement).value })"
                placeholder="Ex: QA-L01"
              />
            </div>
          </div>

          <!-- Status -->
          <div class="detail-row">
            <div class="detail-field full">
              <label>Status</label>
              <div class="status-buttons">
                <button
                  class="status-btn available"
                  :class="{ active: getStatus(lot) === 'AVAILABLE' }"
                  @click="setLotStatus(lot, 'AVAILABLE')"
                >
                  🟢 Disponível
                </button>
                <button
                  class="status-btn reserved"
                  :class="{ active: getStatus(lot) === 'RESERVED' }"
                  @click="setLotStatus(lot, 'RESERVED')"
                >
                  🟡 Reservado
                </button>
                <button
                  class="status-btn sold"
                  :class="{ active: getStatus(lot) === 'SOLD' }"
                  @click="setLotStatus(lot, 'SOLD')"
                >
                  🔴 Vendido
                </button>
              </div>
            </div>
          </div>

          <!-- Price / Area -->
          <div class="detail-row">
            <div class="detail-field">
              <label>Preço (R$)</label>
              <input
                type="number"
                class="form-input form-input-sm"
                :value="lot.metaJson?.price"
                @change="patchMeta(lot, { price: +($event.target as HTMLInputElement).value || undefined })"
                placeholder="0"
              />
            </div>
            <div class="detail-field">
              <label>Área (m²)</label>
              <input
                type="number"
                class="form-input form-input-sm"
                :value="lot.metaJson?.areaM2"
                @change="patchMeta(lot, { areaM2: +($event.target as HTMLInputElement).value || undefined })"
                placeholder="0"
              />
            </div>
          </div>

          <!-- Dimensions -->
          <div class="detail-row">
            <div class="detail-field">
              <label>Frente (m)</label>
              <input
                type="number"
                class="form-input form-input-sm"
                :value="lot.metaJson?.frontage"
                @change="patchMeta(lot, { frontage: +($event.target as HTMLInputElement).value || undefined })"
              />
            </div>
            <div class="detail-field">
              <label>Fundo (m)</label>
              <input
                type="number"
                class="form-input form-input-sm"
                :value="lot.metaJson?.depth"
                @change="patchMeta(lot, { depth: +($event.target as HTMLInputElement).value || undefined })"
              />
            </div>
          </div>

          <!-- Slope -->
          <div class="detail-row">
            <div class="detail-field full">
              <label>Inclinação</label>
              <select
                class="form-input form-input-sm"
                :value="lot.metaJson?.slope || 'FLAT'"
                @change="patchMeta(lot, { slope: ($event.target as HTMLSelectElement).value })"
              >
                <option value="FLAT">Plano</option>
                <option value="UPHILL">Aclive</option>
                <option value="DOWNHILL">Declive</option>
              </select>
            </div>
          </div>

          <div class="detail-actions">
            <button class="btn btn-ghost btn-xs" @click="$emit('focusElement', lot.id!)" title="Localizar no mapa">🎯 Localizar</button>
            <button class="btn btn-ghost btn-xs danger-btn" @click="$emit('delete', lot.id!)" title="Excluir lote">🗑️ Excluir</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { MapElementData } from './types'

const props = defineProps<{
  lots: MapElementData[]
  selectedId: string | null
}>()

const emit = defineEmits<{
  update: [id: string, patch: Partial<MapElementData>]
  delete: [id: string]
  select: [id: string]
  focusElement: [id: string]
}>()

const expandedIds = reactive(new Set<string>())

// Auto-expand selected lot
watch(() => props.selectedId, (id) => {
  if (id) {
    const lot = props.lots.find(l => l.id === id)
    if (lot) expandedIds.add(id)
  }
})

function getStatus(lot: MapElementData): string {
  return lot.metaJson?.lotStatus || 'AVAILABLE'
}

function statusColor(lot: MapElementData): string {
  const s = getStatus(lot)
  if (s === 'SOLD') return '#ef4444'
  if (s === 'RESERVED') return '#f59e0b'
  return '#22c55e'
}

function statusLabel(lot: MapElementData): string {
  const s = getStatus(lot)
  if (s === 'SOLD') return 'Vendido'
  if (s === 'RESERVED') return 'Reservado'
  return 'Disponível'
}

function selectAndToggle(lot: MapElementData) {
  emit('select', lot.id!)
  if (expandedIds.has(lot.id!)) {
    expandedIds.delete(lot.id!)
  } else {
    expandedIds.add(lot.id!)
  }
}

function patchLot(id: string, patch: Partial<MapElementData>) {
  emit('update', id, patch)
}

function patchMeta(lot: MapElementData, metaPatch: Record<string, any>) {
  emit('update', lot.id!, { metaJson: { ...lot.metaJson, ...metaPatch } })
}

function setLotStatus(lot: MapElementData, status: string) {
  patchMeta(lot, { lotStatus: status })
}

function expandAll() {
  for (const lot of props.lots) {
    if (lot.id) expandedIds.add(lot.id)
  }
}

function collapseAll() {
  expandedIds.clear()
}
</script>

<style scoped>
.batch-lots-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
}

.panel-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  border-bottom: 1px solid var(--gray-100);
  flex-shrink: 0;
}

.panel-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--gray-700);
}

.panel-actions { display: flex; gap: 2px; }
.btn-xs {
  width: 24px;
  height: 24px;
  padding: 0;
  font-size: 0.6875rem;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: var(--radius-sm);
  color: var(--gray-400);
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-xs:hover { background: var(--gray-100); color: var(--gray-600); }

.empty-hint {
  padding: var(--space-6) var(--space-4);
  text-align: center;
  font-size: 0.8125rem;
  color: var(--gray-400);
  line-height: 1.6;
}

/* ── Lots list ──────── */
.lots-list {
  flex: 1;
  overflow-y: auto;
}

.lot-row {
  border-bottom: 1px solid var(--gray-50);
}
.lot-row.selected {
  background: var(--primary-light);
}

.lot-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px var(--space-3);
  cursor: pointer;
  transition: background 0.1s;
}
.lot-header:hover { background: var(--gray-50); }

.lot-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.lot-code {
  flex: 1;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--gray-700);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lot-status-badge {
  font-size: 0.625rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}
.status-AVAILABLE { background: #dcfce7; color: #166534; }
.status-RESERVED { background: #fef3c7; color: #92400e; }
.status-SOLD { background: #fef2f2; color: #991b1b; }

.lot-expand {
  font-size: 0.75rem;
  color: var(--gray-400);
  flex-shrink: 0;
}

/* ── Lot details ─────── */
.lot-details {
  padding: 0 var(--space-3) var(--space-3);
  animation: slideDown 0.15s ease;
}
@keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 500px; } }

.detail-row {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.detail-field {
  flex: 1;
}
.detail-field.full { flex: unset; width: 100%; }

.detail-field label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--gray-500);
  margin-bottom: 2px;
}

.form-input-sm {
  height: 28px;
  font-size: 0.8125rem;
  padding: 4px 6px;
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

/* ── Status buttons ────── */
.status-buttons {
  display: flex;
  gap: 4px;
}
.status-btn {
  flex: 1;
  padding: 4px 6px;
  font-size: 0.6875rem;
  border: 1px solid var(--gray-200);
  background: white;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
  font-weight: 500;
}
.status-btn:hover { border-color: var(--gray-300); }
.status-btn.available.active { background: #dcfce7; border-color: #22c55e; color: #166534; }
.status-btn.reserved.active { background: #fef3c7; border-color: #f59e0b; color: #92400e; }
.status-btn.sold.active { background: #fef2f2; border-color: #ef4444; color: #991b1b; }

/* ── Detail actions ────── */
.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-top: var(--space-1);
  padding-top: var(--space-2);
  border-top: 1px solid var(--gray-100);
}
.danger-btn:hover { color: var(--danger) !important; }
</style>
