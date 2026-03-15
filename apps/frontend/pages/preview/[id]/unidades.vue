<template>
  <ProjectUnitsView :id="route.params.id as string" />
</template>

<script setup lang="ts">
import ProjectUnitsView from '~/components/ProjectUnitsView.vue'
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
  () => `preview-units-seo-${previewId.value}`,
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
  projectData.value?.slug ? buildAbsoluteUrl(requestUrl.origin, `/${projectData.value.slug}/unidades`) : '',
)

useSeoMeta({
  title: computed(() => projectData.value?.name ? `Preview de unidades em ${projectData.value.name} | Lotio` : 'Preview de unidades | Lotio'),
  description: 'Visualização de prévia de unidades.',
  robots: buildRobotsContent(true),
})

useHead(() => ({
  link: canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : [],
}))

definePageMeta({
  layout: 'public'
})
</script>
