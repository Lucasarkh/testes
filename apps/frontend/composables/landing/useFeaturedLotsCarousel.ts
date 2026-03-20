import type { Ref, ComputedRef } from 'vue'
import { ref, computed } from 'vue'
import { normalizeLandingLot } from '~/utils/landingLot'
import { lotCarouselAutoplay } from './useAvailableLotsCarousel'

export function useFeaturedLotsCarousel(
  unifiedAvailableLots: Ref<any[]>,
  project: Ref<any>,
  projectSlug: Ref<string>,
  isPreview: Ref<boolean>,
  featuredLotsCarouselConfig: ComputedRef<{ lotCodes: string[]; autoplay: boolean; infinite: boolean }>,
  fetchPublic: (url: string) => Promise<any>,
) {
  const featuredLotsCarouselItems = ref<any[]>([])
  const featuredLotsCarouselLoading = ref(false)
  const featuredLotsCarouselError = ref('')

  const featuredLotsCarouselAutoplay = computed(() => {
    if (!featuredLotsCarouselConfig.value.autoplay) return false
    return lotCarouselAutoplay
  })

  const featuredLotsCarouselShouldLoop = computed(() => {
    return featuredLotsCarouselConfig.value.infinite && featuredLotsCarouselItems.value.length >= 5
  })

  const featuredLotsFromPreviewProject = computed(() => {
    const codes = featuredLotsCarouselConfig.value.lotCodes
    if (!codes.length) return []

    const previewMapElements = Array.isArray(project.value?.mapElements)
      ? project.value.mapElements
      : []

    const previewLots = previewMapElements
      .filter((item: any) => item?.type === 'LOT')
      .map((item: any) => normalizeLandingLot({
        id: item?.id,
        name: item?.name,
        code: item?.code,
        lotDetails: {
          ...(item?.lotDetails || {}),
          status: String(item?.lotDetails?.status || 'AVAILABLE').toUpperCase(),
          tags: Array.isArray(item?.lotDetails?.tags) ? item.lotDetails.tags : [],
        },
      }))

    const fallbackLots = (unifiedAvailableLots.value || []).map((lot: any) => normalizeLandingLot(lot))
    const byCode = new Map<string, any>([...previewLots, ...fallbackLots].map((lot: any) => [String(lot?.code || ''), lot]))

    return codes.map((code) => byCode.get(code)).filter(Boolean)
  })

  const orderedFeaturedLotsCarouselItems = computed(() => {
    const codes = featuredLotsCarouselConfig.value.lotCodes
    const byCode = new Map(featuredLotsCarouselItems.value.map((lot: any) => [String(lot?.code || ''), lot]))
    return codes.map((code) => byCode.get(code)).filter(Boolean)
  })

  const displayedFeaturedLots = computed(() => {
    if (orderedFeaturedLotsCarouselItems.value.length > 0) {
      return orderedFeaturedLotsCarouselItems.value
    }

    if (isPreview.value) {
      return featuredLotsFromPreviewProject.value
    }

    return []
  })

  const loadFeaturedLotsCarousel = async () => {
    const codes = featuredLotsCarouselConfig.value.lotCodes

    if (!codes.length) {
      featuredLotsCarouselItems.value = []
      featuredLotsCarouselError.value = ''
      return
    }

    if (isPreview.value) {
      featuredLotsCarouselItems.value = featuredLotsFromPreviewProject.value
      featuredLotsCarouselError.value = ''
      return
    }

    if (!projectSlug.value) return

    featuredLotsCarouselLoading.value = true
    try {
      const batches: string[] = []
      for (let index = 0; index < codes.length; index += 50) {
        batches.push(codes.slice(index, index + 50).join(','))
      }

      const responses = await Promise.all(
        batches.map((batch) => fetchPublic(`/p/${projectSlug.value}/lots?codes=${encodeURIComponent(batch)}&limit=50&page=1`)),
      )

      const merged = responses.flatMap((response: any) => Array.isArray(response?.data) ? response.data : [])
        .map((lot: any) => normalizeLandingLot(lot))
      const byCode = new Map<string, any>(merged.map((lot: any) => [String(lot?.code || ''), lot]))

      featuredLotsCarouselItems.value = codes.map((code) => byCode.get(code)).filter(Boolean)
      featuredLotsCarouselError.value = ''
    } catch (fetchError: any) {
      featuredLotsCarouselItems.value = []
      featuredLotsCarouselError.value = fetchError?.message || 'Erro ao carregar lotes em destaque'
    } finally {
      featuredLotsCarouselLoading.value = false
    }
  }

  return {
    featuredLotsCarouselItems,
    featuredLotsCarouselLoading,
    featuredLotsCarouselError,
    featuredLotsCarouselAutoplay,
    featuredLotsCarouselShouldLoop,
    featuredLotsFromPreviewProject,
    orderedFeaturedLotsCarouselItems,
    displayedFeaturedLots,
    loadFeaturedLotsCarousel,
  }
}
