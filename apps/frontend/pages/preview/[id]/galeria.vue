<template>
  <ProjectGalleryView :id="route.params.id as string" />
</template>

<script setup lang="ts">
import ProjectGalleryView from '~/components/ProjectGalleryView.vue'
import { buildAbsoluteUrl, buildRobotsContent } from '~/utils/seo'

type PreviewProject = {
  slug?: string
  name?: string
}

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const requestUrl = useRequestURL()

const previewId = computed(() => String(route.params.id || '').trim())
const apiBase = computed(() => String(runtimeConfig.public.apiBase || '').replace(/\/+$/, ''))

const { data: projectData } = await useAsyncData<PreviewProject | null>(
  () => `preview-gallery-seo-${previewId.value}`,
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
  projectData.value?.slug ? buildAbsoluteUrl(requestUrl.origin, `/${projectData.value.slug}/galeria`) : '',
)

useSeoMeta({
  title: computed(() => projectData.value?.name ? `Preview da galeria de ${projectData.value.name} | Lotio` : 'Preview da galeria | Lotio'),
  description: 'Visualização de prévia da galeria.',
  robots: buildRobotsContent(true),
})

useHead(() => ({
  link: canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : [],
}))

definePageMeta({
  layout: 'public'
})
</script>
