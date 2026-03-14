<template>
  <!-- Subdomain / custom-domain: show the resolved project directly at "/" -->
  <ProjectLandingView v-if="hasResolvedProjectContext" />

  <div v-else-if="shouldHoldPlatformLanding" class="loading-full">
    <div class="spinner"></div>
  </div>

  <!-- Standard platform landing for lotio.com.br -->
  <div v-else class="landing-page">
    <LandingHeader />
    <main>
      <LandingHero />
      <!-- <LandingAudience />
      <LandingFeatures /> -->
      <LandingCTA />
    </main>
    <LandingFooter />
  </div>
</template>

<script setup>
import ProjectLandingView from '~/components/ProjectLandingView.vue'
import LandingHeader from '@/components/landing/LandingHeader.vue'
import LandingHero from '@/components/landing/LandingHero.vue'
import LandingAudience from '@/components/landing/LandingAudience.vue'
import LandingFeatures from '@/components/landing/LandingFeatures.vue'
import LandingCTA from '@/components/landing/LandingCTA.vue'
import LandingFooter from '@/components/landing/LandingFooter.vue'
import { useTenantStore } from '~/stores/tenant'

const defaultSeoTitle = 'Lotio - Aliado das Loteadoras, Incorporadoras e Imobiliárias'
const defaultSeoDescription = 'A plataforma definitiva para incorporadoras, loteadoras, imobiliárias e corretores. Mapas interativos, gestão de leads em tempo real e controle total de estoque.'

const tenantStore = useTenantStore()
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const requestUrl = useRequestURL()
const incomingHeaders = useRequestHeaders(['host', 'x-forwarded-host', 'x-forwarded-proto'])

const apiBase = computed(() => String(runtimeConfig.public.apiBase || '').replace(/\/+$/, ''))
const siteOrigin = computed(() => {
  const configured = String(runtimeConfig.public.siteUrl || '').replace(/\/+$/, '')
  if (configured) return configured
  return requestUrl.origin
})
const requestHost = computed(() => {
  const forwarded = String(incomingHeaders['x-forwarded-host'] || '').split(',')[0].trim()
  if (forwarded) return forwarded
  return String(incomingHeaders.host || requestUrl.host || '').trim()
})

function normalizeHostname(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .split(':')[0]
}

const { data: tenantResolverData } = await useAsyncData(
  () => `tenant-resolve-root-${requestHost.value || 'unknown'}`,
  async () => {
    if (!requestHost.value) return null
    try {
      return await $fetch(`${apiBase.value}/api/p/resolve-tenant`, {
        headers: {
          host: requestHost.value,
          'x-forwarded-host': requestHost.value,
          'x-forwarded-proto': String(incomingHeaders['x-forwarded-proto'] || requestUrl.protocol.replace(':', '')),
        },
      })
    } catch {
      return null
    }
  },
  { server: true, default: () => null },
)

const resolvedProjectSlug = computed(() => {
  const payload = tenantResolverData.value
  if (!payload || typeof payload !== 'object') return ''
  const fromProject = String(payload?.project?.slug || '').trim()
  if (fromProject) return fromProject
  return String(payload?.slug || '').trim()
})

const { data: resolvedProject } = await useAsyncData(
  () => `tenant-root-project-${resolvedProjectSlug.value || 'none'}`,
  async () => {
    if (!resolvedProjectSlug.value) return null
    try {
      return await $fetch(`${apiBase.value}/api/p/${encodeURIComponent(resolvedProjectSlug.value)}`)
    } catch {
      return null
    }
  },
  { server: true, default: () => null },
)

const hasResolvedProjectContext = computed(
  () => !!resolvedProjectSlug.value || !!tenantStore.config?.projectId,
)

const isKnownPlatformHost = computed(() => {
  const currentHost = normalizeHostname(requestHost.value || requestUrl.host)
  if (!currentHost) return false

  const configuredHost = normalizeHostname(siteOrigin.value)
  const knownHosts = new Set([
    configuredHost,
    configuredHost.replace(/^www\./, ''),
    configuredHost ? `www.${configuredHost.replace(/^www\./, '')}` : '',
    'localhost',
    '127.0.0.1',
  ].filter(Boolean))

  return knownHosts.has(currentHost)
})

const shouldHoldPlatformLanding = computed(
  () => process.client && !hasResolvedProjectContext.value && !tenantStore.isLoaded && !isKnownPlatformHost.value,
)

const seoTitle = computed(() => {
  const name = String(resolvedProject.value?.name || '').trim()
  if (name) return `Loteamento ${name} - Lotio`
  return defaultSeoTitle
})
const seoDescription = computed(() => {
  const description = String(resolvedProject.value?.description || '').trim()
  if (description) return description
  const name = String(resolvedProject.value?.name || '').trim()
  if (name) return `Conheca o empreendimento ${name} e veja os lotes disponiveis.`
  return defaultSeoDescription
})
const seoImage = computed(() => {
  return (
    resolvedProject.value?.ogLogoUrl
    || resolvedProject.value?.bannerImageUrl
    || resolvedProject.value?.bannerImageTabletUrl
    || resolvedProject.value?.bannerImageMobileUrl
    || `${siteOrigin.value}/img/og-image.png`
  )
})
const seoUrl = computed(() => `${requestUrl.origin}${route.path}`)

useSeoMeta({
  title: seoTitle,
  ogTitle: seoTitle,
  description: seoDescription,
  ogDescription: seoDescription,
  ogType: 'website',
  ogUrl: seoUrl,
  ogImage: seoImage,
  ogSiteName: computed(() => String(resolvedProject.value?.name || 'Lotio')),
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

definePageMeta({
  layout: 'public'
})
</script>

<style>
/* Global Landing Styles */
.landing-page {
  font-family: var(--font-sans);
  color: var(--gray-900);
  background-color: var(--gray-50);
  width: 100%;
  overflow-x: hidden;
  position: relative;
}

.container-landing {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Base Buttons for Landing Override */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 0.95rem;
  border-radius: var(--radius-md);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: 1px solid transparent;
  text-decoration: none !important;
}

.btn-primary {
  background-color: var(--primary);
  color: white !important;
}

.btn-primary:hover {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
  color: white !important;
}

.btn-white {
  background: white;
  color: var(--primary) !important;
}

.btn-white:hover {
  background: white;
  transform: translateY(-1px);
  color: var(--primary-hover) !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.btn-outline-white {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white !important;
}

.btn-outline-white:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: white;
  color: white !important;
}

.btn-outline {
  background-color: transparent;
  border-color: var(--gray-200);
  color: #fff;
}

.btn-outline:hover {
  background-color: var(--gray-100);
  border-color: var(--gray-300);
}

.btn-sm {
  padding: 6px 14px;
  font-size: 0.85rem;
}

.btn-block {
  width: 100%;
}

.btn-rounded {
  border-radius: var(--radius-full);
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>

