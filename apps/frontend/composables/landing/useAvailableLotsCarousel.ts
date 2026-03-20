import type { Ref, ComputedRef } from 'vue'
import { ref, computed } from 'vue'
import { A11y, Autoplay } from 'swiper/modules'
import type { Swiper as SwiperInstance } from 'swiper'
import { normalizeLandingLot, mergeLandingLots } from '~/utils/landingLot'

const AVAILABLE_LOTS_BATCH_SIZE = 10

export const lotCarouselModules = [A11y, Autoplay]

export const lotCarouselAutoplay = {
  delay: 2000,
  disableOnInteraction: false,
  pauseOnMouseEnter: true,
}

export const lotCarouselBreakpoints = {
  480: { slidesPerView: 2.4, spaceBetween: 16 },
  768: { slidesPerView: 3.6, spaceBetween: 18 },
  1024: { slidesPerView: 5, spaceBetween: 20 },
}

export function useAvailableLotsCarousel(
  unifiedAvailableLots: Ref<any[]>,
  project: Ref<any>,
  projectSlug: Ref<string>,
  isPreview: Ref<boolean>,
  fetchPublic: (url: string) => Promise<any>,
) {
  const availableLotsCarouselItems = ref<any[]>([])
  const availableLotsCarouselPage = ref(0)
  const availableLotsCarouselTotal = ref(0)
  const availableLotsCarouselLoading = ref(false)
  const availableLotsCarouselError = ref('')
  const availableLotsSwiper = ref<SwiperInstance | null>(null)

  const seedAvailableLotsCarousel = () => {
    const seeded = (unifiedAvailableLots.value || [])
      .map((lot: any) => normalizeLandingLot(lot))
      .filter((lot: any) => lot.lotDetails?.status === 'AVAILABLE')

    availableLotsCarouselItems.value = mergeLandingLots([], seeded)
    availableLotsCarouselPage.value = 0
    availableLotsCarouselTotal.value = Math.max(project.value?.lotSummary?.available ?? 0, availableLotsCarouselItems.value.length)
    availableLotsCarouselError.value = ''
  }

  const displayedAvailableLots = computed(() => {
    if (availableLotsCarouselItems.value.length > 0) {
      return availableLotsCarouselItems.value
    }

    return (unifiedAvailableLots.value || [])
      .map((lot: any) => normalizeLandingLot(lot))
      .filter((lot: any) => lot.lotDetails?.status === 'AVAILABLE')
  })

  const availableLotsCarouselHasMore = computed(() => {
    if (isPreview.value) return false
    const total = Math.max(availableLotsCarouselTotal.value, project.value?.lotSummary?.available ?? 0)
    return displayedAvailableLots.value.length < total
  })

  const availableLotsCarouselShouldLoop = computed(() => displayedAvailableLots.value.length >= 5)

  const handleAvailableLotsSwiper = (instance: SwiperInstance) => {
    availableLotsSwiper.value = instance
  }

  const loadMoreAvailableLots = async (force = false) => {
    if (isPreview.value || !projectSlug.value || availableLotsCarouselLoading.value) return

    const knownTotal = Math.max(availableLotsCarouselTotal.value, project.value?.lotSummary?.available ?? 0)
    if (!force && knownTotal > 0 && availableLotsCarouselItems.value.length >= knownTotal) return

    const nextPage = availableLotsCarouselPage.value + 1
    availableLotsCarouselLoading.value = true

    try {
      const response = await fetchPublic(`/p/${projectSlug.value}/lots?limit=${AVAILABLE_LOTS_BATCH_SIZE}&page=${nextPage}`)
      const incomingLots = Array.isArray(response?.data)
        ? response.data
            .map((lot: any) => normalizeLandingLot(lot))
            .filter((lot: any) => lot.lotDetails?.status === 'AVAILABLE')
        : []

      availableLotsCarouselItems.value = mergeLandingLots(availableLotsCarouselItems.value, incomingLots)
      availableLotsCarouselPage.value = nextPage
      availableLotsCarouselTotal.value = Math.max(
        Number(response?.total || 0),
        knownTotal,
        availableLotsCarouselItems.value.length,
      )
      availableLotsCarouselError.value = ''
    } catch (fetchError: any) {
      availableLotsCarouselError.value = fetchError?.message || 'Erro ao carregar lotes dispon\u00EDveis'
    } finally {
      availableLotsCarouselLoading.value = false
    }
  }

  const handleAvailableLotsSlideChange = (instance: SwiperInstance) => {
    const currentIndex = Number.isFinite(instance.realIndex) ? instance.realIndex : instance.activeIndex
    const remaining = displayedAvailableLots.value.length - currentIndex - 1

    if (remaining <= 3) {
      void loadMoreAvailableLots()
    }
  }

  const initializeAvailableLotsCarousel = () => {
    seedAvailableLotsCarousel()

    if (!isPreview.value) {
      void loadMoreAvailableLots(true)
    }
  }

  return {
    availableLotsCarouselItems,
    availableLotsCarouselPage,
    availableLotsCarouselTotal,
    availableLotsCarouselLoading,
    availableLotsCarouselError,
    availableLotsSwiper,
    displayedAvailableLots,
    availableLotsCarouselHasMore,
    availableLotsCarouselShouldLoop,
    handleAvailableLotsSwiper,
    loadMoreAvailableLots,
    handleAvailableLotsSlideChange,
    seedAvailableLotsCarousel,
    initializeAvailableLotsCarousel,
  }
}
