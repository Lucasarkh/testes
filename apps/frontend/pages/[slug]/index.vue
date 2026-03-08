<template>
  <div v-if="!tenantStore.isLoaded" class="loading-full">
    <div class="spinner"></div>
  </div>
  <ProjectLandingView v-else />
</template>

<script setup lang="ts">
import ProjectLandingView from '~/components/ProjectLandingView.vue'
import { useTenantStore } from '~/stores/tenant'

const tenantStore = useTenantStore()
const route = useRoute()

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
