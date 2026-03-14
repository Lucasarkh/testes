<template>
  <div>
    <div class="page-header" style="border-bottom: 1px solid var(--glass-border-subtle); padding-bottom: 24px; margin-bottom: 24px;">
      <div style="flex: 1;">
        <div class="flex items-center gap-2" style="margin-bottom: 4px;">
          <NuxtLink :to="`/painel/projetos/${projectId}`" class="btn btn-ghost btn-sm page-back-btn">
            <i class="bi bi-arrow-left-short back-nav-icon" aria-hidden="true"></i>
            <span class="back-nav-label">{{ projectName || 'Projeto' }}</span>
          </NuxtLink>
        </div>
        <h1 style="margin: 0; font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em;"><i class="bi bi-image-fill" aria-hidden="true"></i> Panorama 360°</h1>
        <p style="margin: 0; color: var(--color-surface-400); font-weight: 500;">Gerencie vistas panorâmicas com beacons de texto e linha do tempo.</p>
      </div>

      <div class="flex items-center gap-2">
        <a
          v-if="projectSlug"
          :href="`/${projectSlug}#panorama`"
          target="_blank"
          class="btn btn-sm btn-primary topbar-action-btn"
          style="border-radius: 9999px; padding-left: 20px; padding-right: 20px; height: 38px;"
        >
          <span style="font-size: 1rem;"><i class="bi bi-globe2" aria-hidden="true"></i></span>
          <span>Ver página pública</span>
        </a>
      </div>
    </div>

    <div v-if="loading" class="loading-state" style="height: 400px; display:flex; align-items:center; justify-content:center;">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="loadError" class="card" style="max-width: 500px; color: var(--color-danger);">
      {{ loadError }}
    </div>

    <div v-else style="height: calc(100vh - 200px); min-height: 500px;">
      <PanoramaEditor
        :project-id="projectId"
        :initial-panoramas="panoramas"
        :can-edit="authStore.canEdit"
        @updated="panoramas = $event"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePanoramaApi } from '~/composables/panorama/usePanoramaApi'
import type { Panorama } from '~/composables/panorama/types'
import PanoramaEditor from '~/components/panorama/PanoramaEditor.vue'
import { useApi } from '~/composables/useApi'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'default' })

const route = useRoute()
const projectId = route.params.id as string
const authStore = useAuthStore()

const { fetchApi } = useApi()
const panoramaApi = usePanoramaApi()

const panoramas = ref<Panorama[]>([])
const projectName = ref('')
const projectSlug = ref('')
const loading = ref(true)
const loadError = ref<string | null>(null)

onMounted(async () => {
  try {
    const [project, panos] = await Promise.all([
      fetchApi(`/projects/${projectId}`).catch(() => null),
      panoramaApi.getPanoramas(projectId).catch(() => []),
    ])

    if (project) {
      projectName.value = project.name
      projectSlug.value = project.slug
    }

    panoramas.value = panos
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

.topbar-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(59, 130, 246, 0.26);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(15, 23, 42, 0.94));
  color: #f8fafc;
  box-shadow: 0 10px 24px rgba(2, 6, 23, 0.24);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.topbar-action-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(96, 165, 250, 0.5);
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.28), rgba(15, 23, 42, 0.98));
  box-shadow: 0 14px 32px rgba(2, 6, 23, 0.3);
}

.topbar-action-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2), 0 14px 32px rgba(2, 6, 23, 0.3);
}

.topbar-action-btn span:first-child {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.1);
}

.topbar-action-btn span:last-child {
  font-weight: 700;
  letter-spacing: 0.01em;
}

@media (max-width: 768px) {
  .page-back-btn {
    padding: 9px 14px !important;
    min-height: 38px;
    display: inline-flex;
    align-items: center;
  }
}
</style>
