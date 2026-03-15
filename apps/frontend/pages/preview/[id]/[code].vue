<template>
  <LotDetailsView :id="route.params.id as string" :lot-code="route.params.code as string" />
</template>

<script setup lang="ts">
import LotDetailsView from '~/components/LotDetailsView.vue'
import { buildAbsoluteUrl, buildRobotsContent } from '~/utils/seo'

type PreviewProject = {
  slug?: string
  name?: string
}

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const requestUrl = useRequestURL()

const previewId = computed(() => String(route.params.id || '').trim())
const lotCode = computed(() => decodeURIComponent(String(route.params.code || '').trim()))
const apiBase = computed(() => String(runtimeConfig.public.apiBase || '').replace(/\/+$/, ''))

const { data: projectData } = await useAsyncData<PreviewProject | null>(
  () => `preview-lot-seo-${previewId.value}`,
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
  projectData.value?.slug && lotCode.value
    ? buildAbsoluteUrl(requestUrl.origin, `/${projectData.value.slug}/${encodeURIComponent(lotCode.value)}`)
    : '',
)

useSeoMeta({
  title: computed(() => projectData.value?.name ? `Preview do lote em ${projectData.value.name} | Lotio` : 'Preview do lote | Lotio'),
  description: 'Visualização de prévia de lote.',
  robots: buildRobotsContent(true),
})

useHead(() => ({
  link: canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : [],
}))

definePageMeta({
  layout: 'public'
})
</script>
