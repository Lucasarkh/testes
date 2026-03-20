<template>
  <div class="pub-page">
    <LandingErrorState v-if="error && !project" :error="error" />

    <template v-else-if="project">
      <ProjectSideMenu :items="publicSideMenuItems" />

      <LandingHeroSection
        :project="project"
        :has-hero-banner="hasHeroBanner"
        :hero-background-style="heroBackgroundStyle"
        :hero-tag-label="heroTagLabel"
        :available-lots="availableLots"
        :min-area="minArea"
        :price-range="priceRange"
        :scheduling-enabled="!!schedulingConfig?.enabled"
        :hero-contact-label="heroContactLabel"
        :hero-contact-tracking-label="heroContactTrackingLabel"
      />

      <LandingPreLaunchBar
        v-if="showPreLaunchBar"
        :visible="showPreLaunchBar"
        :corretor="corretor"
        :cta-label="preLaunchBarCtaLabel"
        :tracking-label="preLaunchBarTrackingLabel"
        @dismiss="dismissPreLaunchBar"
      />

      <LandingTrustBar
        v-if="corretor"
        :corretor="corretor"
        :show-with-pre-launch="showPreLaunchBar"
        :primary-interest-label="primaryInterestLabel"
        :tracking-label="trustBarTrackingLabel"
      />

      <LandingSalesMotionToast :message="currentSalesNotice" />

      <!-- Reorderable sections container -->
      <div class="pub-page-sections" style="display: contents;">
        <LandingDescriptionSection
          v-if="showDescriptionBlock"
          :location-title="locationTitle"
          :location-subtitle="locationSubtitle"
          :formatted-location-text="formattedLocationTextValue"
          :has-location-header="hasLocationHeader"
          :section-style="publicSectionStyle('pub-description')"
        />

        <LandingInfrastructureSection
          v-if="showInfrastructureBlock"
          :project="project"
          :categories="infrastructureCategories"
          :section-style="publicSectionStyle('pub-infra')"
        />

        <LandingPlantMapSection
          v-if="project.plantMap && isPublicSectionEnabled('pub-plant')"
          :project="project"
          :plant-map="plantMap"
          :section-style="publicSectionStyle('pub-plant')"
          :is-touch-mobile="isTouchMobile"
        />

        <LandingPanoramaSection
          v-if="panoramas.length > 0 && isPublicSectionEnabled('pub-panorama')"
          :panoramas="panoramas"
          :section-style="publicSectionStyle('pub-panorama')"
          :is-touch-mobile="isTouchMobile"
        />

        <LandingVideoSection
          v-if="project.youtubeVideoUrl && isPublicSectionEnabled('pub-video')"
          :youtube-embed-url="youtubeEmbedUrl"
          :youtube-video-url="project.youtubeVideoUrl"
          :project="project"
          :section-style="publicSectionStyle('pub-video')"
        />

        <LandingHighlightsSection
          v-if="traditionalHighlights.length > 0 && isPublicSectionEnabled('pub-highlights')"
          :project="project"
          :highlights="traditionalHighlights"
          :section-style="publicSectionStyle('pub-highlights')"
        />

        <LandingAvailableLotsCarousel
          v-if="(project.lotSummary?.available ?? 0) > 0 && isPublicSectionEnabled('pub-lots-carousel')"
          :project="project"
          :displayed-lots="displayedAvailableLots"
          :loading="availableLotsCarouselLoading"
          :error="availableLotsCarouselError"
          :has-more="availableLotsCarouselHasMore"
          :should-loop="availableLotsCarouselShouldLoop"
          :modules="lotCarouselModules"
          :autoplay="lotCarouselAutoplay"
          :breakpoints="lotCarouselBreakpoints"
          :units-url="unitsUrl"
          :section-style="publicSectionStyle('pub-lots-carousel')"
          :path-prefix="pathPrefix"
          :corretor-code="corretorCode"
          @swiper-init="handleAvailableLotsSwiper"
          @slide-change="handleAvailableLotsSlideChange"
        />

        <LandingCategoryCarousel
          v-if="publicLotCategories.length > 0 && isPublicSectionEnabled(PUBLIC_CATEGORY_CAROUSEL_SECTION_ID)"
          :categories="publicLotCategories"
          :config="categoryCarouselConfig"
          :should-loop="categoryCarouselShouldLoop"
          :autoplay="categoryCarouselAutoplay"
          :breakpoints="categoryCarouselBreakpoints"
          :modules="lotCarouselModules"
          :categories-url="categoriesUrl"
          :section-style="publicSectionStyle(PUBLIC_CATEGORY_CAROUSEL_SECTION_ID)"
          :project="project"
          :path-prefix="pathPrefix"
          :corretor-code="corretorCode"
          :is-preview="isPreview"
          :project-url="projectUrl"
        />

        <LandingFeaturedLotsCarousel
          v-if="featuredLotsCarouselConfig.lotCodes.length > 0 && isPublicSectionEnabled(PUBLIC_FEATURED_LOTS_CAROUSEL_SECTION_ID)"
          :displayed-lots="displayedFeaturedLots"
          :loading="featuredLotsCarouselLoading"
          :error="featuredLotsCarouselError"
          :should-loop="featuredLotsCarouselShouldLoop"
          :autoplay="featuredLotsCarouselAutoplay"
          :breakpoints="lotCarouselBreakpoints"
          :modules="lotCarouselModules"
          :units-url="unitsUrl"
          :section-style="publicSectionStyle(PUBLIC_FEATURED_LOTS_CAROUSEL_SECTION_ID)"
          :project="project"
          :path-prefix="pathPrefix"
          :corretor-code="corretorCode"
        />

        <LandingLotsGrid
          v-if="(project.lotSummary?.available ?? 0) > 0 && isPublicSectionEnabled('pub-lots')"
          :project="project"
          :units-url="unitsUrl"
          :section-style="publicSectionStyle('pub-lots')"
          :lots="unifiedAvailableLots"
          :path-prefix="pathPrefix"
          :corretor-code="corretorCode"
        />

        <LandingConstructionProgress
          v-if="project.constructionStatus?.length && isPublicSectionEnabled('pub-construction')"
          :items="project.constructionStatus"
          :project="project"
          :section-style="publicSectionStyle('pub-construction')"
        />

        <LandingGallerySection
          v-if="project.projectMedias?.length && isPublicSectionEnabled('pub-gallery')"
          :medias="project.projectMedias"
          :gallery-url="galleryUrl"
          :project="project"
          :section-style="publicSectionStyle('pub-gallery')"
          @open-lightbox="openLightbox"
        />

        <LandingLocationSection
          v-if="(project.googleMapsUrl || project.address) && isPublicSectionEnabled('pub-location')"
          :address="project.address"
          :google-maps-embed-url="googleMapsEmbedUrl"
          :project="project"
          :section-style="publicSectionStyle('pub-location')"
        />

        <div v-if="projectSlug && isPublicSectionEnabled('pub-nearby')" :style="publicSectionStyle('pub-nearby')">
          <LandingNearbyPlaces :project-slug="projectSlug" @update:visible="hasNearbyData = $event" />
        </div>

        <LandingSchedulingSection
          v-if="project && schedulingConfig?.enabled && isPublicSectionEnabled('pub-scheduling')"
          :project="project"
          :scheduling-config="schedulingConfig"
          :section-style="publicSectionStyle('pub-scheduling')"
        />

        <LandingLeadForm
          v-if="isPublicSectionEnabled('pub-contact')"
          :project="project"
          :unified-available-lots="unifiedAvailableLots"
          :is-pre-launch-mode="isPreLaunchMode"
          :project-slug="projectSlug"
          :corretor-code="corretorCode"
          :section-style="publicSectionStyle('pub-contact')"
          :conversion-badge-text="conversionBadgeText"
          :conversion-title="conversionTitle"
          :conversion-subtitle="conversionSubtitle"
          :conversion-availability-text="conversionAvailabilityText"
          :lead-success-title="leadSuccessTitle"
          :lead-success-message="leadSuccessMessage"
          :lead-submit-button-label="leadSubmitButtonLabel"
          :lead-message-placeholder="leadMessagePlaceholder"
          :lead-terms-label="leadTermsLabel"
          :form-submit-tracking-label="formSubmitTrackingLabel"
          :available-lots="availableLots"
        />
      </div>

      <LandingLegalNotice v-if="project.legalNotice" :text="project.legalNotice" />
      <LandingPageFooter :project="project" />

      <CommonMediaLightbox
        v-if="lightboxOpen"
        v-model="lightboxOpen"
        :items="project.projectMedias || []"
        :initial-index="lightboxIdx"
      />

      <LandingStickyNav
        :has-plant-map="!!project.plantMap"
        :has-panoramas="panoramas.length > 0"
        :has-available-lots="(project.lotSummary?.available ?? 0) > 0"
        :sticky-interest-label="stickyInterestLabel"
        :units-url="unitsUrl"
      />

      <LandingPreferenceOnboarding
        :visible="showPreferenceOnboarding"
        :project="project"
        :project-slug="projectSlug"
        :preview-id="previewId"
        :is-preview="isPreview"
        :unified-available-lots="unifiedAvailableLots"
        :all-available-tags="allAvailableTags"
        :area-range-bounds="areaRangeBounds"
        :price-range-bounds="priceRangeBounds"
        :area-range-step="areaRangeStep"
        :price-range-step="priceRangeStep"
        :path-prefix="pathPrefix"
        :corretor-code="corretorCode"
        :search-intent="searchIntent"
        @update:visible="showPreferenceOnboarding = $event; syncBodyScrollLock()"
        @update:search-intent="searchIntent = $event"
        @navigate="handlePreferenceNavigation"
      />

      <LandingFloatingSearchCta
        :visible="preferenceSearchAvailable"
        @click="toggleFilterModal"
      />

      <LandingFilterModal
        :visible="isFilterModalOpen"
        :unified-available-lots="unifiedAvailableLots"
        :all-available-tags="allAvailableTags"
        :area-range-bounds="areaRangeBounds"
        :price-range-bounds="priceRangeBounds"
        :area-range-step="areaRangeStep"
        :price-range-step="priceRangeStep"
        :path-prefix="pathPrefix"
        :corretor-code="corretorCode"
        :search-intent="searchIntent"
        @update:visible="isFilterModalOpen = $event; syncBodyScrollLock()"
        @update:search-intent="searchIntent = $event"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useTenantStore } from '~/stores/tenant'
import { useAiChatStore } from '~/stores/aiChat'
import { useTrackingStore } from '~/stores/tracking'
import { useTracking } from '~/composables/useTracking'
import { usePublicPlantMap } from '~/composables/plantMap/usePlantMapApi'
import type { PlantMap } from '~/composables/plantMap/types'
import { usePublicPanorama } from '~/composables/panorama/usePanoramaApi'
import type { Panorama } from '~/composables/panorama/types'
import { toYoutubeEmbedUrl, toGoogleMapsEmbedUrl } from '~/utils/landingUrls'
import { extractLocationMeta, formatLocationText } from '~/utils/landingRichText'
import { calcContractArea } from '~/utils/landingLot'
import { formatCurrencyToBrasilia } from '~/utils/money'
import { normalizeLotSearchIntent, type LotSearchIntent } from '~/utils/lotSearchIntent'
import {
  normalizePublicCategoryCarouselConfig,
  PUBLIC_CATEGORY_CAROUSEL_META_TYPE,
  PUBLIC_CATEGORY_CAROUSEL_SECTION_ID,
} from '~/utils/publicCategoryCarousel'
import {
  normalizePublicFeaturedLotsCarouselConfig,
  PUBLIC_FEATURED_LOTS_CAROUSEL_META_TYPE,
  PUBLIC_FEATURED_LOTS_CAROUSEL_SECTION_ID,
} from '~/utils/publicFeaturedLotsCarousel'
import {
  useAvailableLotsCarousel,
  lotCarouselModules,
  lotCarouselAutoplay,
  lotCarouselBreakpoints,
} from '~/composables/landing/useAvailableLotsCarousel'
import { useFeaturedLotsCarousel } from '~/composables/landing/useFeaturedLotsCarousel'
import { useSalesMotion } from '~/composables/landing/useSalesMotion'
import { useLotRanges, buildQueryFromCriteria, type IdealLotCriteria } from '~/composables/landing/useLotRanges'
import type { SearchTrackingSource } from '~/composables/landing/useSmartSearch'
import ProjectSideMenu from '~/components/common/ProjectSideMenu.vue'

/* ------------------------------------------------------------------ */
/*  1. Props                                                          */
/* ------------------------------------------------------------------ */
const props = defineProps<{ slug?: string; id?: string }>()

/* ------------------------------------------------------------------ */
/*  2. Route, stores, tracking                                        */
/* ------------------------------------------------------------------ */
const route = useRoute()
const tenantStore = useTenantStore()
const chatStore = useAiChatStore()
const trackingStore = useTrackingStore()
const tracking = useTracking()
const { fetchPublic } = usePublicApi()
const { getPublicPlantMap } = usePublicPlantMap()
const { getPublicPanoramas } = usePublicPanorama()

const isPreview = computed(() => !!props.id || !!route.query.previewId)
const previewId = computed(() => (props.id || route.query.previewId) as string)
const projectSlug = computed(() =>
  (props.slug || route.params.slug || tenantStore.config?.project?.slug || '') as string,
)
const corretorCode = String(route.query.c || '')

/* ------------------------------------------------------------------ */
/*  3. Core refs                                                      */
/* ------------------------------------------------------------------ */
const error = ref('')
const project = ref<any>(null)
const corretor = ref<any>(null)
const plantMap = ref<PlantMap | null>(null)
const panoramas = ref<Panorama[]>([])
const schedulingConfig = ref<any>(null)
const hasNearbyData = ref(false)

/* ------------------------------------------------------------------ */
/*  4. Computed URLs                                                  */
/* ------------------------------------------------------------------ */
const pathPrefix = computed(() => {
  if (isPreview.value) return `/preview/${previewId.value}`
  return projectSlug.value ? `/${projectSlug.value}` : ''
})
const appendC = (base: string) =>
  corretorCode ? `${base}${base.includes('?') ? '&' : '?'}c=${corretorCode}` : base

const projectUrl = computed(() => appendC(pathPrefix.value || '/'))
const unitsUrl = computed(() => appendC(`${pathPrefix.value}/unidades`))
const categoriesUrl = computed(() => {
  if (isPreview.value) return projectUrl.value
  return appendC(`${pathPrefix.value}/categorias`)
})
const galleryUrl = computed(() => appendC(`${pathPrefix.value}/galeria`))
const youtubeEmbedUrl = computed(() => toYoutubeEmbedUrl(project.value?.youtubeVideoUrl || ''))
const googleMapsEmbedUrl = computed(() => toGoogleMapsEmbedUrl(project.value?.googleMapsUrl || ''))

/* ------------------------------------------------------------------ */
/*  5. Location meta                                                  */
/* ------------------------------------------------------------------ */
const locationMeta = computed(() => extractLocationMeta(project.value?.locationText || ''))
const locationTitle = computed(() => locationMeta.value.title)
const locationSubtitle = computed(() => locationMeta.value.subtitle)
const hasLocationHeader = computed(() => !!(locationTitle.value || locationSubtitle.value))
const formattedLocationTextValue = computed(() => formatLocationText(locationMeta.value.body || ''))
const hasMeaningfulLocationText = computed(() => {
  const text = locationMeta.value.body || ''
  return text ? text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim().length > 0 : false
})

/* ------------------------------------------------------------------ */
/*  6. Section ordering system                                        */
/* ------------------------------------------------------------------ */
const highlights = computed(() => {
  const raw = project.value?.highlightsJson
  return Array.isArray(raw) ? raw : []
})

const featuredLotsCarouselConfig = computed(() => {
  const meta = highlights.value.find((h: any) => h?.type === PUBLIC_FEATURED_LOTS_CAROUSEL_META_TYPE)
  return normalizePublicFeaturedLotsCarouselConfig(meta)
})
const categoryCarouselConfig = computed(() => {
  const meta = highlights.value.find((h: any) => h?.type === PUBLIC_CATEGORY_CAROUSEL_META_TYPE)
  return normalizePublicCategoryCarouselConfig(meta)
})

const infrastructureCategories = computed(() => highlights.value.filter((h: any) => h.type === 'category'))
const traditionalHighlights = computed(() => highlights.value.filter((h: any) => h.type === 'highlight' || !h.type))

const PUBLIC_SECTION_ORDER_META_TYPE = '__lotio_public_section_order__'
const LANDING_REORDERABLE_SECTIONS = [
  'pub-banner', 'pub-plant', 'pub-panorama', 'pub-video', 'pub-lots-carousel',
  PUBLIC_CATEGORY_CAROUSEL_SECTION_ID, PUBLIC_FEATURED_LOTS_CAROUSEL_SECTION_ID,
  'pub-lots', 'pub-construction', 'pub-location', 'pub-nearby', 'pub-scheduling',
  'pub-infra', 'pub-highlights', 'pub-description', 'pub-gallery', 'pub-contact',
]

const normalizeLandingSectionOrder = (candidate: unknown) => {
  const incoming = Array.isArray(candidate)
    ? candidate.filter((item): item is string => typeof item === 'string')
    : []
  const knownSet = new Set(LANDING_REORDERABLE_SECTIONS)
  const seen = new Set<string>()
  const ordered = incoming.filter((id) => knownSet.has(id) && !seen.has(id) && seen.add(id))
  for (const id of LANDING_REORDERABLE_SECTIONS) {
    if (!seen.has(id)) ordered.push(id)
  }
  return ordered
}

const publicSectionOrder = computed(() => {
  const meta = highlights.value.find((h: any) => h?.type === PUBLIC_SECTION_ORDER_META_TYPE)
  return normalizeLandingSectionOrder(meta?.order)
})
const disabledPublicSections = computed(() => {
  const meta = highlights.value.find((h: any) => h?.type === PUBLIC_SECTION_ORDER_META_TYPE)
  if (!Array.isArray(meta?.disabled)) return new Set<string>()
  return new Set(meta.disabled.filter((id: unknown): id is string => typeof id === 'string'))
})
const isPublicSectionEnabled = (sectionId: string) => !disabledPublicSections.value.has(sectionId)
const publicSectionOrderIndex = computed(() =>
  new Map(publicSectionOrder.value.map((id, idx) => [id, idx + 1])),
)
const publicSectionStyle = (sectionId: string) => ({
  order: String(publicSectionOrderIndex.value.get(sectionId) ?? 999),
})

const PUBLIC_SIDE_MENU_SECTION_MAP = [
  { sectionId: 'pub-banner', id: 'inicio', label: 'INICIO' },
  { sectionId: 'pub-description', id: 'info', label: 'INFO' },
  { sectionId: 'pub-infra', id: 'infraestrutura', label: 'INFRA' },
  { sectionId: 'pub-plant', id: 'planta', label: 'PLANTA' },
  { sectionId: 'pub-panorama', id: 'panorama', label: '360\u00B0' },
  { sectionId: 'pub-video', id: 'video-apresentacao', label: 'VIDEO' },
  { sectionId: 'pub-highlights', id: 'destaques', label: 'DESTAQUES' },
  { sectionId: 'pub-lots-carousel', id: 'carrossel-lotes', label: 'CARROSSEL' },
  { sectionId: PUBLIC_CATEGORY_CAROUSEL_SECTION_ID, id: 'categorias-destaque', label: 'CATEGORIAS' },
  { sectionId: PUBLIC_FEATURED_LOTS_CAROUSEL_SECTION_ID, id: 'lotes-em-destaque', label: 'SELECAO' },
  { sectionId: 'pub-lots', id: 'lotes', label: 'UNIDADES' },
  { sectionId: 'pub-construction', id: 'obras', label: 'OBRAS' },
  { sectionId: 'pub-gallery', id: 'galeria', label: 'GALERIA' },
  { sectionId: 'pub-location', id: 'localizacao', label: 'LOCAL' },
  { sectionId: 'pub-nearby', id: 'proximidades', label: 'PROX.' },
  { sectionId: 'pub-scheduling', id: 'agendamento', label: 'AGENDAR' },
  { sectionId: 'pub-contact', id: 'contato', label: 'CONTATO' },
] as const

/* ------------------------------------------------------------------ */
/*  7. Section visibility computeds                                   */
/* ------------------------------------------------------------------ */
const showDescriptionBlock = computed(() =>
  isPublicSectionEnabled('pub-description') && (hasMeaningfulLocationText.value || hasLocationHeader.value),
)
const showInfrastructureBlock = computed(() =>
  isPublicSectionEnabled('pub-infra') && infrastructureCategories.value.length > 0,
)

const publicSideMenuVisibility = computed<Record<string, boolean>>(() => ({
  'pub-banner': true,
  'pub-description': showDescriptionBlock.value,
  'pub-infra': showInfrastructureBlock.value,
  'pub-plant': !!project.value?.plantMap && isPublicSectionEnabled('pub-plant'),
  'pub-panorama': panoramas.value.length > 0 && isPublicSectionEnabled('pub-panorama'),
  'pub-video': !!project.value?.youtubeVideoUrl && isPublicSectionEnabled('pub-video'),
  'pub-highlights': traditionalHighlights.value.length > 0 && isPublicSectionEnabled('pub-highlights'),
  'pub-lots-carousel': (project.value?.lotSummary?.available ?? 0) > 0 && isPublicSectionEnabled('pub-lots-carousel'),
  [PUBLIC_CATEGORY_CAROUSEL_SECTION_ID]:
    publicLotCategories.value.length > 0 && isPublicSectionEnabled(PUBLIC_CATEGORY_CAROUSEL_SECTION_ID),
  [PUBLIC_FEATURED_LOTS_CAROUSEL_SECTION_ID]:
    featuredLotsCarouselConfig.value.lotCodes.length > 0 &&
    isPublicSectionEnabled(PUBLIC_FEATURED_LOTS_CAROUSEL_SECTION_ID),
  'pub-lots': (project.value?.lotSummary?.available ?? 0) > 0 && isPublicSectionEnabled('pub-lots'),
  'pub-construction': !!project.value?.constructionStatus?.length && isPublicSectionEnabled('pub-construction'),
  'pub-gallery': !!project.value?.projectMedias?.length && isPublicSectionEnabled('pub-gallery'),
  'pub-location': !!(project.value?.googleMapsUrl || project.value?.address) && isPublicSectionEnabled('pub-location'),
  'pub-nearby': hasNearbyData.value && isPublicSectionEnabled('pub-nearby'),
  'pub-scheduling': !!(project.value && schedulingConfig.value?.enabled && isPublicSectionEnabled('pub-scheduling')),
  'pub-contact': isPublicSectionEnabled('pub-contact'),
}))

const publicSideMenuItems = computed(() =>
  publicSectionOrder.value
    .map((sectionId) => PUBLIC_SIDE_MENU_SECTION_MAP.find((item) => item.sectionId === sectionId))
    .filter((item): item is (typeof PUBLIC_SIDE_MENU_SECTION_MAP)[number] => !!item)
    .filter((item) => publicSideMenuVisibility.value[item.sectionId])
    .map(({ id, label }) => ({ id, label })),
)

/* ------------------------------------------------------------------ */
/*  8. unifiedAvailableLots, mapDataLots                              */
/* ------------------------------------------------------------------ */
const mapDataLots = computed(() => {
  const raw = project.value?.mapData
  if (!raw) return []
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!data.lots) return []
    return Array.isArray(data.lots)
      ? data.lots.map(([, l]: [any, any]) => l)
      : Object.values(data.lots)
  } catch {
    return []
  }
})

const hasMapData = computed(() => !!project.value?.mapData)

const unifiedAvailableLots = computed(() => {
  if (hasMapData.value) {
    const rawMapData =
      typeof project.value.mapData === 'string' ? JSON.parse(project.value.mapData) : project.value.mapData
    const PPM = Number(rawMapData.pixelsPerMeter) || 10

    return mapDataLots.value
      .filter((l: any) => l.status === 'available')
      .map((l: any) => {
        const contractArea = calcContractArea(l)
        let finalAreaM2 = Number(l.area) > 0 ? Number(l.area) / (PPM * PPM) : 0
        if (l.manualAreaM2 != null) finalAreaM2 = Number(l.manualAreaM2)
        else if (contractArea !== null) finalAreaM2 = contractArea

        const finalFrontage =
          l.manualFrontage != null
            ? Number(l.manualFrontage)
            : Number(l.frontage) > 0
              ? Number(l.frontage) / PPM
              : 0

        return {
          id: l.id,
          name: l.label,
          code: l.code,
          lotDetails: {
            areaM2: parseFloat(finalAreaM2.toFixed(2)),
            frontage: parseFloat(finalFrontage.toFixed(2)),
            price: l.price,
            status: 'AVAILABLE',
            tags: l.tags || [],
            block: l.block,
            lotNumber: l.lotNumber,
            pricePerM2: l.pricePerM2,
          },
        }
      })
  }

  return (project.value?.teaserLots || []).map((e: any) => ({
    id: e.id,
    name: e.name,
    code: e.code,
    lotDetails: { ...e.lotDetails, tags: e.lotDetails?.tags || [] },
  }))
})

/* ------------------------------------------------------------------ */
/*  9. Pre-launch mode labels                                         */
/* ------------------------------------------------------------------ */
const totalLots = computed(() => project.value?.lotSummary?.total ?? 0)
const availableLots = computed(() => project.value?.lotSummary?.available ?? 0)
const isPreLaunchMode = computed(() => project.value?.preLaunchEnabled === true)
const preLaunchBarDismissed = ref(false)
const showPreLaunchBar = computed(() => isPreLaunchMode.value && !preLaunchBarDismissed.value)

function dismissPreLaunchBar() {
  preLaunchBarDismissed.value = true
  tracking.trackClick('Barra Fixa: Fechar aviso mobile', 'PRE_LAUNCH')
}

const heroTagLabel = computed(() =>
  isPreLaunchMode.value
    ? 'PR\u00C9-LAN\u00C7AMENTO \u00B7 ACESSO ANTECIPADO EXCLUSIVO'
    : project.value?.tenant?.name || 'Vendas Iniciadas',
)
const primaryInterestLabel = computed(() =>
  isPreLaunchMode.value ? 'Entrar na fila de prefer\u00EAncia' : 'Tenho Interesse',
)
const heroContactLabel = computed(() =>
  isPreLaunchMode.value ? 'Entrar na fila de prefer\u00EAncia' : 'Solicitar informa\u00E7\u00F5es',
)
const stickyInterestLabel = computed(() =>
  isPreLaunchMode.value ? 'ENTRAR NA FILA' : 'TENHO INTERESSE',
)
const preLaunchBarCtaLabel = computed(() =>
  isPreLaunchMode.value ? 'Entrar na fila de prefer\u00EAncia' : 'Solicitar informa\u00E7\u00F5es',
)
const conversionBadgeText = computed(() =>
  isPreLaunchMode.value
    ? 'PR\u00C9-LAN\u00C7AMENTO \u00B7 ACESSO ANTECIPADO EXCLUSIVO'
    : 'Oportunidade \u00FAnica',
)
const conversionTitle = computed(() =>
  isPreLaunchMode.value ? 'Entre na fila do pr\u00E9-lan\u00E7amento' : 'Garanta sua unidade agora',
)
const conversionSubtitle = computed(() =>
  isPreLaunchMode.value
    ? 'Cadastre-se para receber atendimento priorit\u00E1rio, novidades em primeira m\u00E3o e acesso antecipado \u00E0s condi\u00E7\u00F5es especiais deste lan\u00E7amento.'
    : 'Restam poucas unidades dispon\u00EDveis. Preencha o formul\u00E1rio e nossa equipe entrar\u00E1 em contato para tirar suas d\u00FAvidas.',
)
const conversionAvailabilityText = computed(() =>
  isPreLaunchMode.value
    ? `${availableLots.value} lotes eleg\u00EDveis para a fila de prefer\u00EAncia`
    : `${availableLots.value} lotes dispon\u00EDveis no momento`,
)
const leadSuccessTitle = computed(() =>
  isPreLaunchMode.value ? 'Seu acesso antecipado est\u00E1 confirmado!' : 'Solicita\u00E7\u00E3o enviada!',
)
const leadSuccessMessage = computed(() =>
  isPreLaunchMode.value
    ? 'Recebemos seu cadastro com prioridade. Voc\u00EA entrou na fila de prefer\u00EAncia e um consultor vai falar com voc\u00EA antes da abertura oficial para apresentar o lan\u00E7amento e as condi\u00E7\u00F5es exclusivas.'
    : 'Recebemos seus dados e logo um consultor entrar\u00E1 em contato.',
)
const leadSubmitButtonLabel = computed(() =>
  isPreLaunchMode.value ? 'Entrar na fila de prefer\u00EAncia' : 'Falar com um consultor',
)
const leadMessagePlaceholder = computed(() =>
  isPreLaunchMode.value
    ? 'Conte se busca um lote espec\u00EDfico ou quer receber a abertura em primeira m\u00E3o.'
    : 'Em que podemos te ajudar?',
)
const leadTermsLabel = computed(() =>
  isPreLaunchMode.value
    ? 'Aceito os termos de pr\u00E9-lan\u00E7amento e pol\u00EDticas de privacidade e estou ciente de que meu cadastro entrar\u00E1 na fila de prefer\u00EAncia do empreendimento.'
    : 'Aceito os termos de atendimento e pol\u00EDticas de privacidade para receber contato sobre este empreendimento.',
)
const heroContactTrackingLabel = computed(() =>
  isPreLaunchMode.value
    ? 'Bot\u00E3o: Entrar na Fila de Preferencia'
    : 'Bot\u00E3o: Solicitar Informa\u00E7\u00F5es',
)
const trustBarTrackingLabel = computed(() =>
  isPreLaunchMode.value
    ? 'CTA Flutuante: Fila de Preferencia'
    : 'CTA Flutuante: Tenho Interesse',
)
const preLaunchBarTrackingLabel = computed(() =>
  isPreLaunchMode.value
    ? 'Barra Fixa: Entrar na Fila de Preferencia'
    : 'Barra Fixa: Solicitar Informacoes',
)
const formSubmitTrackingLabel = computed(() =>
  isPreLaunchMode.value
    ? 'Formul\u00E1rio: Entrar na Fila de Preferencia'
    : 'Formul\u00E1rio: Submit',
)

const minArea = computed(() => {
  if (project.value?.startingArea) return project.value.startingArea
  const area = project.value?.lotSummary?.minArea
  return area && area > 0 ? area : null
})
const priceRange = computed(() => {
  if (project.value?.startingPrice) return formatCurrencyToBrasilia(project.value.startingPrice)
  const min = project.value?.lotSummary?.minPrice
  return min && min > 0 ? formatCurrencyToBrasilia(Number(min)) : null
})

/* ------------------------------------------------------------------ */
/*  10. Hero banner computeds                                         */
/* ------------------------------------------------------------------ */
const hasHeroBanner = computed(() => {
  if (!isPublicSectionEnabled('pub-banner')) return false
  return !!(
    project.value?.bannerImageUrl ||
    project.value?.bannerImageTabletUrl ||
    project.value?.bannerImageMobileUrl
  )
})
const heroBannerDesktopUrl = computed(
  () => project.value?.bannerImageUrl || project.value?.bannerImageTabletUrl || project.value?.bannerImageMobileUrl || '',
)
const heroBannerTabletUrl = computed(
  () => project.value?.bannerImageTabletUrl || heroBannerDesktopUrl.value || project.value?.bannerImageMobileUrl || '',
)
const heroBannerMobileUrl = computed(
  () => project.value?.bannerImageMobileUrl || heroBannerTabletUrl.value || heroBannerDesktopUrl.value || '',
)
const heroBackgroundStyle = computed(() => {
  const desktop = heroBannerDesktopUrl.value
  const tablet = heroBannerTabletUrl.value || desktop
  const mobile = heroBannerMobileUrl.value || tablet || desktop
  if (!desktop && !tablet && !mobile) return {}
  const cssUrl = (v: string) => `url("${String(v || '').replace(/"/g, '\\"')}")`
  return {
    '--v4-hero-bg-desktop': cssUrl(desktop || tablet || mobile),
    '--v4-hero-bg-tablet': cssUrl(tablet || desktop || mobile),
    '--v4-hero-bg-mobile': cssUrl(mobile || tablet || desktop),
  }
})

/* ------------------------------------------------------------------ */
/*  11. Composable setup                                              */
/* ------------------------------------------------------------------ */
const {
  allAvailableTags,
  preferenceSearchAvailable,
  areaRangeBounds,
  priceRangeBounds,
  areaRangeStep,
  priceRangeStep,
} = useLotRanges(unifiedAvailableLots)

const {
  displayedAvailableLots,
  availableLotsCarouselLoading,
  availableLotsCarouselError,
  availableLotsCarouselHasMore,
  availableLotsCarouselShouldLoop,
  availableLotsSwiper,
  handleAvailableLotsSwiper,
  handleAvailableLotsSlideChange,
  initializeAvailableLotsCarousel,
} = useAvailableLotsCarousel(unifiedAvailableLots, project, projectSlug, isPreview, fetchPublic)

const {
  displayedFeaturedLots,
  featuredLotsCarouselLoading,
  featuredLotsCarouselError,
  featuredLotsCarouselAutoplay,
  featuredLotsCarouselShouldLoop,
  loadFeaturedLotsCarousel,
} = useFeaturedLotsCarousel(
  unifiedAvailableLots, project, projectSlug, isPreview, featuredLotsCarouselConfig, fetchPublic,
)

const {
  currentSalesNotice,
  salesMotionConfig,
  salesMotionTemplatesSignature,
  clearSalesMotionTimers,
  startSalesMotion,
  handleSalesMotionNavigation,
} = useSalesMotion(project, projectSlug, previewId, unifiedAvailableLots, availableLots, totalLots)

/* ------------------------------------------------------------------ */
/*  12. Category carousel state + fetch                               */
/* ------------------------------------------------------------------ */
type PublicLotCategoryCard = {
  id: string
  name: string
  slug: string
  description?: string | null
  imageUrl?: string | null
  availableLots: number
  teaserLots: string[]
}

const publicLotCategories = ref<PublicLotCategoryCard[]>([])

const normalizedPreviewLotCategories = computed<PublicLotCategoryCard[]>(() => {
  const source = Array.isArray(project.value?.lotCategories) ? project.value.lotCategories : []
  return source
    .map((cat: any) => ({
      id: String(cat?.id || ''),
      name: String(cat?.name || '').trim(),
      slug: String(cat?.slug || '').trim(),
      description: cat?.description ?? null,
      imageUrl: cat?.imageUrl ?? null,
      availableLots: Array.isArray(cat?.lots) ? cat.lots.length : Number(cat?.availableLots || 0),
      teaserLots: Array.isArray(cat?.teaserLots)
        ? cat.teaserLots
        : Array.isArray(cat?.lots)
          ? cat.lots.slice(0, 3).map((lot: any) =>
              String(lot?.mapElement?.code || lot?.mapElement?.name || lot?.id || '').trim(),
            ).filter(Boolean)
          : [],
    }))
    .filter((c) => c.name && c.slug && c.availableLots > 0)
})

const categoryCarouselAutoplay = computed(() =>
  categoryCarouselConfig.value.autoplay ? lotCarouselAutoplay : false,
)
const categoryCarouselShouldLoop = computed(() =>
  categoryCarouselConfig.value.infinite && publicLotCategories.value.length >= 5,
)
const categoryCarouselBreakpoints = {
  560: { slidesPerView: 1.4, spaceBetween: 14 },
  768: { slidesPerView: 2.2, spaceBetween: 16 },
  1100: { slidesPerView: 3.15, spaceBetween: 18 },
  1440: { slidesPerView: 5, spaceBetween: 20 },
}

async function fetchPublicLotCategories() {
  if (isPreview.value) {
    publicLotCategories.value = normalizedPreviewLotCategories.value
    return
  }
  if (!projectSlug.value) {
    publicLotCategories.value = []
    return
  }
  try {
    const response = await fetchPublic(`/p/${projectSlug.value}/lot-categories`)
    publicLotCategories.value = Array.isArray(response) ? response : []
  } catch {
    publicLotCategories.value = []
  }
}

/* ------------------------------------------------------------------ */
/*  13. Lightbox state                                                */
/* ------------------------------------------------------------------ */
const lightboxOpen = ref(false)
const lightboxIdx = ref(0)
function openLightbox(idx: number) {
  lightboxIdx.value = idx
  lightboxOpen.value = true
}

/* ------------------------------------------------------------------ */
/*  14. Touch detection                                               */
/* ------------------------------------------------------------------ */
const isTouchMobile = ref(false)
function detectTouchMobile() {
  if (!process.client) return
  isTouchMobile.value =
    window.matchMedia('(pointer: coarse)').matches && window.matchMedia('(max-width: 1024px)').matches
}

/* ------------------------------------------------------------------ */
/*  15. Body scroll lock                                              */
/* ------------------------------------------------------------------ */
const syncBodyScrollLock = () => {
  if (!process.client) return
  document.body.style.overflow = isFilterModalOpen.value || showPreferenceOnboarding.value ? 'hidden' : ''
}

/* ------------------------------------------------------------------ */
/*  19. searchIntent  20. isFilterModalOpen  21. showPreferenceOnboarding */
/* ------------------------------------------------------------------ */
const searchIntent = ref<LotSearchIntent | ''>(normalizeLotSearchIntent(route.query.searchIntent))
const isFilterModalOpen = ref(false)
const showPreferenceOnboarding = ref(false)
const preferenceOnboardingTimerId = ref<number | null>(null)

function toggleFilterModal() {
  isFilterModalOpen.value = !isFilterModalOpen.value
  syncBodyScrollLock()
}

function handleModalKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (showPreferenceOnboarding.value) {
    showPreferenceOnboarding.value = false
    syncBodyScrollLock()
    return
  }
  if (isFilterModalOpen.value) toggleFilterModal()
}

const preferenceOnboardingStorageKey = computed(() => {
  const projectKey = String(project.value?.id || projectSlug.value || previewId.value || 'unknown')
  return `lotio:preference-onboarding:${projectKey}`
})

function openPreferenceOnboardingIfNeeded() {
  if (!process.client || unifiedAvailableLots.value.length === 0) return
  try {
    if (window.localStorage.getItem(preferenceOnboardingStorageKey.value)) return
  } catch {
    return
  }
  if (preferenceOnboardingTimerId.value !== null) window.clearTimeout(preferenceOnboardingTimerId.value)
  preferenceOnboardingTimerId.value = window.setTimeout(() => {
    showPreferenceOnboarding.value = true
    tracking.trackEvent({
      type: 'TOOL_USE',
      category: 'LOT_SEARCH',
      action: 'IMPRESSION',
      label: 'Busca guiada 7s',
      metadata: { source: 'timed_onboarding' },
    })
  }, 7000)
}

async function handlePreferenceNavigation(criteria: IdealLotCriteria, source: SearchTrackingSource) {
  showPreferenceOnboarding.value = false
  syncBodyScrollLock()
  await navigateTo({
    path: pathPrefix.value + '/unidades',
    query: buildQueryFromCriteria(criteria, corretorCode),
  })
}

/* ------------------------------------------------------------------ */
/*  16. onMounted                                                     */
/* ------------------------------------------------------------------ */
onMounted(async () => {
  detectTouchMobile()
  window.addEventListener('resize', detectTouchMobile)
  window.addEventListener('keydown', handleModalKeyDown)
  window.addEventListener('scroll', handleSalesMotionNavigation, { passive: true })

  try {
    const baseUrl = isPreview.value ? `/p/preview/${previewId.value}` : `/p/${projectSlug.value}`

    const [p, c, s] = await Promise.allSettled([
      fetchPublic(baseUrl),
      corretorCode && !isPreview.value
        ? fetchPublic(`${baseUrl}/corretores/${corretorCode}`)
        : Promise.resolve(null),
      !isPreview.value
        ? fetchPublic(`${baseUrl}/scheduling/config`).catch(() => null)
        : Promise.resolve(null),
    ])

    if (p.status === 'fulfilled') {
      project.value = p.value
      chatStore.setProject(p.value)
      await fetchPublicLotCategories()
      initializeAvailableLotsCarousel()
      await loadFeaturedLotsCarousel()

      if (s.status === 'fulfilled' && s.value) schedulingConfig.value = s.value

      // Lazy plant map via IntersectionObserver
      if (p.value.plantMap) {
        let plantMapLoaded = false
        const loadPlantMap = () => {
          if (plantMapLoaded) return
          plantMapLoaded = true
          getPublicPlantMap(p.value.id, isPreview.value)
            .then((pm) => { plantMap.value = pm })
            .catch(() => {})
        }
        nextTick(() => {
          const section = document.getElementById('planta')
          if (!section || typeof IntersectionObserver === 'undefined') {
            loadPlantMap()
            return
          }
          const observer = new IntersectionObserver(
            (entries) => {
              if (entries[0]?.isIntersecting) {
                loadPlantMap()
                observer.disconnect()
              }
            },
            { rootMargin: '300px' },
          )
          observer.observe(section)
        })
      }

      // Panoramas (non-blocking)
      getPublicPanoramas(p.value.id, isPreview.value)
        .then((panos) => { panoramas.value = panos ?? [] })
        .catch(() => {})

      openPreferenceOnboardingIfNeeded()
    } else {
      error.value = (p.reason as any)?.message || 'Projeto n\u00E3o encontrado'
    }

    if (c.status === 'fulfilled' && c.value) corretor.value = c.value
  } catch (e: any) {
    error.value = e.message || 'Projeto n\u00E3o encontrado'
  }

  startSalesMotion()
})

/* ------------------------------------------------------------------ */
/*  17. Watchers                                                      */
/* ------------------------------------------------------------------ */
watch(
  () => displayedAvailableLots.value.length,
  async () => {
    await nextTick()
    if (!availableLotsSwiper.value || availableLotsSwiper.value.destroyed) return
    availableLotsSwiper.value.update()
  },
)

watch(
  () => [project.value?.id, projectSlug.value, isPreview.value, featuredLotsCarouselConfig.value.lotCodes.join('|')],
  () => { void loadFeaturedLotsCarousel() },
)

watch(
  () => [project.value?.id, projectSlug.value, isPreview.value],
  () => { void fetchPublicLotCategories() },
)

watch(
  () => [
    salesMotionConfig.value.enabled,
    salesMotionConfig.value.showOnce,
    salesMotionConfig.value.intervalSeconds,
    salesMotionConfig.value.displaySeconds,
    salesMotionConfig.value.maxNotices,
    salesMotionTemplatesSignature.value,
  ],
  () => { startSalesMotion() },
)

watch(showPreferenceOnboarding, () => { syncBodyScrollLock() })

/* ------------------------------------------------------------------ */
/*  18. onUnmounted                                                   */
/* ------------------------------------------------------------------ */
onUnmounted(() => {
  clearSalesMotionTimers()
  if (preferenceOnboardingTimerId.value !== null) {
    window.clearTimeout(preferenceOnboardingTimerId.value)
    preferenceOnboardingTimerId.value = null
  }
  window.removeEventListener('resize', detectTouchMobile)
  window.removeEventListener('keydown', handleModalKeyDown)
  window.removeEventListener('scroll', handleSalesMotionNavigation)
  document.body.style.overflow = ''
})
</script>

<style>
@import '~/assets/css/landing-tokens.css';
</style>

<style scoped>
.pub-page {
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: var(--v4-text);
  background: var(--v4-bg);
  line-height: 1.47059;
  font-weight: 400;
  letter-spacing: -0.022em;
  -webkit-font-smoothing: antialiased;
  padding-top: 0.1px;
}
</style>
