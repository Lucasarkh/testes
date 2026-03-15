<template>
  <div class="pub-page">
    <!-- Loading -->
    <div v-if="loading" class="pub-loading">
      <div class="loading-spinner"></div>
      <p>Carregando galeria...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="pub-error">
      <div class="pub-error-card card">
        <h2>Projeto não encontrado</h2>
        <p>{{ error }}</p>
        <NuxtLink :to="projectUrl" class="v4-btn-primary" style="display: inline-flex; align-items: center; gap: 8px; margin-top: 1rem;"><i class="bi bi-arrow-left-short back-nav-icon" aria-hidden="true"></i><span class="back-nav-label">Voltar ao projeto</span></NuxtLink>
      </div>
    </div>

    <!-- Project -->
    <template v-else-if="project">
      <!-- Minimal Header -->
      <nav class="v4-mini-header">
        <div class="v4-container">
          <div class="v4-mini-header-inner">
            <NuxtLink :to="projectUrl" class="v4-back-link">
              <i class="bi bi-arrow-left-short back-nav-icon" aria-hidden="true"></i>
              <span class="back-nav-label">Voltar para o Projeto</span>
            </NuxtLink>
            <div class="v4-mini-brand">
              <strong>{{ project.name }}</strong>
            </div>
          </div>
        </div>
      </nav>

      <section class="v4-section" style="padding-top: 100px;">
        <div class="v4-container">
          <div class="v4-section-header">
            <h2 class="v4-section-title" style="font-size: 32px;">Galeria de Mídia</h2>
            <p class="v4-section-subtitle" style="font-size: 17px;">Explore todas as fotos e vídeos do empreendimento {{ project.name }}.</p>
          </div>

          <div class="v4-gallery-grid">
            <div 
              v-for="(m, i) in paginatedMedia" 
              :key="m.id" 
              class="v4-gallery-item"
              @click="openLightbox(Number(i) + (page - 1) * perPage)"
            >
              <img
                v-if="m.type === 'PHOTO'"
                :src="m.url"
                :alt="m.caption || 'Foto'"
                :loading="i < 6 ? 'eager' : 'lazy'"
                :fetchpriority="i < 3 ? 'high' : 'auto'"
                decoding="async"
              />
              <video v-else :src="m.url" preload="metadata" />
              <div class="v4-gallery-overlay">
                <span v-if="m.caption" class="v4-gallery-caption">{{ m.caption }}</span>
                <span class="v4-gallery-expand">↗</span>
              </div>
            </div>
          </div>

          <div v-if="meta.totalPages > 1" style="margin-top: 64px; display: flex; justify-content: center;">
            <CommonPagination :meta="meta" @change="page = $event" />
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="v4-footer">
        <div class="v4-container">
          <div class="v4-footer-inner">
            <div class="v4-footer-brand">
              <span class="v4-footer-tenant">{{ project.tenant?.name }}</span>
              <span class="v4-footer-project">Loteamento {{ project.name }}</span>
            </div>
            <div class="v4-footer-copyright">
              © {{ new Date().getFullYear() }} — Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>

      <!-- Lightbox -->
      <div v-if="lightboxOpen" class="v4-lightbox" @click.self="lightboxOpen = false">
        <button class="v4-lightbox-close" @click="lightboxOpen = false">&times;</button>
        <button v-if="lightboxIdx > 0" class="v4-lightbox-btn v4-prev" @click="lightboxIdx--">&#10094;</button>
        <div class="v4-lightbox-content">
          <img v-if="lightboxMedia?.type === 'PHOTO'" :src="lightboxMedia.url" :alt="lightboxMedia.caption || 'Mídia do projeto'" />
          <video v-else :src="lightboxMedia?.url" controls autoplay />
          <div v-if="lightboxMedia?.caption" class="v4-lightbox-caption">{{ lightboxMedia.caption }}</div>
        </div>
        <button v-if="lightboxIdx < (project.projectMedias?.length || 1) - 1" class="v4-lightbox-btn v4-next" @click="lightboxIdx++">&#10095;</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTenantStore } from '~/stores/tenant'

const props = defineProps({
  slug: {
    type: String,
    default: ''
  },
  id: {
    type: String,
    default: ''
  }
})

const route = useRoute()
const tenantStore = useTenantStore()
const { fetchPublic } = usePublicApi()

const projectSlug = computed(() => (tenantStore.config?.project?.slug || props.slug || route.params.slug || '') as string)
const isPreview = computed(() => !!props.id || !!route.query.previewId)
const previewId = computed(() => (props.id || route.query.previewId) as string)
const pathPrefix = computed(() => {
  if (isPreview.value) {
    return `/preview/${previewId.value}`
  }
  return projectSlug.value ? `/${projectSlug.value}` : ''
})
const corretorCode = route.query.c || ''

const projectUrl = computed(() => {
  const base = pathPrefix.value || '/'
  return corretorCode ? `${base}${base.includes('?') ? '&' : '?'}c=${corretorCode}` : base
})

const loading = ref(true)
const error = ref('')

type ProjectMediaItem = {
  id: string
  url: string
  type: 'PHOTO' | 'VIDEO' | string
  caption?: string | null
}

type GalleryProject = {
  name: string
  tenant?: { name?: string | null } | null
  projectMedias?: ProjectMediaItem[] | null
}

const project = ref<GalleryProject | null>(null)

const page = ref(1)
const perPage = 16

const lightboxOpen = ref(false)
const lightboxIdx = ref(0)
const lightboxMedia = computed(() => project.value?.projectMedias?.[lightboxIdx.value] ?? null)

const paginatedMedia = computed<ProjectMediaItem[]>(() => {
  if (!project.value?.projectMedias) return []
  const start = (page.value - 1) * perPage
  return project.value.projectMedias.slice(start, start + perPage)
})

const meta = computed(() => ({
  totalItems: project.value?.projectMedias?.length || 0,
  itemCount: paginatedMedia.value.length,
  itemsPerPage: perPage,
  totalPages: Math.ceil((project.value?.projectMedias?.length || 0) / perPage),
  currentPage: page.value
}))

function openLightbox(idx: number) {
  lightboxIdx.value = idx
  lightboxOpen.value = true
}

onMounted(async () => {
  try {
    const baseUrl = isPreview.value ? `/p/preview/${previewId.value}` : `/p/${projectSlug.value}`
    project.value = await fetchPublic(baseUrl)
    if (project.value) {
      useHead({
        title: `Galeria — ${project.value.name}`,
        meta: [
          { name: 'description', content: `Veja todas as fotos e vídeos do loteamento ${project.value.name}` }
        ]
      })
    }
  } catch (e: any) {
    error.value = e.message || 'Erro ao carregar galeria'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* Reuse styles from index.vue or common definitions */
.pub-page {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #1d1d1f;
  background: #ffffff;
  line-height: 1.47059;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

.v4-container {
  max-width: 1040px;
  margin: 0 auto;
  padding: 0 22px;
}

.v4-mini-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 64px;
  background: rgba(255,255,255,0.8);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid #d2d2d7;
  display: flex;
  align-items: center;
  z-index: 1000;
}

.v4-mini-header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.v4-back-link {
  text-decoration: none;
  color: #0071e3;
  font-weight: 500;
  font-size: 14px;
}

.v4-back-link:hover {
  text-decoration: underline;
}

.v4-section { padding: 48px 0; }

.v4-section-title { font-size: 40px; font-weight: 600; line-height: 1.1; margin-bottom: 12px; letter-spacing: -0.003em; }
.v4-section-subtitle { font-size: 21px; color: #86868b; line-height: 1.38105; margin-bottom: 40px; }

/* Grid Gallery */
.v4-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.v4-gallery-item {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background: #f5f5f7;
  border: 1px solid #d2d2d7;
  aspect-ratio: 1/1;
}

.v4-gallery-item img, .v4-gallery-item video {
  width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.v4-gallery-item:hover img, .v4-gallery-item:hover video { transform: scale(1.05); }

.v4-gallery-overlay {
  position: absolute; inset: 0; background: linear-gradient(0deg, rgba(0,0,0,0.4) 0%, transparent 60%);
  display: flex; align-items: flex-end; justify-content: space-between; padding: 24px; opacity: 0; transition: opacity 0.3s;
}

.v4-gallery-item:hover .v4-gallery-overlay { opacity: 1; }

.v4-gallery-caption { color: white; font-size: 15px; font-weight: 500; }
.v4-gallery-expand { color: white; font-size: 20px; }

/* Global Utilities copied for the page context */
.loading-spinner { width: 32px; height: 32px; border: 3px solid rgba(0, 113, 227, 0.1); border-top-color: #0071e3; border-radius: 50%; animation: spinner 1s linear infinite; }
@keyframes spinner { to { transform: rotate(360deg); } }

.pub-loading, .pub-error { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; padding: 40px; text-align: center; }

.v4-btn-primary {
  background: #0071e3; color: white; border: none; padding: 12px 24px; border-radius: 980px; font-size: 17px; font-weight: 500; cursor: pointer; transition: all 0.2s;
}
.v4-btn-primary:hover { background: #0077ed; transform: scale(1.02); }

/* Lightbox V4 */
.v4-lightbox { position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,0.95); display: flex; align-items: center; justify-content: center; }
.v4-lightbox-btn { position: absolute; background: none; border: none; color: white; font-size: 40px; cursor: pointer; padding: 20px; opacity: 0.5; transition: 0.2s; }
.v4-lightbox-btn:hover { opacity: 1; }
.v4-prev { left: 20px; }
.v4-next { right: 20px; }
.v4-lightbox-close { position: absolute; top: 20px; right: 20px; background: none; border: none; color: white; font-size: 32px; cursor: pointer; z-index: 2100; }
.v4-lightbox-content { max-width: 90%; max-height: 80%; text-align: center; }
.v4-lightbox-content img, .v4-lightbox-content video { max-width: 100%; max-height: 100%; border-radius: 12px; }
.v4-lightbox-caption { color: white; margin-top: 16px; font-size: 17px; }

.v4-footer { padding: 48px 0; border-top: 1px solid #d2d2d7; background: #f5f5f7; margin-top: 80px; }
.v4-footer-tenant { font-weight: 600; font-size: 17px; margin-bottom: 4px; display: block; }
.v4-footer-copyright { font-size: 12px; color: #86868b; }
</style>