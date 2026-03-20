<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="v4-onboarding-overlay"
      ref="onboardingOverlayRef"
      @click.self="dismissPreferenceOnboarding"
    >
      <div class="v4-onboarding-shell" ref="onboardingCardRef">
        <!-- Decorative orbs -->
        <div class="v4-onboarding-orb v4-onboarding-orb--one" aria-hidden="true"></div>
        <div class="v4-onboarding-orb v4-onboarding-orb--two" aria-hidden="true"></div>
        <div class="v4-onboarding-orb v4-onboarding-orb--three" aria-hidden="true"></div>

        <!-- Header -->
        <div class="v4-onboarding-head" data-onboarding-animate>
          <div class="v4-onboarding-head-top">
            <div class="v4-onboarding-head-row">
              <span class="v4-onboarding-kicker">Busca guiada</span>
              <span class="v4-onboarding-step-label">{{ onboardingStepCaption }}</span>
            </div>
            <button class="v4-onboarding-dismiss" @click="dismissPreferenceOnboarding">Fechar</button>
          </div>
          <div class="v4-onboarding-progress">
            <span ref="onboardingProgressFillRef" :style="{ width: onboardingProgressPercent + '%' }"></span>
          </div>
        </div>

        <!-- Content area -->
        <div class="v4-onboarding-content" ref="onboardingContentRef">
          <!-- STEP: intro -->
          <div v-if="onboardingCurrentStepKey === 'intro'" class="v4-onboarding-intro-grid" data-step-animate>
            <div class="v4-onboarding-copy">
              <h3>Encontre o lote ideal em 30 segundos.</h3>
              <p>Responda algumas perguntas rápidas e vou montar uma seleção personalizada para você, direto do estoque disponível.</p>
              <div class="v4-onboarding-summary-strip">
                <span class="v4-onboarding-summary-pill">Filtragem inteligente</span>
                <span class="v4-onboarding-summary-pill">Sem cadastro</span>
                <span class="v4-onboarding-summary-pill">Resultado na hora</span>
              </div>
            </div>
            <div class="v4-onboarding-intro-visual">
              <span class="v4-onboarding-preview-label">O que vai acontecer</span>
              <div class="v4-onboarding-preview-stack">
                <div class="v4-onboarding-preview-card v4-onboarding-preview-card--primary">
                  <div class="v4-onboarding-preview-dot"></div>
                  <div>
                    <strong>{{ onboardingSearchPreviewHeadline }}</strong>
                    <p>{{ onboardingSearchPreviewBody }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- STEP: intent -->
          <div v-else-if="onboardingCurrentStepKey === 'intent'" class="v4-onboarding-step-panel" data-step-animate>
            <div class="v4-onboarding-copy">
              <h3>Para que você quer o lote?</h3>
              <p>Isso ajuda a calibrar a ordem dos resultados e registrar o contexto da sua busca.</p>
              <div class="v4-onboarding-options-grid">
                <div
                  v-for="option in LOT_SEARCH_INTENT_OPTIONS"
                  :key="option.value"
                  class="v4-onboarding-option"
                  :class="{ active: searchIntent === option.value }"
                  @click="handleSearchIntentChange(option.value)"
                >
                  <span class="v4-onboarding-option-badge">{{ option.label }}</span>
                  <strong>{{ option.label }}</strong>
                  <span>{{ option.description }}</span>
                </div>
              </div>
            </div>
            <div class="v4-onboarding-summary-card">
              <span class="v4-onboarding-summary-title">Resumo da seleção</span>
              <div class="v4-onboarding-summary-chips">
                <span v-if="searchIntent" class="v4-onboarding-chip">{{ getLotSearchIntentLabel(searchIntent) }}</span>
                <span v-else class="v4-onboarding-chip is-empty">Nenhuma seleção ainda</span>
              </div>
              <div class="v4-onboarding-preview-stack" style="margin-top: 18px;">
                <div class="v4-onboarding-preview-card">
                  <div class="v4-onboarding-preview-dot"></div>
                  <div>
                    <strong>{{ onboardingSearchPreviewHeadline }}</strong>
                    <p>{{ onboardingSearchPreviewBody }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- STEP: area -->
          <div v-else-if="onboardingCurrentStepKey === 'area'" class="v4-onboarding-step-panel" data-step-animate>
            <div class="v4-onboarding-copy">
              <h3>Qual faixa de área?</h3>
              <p>Selecione o tamanho aproximado do terreno que interessa a você.</p>

              <div class="v4-smart-range-card v4-smart-range-card--guided" data-step-animate>
                <div class="v4-smart-range-head">
                  <div>
                    <span class="v4-smart-range-label">Faixa de área</span>
                    <strong>{{ onboardingAreaRangeLabel }}</strong>
                  </div>
                  <span class="v4-smart-range-hint">{{ formatAreaValue(areaRangeBounds.min) }} a {{ formatAreaValue(areaRangeBounds.max) }}</span>
                </div>

                <div class="v4-dual-range">
                  <div class="v4-dual-range-track" :style="onboardingAreaTrackStyle"></div>
                  <input class="v4-dual-range-input" type="range" :min="areaRangeBounds.min" :max="areaRangeBounds.max" :step="areaRangeStep" :value="currentOnboardingAreaRange.min" @input="updateOnboardingAreaMin(Number(($event.target as HTMLInputElement).value))" />
                  <input class="v4-dual-range-input" type="range" :min="areaRangeBounds.min" :max="areaRangeBounds.max" :step="areaRangeStep" :value="currentOnboardingAreaRange.max" @input="updateOnboardingAreaMax(Number(($event.target as HTMLInputElement).value))" />
                </div>

                <div class="v4-smart-range-values">
                  <div class="v4-smart-range-pill">
                    <span>Min</span>
                    <strong>{{ formatAreaValue(currentOnboardingAreaRange.min) }}</strong>
                  </div>
                  <div class="v4-smart-range-pill">
                    <span>Max</span>
                    <strong>{{ formatAreaValue(currentOnboardingAreaRange.max) }}</strong>
                  </div>
                </div>
              </div>
            </div>
            <div class="v4-onboarding-summary-card">
              <span class="v4-onboarding-summary-title">Resumo da seleção</span>
              <div class="v4-onboarding-summary-chips">
                <span v-if="searchIntent" class="v4-onboarding-chip">{{ getLotSearchIntentLabel(searchIntent) }}</span>
                <span class="v4-onboarding-chip">{{ onboardingAreaRangeLabel }}</span>
              </div>
              <div class="v4-onboarding-preview-stack" style="margin-top: 18px;">
                <div class="v4-onboarding-preview-card">
                  <div class="v4-onboarding-preview-dot"></div>
                  <div>
                    <strong>{{ onboardingSearchPreviewHeadline }}</strong>
                    <p>{{ onboardingSearchPreviewBody }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- STEP: price -->
          <div v-else-if="onboardingCurrentStepKey === 'price'" class="v4-onboarding-step-panel" data-step-animate>
            <div class="v4-onboarding-copy">
              <h3>Qual faixa de valor?</h3>
              <p>Defina o orçamento que faz sentido para a sua realidade.</p>

              <div class="v4-smart-range-card v4-smart-range-card--guided" data-step-animate>
                <div class="v4-smart-range-head">
                  <div>
                    <span class="v4-smart-range-label">Faixa de valor</span>
                    <strong>{{ onboardingPriceRangeLabel }}</strong>
                  </div>
                  <span class="v4-smart-range-hint">{{ formatCurrencyToBrasilia(priceRangeBounds.min) }} a {{ formatCurrencyToBrasilia(priceRangeBounds.max) }}</span>
                </div>

                <div class="v4-dual-range">
                  <div class="v4-dual-range-track" :style="onboardingPriceTrackStyle"></div>
                  <input class="v4-dual-range-input" type="range" :min="priceRangeBounds.min" :max="priceRangeBounds.max" :step="priceRangeStep" :value="currentOnboardingPriceRange.min" @input="updateOnboardingPriceMin(Number(($event.target as HTMLInputElement).value))" />
                  <input class="v4-dual-range-input" type="range" :min="priceRangeBounds.min" :max="priceRangeBounds.max" :step="priceRangeStep" :value="currentOnboardingPriceRange.max" @input="updateOnboardingPriceMax(Number(($event.target as HTMLInputElement).value))" />
                </div>

                <div class="v4-smart-range-values">
                  <div class="v4-smart-range-pill">
                    <span>Min</span>
                    <strong>{{ formatCurrencyToBrasilia(currentOnboardingPriceRange.min) }}</strong>
                  </div>
                  <div class="v4-smart-range-pill">
                    <span>Max</span>
                    <strong>{{ formatCurrencyToBrasilia(currentOnboardingPriceRange.max) }}</strong>
                  </div>
                </div>
              </div>
            </div>
            <div class="v4-onboarding-summary-card">
              <span class="v4-onboarding-summary-title">Resumo da seleção</span>
              <div class="v4-onboarding-summary-chips">
                <span v-if="searchIntent" class="v4-onboarding-chip">{{ getLotSearchIntentLabel(searchIntent) }}</span>
                <span class="v4-onboarding-chip">{{ onboardingAreaRangeLabel }}</span>
                <span class="v4-onboarding-chip">{{ onboardingPriceRangeLabel }}</span>
              </div>
              <div class="v4-onboarding-preview-stack" style="margin-top: 18px;">
                <div class="v4-onboarding-preview-card">
                  <div class="v4-onboarding-preview-dot"></div>
                  <div>
                    <strong>{{ onboardingSearchPreviewHeadline }}</strong>
                    <p>{{ onboardingSearchPreviewBody }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- STEP: tags -->
          <div v-else-if="onboardingCurrentStepKey === 'tags'" class="v4-onboarding-step-panel" data-step-animate>
            <div class="v4-onboarding-copy">
              <h3>Alguma preferência específica?</h3>
              <p>Selecione os selos que mais importam para você. Se nenhum combinar, pule sem problema.</p>
              <div class="v4-onboarding-tag-cloud" data-step-animate>
                <button
                  v-for="tag in allAvailableTags"
                  :key="tag"
                  class="v4-onboarding-tag"
                  :class="{ active: onboardingSelectedTags.includes(tag) }"
                  @click="toggleOnboardingTag(tag)"
                >
                  {{ tag }}
                </button>
              </div>
            </div>
            <div class="v4-onboarding-summary-card">
              <span class="v4-onboarding-summary-title">Resumo da seleção</span>
              <div class="v4-onboarding-summary-chips">
                <span v-if="searchIntent" class="v4-onboarding-chip">{{ getLotSearchIntentLabel(searchIntent) }}</span>
                <span class="v4-onboarding-chip">{{ onboardingAreaRangeLabel }}</span>
                <span class="v4-onboarding-chip">{{ onboardingPriceRangeLabel }}</span>
                <span v-for="tag in onboardingSelectedTags" :key="`summary-${tag}`" class="v4-onboarding-chip">{{ tag }}</span>
                <span v-if="!onboardingSelectedTags.length && !searchIntent" class="v4-onboarding-chip is-empty">Nenhum selo selecionado</span>
              </div>
              <div class="v4-onboarding-preview-stack" style="margin-top: 18px;">
                <div class="v4-onboarding-preview-card">
                  <div class="v4-onboarding-preview-dot"></div>
                  <div>
                    <strong>{{ onboardingSearchPreviewHeadline }}</strong>
                    <p>{{ onboardingSearchPreviewBody }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="v4-onboarding-footer" data-onboarding-animate>
          <div class="v4-onboarding-footer-copy">
            <strong>{{ onboardingSearchCount > 0 ? `${onboardingSearchCount} unidades compatíveis` : 'Busca aberta para refinamento' }}</strong>
            <span class="v4-onboarding-mini-note">Você pode refinar depois na página de resultados.</span>
          </div>
          <div class="v4-onboarding-footer-actions">
            <button
              v-if="onboardingStepIndex > 0"
              class="v4-onboarding-btn v4-onboarding-btn--ghost"
              @click="goToPreviousOnboardingStep"
            >
              Voltar
            </button>
            <button
              class="v4-onboarding-btn v4-onboarding-btn--primary"
              @click="handleOnboardingPrimaryAction"
            >
              {{ onboardingPrimaryCtaLabel }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, toRef, watch } from 'vue'
import { LOT_SEARCH_INTENT_OPTIONS, getLotSearchIntentLabel } from '~/utils/lotSearchIntent'
import { formatCurrencyToBrasilia } from '~/utils/money'
import { formatAreaValue } from '~/composables/landing/useLotRanges'
import { usePreferenceOnboarding } from '~/composables/landing/usePreferenceOnboarding'
import type { IdealLotCriteria } from '~/composables/landing/useLotRanges'
import type { SearchTrackingSource } from '~/composables/landing/useSmartSearch'

const props = defineProps<{
  visible: boolean
  project: any
  projectSlug: string
  previewId: string
  isPreview: boolean
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
  navigate: [criteria: IdealLotCriteria, source: SearchTrackingSource]
}>()

const unifiedAvailableLotsRef = toRef(props, 'unifiedAvailableLots')
const projectRef = toRef(props, 'project')
const projectSlugRef = computed(() => props.projectSlug)
const previewIdRef = computed(() => props.previewId)
const allAvailableTagsRef = computed(() => props.allAvailableTags)
const preferenceSearchAvailable = computed(() => props.unifiedAvailableLots.length > 0)
const areaRangeBoundsComputed = computed(() => props.areaRangeBounds)
const priceRangeBoundsComputed = computed(() => props.priceRangeBounds)
const areaRangeStepComputed = computed(() => props.areaRangeStep)
const priceRangeStepComputed = computed(() => props.priceRangeStep)

const searchIntentLocal = ref(props.searchIntent as any)

const syncBodyScrollLock = () => {
  if (!process.client) return
  document.body.style.overflow = props.visible ? 'hidden' : ''
}

const navigateToIdealLots = async (criteria: IdealLotCriteria, source: SearchTrackingSource) => {
  emit('navigate', criteria, source)
}

const {
  showPreferenceOnboarding,
  onboardingStepIndex,
  onboardingSelectedTags,
  onboardingOverlayRef,
  onboardingCardRef,
  onboardingContentRef,
  onboardingProgressFillRef,
  currentOnboardingAreaRange,
  currentOnboardingPriceRange,
  onboardingAreaRangeLabel,
  onboardingPriceRangeLabel,
  onboardingAreaTrackStyle,
  onboardingPriceTrackStyle,
  updateOnboardingAreaMin,
  updateOnboardingAreaMax,
  updateOnboardingPriceMin,
  updateOnboardingPriceMax,
  onboardingSteps,
  onboardingCurrentStepKey,
  onboardingStepCaption,
  onboardingProgressPercent,
  onboardingSearchCount,
  onboardingPrimaryCtaLabel,
  onboardingSearchPreviewHeadline,
  onboardingSearchPreviewBody,
  toggleOnboardingTag,
  animatePreferenceOnboardingStep,
  animatePreferenceOnboardingOpen,
  dismissPreferenceOnboarding: rawDismiss,
  goToPreviousOnboardingStep,
  handleOnboardingPrimaryAction,
} = usePreferenceOnboarding(
  unifiedAvailableLotsRef as any,
  projectRef as any,
  projectSlugRef as any,
  previewIdRef as any,
  allAvailableTagsRef,
  preferenceSearchAvailable,
  areaRangeBoundsComputed,
  priceRangeBoundsComputed,
  areaRangeStepComputed,
  priceRangeStepComputed,
  searchIntentLocal,
  syncBodyScrollLock,
  navigateToIdealLots,
)

const dismissPreferenceOnboarding = () => {
  rawDismiss()
  emit('update:visible', false)
}

const handleSearchIntentChange = (value: string) => {
  searchIntentLocal.value = value
  emit('update:searchIntent', value)
}

watch(() => props.visible, (v) => {
  showPreferenceOnboarding.value = v
  if (v) {
    animatePreferenceOnboardingOpen()
  }
})

watch(onboardingCurrentStepKey, () => {
  animatePreferenceOnboardingStep()
})
</script>

<style scoped>
.v4-onboarding-overlay {
  position: fixed;
  inset: 0;
  z-index: 9100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(0, 113, 227, 0.18), transparent 28%),
    radial-gradient(circle at bottom right, rgba(73, 182, 255, 0.14), transparent 24%),
    rgba(6, 14, 24, 0.68);
  backdrop-filter: blur(18px);
}

.v4-onboarding-shell {
  position: relative;
  width: min(100%, 980px);
  max-height: min(92dvh, 860px);
  border-radius: 32px;
  overflow: hidden;
  padding: 28px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.55);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(245, 247, 250, 0.92)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(239, 243, 248, 0.88));
  box-shadow: 0 32px 90px rgba(4, 20, 35, 0.36);
}

.v4-onboarding-orb {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  opacity: 0.65;
  filter: blur(2px);
  animation: v4-onboarding-float 10s ease-in-out infinite;
}

.v4-onboarding-orb--one {
  width: 220px;
  height: 220px;
  top: -78px;
  right: -36px;
  background: radial-gradient(circle, rgba(0, 113, 227, 0.18), rgba(0, 113, 227, 0.02) 70%);
}

.v4-onboarding-orb--two {
  width: 140px;
  height: 140px;
  left: -46px;
  bottom: 72px;
  background: radial-gradient(circle, rgba(103, 184, 255, 0.18), rgba(103, 184, 255, 0.01) 72%);
  animation-delay: -2s;
}

.v4-onboarding-orb--three {
  width: 120px;
  height: 120px;
  right: 28%;
  bottom: -44px;
  background: radial-gradient(circle, rgba(29, 29, 31, 0.1), transparent 70%);
  animation-delay: -4s;
}

.v4-onboarding-dismiss {
  position: relative;
  border: none;
  border-radius: 999px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.8);
  color: #4a4a50;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
}

.v4-onboarding-head,
.v4-onboarding-content,
.v4-onboarding-footer {
  position: relative;
  z-index: 1;
}

.v4-onboarding-head {
  display: grid;
  gap: 14px;
  margin-bottom: 26px;
}

.v4-onboarding-head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.v4-onboarding-head-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.v4-onboarding-kicker,
.v4-onboarding-step-label {
  display: block;
}

.v4-onboarding-kicker {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--v4-primary);
  margin-bottom: 6px;
}

.v4-onboarding-step-label,
.v4-onboarding-mini-note {
  color: #6b7280;
  font-size: 14px;
  font-weight: 600;
}

.v4-onboarding-progress {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(17, 24, 39, 0.08);
}

.v4-onboarding-progress > span {
  display: block;
  width: 0;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0071e3, #59b4ff);
  box-shadow: 0 0 18px rgba(0, 113, 227, 0.22);
}

.v4-onboarding-content {
  min-height: 420px;
  overflow-y: auto;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(134, 134, 139, 0.45) transparent;
}

.v4-onboarding-content::-webkit-scrollbar {
  width: 8px;
}

.v4-onboarding-content::-webkit-scrollbar-track {
  background: transparent;
}

.v4-onboarding-content::-webkit-scrollbar-thumb {
  background: rgba(134, 134, 139, 0.45);
  border-radius: 999px;
}

.v4-onboarding-intro-grid,
.v4-onboarding-step-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 24px;
  align-items: start;
}

.v4-onboarding-copy h3 {
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 0.98;
  letter-spacing: -0.04em;
  margin: 0 0 16px;
  color: #121417;
}

.v4-onboarding-copy p {
  max-width: 580px;
  margin: 0;
  font-size: 17px;
  line-height: 1.6;
  color: #5b6470;
}

.v4-onboarding-summary-strip,
.v4-onboarding-summary-chips,
.v4-onboarding-tag-cloud,
.v4-onboarding-footer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.v4-onboarding-summary-strip {
  margin-top: 22px;
}

.v4-onboarding-summary-pill,
.v4-onboarding-chip {
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.v4-onboarding-summary-pill {
  background: rgba(0, 113, 227, 0.09);
  color: var(--v4-primary);
}

.v4-onboarding-chip {
  background: rgba(15, 23, 42, 0.06);
  color: #1f2937;
}

.v4-onboarding-chip.is-empty {
  background: rgba(148, 163, 184, 0.14);
  color: #64748b;
}

.v4-onboarding-intro-visual,
.v4-onboarding-summary-card {
  border-radius: 28px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.2);
  backdrop-filter: blur(12px);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
}

.v4-onboarding-preview-stack {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}

.v4-onboarding-preview-card {
  border-radius: 22px;
  padding: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(245, 247, 250, 0.9));
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.v4-onboarding-preview-card--primary {
  background: linear-gradient(135deg, rgba(0, 113, 227, 0.1), rgba(255, 255, 255, 0.96));
}

.v4-onboarding-preview-label,
.v4-onboarding-summary-title {
  display: block;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #64748b;
}

.v4-onboarding-preview-card strong {
  display: block;
  margin-bottom: 8px;
  font-size: 18px;
  line-height: 1.2;
  color: #101828;
}

.v4-onboarding-preview-card p {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: #5b6470;
}

.v4-onboarding-preview-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, #0071e3, #59b4ff);
  box-shadow: 0 0 0 8px rgba(0, 113, 227, 0.09);
  flex-shrink: 0;
}

.v4-onboarding-preview-stack .v4-onboarding-preview-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.v4-smart-range-card {
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.88);
  padding: 18px;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.06);
}

.v4-smart-range-card--guided {
  margin-top: 22px;
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

.v4-onboarding-options-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 22px;
}

.v4-onboarding-option {
  position: relative;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 22px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.78);
  text-align: left;
  cursor: pointer;
  transition: transform 0.24s ease, border-color 0.24s ease, box-shadow 0.24s ease, background 0.24s ease;
}

.v4-onboarding-option:hover {
  transform: translateY(-3px);
  border-color: rgba(0, 113, 227, 0.26);
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.08);
}

.v4-onboarding-option.active {
  border-color: rgba(0, 113, 227, 0.55);
  background: linear-gradient(180deg, rgba(0, 113, 227, 0.08), rgba(255, 255, 255, 0.96));
  box-shadow: 0 18px 40px rgba(0, 113, 227, 0.14);
}

.v4-onboarding-option strong,
.v4-onboarding-option span {
  display: block;
}

.v4-onboarding-option strong {
  font-size: 20px;
  line-height: 1.12;
  letter-spacing: -0.03em;
  color: #111827;
  margin-bottom: 10px;
}

.v4-onboarding-option span {
  font-size: 14px;
  line-height: 1.55;
  color: #64748b;
}

.v4-onboarding-option-badge {
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  margin-bottom: 14px;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  color: #1f2937 !important;
  font-size: 12px !important;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.v4-onboarding-tag-cloud {
  margin-top: 22px;
}

.v4-onboarding-tag {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 999px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.78);
  color: #1f2937;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.22s ease;
}

.v4-onboarding-tag:hover,
.v4-onboarding-tag.active {
  border-color: rgba(0, 113, 227, 0.48);
  background: rgba(0, 113, 227, 0.1);
  color: var(--v4-primary);
}

.v4-onboarding-footer {
  margin-top: 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.v4-onboarding-footer-copy {
  display: grid;
  gap: 6px;
  max-width: 480px;
}

.v4-onboarding-footer-copy strong {
  font-size: 15px;
  line-height: 1.3;
  color: #101828;
}

.v4-onboarding-footer-copy span {
  font-size: 13px;
  line-height: 1.55;
  color: #64748b;
}

.v4-onboarding-btn {
  border: none;
  border-radius: 16px;
  padding: 15px 20px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease, background 0.2s ease;
}

.v4-onboarding-btn:hover {
  transform: translateY(-1px);
}

.v4-onboarding-btn--ghost {
  background: rgba(15, 23, 42, 0.06);
  color: #1f2937;
}

.v4-onboarding-btn--primary {
  background: linear-gradient(135deg, #0071e3, #0099ff);
  color: #fff;
  min-width: 220px;
  box-shadow: 0 18px 36px rgba(0, 113, 227, 0.24);
}

@keyframes v4-onboarding-float {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(0, -10px, 0) scale(1.04); }
}

@media (max-width: 768px) {
  .v4-onboarding-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .v4-onboarding-shell {
    width: 100%;
    max-height: min(88dvh, 760px);
    border-radius: 24px 24px 0 0;
    padding: 16px 14px 14px;
  }

  .v4-onboarding-dismiss {
    align-self: flex-start;
    padding: 9px 12px;
    font-size: 12px;
  }

  .v4-onboarding-head {
    margin-bottom: 16px;
    gap: 12px;
  }

  .v4-onboarding-head-top,
  .v4-onboarding-head-row,
  .v4-onboarding-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .v4-onboarding-head-row {
    gap: 8px;
  }

  .v4-onboarding-intro-grid,
  .v4-onboarding-step-panel,
  .v4-onboarding-options-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .v4-onboarding-content {
    min-height: auto;
    padding-right: 2px;
  }

  .v4-onboarding-copy h3 {
    font-size: 1.85rem;
    line-height: 1.02;
    margin-bottom: 12px;
  }

  .v4-onboarding-copy p {
    font-size: 14px;
    line-height: 1.5;
  }

  .v4-onboarding-summary-strip {
    gap: 8px;
    margin-top: 16px;
  }

  .v4-onboarding-summary-pill,
  .v4-onboarding-chip {
    padding: 8px 11px;
    font-size: 12px;
  }

  .v4-onboarding-intro-visual {
    display: none;
  }

  .v4-onboarding-summary-card {
    padding: 14px;
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

  .v4-onboarding-option {
    padding: 16px;
    border-radius: 18px;
  }

  .v4-onboarding-option strong {
    font-size: 18px;
    margin-bottom: 8px;
  }

  .v4-onboarding-option span {
    font-size: 13px;
    line-height: 1.45;
  }

  .v4-onboarding-option-badge {
    margin-bottom: 10px;
  }

  .v4-onboarding-tag-cloud {
    gap: 8px;
    margin-top: 16px;
  }

  .v4-onboarding-tag {
    padding: 10px 12px;
    font-size: 13px;
  }

  .v4-onboarding-footer {
    margin-top: 14px;
    padding-top: 14px;
    gap: 12px;
  }

  .v4-onboarding-footer-copy strong {
    font-size: 14px;
  }

  .v4-onboarding-footer-copy span {
    font-size: 12px;
    line-height: 1.45;
  }

  .v4-onboarding-footer-actions {
    width: 100%;
    gap: 10px;
  }

  .v4-onboarding-btn {
    width: 100%;
    padding: 14px 16px;
    border-radius: 14px;
    font-size: 14px;
  }
}
</style>
