<template>
  <ProjectLandingView :id="route.params.id as string" />
</template>

<script setup lang="ts">
import ProjectLandingView from '~/components/ProjectLandingView.vue'
import { buildAbsoluteUrl, buildRobotsContent, resolveSeoImage } from '~/utils/seo'

type PreviewProject = {
  slug?: string
  name?: string
  ogLogoUrl?: string
  bannerImageUrl?: string
  bannerImageTabletUrl?: string
  bannerImageMobileUrl?: string
}

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const requestUrl = useRequestURL()

const previewId = computed(() => String(route.params.id || '').trim())
const apiBase = computed(() => String(runtimeConfig.public.apiBase || '').replace(/\/+$/, ''))

const { data: projectData } = await useAsyncData<PreviewProject | null>(
  () => `preview-project-seo-${previewId.value}`,
  async () => {
    if (!previewId.value) return null
    try {
      return await $fetch<PreviewProject>(`${apiBase.value}/api/p/preview/${encodeURIComponent(previewId.value)}`)
    } catch {
      return null
    }
  },
  { server: true, default: () => null },
)

const canonicalUrl = computed(() =>
  projectData.value?.slug ? buildAbsoluteUrl(requestUrl.origin, `/${projectData.value.slug}`) : '',
)
const seoImage = computed(() =>
  resolveSeoImage(
    requestUrl.origin,
    projectData.value?.ogLogoUrl,
    projectData.value?.bannerImageUrl,
    projectData.value?.bannerImageTabletUrl,
    projectData.value?.bannerImageMobileUrl,
    '/img/og-image.png',
  ),
)

useSeoMeta({
  title: computed(() => projectData.value?.name ? `Preview de ${projectData.value.name} | Lotio` : 'Preview do empreendimento | Lotio'),
  description: 'Visualização de prévia de empreendimento.',
  ogImage: seoImage,
  robots: buildRobotsContent(true),
})

useHead(() => ({
  link: canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : [],
}))

definePageMeta({
  layout: 'public'
})
</script>
