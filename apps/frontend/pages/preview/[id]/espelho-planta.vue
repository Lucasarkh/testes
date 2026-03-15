<template>
  <ProjectPlantMirrorView :id="route.params.id as string" />
</template>

<script setup lang="ts">
import ProjectPlantMirrorView from '~/components/ProjectPlantMirrorView.vue'
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
  () => `preview-plant-mirror-seo-${previewId.value}`,
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
  projectData.value?.slug ? buildAbsoluteUrl(requestUrl.origin, `/${projectData.value.slug}/espelho-planta`) : '',
)

useSeoMeta({
  title: computed(() => projectData.value?.name ? `Preview do espelho da planta de ${projectData.value.name} | Lotio` : 'Preview do espelho da planta | Lotio'),
  description: 'Visualização de prévia do espelho da planta.',
  robots: buildRobotsContent(true),
})

useHead(() => ({
  link: canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : [],
}))

definePageMeta({
  layout: false,
})
</script>
