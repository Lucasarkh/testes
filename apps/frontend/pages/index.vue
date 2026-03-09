<template>
  <div v-if="!tenantStore.isLoaded" class="loading-full">
    <div class="spinner"></div>
  </div>

  <!-- Subdomain / custom-domain: show the resolved project directly at "/" -->
  <ProjectLandingView v-else-if="tenantStore.config?.projectId" />

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

const tenantStore = useTenantStore()

useSeoMeta({
  title: 'Lotio - Aliado das Loteadoras, Incorporadoras e Imobiliárias',
  ogTitle: 'Lotio - Aliado das Loteadoras, Incorporadoras e Imobiliárias',
  description: 'A plataforma definitiva para incorporadoras, loteadoras, imobiliárias e corretores. Mapas interativos, gestão de leads em tempo real e controle total de estoque.',
  ogDescription: 'A plataforma definitiva para incorporadoras, loteadoras, imobiliárias e corretores. Mapas interativos, gestão de leads em tempo real e controle total de estoque.',
  ogImage: '/og-image.jpg',
  twitterCard: 'summary_large_image',
})

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

