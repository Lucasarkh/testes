<template>
  <div class="lot-grid-modal-overlay">
    <div class="lot-grid-modal">
      <div class="modal-header">
        <h3>⊞ Grade de Lotes</h3>
        <p>Crie vários lotes retangulares organizados em grade</p>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <div class="grid-form">
          <div class="form-row">
            <div class="form-group-sm">
              <label>Linhas</label>
              <input type="number" class="form-input form-input-sm" v-model.number="config.rows" min="1" max="50" />
            </div>
            <div class="form-group-sm">
              <label>Colunas</label>
              <input type="number" class="form-input form-input-sm" v-model.number="config.cols" min="1" max="50" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group-sm">
              <label>Largura do lote (px)</label>
              <input type="number" class="form-input form-input-sm" v-model.number="config.lotWidth" min="20" max="500" />
            </div>
            <div class="form-group-sm">
              <label>Altura do lote (px)</label>
              <input type="number" class="form-input form-input-sm" v-model.number="config.lotHeight" min="20" max="500" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group-sm">
              <label>Espaçamento (px)</label>
              <input type="number" class="form-input form-input-sm" v-model.number="config.gap" min="0" max="50" />
            </div>
            <div class="form-group-sm">
              <label>Rotação (graus)</label>
              <input type="number" class="form-input form-input-sm" v-model.number="config.rotation" min="0" max="360" step="5" />
            </div>
          </div>

          <div class="form-group-sm">
            <label>Nome da Quadra</label>
            <input type="text" class="form-input form-input-sm" v-model="config.blockName" placeholder="Ex: Quadra A" />
          </div>

          <div class="form-group-sm">
            <label>Número inicial</label>
            <input type="number" class="form-input form-input-sm" v-model.number="config.startNumber" min="1" />
          </div>
        </div>

        <!-- Preview -->
        <div class="grid-preview">
          <div class="preview-label">Pré-visualização: {{ config.rows * config.cols }} lotes</div>
          <div class="preview-canvas" :style="previewStyle">
            <div
              v-for="i in Math.min(config.rows * config.cols, 120)"
              :key="i"
              class="preview-lot"
              :style="lotPreviewStyle(i - 1)"
            >
              <span>{{ config.startNumber + i - 1 }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="placement-hint">
          💡 Após criar, clique no mapa para posicionar a grade
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="$emit('close')">Cancelar</button>
          <button class="btn btn-primary" @click="create">
            Criar {{ config.rows * config.cols }} Lotes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed } from 'vue'
import type { LotGridConfig } from '../../composables/map/types'

const props = defineProps<{
  initialConfig: LotGridConfig
}>()

const emit = defineEmits<{
  close: []
  create: [config: LotGridConfig]
}>()

const config = reactive<LotGridConfig>({ ...props.initialConfig })

const previewStyle = computed(() => {
  const totalW = config.cols * (config.lotWidth + config.gap)
  const totalH = config.rows * (config.lotHeight + config.gap)
  const maxW = 360
  const maxH = 200
  const scale = Math.min(maxW / totalW, maxH / totalH, 1)
  return {
    width: `${totalW * scale}px`,
    height: `${totalH * scale}px`,
    position: 'relative' as const,
  }
})

function lotPreviewStyle(index: number) {
  const row = Math.floor(index / config.cols)
  const col = index % config.cols

  const totalW = config.cols * (config.lotWidth + config.gap)
  const totalH = config.rows * (config.lotHeight + config.gap)
  const maxW = 360
  const maxH = 200
  const scale = Math.min(maxW / totalW, maxH / totalH, 1)

  return {
    left: `${col * (config.lotWidth + config.gap) * scale}px`,
    top: `${row * (config.lotHeight + config.gap) * scale}px`,
    width: `${config.lotWidth * scale}px`,
    height: `${config.lotHeight * scale}px`,
  }
}

function create() {
  emit('create', { ...config })
}
</script>

<style scoped>
.lot-grid-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.lot-grid-modal {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  width: 480px;
  max-width: 95vw;
  max-height: 90vh;
  overflow: auto;
  animation: slideUp 0.2s ease;
}
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.modal-header {
  padding: var(--space-5) var(--space-5) var(--space-3);
  position: relative;
}
.modal-header h3 { font-size: 1.125rem; font-weight: 700; color: var(--gray-800); margin: 0 0 4px; }
.modal-header p { font-size: 0.8125rem; color: var(--gray-500); margin: 0; }
.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  border: none;
  background: transparent;
  font-size: 1.4rem;
  cursor: pointer;
  color: var(--gray-400);
  line-height: 1;
}
.modal-close:hover { color: var(--gray-700); }

.modal-body { padding: 0 var(--space-5) var(--space-4); }

.grid-form { display: flex; flex-direction: column; gap: var(--space-2); }
.form-row { display: flex; gap: var(--space-3); }
.form-row .form-group-sm { flex: 1; }

.form-group-sm { margin-bottom: 4px; }
.form-group-sm label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--gray-600);
  margin-bottom: 2px;
}

.form-input-sm {
  height: 32px;
  font-size: 0.8125rem;
  padding: 4px 8px;
  width: 100%;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-sm);
}
.form-input-sm:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-light);
}

/* ── Preview ─────── */
.grid-preview {
  margin-top: var(--space-4);
  padding: var(--space-3);
  background: var(--gray-50);
  border-radius: var(--radius-md);
  border: 1px solid var(--gray-200);
}
.preview-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--gray-500);
  margin-bottom: var(--space-2);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.preview-canvas {
  margin: 0 auto;
  overflow: hidden;
}
.preview-lot {
  position: absolute;
  background: #dcfce7;
  border: 1px solid #22c55e;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5rem;
  color: #166534;
  font-weight: 600;
  overflow: hidden;
}

/* ── Footer ──────── */
.modal-footer {
  padding: var(--space-3) var(--space-5) var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.placement-hint {
  font-size: 0.8125rem;
  color: var(--gray-500);
  text-align: center;
  padding: var(--space-2);
  background: #eff6ff;
  border-radius: var(--radius-sm);
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
