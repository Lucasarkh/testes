<template>
  <div class="toolbox">
    <!-- Workflow steps indicator -->
    <div class="toolbox-steps">
      <button
        v-for="step in EDITOR_STEPS"
        :key="step.key"
        class="step-btn"
        :class="{ active: editorStep === step.key }"
        @click="$emit('setStep', step.key)"
      >
        <span class="step-icon">{{ step.icon }}</span>
        <span class="step-label">{{ step.label }}</span>
      </button>
    </div>

    <!-- Step: Image Base -->
    <template v-if="editorStep === 'image'">
      <div class="toolbox-section">
        <div class="onboarding-card">
          <div class="onboarding-icon">🖼️</div>
          <h4>Imagem Base</h4>
          <p>Envie a planta do loteamento para usar como referência ao desenhar os lotes.</p>
          <label class="btn btn-primary btn-block upload-btn">
            {{ uploadingImage ? 'Enviando...' : '📤 Enviar Imagem' }}
            <input type="file" accept="image/*" style="display:none" @change="$emit('uploadImage', $event)" :disabled="uploadingImage" />
          </label>
          <div v-if="mapBaseImageUrl" class="current-image-info">
            <span class="check-icon">✅</span> Imagem carregada
            <button class="btn-link danger-link" @click="$emit('removeImage')">Remover</button>
          </div>
          <button class="btn btn-ghost btn-sm skip-btn" @click="$emit('setStep', 'draw')">
            Pular este passo →
          </button>
        </div>
      </div>
    </template>

    <!-- Step: Draw -->
    <template v-if="editorStep === 'draw'">
      <!-- Navigation tools -->
      <div class="toolbox-section">
        <span class="toolbox-label">Navegação</span>
        <div class="nav-tools">
          <button
            v-for="t in navTools"
            :key="t.key"
            class="smart-tool-btn compact"
            :class="{ active: smartTool === t.key }"
            :title="t.description + (t.shortcut ? ` (${t.shortcut})` : '')"
            @click="$emit('setSmartTool', t.key)"
          >
            <span class="st-icon">{{ t.icon }}</span>
            <span class="st-label">{{ t.label }}</span>
          </button>
        </div>
      </div>

      <!-- Lot tools - THE main feature -->
      <div class="toolbox-section">
        <span class="toolbox-label">🏘️ Lotes</span>
        <div class="smart-tools-list">
          <button
            v-for="t in lotTools"
            :key="t.key"
            class="smart-tool-btn"
            :class="{ active: smartTool === t.key }"
            @click="$emit('setSmartTool', t.key)"
          >
            <span class="st-icon">{{ t.icon }}</span>
            <div class="st-info">
              <span class="st-label">{{ t.label }}</span>
              <span class="st-desc">{{ t.description }}</span>
            </div>
            <span v-if="t.shortcut" class="st-shortcut">{{ t.shortcut }}</span>
          </button>
        </div>
      </div>

      <!-- Infrastructure tools -->
      <div class="toolbox-section">
        <span class="toolbox-label">🏗️ Infraestrutura</span>
        <div class="smart-tools-list">
          <button
            v-for="t in infraTools"
            :key="t.key"
            class="smart-tool-btn"
            :class="{ active: smartTool === t.key }"
            @click="$emit('setSmartTool', t.key)"
          >
            <span class="st-icon">{{ t.icon }}</span>
            <div class="st-info">
              <span class="st-label">{{ t.label }}</span>
              <span class="st-desc">{{ t.description }}</span>
            </div>
            <span v-if="t.shortcut" class="st-shortcut">{{ t.shortcut }}</span>
          </button>
        </div>
      </div>

      <!-- Other tools -->
      <div class="toolbox-section">
        <span class="toolbox-label">Outros</span>
        <div class="smart-tools-list">
          <button
            v-for="t in otherTools"
            :key="t.key"
            class="smart-tool-btn"
            :class="{ active: smartTool === t.key }"
            @click="$emit('setSmartTool', t.key)"
          >
            <span class="st-icon">{{ t.icon }}</span>
            <div class="st-info">
              <span class="st-label">{{ t.label }}</span>
              <span class="st-desc">{{ t.description }}</span>
            </div>
            <span v-if="t.shortcut" class="st-shortcut">{{ t.shortcut }}</span>
          </button>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="toolbox-section">
        <span class="toolbox-label">Ações Rápidas</span>
        <div class="quick-actions">
          <button class="btn btn-sm btn-secondary btn-block" @click="$emit('undo')" :disabled="!canUndo" title="Desfazer (Ctrl+Z)">↩ Desfazer</button>
          <button class="btn btn-sm btn-secondary btn-block" @click="$emit('redo')" :disabled="!canRedo" title="Refazer (Ctrl+Y)">↪ Refazer</button>
        </div>
      </div>

      <!-- Drawing hint -->
      <div v-if="drawingHint" class="toolbox-section drawing-hint-section">
        <div class="drawing-hint-box" :class="{ 'is-drawing': isDrawing }">
          <span class="hint-icon">{{ isDrawing ? '✏️' : '💡' }}</span>
          <p>{{ drawingHint }}</p>
          <button v-if="isDrawing" class="btn btn-sm btn-danger" @click="$emit('cancelDrawing')">✕ Cancelar</button>
        </div>
      </div>
    </template>

    <!-- Step: Data (spreadsheet for lot details) -->
    <template v-if="editorStep === 'data'">
      <div class="toolbox-section">
        <div class="onboarding-card">
          <div class="onboarding-icon">📋</div>
          <h4>Dados dos Lotes</h4>
          <p>Preencha preços, áreas e status no painel à direita. Selecione lotes no mapa ou use a lista abaixo.</p>
        </div>
      </div>

      <!-- Batch naming -->
      <div class="toolbox-section">
        <span class="toolbox-label">Nomear em Lote</span>
        <div class="batch-naming">
          <input
            v-model="batchPrefix"
            class="form-input form-input-sm"
            placeholder="Ex: Quadra A - Lote"
          />
          <button class="btn btn-sm btn-primary btn-block" @click="$emit('autoName', batchPrefix, 1)" :disabled="!batchPrefix">
            Numerar {{ lotCount }} lotes automaticamente
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="toolbox-section">
        <span class="toolbox-label">Resumo</span>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-val">{{ stats.lots }}</span>
            <span class="stat-lbl">Lotes</span>
          </div>
          <div class="stat-item available">
            <span class="stat-val">{{ stats.available }}</span>
            <span class="stat-lbl">Disponíveis</span>
          </div>
          <div class="stat-item reserved">
            <span class="stat-val">{{ stats.reserved }}</span>
            <span class="stat-lbl">Reservados</span>
          </div>
          <div class="stat-item sold">
            <span class="stat-val">{{ stats.sold }}</span>
            <span class="stat-lbl">Vendidos</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Save button (always visible) -->
    <div class="toolbox-section save-section">
      <button class="btn btn-primary btn-block save-btn" @click="$emit('save')" :disabled="!dirty || saving">
        {{ saving ? '⏳ Salvando...' : dirty ? '💾 Salvar Alterações' : '✅ Tudo Salvo' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SmartTool, EditorStep } from './types'
import { SMART_TOOLS, EDITOR_STEPS } from './types'

const props = defineProps<{
  smartTool: SmartTool
  editorStep: EditorStep
  isDrawing: boolean
  dirty: boolean
  saving: boolean
  canUndo: boolean
  canRedo: boolean
  drawingHint: string
  mapBaseImageUrl: string | null
  uploadingImage: boolean
  stats: { total: number; lots: number; available: number; reserved: number; sold: number }
  lotCount: number
}>()

defineEmits<{
  setSmartTool: [tool: SmartTool]
  setStep: [step: EditorStep]
  save: []
  undo: []
  redo: []
  cancelDrawing: []
  uploadImage: [event: Event]
  removeImage: []
  autoName: [prefix: string, startNum: number]
}>()

const batchPrefix = ref('Quadra A - Lote')

const navTools = computed(() => SMART_TOOLS.filter((tool) => tool.category === 'navigate'))
const lotTools = computed(() => SMART_TOOLS.filter((tool) => tool.category === 'lots'))
const infraTools = computed(() => SMART_TOOLS.filter((tool) => tool.category === 'infrastructure'))
const otherTools = computed(() => SMART_TOOLS.filter((tool) => tool.category === 'other'))
</script>

<style scoped>
.toolbox {
  width: 100%;
  background: white;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

/* ── Steps indicator ────── */
.toolbox-steps {
  display: flex;
  border-bottom: 2px solid var(--gray-100);
}

.step-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  gap: 2px;
  transition: all 0.15s;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
}
.step-btn:hover { background: var(--gray-50); }
.step-btn.active {
  background: var(--primary-light);
  border-bottom-color: var(--primary);
}
.step-icon { font-size: 1.1rem; }
.step-label { font-size: 0.6875rem; font-weight: 600; color: var(--gray-500); }
.step-btn.active .step-label { color: var(--primary); }

/* ── Sections ───────────── */
.toolbox-section {
  padding: var(--space-3);
  border-bottom: 1px solid var(--gray-100);
}

.toolbox-label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--gray-400);
  margin-bottom: var(--space-2);
}

/* ── Onboarding card ────── */
.onboarding-card {
  text-align: center;
  padding: var(--space-2) 0;
}
.onboarding-icon { font-size: 2rem; margin-bottom: var(--space-2); }
.onboarding-card h4 { font-size: 0.9375rem; font-weight: 700; color: var(--gray-800); margin-bottom: var(--space-1); }
.onboarding-card p { font-size: 0.8125rem; color: var(--gray-500); line-height: 1.5; margin-bottom: var(--space-3); }

.upload-btn { width: 100%; justify-content: center; }
.current-image-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: var(--space-2);
  font-size: 0.8125rem;
  color: var(--gray-600);
}
.check-icon { font-size: 0.875rem; }
.btn-link { background: none; border: none; cursor: pointer; font-size: 0.75rem; color: var(--gray-500); text-decoration: underline; }
.danger-link { color: var(--danger); }
.skip-btn { width: 100%; margin-top: var(--space-3); justify-content: center; }

/* ── Nav tools (compact) ── */
.nav-tools {
  display: flex;
  gap: 4px;
}

.smart-tool-btn.compact {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid var(--gray-200);
  background: white;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.8125rem;
}
.smart-tool-btn.compact:hover { background: var(--gray-50); border-color: var(--gray-300); }
.smart-tool-btn.compact.active {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
}
.smart-tool-btn.compact .st-icon { font-size: 1rem; }
.smart-tool-btn.compact .st-label { font-size: 0.75rem; font-weight: 500; }

/* ── Smart tools list ───── */
.smart-tools-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.smart-tool-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  width: 100%;
}
.smart-tool-btn:hover {
  background: var(--gray-50);
  border-color: var(--gray-200);
}
.smart-tool-btn.active {
  background: var(--primary-light);
  border-color: var(--primary);
}

.st-icon { font-size: 1.25rem; flex-shrink: 0; width: 28px; text-align: center; }
.st-info { flex: 1; min-width: 0; }
.st-label { display: block; font-size: 0.8125rem; font-weight: 600; color: var(--gray-700); line-height: 1.2; }
.smart-tool-btn.active .st-label { color: var(--primary); }
.st-desc { display: block; font-size: 0.6875rem; color: var(--gray-400); line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.st-shortcut {
  font-size: 0.625rem;
  background: var(--gray-100);
  color: var(--gray-500);
  padding: 1px 5px;
  border-radius: 3px;
  font-family: var(--font-mono);
  font-weight: 600;
  flex-shrink: 0;
}

/* ── Quick actions ──────── */
.quick-actions {
  display: flex;
  gap: 4px;
}
.quick-actions .btn { flex: 1; justify-content: center; }

/* ── Drawing hint ───────── */
.drawing-hint-section { padding-bottom: var(--space-2); }
.drawing-hint-box {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}
.drawing-hint-box.is-drawing {
  background: #fef3c7;
  border-color: #fcd34d;
  animation: pulse-hint 2s ease-in-out infinite;
}
@keyframes pulse-hint {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}

.hint-icon { font-size: 1rem; margin-right: 4px; }
.drawing-hint-box p {
  font-size: 0.8125rem;
  color: var(--gray-600);
  line-height: 1.5;
  margin: 0 0 var(--space-2);
}
.drawing-hint-box .btn { width: 100%; justify-content: center; }

/* ── Batch naming ───────── */
.batch-naming {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* ── Stats grid ─────────── */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.stat-item {
  text-align: center;
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--gray-50);
  border: 1px solid var(--gray-100);
}
.stat-item.available { background: #f0fdf4; border-color: #bbf7d0; }
.stat-item.reserved { background: #fffbeb; border-color: #fde68a; }
.stat-item.sold { background: #fef2f2; border-color: #fecaca; }
.stat-val { display: block; font-size: 1.25rem; font-weight: 700; color: var(--gray-800); }
.stat-lbl { font-size: 0.6875rem; color: var(--gray-500); }

/* ── Save section ───────── */
.save-section {
  margin-top: auto;
  border-top: 1px solid var(--gray-200);
  border-bottom: none;
}
.save-btn { width: 100%; justify-content: center; font-weight: 600; }

/* ── Utilities ──────────── */
.btn-block { width: 100%; justify-content: center; display: flex; }
.form-input-sm {
  height: 30px;
  font-size: 0.8125rem;
  padding: 4px 8px;
}
</style>
