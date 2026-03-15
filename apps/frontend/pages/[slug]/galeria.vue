<template>
  <ProjectGalleryView />
</template>

<script setup lang="ts">
import ProjectGalleryView from '~/components/ProjectGalleryView.vue'
import {
  buildAbsoluteUrl,
  buildRobotsContent,
  normalizeSiteOrigin,
  resolveSeoImage,
} from '~/utils/seo'

type PublicProject = {
  name?: string
  ogLogoUrl?: string
  bannerImageUrl?: string
  bannerImageTabletUrl?: string
  bannerImageMobileUrl?: string
}

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const requestUrl = useRequestURL()

const slug = computed(() => String(route.params.slug || '').trim())
const apiBase = computed(() => String(runtimeConfig.public.apiBase || '').replace(/\/+$/, ''))
const siteOrigin = computed(() => normalizeSiteOrigin(runtimeConfig.public.siteUrl, requestUrl.origin))

const { data: projectData } = await useAsyncData<PublicProject | null>(
  () => `seo-project-gallery-${slug.value}`,
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

const seoTitle = computed(() =>
  projectData.value?.name
    ? `Galeria de fotos e vídeos de ${projectData.value.name} | Lotio`
    : 'Galeria do empreendimento | Lotio',
)
const seoDescription = computed(() =>
  projectData.value?.name
    ? `Veja a galeria de fotos e vídeos do empreendimento ${projectData.value.name}.`
    : 'Veja a galeria de fotos e vídeos do empreendimento.',
)
const seoImage = computed(() =>
  resolveSeoImage(
    siteOrigin.value,
    projectData.value?.ogLogoUrl,
    projectData.value?.bannerImageUrl,
    projectData.value?.bannerImageTabletUrl,
    projectData.value?.bannerImageMobileUrl,
    '/img/og-image.png',
  ),
)
const seoUrl = computed(() => buildAbsoluteUrl(requestUrl.origin, route.path))
const seoSchema = computed(() => ([
  {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: seoTitle.value,
    description: seoDescription.value,
    url: seoUrl.value,
    image: seoImage.value,
  },
]))

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogType: 'website',
  ogUrl: seoUrl,
  ogImage: seoImage,
  ogSiteName: computed(() => projectData.value?.name || 'Lotio'),
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: seoImage,
  robots: buildRobotsContent(false),
})

useHead(() => ({
  link: [
    { rel: 'canonical', href: seoUrl.value },
    { rel: 'image_src', href: seoImage.value },
  ],
  script: [
    {
      key: 'project-gallery-ld-json',
      type: 'application/ld+json',
      innerHTML: JSON.stringify(seoSchema.value),
    },
  ],
}))

definePageMeta({
  layout: 'public'
})
</script>
