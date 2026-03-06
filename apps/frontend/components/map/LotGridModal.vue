<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay">
      <div class="modal-card">
        <h3 class="modal-title">Gerar grade de lotes</h3>
        <p class="modal-desc">Crie uma grade de lotes automaticamente. Os lotes serão colocados a partir da posição (0, 0) no mapa.</p>

        <div class="form-grid">
          <div class="field">
            <label>Colunas</label>
            <input v-model.number="cols" type="number" min="1" max="50" />
          </div>
          <div class="field">
            <label>Linhas</label>
            <input v-model.number="rows" type="number" min="1" max="50" />
          </div>
        </div>

        <div class="form-grid">
          <div class="field">
            <label>Tipo de lote</label>
            <select v-model="lotTileId">
              <option value="lot-small">Lote pequeno (2×2)</option>
              <option value="lot-medium">Lote médio (2×3)</option>
              <option value="lot-large">Lote grande (3×3)</option>
              <option value="lot-wide">Lote largo (3×2)</option>
              <option value="lot-commercial">Lote comercial (3×4)</option>
            </select>
          </div>
          <div class="field">
            <label>Prefixo</label>
            <input v-model="prefix" type="text" placeholder="Q1-L" />
          </div>
        </div>

        <div class="form-grid">
          <div class="field">
            <label>Posição X inicial</label>
            <input v-model.number="startX" type="number" />
          </div>
          <div class="field">
            <label>Posição Y inicial</label>
            <input v-model.number="startY" type="number" />
          </div>
        </div>

        <div class="preview-info">
          <span>{{ cols * rows }} lotes ({{ cols }}×{{ rows }})</span>
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" @click="$emit('close')">Cancelar</button>
          <button class="btn-primary" @click="generate">Gerar lotes</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getTileById } from '../../composables/map/types'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  close: []
  generate: [config: {
    cols: number
    rows: number
    tileId: string
    prefix: string
    startX: number
    startY: number
  }]
}>()

const cols = ref(5)
const rows = ref(4)
const lotTileId = ref('lot-small')
const prefix = ref('Q1-L')
const startX = ref(0)
const startY = ref(0)

function generate() {
  emit('generate', {
    cols: cols.value,
    rows: rows.value,
    tileId: lotTileId.value,
    prefix: prefix.value,
    startX: startX.value,
    startY: startY.value,
  })
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal-card {
  background: white; border-radius: 10px; padding: 24px; width: 420px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.modal-title { font-size: 1.05rem; font-weight: 700; color: var(--gray-900); margin-bottom: 6px; }
.modal-desc { font-size: 0.78rem; color: var(--gray-500); margin-bottom: 16px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 0.72rem; font-weight: 600; color: var(--gray-600); }
.field input, .field select {
  border: 1px solid var(--gray-200); border-radius: 6px; padding: 6px 10px;
  font-size: 0.8rem;
}
.field input:focus, .field select:focus {
  outline: none; border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(59,130,246,0.15);
}
.preview-info {
  background: var(--gray-50); padding: 10px; border-radius: 6px;
  font-size: 0.78rem; color: var(--gray-600); text-align: center;
  margin-bottom: 14px;
}
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
.btn-secondary {
  padding: 8px 16px; border: 1px solid var(--gray-200); border-radius: 6px;
  background: white; cursor: pointer; font-size: 0.8rem; color: var(--gray-700);
}
.btn-secondary:hover { background: var(--gray-50); }
.btn-primary {
  padding: 8px 16px; border: none; border-radius: 6px;
  background: var(--color-primary, #3b82f6); color: white; cursor: pointer;
  font-size: 0.8rem; font-weight: 600;
}
.btn-primary:hover { background: var(--color-primary-dark, #2563eb); }
</style>
