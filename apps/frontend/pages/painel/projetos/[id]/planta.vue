<template>
  <div>
    <!-- Header -->
    <div class="page-header" style="border-bottom: 1px solid var(--glass-border-subtle); padding-bottom: 24px; margin-bottom: 24px;">
      <div style="flex: 1;">
        <div class="flex items-center gap-2" style="margin-bottom: 4px;">
          <NuxtLink :to="`/painel/projetos/${projectId}`" class="btn btn-ghost btn-sm" style="padding-left: 0; color: var(--color-surface-400);">
            ← {{ projectName || 'Projeto' }}
          </NuxtLink>
        </div>
        <h1 style="margin: 0; font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em;">🗺️ Planta Interativa</h1>
        <p style="margin: 0; color: var(--color-surface-400); font-weight: 500;">Gerencie a planta do loteamento com hotspots interativos.</p>
      </div>

      <div class="flex items-center gap-2">
        <a
          v-if="projectSlug"
          :href="`/${projectSlug}#planta`"
          target="_blank"
          class="btn btn-sm btn-primary"
          style="border-radius: 9999px; padding-left: 20px; padding-right: 20px; height: 38px;"
        >
          <span style="font-size: 1rem;">🌐</span>
          <span>Ver página pública</span>
        </a>
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
    <div v-else style="height: calc(100vh - 200px); min-height: 500px;">
      <PlantMapEditor
        :project-id="projectId"
        :initial-plant-map="plantMap"
        @updated="plantMap = $event"
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
import { useApi } from '~/composables/useApi'

definePageMeta({ layout: 'default' })

const route = useRoute()
const projectId = route.params.id as string

const { fetchApi } = useApi()
const plantMapApi = usePlantMapApi()

const plantMap = ref<PlantMap | null>(null)
const projectName = ref('')
const projectSlug = ref('')
const loading = ref(true)
const loadError = ref<string | null>(null)

onMounted(async () => {
  try {
    // Load project info + plant map in parallel
    const [project, pm] = await Promise.all([
      fetchApi(`/projects/${projectId}`).catch(() => null),
      plantMapApi.getPlantMap(projectId).catch(() => null),
    ])

    if (project) {
      projectName.value = project.name
      projectSlug.value = project.slug
    }

    plantMap.value = pm
  } catch (e: any) {
    loadError.value = e.message ?? 'Erro ao carregar.'
  } finally {
    loading.value = false
  }
})
</script>
