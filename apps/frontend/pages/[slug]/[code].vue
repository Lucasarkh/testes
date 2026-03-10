<template>
  <LotDetailsView />
</template>

<script setup lang="ts">
import LotDetailsView from '~/components/LotDetailsView.vue'

type PublicProject = {
  name?: string
  ogLogoUrl?: string
  bannerImageUrl?: string
  bannerImageTabletUrl?: string
  bannerImageMobileUrl?: string
}

type PublicLot = {
  id?: string
  code?: string
  name?: string
  lotDetails?: {
    lotNumber?: string
    medias?: Array<{ url?: string | null }>
  }
}

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const requestUrl = useRequestURL()

const normalizeId = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const slug = computed(() => String(route.params.slug || '').trim())
const lotCode = computed(() => decodeURIComponent(String(route.params.code || '').trim()))

const apiBase = computed(() => String(runtimeConfig.public.apiBase || '').replace(/\/+$/, ''))
const siteOrigin = computed(() => {
  const configured = String(runtimeConfig.public.siteUrl || '').replace(/\/+$/, '')
  if (configured) return configured
  return requestUrl.origin
})

const { data: projectData } = await useAsyncData<PublicProject | null>(
  () => `seo-project-${slug.value}`,
  async () => {
    if (!slug.value) return null
    try {
      return await $fetch<PublicProject>(`${apiBase.value}/api/p/${encodeURIComponent(slug.value)}`)
    } catch {
      return null
    }
  },
  { server: true, default: () => null },
)

const { data: lotsData } = await useAsyncData<PublicLot[]>(
  () => `seo-lots-${slug.value}-${lotCode.value}`,
  async () => {
    if (!slug.value || !lotCode.value) return []
    try {
      const response = await $fetch<{ data?: PublicLot[] }>(
        `${apiBase.value}/api/p/${encodeURIComponent(slug.value)}/lots`,
        {
          query: {
            search: lotCode.value,
            limit: 20,
            page: 1,
          },
        },
      )
      return Array.isArray(response?.data) ? response.data : []
    } catch {
      return []
    }
  },
  { server: true, default: () => [] },
)

const lotData = computed(() => {
  const target = normalizeId(lotCode.value)
  if (!target) return null
  return (
    lotsData.value.find((item) => {
      const code = normalizeId(item.code)
      const name = normalizeId(item.name)
      const number = normalizeId(item.lotDetails?.lotNumber)
      return code === target || name === target || number === target
    }) || null
  )
})

const seoLotLabel = computed(
  () => lotData.value?.lotDetails?.lotNumber || lotData.value?.code || lotData.value?.name || lotCode.value || 'Lote',
)
const seoProjectName = computed(() => projectData.value?.name || 'Empreendimento')
const seoTitle = computed(() => `Saiba mais sobre o lote ${seoLotLabel.value} do ${seoProjectName.value}`)
const seoDescription = computed(
  () => `Saiba mais sobre o lote ${seoLotLabel.value} do ${seoProjectName.value}. Veja detalhes, valor e condicoes de pagamento.`,
)
const seoImage = computed(() => {
  const lotMedia = lotData.value?.lotDetails?.medias?.find((media) => !!media?.url)?.url || ''
  return (
    projectData.value?.ogLogoUrl
    || lotMedia
    || projectData.value?.bannerImageUrl
    || projectData.value?.bannerImageTabletUrl
    || projectData.value?.bannerImageMobileUrl
    || `${siteOrigin.value}/img/og-image.png`
  )
})
const seoUrl = computed(() => `${requestUrl.origin}${route.path}`)

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogType: 'article',
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogUrl: seoUrl,
  ogImage: seoImage,
  ogSiteName: seoProjectName,
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: seoImage,
})

definePageMeta({
  layout: 'public'
})
</script>
