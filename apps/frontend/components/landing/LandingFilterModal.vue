<template>
  <Transition name="fade">
    <div v-if="visible" class="v4-filter-modal-overlay">
      <div class="v4-filter-modal-card">
        <div class="v4-modal-header">
          <h3 class="v4-modal-title">Lote Ideal</h3>
          <button class="v4-modal-close" @click="$emit('update:visible', false)">&#10005;</button>
        </div>

        <div class="v4-modal-body">
          <p style="margin-bottom: 24px; color: #86868b; font-size: 15px;">Escolha as características que você deseja para o seu novo lote.</p>

          <span class="v4-modal-label">O que você está buscando?</span>
          <div class="v4-modal-tags" style="margin-bottom: 24px;">
            <button
              v-for="option in LOT_SEARCH_INTENT_OPTIONS"
              :key="option.value"
              class="v4-modal-tag"
              :class="{ active: searchIntent === option.value }"
              @click="handleSearchIntentChange(option.value)"
            >
              {{ option.label }}
            </button>
          </div>

          <template v-if="allAvailableTags.length">
            <span class="v4-modal-label">Características</span>
            <div class="v4-modal-tags">
              <button
                v-for="tag in allAvailableTags"
                :key="tag"
                class="v4-modal-tag"
                :class="{ active: selectedFilterTags.includes(tag) }"
                @click="toggleFilterTag(tag)"
              >
                {{ tag }}
              </button>
            </div>
          </template>

          <span class="v4-modal-label">Busca Inteligente</span>
          <div class="v4-smart-grid">
            <div class="v4-smart-range-card v4-smart-range-card--modal v4-smart-grid-span-2">
              <div class="v4-smart-range-head">
                <div>
                  <span class="v4-smart-range-label">Faixa de área</span>
                  <strong>{{ smartAreaRangeLabel }}</strong>
                </div>
                <span class="v4-smart-range-hint">Disponível de {{ formatAreaValue(areaRangeBounds.min) }} a {{ formatAreaValue(areaRangeBounds.max) }}</span>
              </div>

              <div class="v4-dual-range">
                <div class="v4-dual-range-track" :style="smartAreaTrackStyle"></div>
                <input class="v4-dual-range-input" type="range" :min="areaRangeBounds.min" :max="areaRangeBounds.max" :step="areaRangeStep" :value="currentSmartAreaRange.min" @input="updateSmartAreaMin(Number(($event.target as HTMLInputElement).value))" />
                <input class="v4-dual-range-input" type="range" :min="areaRangeBounds.min" :max="areaRangeBounds.max" :step="areaRangeStep" :value="currentSmartAreaRange.max" @input="updateSmartAreaMax(Number(($event.target as HTMLInputElement).value))" />
              </div>

              <div class="v4-smart-range-values">
                <div class="v4-smart-range-pill">
                  <span>Min</span>
                  <strong>{{ formatAreaValue(currentSmartAreaRange.min) }}</strong>
                </div>
                <div class="v4-smart-range-pill">
                  <span>Max</span>
                  <strong>{{ formatAreaValue(currentSmartAreaRange.max) }}</strong>
                </div>
              </div>
            </div>

            <div class="v4-smart-range-card v4-smart-range-card--modal v4-smart-grid-span-2">
              <div class="v4-smart-range-head">
                <div>
                  <span class="v4-smart-range-label">Faixa de valor</span>
                  <strong>{{ smartPriceRangeLabel }}</strong>
                </div>
                <span class="v4-smart-range-hint">Disponível de {{ formatCurrencyToBrasilia(priceRangeBounds.min) }} a {{ formatCurrencyToBrasilia(priceRangeBounds.max) }}</span>
              </div>

              <div class="v4-dual-range">
                <div class="v4-dual-range-track" :style="smartPriceTrackStyle"></div>
                <input class="v4-dual-range-input" type="range" :min="priceRangeBounds.min" :max="priceRangeBounds.max" :step="priceRangeStep" :value="currentSmartPriceRange.min" @input="updateSmartPriceMin(Number(($event.target as HTMLInputElement).value))" />
                <input class="v4-dual-range-input" type="range" :min="priceRangeBounds.min" :max="priceRangeBounds.max" :step="priceRangeStep" :value="currentSmartPriceRange.max" @input="updateSmartPriceMax(Number(($event.target as HTMLInputElement).value))" />
              </div>

              <div class="v4-smart-range-values">
                <div class="v4-smart-range-pill">
                  <span>Min</span>
                  <strong>{{ formatCurrencyToBrasilia(currentSmartPriceRange.min) }}</strong>
                </div>
                <div class="v4-smart-range-pill">
                  <span>Max</span>
                  <strong>{{ formatCurrencyToBrasilia(currentSmartPriceRange.max) }}</strong>
                </div>
              </div>
            </div>

            <label class="v4-smart-field">
              <span>Teto de valor por m² (R$)</span>
              <input v-model="smartSearchForm.maxPricePerM2" type="number" min="0" step="10" placeholder="Ex: 650" />
            </label>
            <label class="v4-smart-field">
              <span>Largura mínima (m)</span>
              <input v-model="smartSearchForm.minFrontage" type="number" min="0" step="0.1" placeholder="Ex: 10" />
            </label>
            <label class="v4-smart-field">
              <span>Altura mínima (m)</span>
              <input v-model="smartSearchForm.minDepth" type="number" min="0" step="0.1" placeholder="Ex: 25" />
            </label>
          </div>

          <div class="v4-modal-options">
            <label class="v4-modal-option">
              <input type="checkbox" v-model="exactMatchMode" />
              <div class="v4-option-info">
                <span class="v4-option-title">Correspondência Exata</span>
                <span class="v4-option-desc">Mostrar apenas lotes que possuem todos os selos selecionados.</span>
              </div>
            </label>
            <label class="v4-modal-option">
              <input type="checkbox" v-model="smartSearchForm.sortByLowestPricePerM2" />
              <div class="v4-option-info">
                <span class="v4-option-title">Priorizar menor valor de m²</span>
                <span class="v4-option-desc">Ordena os resultados do mais barato por m² para o mais caro.</span>
              </div>
            </label>
          </div>
        </div>

        <div class="v4-modal-footer">
          <button class="v4-btn-modal-search" @click="applyFiltersAndSearch">
            {{ hasAnySmartFilter || selectedFilterTags.length ? `Ver ${filteredCount} unidades compatíveis` : 'Ver todas as unidades' }}
          </button>
          <button v-if="hasAnySmartFilter || selectedFilterTags.length" class="v4-btn-modal-clear" @click="resetIdealLotFilters">
            Limpar seleção
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, toRef } from 'vue'
import { LOT_SEARCH_INTENT_OPTIONS } from '~/utils/lotSearchIntent'
import { formatCurrencyToBrasilia } from '~/utils/money'
import { formatAreaValue } from '~/composables/landing/useLotRanges'
import { useSmartSearch } from '~/composables/landing/useSmartSearch'

const props = defineProps<{
  visible: boolean
  unifiedAvailableLots: any[]
  allAvailableTags: string[]
  areaRangeBounds: { min: number; max: number }
  priceRangeBounds: { min: number; max: number }
  areaRangeStep: number
  priceRangeStep: number
  pathPrefix: string
  corretorCode: string
  searchIntent: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:searchIntent': [value: string]
}>()

const unifiedAvailableLotsRef = toRef(props, 'unifiedAvailableLots')
const areaRangeBoundsComputed = computed(() => props.areaRangeBounds)
const priceRangeBoundsComputed = computed(() => props.priceRangeBounds)
const areaRangeStepComputed = computed(() => props.areaRangeStep)
const priceRangeStepComputed = computed(() => props.priceRangeStep)
const pathPrefixComputed = computed(() => props.pathPrefix)
const showPreferenceOnboarding = ref(false)

const syncBodyScrollLock = () => {
  if (!process.client) return
  document.body.style.overflow = props.visible ? 'hidden' : ''
}

const {
  isFilterModalOpen,
  selectedFilterTags,
  exactMatchMode,
  searchIntent: smartSearchIntent,
  smartSearchForm,
  hasAnySmartFilter,
  filteredCount,
  toggleFilterTag,
  resetIdealLotFilters,
  applyFiltersAndSearch,
  currentSmartAreaRange,
  currentSmartPriceRange,
  smartAreaRangeLabel,
  smartPriceRangeLabel,
  smartAreaTrackStyle,
  smartPriceTrackStyle,
  updateSmartAreaMin,
  updateSmartAreaMax,
  updateSmartPriceMin,
  updateSmartPriceMax,
} = useSmartSearch(
  unifiedAvailableLotsRef as any,
  areaRangeBoundsComputed,
  priceRangeBoundsComputed,
  areaRangeStepComputed,
  priceRangeStepComputed,
  props.corretorCode,
  pathPrefixComputed,
  syncBodyScrollLock,
  showPreferenceOnboarding,
  (props.searchIntent || '') as any,
)

const handleSearchIntentChange = (value: string) => {
  smartSearchIntent.value = value as any
  emit('update:searchIntent', value)
}
</script>

<style scoped>
/* Fade animation */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Modal Search Styles */
.v4-filter-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  z-index: 9000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 12px;
}

@media (min-width: 769px) {
  .v4-filter-modal-overlay {
    align-items: center;
    padding: 28px;
  }
}

.v4-filter-modal-card {
  background: white;
  width: min(100%, 760px);
  border-radius: 28px 28px 0 0;
  padding: 24px 20px 20px;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.12);
  max-height: calc(100dvh - 24px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  animation: modal-slide-up 0.35s cubic-bezier(0.165, 0.84, 0.44, 1);
}

@media (min-width: 769px) {
  .v4-filter-modal-card {
    border-radius: 28px;
    padding: 30px;
    max-height: min(90dvh, 920px);
    box-shadow: 0 30px 60px rgba(0,0,0,0.15);
    animation: modal-appear 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  }
}

@keyframes modal-slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes modal-appear {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.v4-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-shrink: 0;
}
.v4-modal-title { font-size: 24px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.02em; }
.v4-modal-close {
  background: #f5f5f7;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #86868b;
  transition: all 0.2s;
  flex-shrink: 0;
}
.v4-modal-close:hover { background: #e8e8ed; color: #1d1d1f; }

.v4-modal-body {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 16px;
  padding-right: 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(134, 134, 139, 0.55) transparent;
}

.v4-modal-body::-webkit-scrollbar {
  width: 8px;
}

.v4-modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.v4-modal-body::-webkit-scrollbar-thumb {
  background: rgba(134, 134, 139, 0.45);
  border-radius: 999px;
}

.v4-modal-body::-webkit-scrollbar-thumb:hover {
  background: rgba(134, 134, 139, 0.72);
}
.v4-modal-label { font-size: 13px; font-weight: 700; color: #86868b; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 16px; }

.v4-modal-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
}

.v4-smart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .v4-smart-grid {
    grid-template-columns: 1fr;
  }
}

.v4-smart-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.v4-smart-field span {
  font-size: 12px;
  font-weight: 600;
  color: #6e6e73;
}

.v4-smart-field input {
  border: 1px solid #d2d2d7;
  border-radius: 12px;
  padding: 11px 12px;
  font-size: 14px;
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.v4-smart-field input:focus {
  outline: none;
  border-color: #0071e3;
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.15);
}

.v4-modal-tag {
  background: #f5f5f7;
  border: 1px solid #d2d2d7;
  padding: 10px 18px;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.v4-modal-tag:hover { background: #e8e8ed; }
.v4-modal-tag.active { background: #0071e3; color: white; border-color: #0071e3; }

.v4-modal-options {
  background: #f5f5f7;
  padding: 16px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.v4-modal-option {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.v4-modal-option input[type="checkbox"] { width: 20px; height: 20px; cursor: pointer; }
.v4-option-info { display: flex; flex-direction: column; }
.v4-option-title { font-size: 14px; font-weight: 600; color: #1d1d1f; }
.v4-option-desc { font-size: 12px; color: #86868b; }

.v4-modal-footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
  border-top: 1px solid #ececf0;
  padding-top: 14px;
  background: #fff;
}
.v4-btn-modal-search {
  background: #0071e3;
  color: white;
  border: none;
  padding: 16px;
  border-radius: 14px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.v4-btn-modal-search:hover { background: #0077ed; transform: scale(1.02); }
.v4-btn-modal-clear {
  background: transparent;
  color: #0071e3;
  border: none;
  padding: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

/* Smart range card styles */
.v4-smart-range-card {
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.88);
  padding: 18px;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.06);
}

.v4-smart-range-card--modal {
  background: #fbfbfd;
}

.v4-smart-grid-span-2 {
  grid-column: span 2;
}

.v4-smart-range-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.v4-smart-range-label,
.v4-smart-range-hint {
  display: block;
}

.v4-smart-range-label {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}

.v4-smart-range-head strong {
  font-size: 20px;
  line-height: 1.2;
  letter-spacing: -0.03em;
  color: #0f172a;
}

.v4-smart-range-hint {
  font-size: 12px;
  line-height: 1.4;
  color: #64748b;
  text-align: right;
}

.v4-dual-range {
  position: relative;
  height: 34px;
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}

.v4-dual-range-track {
  position: absolute;
  inset: 50% 0 auto;
  transform: translateY(-50%);
  height: 8px;
  border-radius: 999px;
  pointer-events: none;
}

.v4-dual-range-input {
  position: absolute;
  inset: 0;
  width: 100%;
  margin: 0;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
  pointer-events: none;
}

.v4-dual-range-input::-webkit-slider-runnable-track {
  height: 8px;
  background: transparent;
}

.v4-dual-range-input::-moz-range-track {
  height: 8px;
  background: transparent;
}

.v4-dual-range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #0071e3;
  border: 4px solid #fff;
  box-shadow: 0 8px 20px rgba(0, 113, 227, 0.28);
  pointer-events: auto;
  cursor: pointer;
  margin-top: -7px;
}

.v4-dual-range-input::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #0071e3;
  border: 4px solid #fff;
  box-shadow: 0 8px 20px rgba(0, 113, 227, 0.28);
  pointer-events: auto;
  cursor: pointer;
}

.v4-smart-range-values {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.v4-smart-range-pill {
  border-radius: 16px;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.05);
}

.v4-smart-range-pill span,
.v4-smart-range-pill strong {
  display: block;
}

.v4-smart-range-pill span {
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
}

.v4-smart-range-pill strong {
  font-size: 14px;
  line-height: 1.3;
  color: #0f172a;
}

@media (max-width: 768px) {
  .v4-filter-modal-overlay {
    padding: 0;
  }

  .v4-filter-modal-card {
    width: 100%;
    border-radius: 24px 24px 0 0;
    max-height: 90dvh;
    padding: 20px 16px 16px;
  }

  .v4-modal-header {
    margin-bottom: 16px;
  }

  .v4-modal-title {
    font-size: 28px;
  }

  .v4-modal-body {
    padding-right: 6px;
    margin-bottom: 12px;
  }

  .v4-smart-grid-span-2 {
    grid-column: span 1;
  }

  .v4-smart-range-card {
    padding: 14px;
    border-radius: 18px;
  }

  .v4-smart-range-head {
    flex-direction: column;
    gap: 8px;
    margin-bottom: 14px;
  }

  .v4-smart-range-head strong {
    font-size: 17px;
  }

  .v4-smart-range-hint {
    text-align: left;
  }

  .v4-smart-range-values {
    gap: 8px;
  }

  .v4-smart-range-pill {
    padding: 10px 12px;
  }

  .v4-dual-range-input::-webkit-slider-thumb {
    width: 20px;
    height: 20px;
    margin-top: -6px;
  }

  .v4-dual-range-input::-moz-range-thumb {
    width: 20px;
    height: 20px;
  }
}
</style>
