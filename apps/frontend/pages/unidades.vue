<template>
  <div v-if="!tenantStore.isLoaded" class="loading-full">
    <div class="spinner"></div>
  </div>
  <ProjectUnitsView v-else-if="tenantStore.config?.projectId" />
  <div v-else class="p-8 text-center">
     <h1 class="text-2xl font-bold">Página não encontrada</h1>
    <NuxtLink to="/" class="text-primary underline" style="display: inline-flex; align-items: center; gap: 6px;"><i class="bi bi-arrow-left-short" aria-hidden="true"></i><span>Voltar para o início</span></NuxtLink>
  </div>
</template>

<script setup>
import { useTenantStore } from '~/stores/tenant'
import ProjectUnitsView from '~/components/ProjectUnitsView.vue'
const tenantStore = useTenantStore()

definePageMeta({
  layout: 'public'
})
</script>
