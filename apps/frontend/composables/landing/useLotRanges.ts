import type { Ref } from 'vue'
import { computed } from 'vue'
import { formatCurrencyToBrasilia } from '~/utils/money'

export type IdealLotCriteria = {
  searchIntent: string | null
  selectedTags: string[]
  exactMatch: boolean
  minArea: unknown
  maxArea: unknown
  minPrice: unknown
  maxPrice: unknown
  maxPricePerM2: unknown
  minFrontage: unknown
  minDepth: unknown
  sortByLowestPricePerM2: boolean
}

export function parseSmartNumber(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const normalized = String(value).trim()
  if (!normalized) return null

  const parsed = Number(normalized.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export function getFiniteSortedValues(values: unknown[]): number[] {
  return values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)
}

export function buildRangeBounds(values: number[], fallbackMin: number, fallbackMax: number) {
  const minimum = values[0] ?? fallbackMin
  const maximum = values[values.length - 1] ?? fallbackMax
  return {
    min: Math.min(minimum, maximum),
    max: Math.max(minimum, maximum),
  }
}

export function getRangeStep(spread: number, type: 'area' | 'price'): number {
  if (type === 'area') {
    if (spread <= 150) return 10
    if (spread <= 400) return 25
    if (spread <= 900) return 50
    return 100
  }

  if (spread <= 200000) return 10000
  if (spread <= 600000) return 25000
  if (spread <= 1200000) return 50000
  return 100000
}

export function normalizeStepValue(value: number, bounds: { min: number; max: number }, step: number): number {
  const clamped = Math.max(bounds.min, Math.min(bounds.max, value))
  const snapped = bounds.min + Math.round((clamped - bounds.min) / step) * step
  return Math.max(bounds.min, Math.min(bounds.max, snapped))
}

export function buildSliderRangeStyle(min: number, max: number, bounds: { min: number; max: number }) {
  const spread = Math.max(1, bounds.max - bounds.min)
  const start = ((min - bounds.min) / spread) * 100
  const end = ((max - bounds.min) / spread) * 100
  return {
    background: `linear-gradient(90deg, rgba(148, 163, 184, 0.28) 0%, rgba(148, 163, 184, 0.28) ${start}%, rgba(0, 113, 227, 0.94) ${start}%, rgba(0, 153, 255, 0.94) ${end}%, rgba(148, 163, 184, 0.28) ${end}%, rgba(148, 163, 184, 0.28) 100%)`,
  }
}

export function formatAreaValue(value: number): string {
  return `${Math.round(value)} m\u00B2`
}

export function formatSmartRangeLabel(min: number, max: number, bounds: { min: number; max: number }, formatter: (value: number) => string): string {
  const atFullRange = min === bounds.min && max === bounds.max
  if (atFullRange) return 'Qualquer faixa'
  if (min === max) return formatter(min)
  if (min === bounds.min) return `At\u00E9 ${formatter(max)}`
  if (max === bounds.max) return `A partir de ${formatter(min)}`
  return `${formatter(min)} a ${formatter(max)}`
}

export function matchesPreferenceRange(rawValue: number | null | undefined, minimum?: number | null, maximum?: number | null): boolean {
  if (rawValue == null || Number.isNaN(rawValue)) return false
  if (minimum != null && rawValue < minimum) return false
  if (maximum != null && rawValue > maximum) return false
  return true
}

export function getPreferenceMatchScore(lot: any, criteria: IdealLotCriteria): number {
  const details = lot?.lotDetails || {}
  const areaM2 = Number(details.areaM2)
  const price = Number(details.price)
  const pricePerM2 = Number(details.pricePerM2)
  const frontage = Number(details.frontage)
  const depth = Number(details.depth)

  const minArea = parseSmartNumber(criteria.minArea)
  const maxArea = parseSmartNumber(criteria.maxArea)
  const minPrice = parseSmartNumber(criteria.minPrice)
  const maxPrice = parseSmartNumber(criteria.maxPrice)
  const maxPricePerM2 = parseSmartNumber(criteria.maxPricePerM2)
  const minFrontage = parseSmartNumber(criteria.minFrontage)
  const minDepth = parseSmartNumber(criteria.minDepth)

  let score = 0
  const lotTags = details.tags || []
  if (criteria.selectedTags.length > 0) {
    const tagMatched = criteria.exactMatch
      ? criteria.selectedTags.every(tag => lotTags.includes(tag))
      : criteria.selectedTags.some(tag => lotTags.includes(tag))

    if (tagMatched) {
      score += criteria.exactMatch ? Math.max(2, criteria.selectedTags.length) : 2
    }
  }

  if ((minArea != null || maxArea != null) && matchesPreferenceRange(Number.isFinite(areaM2) ? areaM2 : null, minArea, maxArea)) score += 1
  if ((minPrice != null || maxPrice != null) && matchesPreferenceRange(Number.isFinite(price) ? price : null, minPrice, maxPrice)) score += 1
  if (maxPricePerM2 != null && matchesPreferenceRange(Number.isFinite(pricePerM2) ? pricePerM2 : null, null, maxPricePerM2)) score += 1
  if (minFrontage != null && matchesPreferenceRange(Number.isFinite(frontage) ? frontage : null, minFrontage, null)) score += 1
  if (minDepth != null && matchesPreferenceRange(Number.isFinite(depth) ? depth : null, minDepth, null)) score += 1

  return score
}

export function countLotsByCriteria(lots: any[], criteria: IdealLotCriteria): number {
  const hasAnyCriteria = Boolean(
    criteria.searchIntent ||
    criteria.selectedTags.length ||
    parseSmartNumber(criteria.minArea) != null ||
    parseSmartNumber(criteria.maxArea) != null ||
    parseSmartNumber(criteria.minPrice) != null ||
    parseSmartNumber(criteria.maxPrice) != null ||
    parseSmartNumber(criteria.maxPricePerM2) != null ||
    parseSmartNumber(criteria.minFrontage) != null ||
    parseSmartNumber(criteria.minDepth) != null
  )

  return lots.filter((lot: any) => !hasAnyCriteria || getPreferenceMatchScore(lot, criteria) > 0).length
}

export function buildQueryFromCriteria(criteria: IdealLotCriteria, corretorCode: string): Record<string, string> {
  const query: Record<string, string> = {}

  if (criteria.searchIntent) {
    query.searchIntent = criteria.searchIntent
  }
  if (criteria.selectedTags.length) {
    query.tags = criteria.selectedTags.join(',')
  }
  if (criteria.exactMatch) {
    query.matchMode = 'exact'
  }

  const minArea = parseSmartNumber(criteria.minArea)
  const maxArea = parseSmartNumber(criteria.maxArea)
  const minPrice = parseSmartNumber(criteria.minPrice)
  const maxPrice = parseSmartNumber(criteria.maxPrice)
  const maxPricePerM2 = parseSmartNumber(criteria.maxPricePerM2)
  const minFrontage = parseSmartNumber(criteria.minFrontage)
  const minDepth = parseSmartNumber(criteria.minDepth)

  if (minArea != null) query.minArea = String(minArea)
  if (maxArea != null) query.maxArea = String(maxArea)
  if (minPrice != null) query.minPrice = String(minPrice)
  if (maxPrice != null) query.maxPrice = String(maxPrice)
  if (maxPricePerM2 != null) query.maxPricePerM2 = String(maxPricePerM2)
  if (minFrontage != null) query.minFrontage = String(minFrontage)
  if (minDepth != null) query.minDepth = String(minDepth)
  if (criteria.sortByLowestPricePerM2) {
    query.sortBy = 'pricePerM2Asc'
  }

  query.smartMode = 'preference'

  if (corretorCode) {
    query.c = String(corretorCode)
  }

  return query
}

export function useLotRanges(unifiedAvailableLots: Ref<any[]>) {
  const allAvailableTags = computed(() => {
    const tags = new Set<string>()
    unifiedAvailableLots.value.forEach((l: any) => {
      if (l.lotDetails?.tags) {
        l.lotDetails.tags.forEach((t: string) => tags.add(t))
      }
    })
    return Array.from(tags).sort()
  })

  const preferenceSearchAvailable = computed(() => unifiedAvailableLots.value.length > 0)

  const availableAreaValues = computed(() => {
    return getFiniteSortedValues(unifiedAvailableLots.value.map((lot: any) => lot?.lotDetails?.areaM2))
  })

  const availablePriceValues = computed(() => {
    return getFiniteSortedValues(unifiedAvailableLots.value.map((lot: any) => lot?.lotDetails?.price))
  })

  const areaRangeBounds = computed(() => buildRangeBounds(availableAreaValues.value, 250, 500))
  const priceRangeBounds = computed(() => buildRangeBounds(availablePriceValues.value, 150000, 350000))
  const areaRangeStep = computed(() => getRangeStep(areaRangeBounds.value.max - areaRangeBounds.value.min, 'area'))
  const priceRangeStep = computed(() => getRangeStep(priceRangeBounds.value.max - priceRangeBounds.value.min, 'price'))

  return {
    allAvailableTags,
    preferenceSearchAvailable,
    availableAreaValues,
    availablePriceValues,
    areaRangeBounds,
    priceRangeBounds,
    areaRangeStep,
    priceRangeStep,
  }
}
