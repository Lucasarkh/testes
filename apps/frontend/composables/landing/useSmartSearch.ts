import type { Ref, ComputedRef } from 'vue'
import { ref, computed } from 'vue'
import { useTracking } from '~/composables/useTracking'
import { normalizeLotSearchIntent, getLotSearchIntentLabel, type LotSearchIntent } from '~/utils/lotSearchIntent'
import { formatCurrencyToBrasilia } from '~/utils/money'
import {
  type IdealLotCriteria,
  parseSmartNumber,
  countLotsByCriteria,
  buildQueryFromCriteria,
  buildSliderRangeStyle,
  formatSmartRangeLabel,
  normalizeStepValue,
  formatAreaValue,
} from './useLotRanges'

export type SearchTrackingSource = 'timed_onboarding' | 'smart_modal'

export function useSmartSearch(
  unifiedAvailableLots: Ref<any[]>,
  areaRangeBounds: ComputedRef<{ min: number; max: number }>,
  priceRangeBounds: ComputedRef<{ min: number; max: number }>,
  areaRangeStep: ComputedRef<number>,
  priceRangeStep: ComputedRef<number>,
  corretorCode: string,
  pathPrefix: ComputedRef<string>,
  syncBodyScrollLock: () => void,
  showPreferenceOnboarding: Ref<boolean>,
  initialSearchIntent: LotSearchIntent | '',
) {
  const tracking = useTracking()

  const isFilterModalOpen = ref(false)
  const selectedFilterTags = ref<string[]>([])
  const exactMatchMode = ref(false)
  const searchIntent = ref<LotSearchIntent | ''>(initialSearchIntent)
  const smartSearchForm = ref({
    minArea: '',
    maxArea: '',
    minPrice: '',
    maxPrice: '',
    maxPricePerM2: '',
    minFrontage: '',
    minDepth: '',
    sortByLowestPricePerM2: false,
  })

  const hasAnySmartFilter = computed(() => {
    const f = smartSearchForm.value
    return !!(
      searchIntent.value ||
      f.minArea ||
      f.maxArea ||
      f.minPrice ||
      f.maxPrice ||
      f.maxPricePerM2 ||
      f.minFrontage ||
      f.minDepth ||
      f.sortByLowestPricePerM2
    )
  })

  const buildModalCriteria = (): IdealLotCriteria => ({
    searchIntent: searchIntent.value || null,
    selectedTags: [...selectedFilterTags.value],
    exactMatch: exactMatchMode.value,
    minArea: smartSearchForm.value.minArea,
    maxArea: smartSearchForm.value.maxArea,
    minPrice: smartSearchForm.value.minPrice,
    maxPrice: smartSearchForm.value.maxPrice,
    maxPricePerM2: smartSearchForm.value.maxPricePerM2,
    minFrontage: smartSearchForm.value.minFrontage,
    minDepth: smartSearchForm.value.minDepth,
    sortByLowestPricePerM2: smartSearchForm.value.sortByLowestPricePerM2,
  })

  const buildSearchTrackingMetadata = (criteria: IdealLotCriteria, source: SearchTrackingSource) => {
    const resultCount = countLotsByCriteria(unifiedAvailableLots.value, criteria)
    const selectedIntent = criteria.searchIntent || null
    return {
      source,
      intent: selectedIntent,
      intentLabel: selectedIntent ? getLotSearchIntentLabel(selectedIntent) : null,
      resultCount,
      smartMode: 'preference',
      selectedTags: [...criteria.selectedTags],
      selectedTagsCount: criteria.selectedTags.length,
      exactMatch: criteria.exactMatch,
      sortByLowestPricePerM2: criteria.sortByLowestPricePerM2,
      filters: {
        minArea: parseSmartNumber(criteria.minArea),
        maxArea: parseSmartNumber(criteria.maxArea),
        minPrice: parseSmartNumber(criteria.minPrice),
        maxPrice: parseSmartNumber(criteria.maxPrice),
        maxPricePerM2: parseSmartNumber(criteria.maxPricePerM2),
        minFrontage: parseSmartNumber(criteria.minFrontage),
        minDepth: parseSmartNumber(criteria.minDepth),
      },
    }
  }

  const trackSearchSubmission = async (criteria: IdealLotCriteria, source: SearchTrackingSource) => {
    const label = source === 'timed_onboarding' ? 'Busca guiada 7s' : 'Busca inteligente modal'
    await tracking.trackEvent({
      type: 'TOOL_USE',
      category: 'LOT_SEARCH',
      action: 'SUBMIT',
      label,
      metadata: buildSearchTrackingMetadata(criteria, source),
    })
  }

  const navigateToIdealLots = async (criteria: IdealLotCriteria, source: SearchTrackingSource) => {
    await trackSearchSubmission(criteria, source)
    isFilterModalOpen.value = false
    showPreferenceOnboarding.value = false
    syncBodyScrollLock()

    await navigateTo({
      path: pathPrefix.value + '/unidades',
      query: buildQueryFromCriteria(criteria, corretorCode),
    })
  }

  const filteredCount = computed(() => {
    return countLotsByCriteria(unifiedAvailableLots.value, buildModalCriteria())
  })

  const toggleFilterModal = () => {
    isFilterModalOpen.value = !isFilterModalOpen.value
    syncBodyScrollLock()
  }

  const toggleFilterTag = (tag: string) => {
    const idx = selectedFilterTags.value.indexOf(tag)
    if (idx > -1) selectedFilterTags.value.splice(idx, 1)
    else selectedFilterTags.value.push(tag)
  }

  const resetIdealLotFilters = () => {
    searchIntent.value = ''
    selectedFilterTags.value = []
    exactMatchMode.value = false
    smartSearchForm.value = {
      minArea: '',
      maxArea: '',
      minPrice: '',
      maxPrice: '',
      maxPricePerM2: '',
      minFrontage: '',
      minDepth: '',
      sortByLowestPricePerM2: false,
    }
  }

  const applyFiltersAndSearch = () => {
    tracking.trackClick('Bot\u00E3o: Aplicar Filtros e Buscar', 'LIST_FILTER')
    navigateToIdealLots(buildModalCriteria(), 'smart_modal')
  }

  // Smart range computed values
  const currentSmartAreaRange = computed(() => ({
    min: parseSmartNumber(smartSearchForm.value.minArea) ?? areaRangeBounds.value.min,
    max: parseSmartNumber(smartSearchForm.value.maxArea) ?? areaRangeBounds.value.max,
  }))

  const currentSmartPriceRange = computed(() => ({
    min: parseSmartNumber(smartSearchForm.value.minPrice) ?? priceRangeBounds.value.min,
    max: parseSmartNumber(smartSearchForm.value.maxPrice) ?? priceRangeBounds.value.max,
  }))

  const smartAreaRangeLabel = computed(() => {
    return formatSmartRangeLabel(currentSmartAreaRange.value.min, currentSmartAreaRange.value.max, areaRangeBounds.value, formatAreaValue)
  })

  const smartPriceRangeLabel = computed(() => {
    return formatSmartRangeLabel(currentSmartPriceRange.value.min, currentSmartPriceRange.value.max, priceRangeBounds.value, formatCurrencyToBrasilia)
  })

  const smartAreaTrackStyle = computed(() => buildSliderRangeStyle(currentSmartAreaRange.value.min, currentSmartAreaRange.value.max, areaRangeBounds.value))
  const smartPriceTrackStyle = computed(() => buildSliderRangeStyle(currentSmartPriceRange.value.min, currentSmartPriceRange.value.max, priceRangeBounds.value))

  const syncSmartAreaRange = (nextMin: number, nextMax: number) => {
    const min = normalizeStepValue(nextMin, areaRangeBounds.value, areaRangeStep.value)
    const max = normalizeStepValue(nextMax, areaRangeBounds.value, areaRangeStep.value)
    const orderedMin = Math.min(min, max)
    const orderedMax = Math.max(min, max)

    smartSearchForm.value.minArea = orderedMin === areaRangeBounds.value.min ? '' : String(orderedMin)
    smartSearchForm.value.maxArea = orderedMax === areaRangeBounds.value.max ? '' : String(orderedMax)
  }

  const syncSmartPriceRange = (nextMin: number, nextMax: number) => {
    const min = normalizeStepValue(nextMin, priceRangeBounds.value, priceRangeStep.value)
    const max = normalizeStepValue(nextMax, priceRangeBounds.value, priceRangeStep.value)
    const orderedMin = Math.min(min, max)
    const orderedMax = Math.max(min, max)

    smartSearchForm.value.minPrice = orderedMin === priceRangeBounds.value.min ? '' : String(orderedMin)
    smartSearchForm.value.maxPrice = orderedMax === priceRangeBounds.value.max ? '' : String(orderedMax)
  }

  const updateSmartAreaMin = (value: number) => {
    syncSmartAreaRange(value, currentSmartAreaRange.value.max)
  }

  const updateSmartAreaMax = (value: number) => {
    syncSmartAreaRange(currentSmartAreaRange.value.min, value)
  }

  const updateSmartPriceMin = (value: number) => {
    syncSmartPriceRange(value, currentSmartPriceRange.value.max)
  }

  const updateSmartPriceMax = (value: number) => {
    syncSmartPriceRange(currentSmartPriceRange.value.min, value)
  }

  return {
    isFilterModalOpen,
    selectedFilterTags,
    exactMatchMode,
    searchIntent,
    smartSearchForm,
    hasAnySmartFilter,
    filteredCount,
    buildModalCriteria,
    toggleFilterModal,
    toggleFilterTag,
    resetIdealLotFilters,
    applyFiltersAndSearch,
    navigateToIdealLots,
    trackSearchSubmission,
    buildSearchTrackingMetadata,
    currentSmartAreaRange,
    currentSmartPriceRange,
    smartAreaRangeLabel,
    smartPriceRangeLabel,
    smartAreaTrackStyle,
    smartPriceTrackStyle,
    syncSmartAreaRange,
    syncSmartPriceRange,
    updateSmartAreaMin,
    updateSmartAreaMax,
    updateSmartPriceMin,
    updateSmartPriceMax,
  }
}
