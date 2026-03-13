<template>
  <div v-if="!tenantStore.isLoaded" class="loading-full">
    <div class="spinner"></div>
  </div>
  <ProjectLandingView v-else />
</template>

<script setup lang="ts">
import ProjectLandingView from '~/components/ProjectLandingView.vue'
import { useTenantStore } from '~/stores/tenant'

type PublicProject = {
  name?: string
  description?: string
  ogLogoUrl?: string
  bannerImageUrl?: string
  bannerImageTabletUrl?: string
  bannerImageMobileUrl?: string
}

const tenantStore = useTenantStore()
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const requestUrl = useRequestURL()

const slug = computed(() => String(route.params.slug || '').trim())
const apiBase = computed(() => String(runtimeConfig.public.apiBase || '').replace(/\/+$/, ''))
const siteOrigin = computed(() => {
  const configured = String(runtimeConfig.public.siteUrl || '').replace(/\/+$/, '')
  if (configured) return configured
  return requestUrl.origin
})

const { data: projectData } = await useAsyncData<PublicProject | null>(
  () => `seo-project-page-${slug.value}`,
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

const seoTitle = computed(() => {
  if (projectData.value?.name) {
    return `Loteamento ${projectData.value.name} - Lotio`
  }
  return 'Empreendimento - Lotio'
})
const seoDescription = computed(
  () =>
    projectData.value?.description
    || (projectData.value?.name
      ? `Conheca o empreendimento ${projectData.value.name} e veja os lotes disponiveis.`
      : 'Conheca os empreendimentos disponiveis na Lotio.'),
)
const seoImage = computed(
  () =>
    projectData.value?.ogLogoUrl
    || projectData.value?.bannerImageUrl
    || projectData.value?.bannerImageTabletUrl
    || projectData.value?.bannerImageMobileUrl
    || `${siteOrigin.value}/img/og-image.png`,
)
const seoUrl = computed(() => `${requestUrl.origin}${route.path}`)

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogType: 'website',
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogUrl: seoUrl,
  ogImage: seoImage,
  ogSiteName: computed(() => projectData.value?.name || 'Lotio'),
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
  twitterImage: seoImage,
})

useHead(() => ({
  link: [
    { rel: 'image_src', href: seoImage.value },
  ],
}))

// On custom domains the project is served at "/". Redirect /:slug → / once
// the tenant context confirms this slug belongs to the current domain.
watch(
  () => tenantStore.isLoaded,
  (loaded) => {
    if (loaded && tenantStore.config?.project?.slug === route.params.slug) {
      navigateTo('/', { replace: true })
    }
  },
  { immediate: true },
)

definePageMeta({
  layout: 'public'
})
</script>

<style scoped>
.loading-full {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0,0,0,0.1);
  border-left-color: #0071e3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
