<template>
  <div>
    <!-- Header -->
    <div class="page-header" style="border-bottom: 1px solid var(--glass-border-subtle); padding-bottom: 24px; margin-bottom: 24px;">
      <div style="flex: 1;">
        <div class="flex items-center gap-2" style="margin-bottom: 4px;">
          <NuxtLink :to="`/painel/projetos/${projectId}`" class="btn btn-ghost btn-sm page-back-btn">
            <i class="bi bi-arrow-left-short back-nav-icon" aria-hidden="true"></i>
            <span class="back-nav-label">{{ projectName || 'Projeto' }}</span>
          </NuxtLink>
        </div>
        <h1 style="margin: 0; font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em;"><i class="bi bi-map" aria-hidden="true"></i> Planta Interativa</h1>
        <p style="margin: 0; color: var(--color-surface-400); font-weight: 500;">Gerencie a planta do loteamento com hotspots interativos.</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state" style="height: 400px; display:flex; align-items:center; justify-content:center;">
      <div class="loading-spinner"></div>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="card" style="max-width: 500px; color: var(--color-danger);">
      {{ loadError }}
    </div>

    <!-- Editor -->
    <div v-else class="plant-page-layout">
      <div class="plant-editor-shell">
        <PlantMapEditor
          :project-id="projectId"
          :initial-plant-map="plantMap"
          @updated="plantMap = $event"
          @hotspots-changed="refreshLotsList"
          @edit-lot="openLotFromEditor"
        />
      </div>

      <PlantLotsManager
        ref="lotsManagerRef"
        :project-id="projectId"
        :project="project"
        @map-changed="reloadPlantMap"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePlantMapApi } from '~/composables/plantMap/usePlantMapApi'
import type { PlantMap } from '~/composables/plantMap/types'
import PlantMapEditor from '~/components/plantMap/PlantMapEditor.vue'
import PlantLotsManager from '~/components/plantMap/PlantLotsManager.vue'
import { useApi } from '~/composables/useApi'

definePageMeta({ layout: 'default' })

const route = useRoute()
const projectId = route.params.id as string

const { fetchApi } = useApi()
const plantMapApi = usePlantMapApi()

const plantMap = ref<PlantMap | null>(null)
const project = ref<any>(null)
const projectName = ref('')
const projectSlug = ref('')
const loading = ref(true)
const loadError = ref<string | null>(null)
const lotsManagerRef = ref<{
  refreshLots: (page?: number) => Promise<void>
  openLotByMapElementId: (mapElementId: string) => Promise<void>
} | null>(null)

const reloadPlantMap = async () => {
  plantMap.value = await plantMapApi.getPlantMap(projectId).catch(() => plantMap.value)
}

const refreshLotsList = async () => {
  await lotsManagerRef.value?.refreshLots(1)
}

const openLotFromEditor = async (mapElementId: string) => {
  await lotsManagerRef.value?.openLotByMapElementId(mapElementId)

  if (typeof document !== 'undefined') {
    document.getElementById('plant-lots-manager')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

onMounted(async () => {
  try {
    // Load project info + plant map in parallel
    const [projectData, pm] = await Promise.all([
      fetchApi(`/projects/${projectId}`).catch(() => null),
      plantMapApi.getPlantMap(projectId).catch(() => null),
    ])

    if (projectData) {
      project.value = projectData
      projectName.value = projectData.name
      projectSlug.value = projectData.slug
    }

    plantMap.value = pm
  } catch (e: any) {
    loadError.value = e.message ?? 'Erro ao carregar.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page-back-btn {
  padding: 6px 14px !important;
  border-radius: 12px;
  color: #d1d5db !important;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  text-decoration: none;
  font-weight: 700;
  transition: all 0.2s ease;
}

.page-back-btn:hover {
  color: #f8fafc !important;
  border-color: rgba(148, 163, 184, 0.7);
  background: rgba(15, 23, 42, 0.62);
}

@media (max-width: 768px) {
  .page-back-btn {
    padding: 9px 14px !important;
    min-height: 38px;
    display: inline-flex;
    align-items: center;
  }
}

.plant-page-layout {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.plant-editor-shell {
  min-height: 70vh;
}

@media (max-width: 768px) {
  .plant-editor-shell {
    min-height: 58vh;
  }
}
</style>
