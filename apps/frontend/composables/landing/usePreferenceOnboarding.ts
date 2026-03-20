import type { Ref, ComputedRef } from 'vue'
import { ref, computed, nextTick } from 'vue'
import { gsap } from 'gsap'
import { useTracking } from '~/composables/useTracking'
import { getLotSearchIntentLabel, type LotSearchIntent } from '~/utils/lotSearchIntent'
import { formatCurrencyToBrasilia } from '~/utils/money'
import {
  type IdealLotCriteria,
  countLotsByCriteria,
  normalizeStepValue,
  buildSliderRangeStyle,
  formatSmartRangeLabel,
  formatAreaValue,
} from './useLotRanges'
import type { SearchTrackingSource } from './useSmartSearch'

export function usePreferenceOnboarding(
  unifiedAvailableLots: Ref<any[]>,
  project: Ref<any>,
  projectSlug: Ref<string>,
  previewId: Ref<string>,
  allAvailableTags: ComputedRef<string[]>,
  preferenceSearchAvailable: ComputedRef<boolean>,
  areaRangeBounds: ComputedRef<{ min: number; max: number }>,
  priceRangeBounds: ComputedRef<{ min: number; max: number }>,
  areaRangeStep: ComputedRef<number>,
  priceRangeStep: ComputedRef<number>,
  searchIntent: Ref<LotSearchIntent | ''>,
  syncBodyScrollLock: () => void,
  navigateToIdealLots: (criteria: IdealLotCriteria, source: SearchTrackingSource) => Promise<void>,
) {
  const tracking = useTracking()

  const showPreferenceOnboarding = ref(false)
  const onboardingStepIndex = ref(0)
  const onboardingSelectedTags = ref<string[]>([])
  const onboardingAreaMin = ref<number | null>(null)
  const onboardingAreaMax = ref<number | null>(null)
  const onboardingPriceMin = ref<number | null>(null)
  const onboardingPriceMax = ref<number | null>(null)
  const onboardingOverlayRef = ref<HTMLElement | null>(null)
  const onboardingCardRef = ref<HTMLElement | null>(null)
  const onboardingContentRef = ref<HTMLElement | null>(null)
  const onboardingProgressFillRef = ref<HTMLElement | null>(null)
  const preferenceOnboardingTimerId = ref<number | null>(null)

  const preferenceOnboardingStorageKey = computed(() => {
    const projectKey = String(project.value?.id || projectSlug.value || previewId.value || 'unknown')
    return `lotio:preference-onboarding:${projectKey}`
  })

  const currentOnboardingAreaRange = computed(() => ({
    min: onboardingAreaMin.value ?? areaRangeBounds.value.min,
    max: onboardingAreaMax.value ?? areaRangeBounds.value.max,
  }))

  const currentOnboardingPriceRange = computed(() => ({
    min: onboardingPriceMin.value ?? priceRangeBounds.value.min,
    max: onboardingPriceMax.value ?? priceRangeBounds.value.max,
  }))

  const onboardingAreaRangeLabel = computed(() => {
    return formatSmartRangeLabel(currentOnboardingAreaRange.value.min, currentOnboardingAreaRange.value.max, areaRangeBounds.value, formatAreaValue)
  })

  const onboardingPriceRangeLabel = computed(() => {
    return formatSmartRangeLabel(currentOnboardingPriceRange.value.min, currentOnboardingPriceRange.value.max, priceRangeBounds.value, formatCurrencyToBrasilia)
  })

  const onboardingAreaTrackStyle = computed(() => buildSliderRangeStyle(currentOnboardingAreaRange.value.min, currentOnboardingAreaRange.value.max, areaRangeBounds.value))
  const onboardingPriceTrackStyle = computed(() => buildSliderRangeStyle(currentOnboardingPriceRange.value.min, currentOnboardingPriceRange.value.max, priceRangeBounds.value))

  const syncOnboardingAreaRange = (nextMin: number, nextMax: number) => {
    const min = normalizeStepValue(nextMin, areaRangeBounds.value, areaRangeStep.value)
    const max = normalizeStepValue(nextMax, areaRangeBounds.value, areaRangeStep.value)
    onboardingAreaMin.value = Math.min(min, max)
    onboardingAreaMax.value = Math.max(min, max)
  }

  const syncOnboardingPriceRange = (nextMin: number, nextMax: number) => {
    const min = normalizeStepValue(nextMin, priceRangeBounds.value, priceRangeStep.value)
    const max = normalizeStepValue(nextMax, priceRangeBounds.value, priceRangeStep.value)
    onboardingPriceMin.value = Math.min(min, max)
    onboardingPriceMax.value = Math.max(min, max)
  }

  const updateOnboardingAreaMin = (value: number) => {
    syncOnboardingAreaRange(value, currentOnboardingAreaRange.value.max)
  }

  const updateOnboardingAreaMax = (value: number) => {
    syncOnboardingAreaRange(currentOnboardingAreaRange.value.min, value)
  }

  const updateOnboardingPriceMin = (value: number) => {
    syncOnboardingPriceRange(value, currentOnboardingPriceRange.value.max)
  }

  const updateOnboardingPriceMax = (value: number) => {
    syncOnboardingPriceRange(currentOnboardingPriceRange.value.min, value)
  }

  const onboardingSteps = computed(() => {
    const base = ['intro', 'intent', 'area', 'price']
    if (allAvailableTags.value.length > 0) base.push('tags')
    return base
  })

  const onboardingCurrentStepKey = computed(() => onboardingSteps.value[onboardingStepIndex.value] || 'intro')
  const onboardingStepCaption = computed(() => `Passo ${onboardingStepIndex.value + 1} de ${onboardingSteps.value.length}`)
  const onboardingProgressPercent = computed(() => ((onboardingStepIndex.value + 1) / onboardingSteps.value.length) * 100)

  const onboardingCriteria = computed<IdealLotCriteria>(() => ({
    searchIntent: searchIntent.value || null,
    selectedTags: [...onboardingSelectedTags.value],
    exactMatch: false,
    minArea: currentOnboardingAreaRange.value.min === areaRangeBounds.value.min ? null : currentOnboardingAreaRange.value.min,
    maxArea: currentOnboardingAreaRange.value.max === areaRangeBounds.value.max ? null : currentOnboardingAreaRange.value.max,
    minPrice: currentOnboardingPriceRange.value.min === priceRangeBounds.value.min ? null : currentOnboardingPriceRange.value.min,
    maxPrice: currentOnboardingPriceRange.value.max === priceRangeBounds.value.max ? null : currentOnboardingPriceRange.value.max,
    maxPricePerM2: null,
    minFrontage: null,
    minDepth: null,
    sortByLowestPricePerM2: false,
  }))

  const onboardingRelaxedCriteria = computed(() => {
    const criteria = onboardingCriteria.value
    if (countLotsByCriteria(unifiedAvailableLots.value, criteria) > 0) return criteria

    if (criteria.selectedTags.length > 0) {
      const relaxed = { ...criteria, selectedTags: [] }
      if (countLotsByCriteria(unifiedAvailableLots.value, relaxed) > 0) return relaxed
    }

    return criteria
  })

  const onboardingSearchCount = computed(() => countLotsByCriteria(unifiedAvailableLots.value, onboardingRelaxedCriteria.value))

  const onboardingPrimaryCtaLabel = computed(() => {
    if (onboardingCurrentStepKey.value === 'intro') return 'Come\u00E7ar agora'
    if (onboardingStepIndex.value < onboardingSteps.value.length - 1) return 'Continuar'
    if (onboardingSearchCount.value > 0) return `Ver ${onboardingSearchCount.value} op\u00E7\u00F5es`
    return 'Abrir busca inteligente'
  })

  const onboardingSearchPreviewHeadline = computed(() => {
    if (onboardingCurrentStepKey.value === 'intro') {
      return 'Voc\u00EA entra na busca j\u00E1 com contexto.'
    }
    if (onboardingSearchCount.value > 0) {
      return `${onboardingSearchCount.value} unidades j\u00E1 combinam com o que voc\u00EA selecionou.`
    }
    return 'Se n\u00E3o houver combina\u00E7\u00E3o exata, a busca abre pronta para refinamento.'
  })

  const onboardingSearchPreviewBody = computed(() => {
    if (onboardingCurrentStepKey.value === 'intro') {
      return 'A ideia \u00E9 reduzir atrito no primeiro acesso e te levar direto para uma shortlist melhor.'
    }
    if (onboardingCurrentStepKey.value === 'intent' && searchIntent.value) {
      return `Vou usar ${getLotSearchIntentLabel(searchIntent.value).toLowerCase()} como contexto da sua busca e registrar isso para melhorar a leitura das m\u00E9tricas.`
    }
    if (onboardingSelectedTags.value.length > 0 && onboardingSearchCount.value > 0) {
      return 'Quando um atributo fica restritivo demais, eu alivio essa camada para evitar uma tela vazia.'
    }
    return 'Depois, a busca completa continua dispon\u00EDvel para voc\u00EA refinar tudo manualmente.'
  })

  const resetPreferenceOnboarding = () => {
    onboardingStepIndex.value = 0
    searchIntent.value = ''
    onboardingSelectedTags.value = []
    onboardingAreaMin.value = null
    onboardingAreaMax.value = null
    onboardingPriceMin.value = null
    onboardingPriceMax.value = null
  }

  const markPreferenceOnboardingAsSeen = (reason: 'dismissed' | 'completed') => {
    if (!process.client) return
    try {
      window.localStorage.setItem(preferenceOnboardingStorageKey.value, JSON.stringify({ reason, seenAt: Date.now() }))
    } catch {
      // Ignore storage failures on the guided onboarding.
    }
  }

  const toggleOnboardingTag = (tag: string) => {
    const index = onboardingSelectedTags.value.indexOf(tag)
    if (index >= 0) onboardingSelectedTags.value.splice(index, 1)
    else onboardingSelectedTags.value.push(tag)
  }

  const animatePreferenceOnboardingStep = () => {
    if (!process.client || !showPreferenceOnboarding.value) return

    nextTick(() => {
      const content = onboardingContentRef.value
      if (!content) return

      const targets = Array.from(content.querySelectorAll('[data-step-animate]'))
      if (targets.length) {
        gsap.killTweensOf(targets)
        gsap.fromTo(
          targets,
          { opacity: 0, y: 20, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.42, stagger: 0.06, ease: 'power3.out' },
        )
      }

      if (onboardingProgressFillRef.value) {
        gsap.to(onboardingProgressFillRef.value, {
          width: `${onboardingProgressPercent.value}%`,
          duration: 0.45,
          ease: 'power2.out',
        })
      }
    })
  }

  const animatePreferenceOnboardingOpen = () => {
    if (!process.client) return

    nextTick(() => {
      const overlay = onboardingOverlayRef.value
      const card = onboardingCardRef.value
      if (!overlay || !card) return

      const ornamental = Array.from(card.querySelectorAll('.v4-onboarding-orb'))
      const chrome = Array.from(card.querySelectorAll('[data-onboarding-animate]'))

      gsap.killTweensOf([overlay, card, ...ornamental, ...chrome])
      gsap.set(overlay, { opacity: 0 })
      gsap.set(card, { opacity: 0, y: 40, scale: 0.96, transformPerspective: 900, rotateX: 4 })
      gsap.set(ornamental, { opacity: 0, scale: 0.72 })
      gsap.set(chrome, { opacity: 0, y: 18 })

      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .to(overlay, { opacity: 1, duration: 0.24 })
        .to(card, { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 0.58, ease: 'expo.out' }, 0)
        .to(ornamental, { opacity: 1, scale: 1, duration: 0.7, stagger: 0.06, ease: 'back.out(1.6)' }, 0.08)
        .to(chrome, { opacity: 1, y: 0, duration: 0.45, stagger: 0.05 }, 0.16)

      animatePreferenceOnboardingStep()
    })
  }

  const dismissPreferenceOnboarding = () => {
    void tracking.trackEvent({
      type: 'TOOL_USE',
      category: 'LOT_SEARCH',
      action: 'DISMISS',
      label: 'Busca guiada 7s',
      metadata: {
        source: 'timed_onboarding',
        intent: searchIntent.value || null,
        intentLabel: searchIntent.value ? getLotSearchIntentLabel(searchIntent.value) : null,
        step: onboardingCurrentStepKey.value,
      },
    })
    showPreferenceOnboarding.value = false
    markPreferenceOnboardingAsSeen('dismissed')
    syncBodyScrollLock()
  }

  const openPreferenceOnboardingIfNeeded = () => {
    if (!process.client || !preferenceSearchAvailable.value) return

    try {
      if (window.localStorage.getItem(preferenceOnboardingStorageKey.value)) return
    } catch {
      return
    }

    if (preferenceOnboardingTimerId.value !== null) {
      window.clearTimeout(preferenceOnboardingTimerId.value)
    }

    preferenceOnboardingTimerId.value = window.setTimeout(() => {
      resetPreferenceOnboarding()
      showPreferenceOnboarding.value = true
      void tracking.trackEvent({
        type: 'TOOL_USE',
        category: 'LOT_SEARCH',
        action: 'IMPRESSION',
        label: 'Busca guiada 7s',
        metadata: {
          source: 'timed_onboarding',
        },
      })
    }, 7000)
  }

  const goToPreviousOnboardingStep = () => {
    onboardingStepIndex.value = Math.max(0, onboardingStepIndex.value - 1)
  }

  const handleOnboardingPrimaryAction = () => {
    if (onboardingStepIndex.value < onboardingSteps.value.length - 1) {
      onboardingStepIndex.value += 1
      return
    }

    markPreferenceOnboardingAsSeen('completed')
    navigateToIdealLots(onboardingRelaxedCriteria.value, 'timed_onboarding')
  }

  return {
    showPreferenceOnboarding,
    onboardingStepIndex,
    onboardingSelectedTags,
    onboardingAreaMin,
    onboardingAreaMax,
    onboardingPriceMin,
    onboardingPriceMax,
    onboardingOverlayRef,
    onboardingCardRef,
    onboardingContentRef,
    onboardingProgressFillRef,
    preferenceOnboardingTimerId,
    preferenceOnboardingStorageKey,
    currentOnboardingAreaRange,
    currentOnboardingPriceRange,
    onboardingAreaRangeLabel,
    onboardingPriceRangeLabel,
    onboardingAreaTrackStyle,
    onboardingPriceTrackStyle,
    syncOnboardingAreaRange,
    syncOnboardingPriceRange,
    updateOnboardingAreaMin,
    updateOnboardingAreaMax,
    updateOnboardingPriceMin,
    updateOnboardingPriceMax,
    onboardingSteps,
    onboardingCurrentStepKey,
    onboardingStepCaption,
    onboardingProgressPercent,
    onboardingCriteria,
    onboardingRelaxedCriteria,
    onboardingSearchCount,
    onboardingPrimaryCtaLabel,
    onboardingSearchPreviewHeadline,
    onboardingSearchPreviewBody,
    resetPreferenceOnboarding,
    markPreferenceOnboardingAsSeen,
    toggleOnboardingTag,
    animatePreferenceOnboardingStep,
    animatePreferenceOnboardingOpen,
    dismissPreferenceOnboarding,
    openPreferenceOnboardingIfNeeded,
    goToPreviousOnboardingStep,
    handleOnboardingPrimaryAction,
  }
}
