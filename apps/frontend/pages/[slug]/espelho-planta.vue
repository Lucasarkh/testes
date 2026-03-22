<template>
  <ProjectPlantMirrorView :slug="route.params.slug as string" />
</template>

<script setup lang="ts">
import ProjectPlantMirrorView from '~/components/ProjectPlantMirrorView.vue'
import {
  buildAbsoluteUrl,
  buildCanonicalUrl,
  buildRobotsContent,
  resolvePublicSiteOrigin,
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
const siteOrigin = computed(() => resolvePublicSiteOrigin(runtimeConfig.public.siteUrl, requestUrl.origin))

const { data: projectData } = await useAsyncData<PublicProject | null>(
  () => `seo-project-plant-mirror-${slug.value}`,
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
    ? `Espelho da planta de ${projectData.value.name} | Lotio`
    : 'Espelho da planta | Lotio',
)
const seoDescription = computed(() =>
  projectData.value?.name
    ? `Visualize o espelho da planta do empreendimento ${projectData.value.name}.`
    : 'Visualize o espelho da planta do empreendimento.',
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
const seoUrl = computed(() => buildCanonicalUrl(siteOrigin.value, route.path))
const projectUrl = computed(() => buildCanonicalUrl(siteOrigin.value, `/${slug.value}`))

const seoBreadcrumb = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Lotio', item: buildCanonicalUrl(siteOrigin.value, '/') },
    { '@type': 'ListItem', position: 2, name: projectData.value?.name || slug.value, item: projectUrl.value },
    { '@type': 'ListItem', position: 3, name: 'Espelho da Planta' },
  ],
}))

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
      key: 'plant-mirror-breadcrumb-ld-json',
      type: 'application/ld+json',
      innerHTML: JSON.stringify(seoBreadcrumb.value),
    },
  ],
}))

definePageMeta({
  layout: false,
})
</script>
