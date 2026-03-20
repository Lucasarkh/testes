<template>
  <div class="pub-page v4-categories-shell">
    <nav class="v4-header-glass">
      <div class="v4-container">
        <div class="v4-header-inner">
          <NuxtLink :to="projectUrl" class="v4-back-btn">
            <span class="v4-icon" aria-hidden="true"><i class="bi bi-arrow-left-short back-nav-icon"></i></span>
            <span class="back-nav-label">Ver Projeto</span>
          </NuxtLink>
          <div v-if="project" class="v4-header-title">
            <strong>{{ project.name }}</strong>
            <span class="v4-dot"></span>
            <span>Categorias</span>
          </div>
        </div>
      </div>
    </nav>

    <LandingTrustBar
      v-if="corretor"
      :corretor="corretor"
      :show-with-pre-launch="false"
      :primary-interest-label="'Entrar na fila de preferencia'"
      :tracking-label="'trust_bar_categories_index_interest'"
      :primary-href="brokerPrimaryHref"
      :sticky-offset="64"
    />

    <main class="v4-main-content">
      <section class="v4-categories-hero">
        <div class="v4-container">
          <div class="v4-categories-hero__header">
            <div>
              <h1>Escolha uma categoria</h1>
              <p>Explore grupos de lotes com a mesma característica e entre em uma página dedicada com os cards daquela seleção.</p>
            </div>
            <div class="v4-categories-hero__actions">
              <NuxtLink :to="unitsUrl" class="v4-categories-btn v4-categories-btn--primary">Ver unidades</NuxtLink>
              <NuxtLink :to="projectUrl" class="v4-categories-btn v4-categories-btn--ghost">Voltar ao loteamento</NuxtLink>
            </div>
          </div>

          <div v-if="!loading && categories.length" class="v4-categories-stats">
            <div class="v4-categories-stat">
              <strong>{{ categories.length }}</strong>
              <span>Categorias publicadas</span>
            </div>
            <div class="v4-categories-stat">
              <strong>{{ totalAvailableLots }}</strong>
              <span>Lotes agrupados</span>
            </div>
            <div class="v4-categories-stat">
              <strong>{{ categoriesWithImages }}</strong>
              <span>Categorias com imagem</span>
            </div>
          </div>
        </div>
      </section>

      <section class="v4-categories-section">
        <div class="v4-container">
          <div v-if="loading" class="v4-categories-state">
            <div class="loading-spinner"></div>
            <p>Carregando categorias...</p>
          </div>

          <div v-else-if="error" class="v4-categories-state v4-categories-state--error">
            <h2>Não foi possível carregar as categorias</h2>
            <p>{{ error }}</p>
          </div>

          <div v-else-if="!categories.length" class="v4-categories-state">
            <h2>Nenhuma categoria publicada</h2>
            <p>As categorias deste empreendimento ainda não foram configuradas.</p>
          </div>

          <div v-else class="v4-categories-grid">
            <NuxtLink
              v-for="category in categories"
              :key="category.id"
              :to="categoryUrl(category)"
              class="v4-category-tile"
            >
              <div class="v4-category-tile__media" :class="{ 'has-image': !!category.imageUrl }">
                <img v-if="category.imageUrl" :src="category.imageUrl" :alt="`Imagem da categoria ${category.name}`" />
                <div v-else class="v4-category-tile__placeholder">
                  <i class="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i>
                </div>
              </div>

              <div class="v4-category-tile__body">
                <div class="v4-category-tile__top">
                  <span class="v4-category-badge">{{ category.availableLots }} {{ category.availableLots === 1 ? 'lote' : 'lotes' }}</span>
                  <strong>{{ category.name }}</strong>
                </div>

                <p v-if="category.description">{{ category.description }}</p>

                <div v-if="category.teaserLots.length" class="v4-category-tile__chips">
                  <span v-for="code in category.teaserLots.slice(0, 3)" :key="`${category.id}-${code}`">{{ code }}</span>
                </div>

                <div class="v4-category-tile__footer">
                  <span>Ver lotes da categoria</span>
                  <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>
      </section>
    </main>

    <footer class="v4-footer-clean">
      <div class="v4-container">
        <div class="v4-footer-content">
          <p>&copy; {{ new Date().getFullYear() }} — {{ project?.tenant?.name }} · {{ project?.name }}</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTenantStore } from '~/stores/tenant'

type PublicCategory = {
  id: string
  name: string
  slug: string
  description?: string | null
  imageUrl?: string | null
  availableLots: number
  teaserLots: string[]
}

const props = defineProps({
  slug: {
    type: String,
    default: ''
  }
})

const route = useRoute()
const router = useRouter()
const tenantStore = useTenantStore()
const { fetchPublic } = usePublicApi()

const project = ref<any>(null)
const corretor = ref<any>(null)
const categories = ref<PublicCategory[]>([])
const loading = ref(true)
const error = ref('')

const projectSlug = computed(() => (tenantStore.config?.project?.slug || props.slug || route.params.slug || '') as string)
const corretorCode = computed(() => String(route.query.c || ''))
const pathPrefix = computed(() => (projectSlug.value ? `/${projectSlug.value}` : ''))
const projectUrl = computed(() => {
  const base = pathPrefix.value || '/'
  return corretorCode.value ? `${base}${base.includes('?') ? '&' : '?'}c=${corretorCode.value}` : base
})
const unitsUrl = computed(() => {
  const base = `${pathPrefix.value || ''}/unidades` || '/unidades'
  return corretorCode.value ? `${base}?c=${corretorCode.value}` : base
})
const brokerPrimaryHref = computed(() => `${projectUrl.value}#contato`)

const totalAvailableLots = computed(() => categories.value.reduce((sum, category) => sum + Number(category.availableLots || 0), 0))
const categoriesWithImages = computed(() => categories.value.filter(category => !!category.imageUrl).length)

const categoryUrl = (category: PublicCategory) => {
  const base = `${pathPrefix.value || ''}/categorias/${encodeURIComponent(category.slug)}`
  return corretorCode.value ? `${base}?c=${corretorCode.value}` : base
}

const fetchProject = async () => {
  if (!projectSlug.value) return
  project.value = await fetchPublic(`/p/${projectSlug.value}`)
}

const fetchCorretor = async () => {
  if (!projectSlug.value || !corretorCode.value) {
    corretor.value = null
    return
  }
  corretor.value = await fetchPublic(`/p/${projectSlug.value}/corretores/${corretorCode.value}`)
}

const fetchCategories = async () => {
  if (!projectSlug.value) return
  categories.value = await fetchPublic(`/p/${projectSlug.value}/lot-categories`)
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([fetchProject(), fetchCategories(), fetchCorretor()])
    const requestedCategory = String(route.query.category || '').trim()
    if (requestedCategory) {
      const target = categories.value.find(category => category.slug === requestedCategory)
      if (target) {
        await router.replace(categoryUrl(target))
        return
      }
    }
  } catch (loadError: any) {
    error.value = loadError?.message || 'Erro ao carregar a página de categorias.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.v4-header-glass {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  height: 56px;
  display: flex;
  align-items: center;
}

.v4-header-inner {
  display: flex;
  align-items: center;
  gap: 16px;
}

.v4-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: #1d1d1f;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.v4-header-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #86868b;
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.v4-header-title strong {
  color: #1d1d1f;
  font-weight: 600;
}

.v4-dot {
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #d2d2d7;
}

.v4-categories-shell {
  --v4-primary: #0071e3;
  --v4-text: #1d1d1f;
  --v4-text-muted: #6b7280;
  --v4-border: rgba(0, 0, 0, 0.08);
  background: #fff;
  min-height: 100vh;
  color: #1d1d1f;
  -webkit-font-smoothing: antialiased;
}

.v4-container {
  width: 90%;
  margin: 0 auto;
}

.v4-categories-hero {
  padding: 40px 0 32px;
}

.v4-categories-hero__header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: left;
}

.v4-categories-hero h1 {
  margin: 0;
  color: #1d1d1f;
  font-size: 2.2rem;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-weight: 700;
}

.v4-categories-hero p {
  margin: 12px 0 0;
  color: #48484a;
  font-size: 1rem;
  line-height: 1.5;
  font-weight: 400;
}

.v4-categories-hero__actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 24px;
}

.v4-categories-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 50px;
  padding: 0 20px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  text-decoration: none;
  transition: all 0.2s ease;
}

.v4-categories-btn--primary {
  background: #0071e3;
  color: #fff;
}

.v4-categories-btn--ghost {
  background: #f5f5f7;
  color: #1d1d1f;
}

.v4-categories-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid #f5f5f7;
}

.v4-categories-stat {
  display: flex;
  flex-direction: column;
}

.v4-categories-stat strong {
  display: block;
  color: #1d1d1f;
  font-size: 1.6rem;
  line-height: 1;
  font-weight: 700;
}

.v4-categories-stat span {
  display: block;
  margin-top: 4px;
  color: #86868b;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.v4-categories-section {
  padding: 8px 0 64px;
}

.v4-categories-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.v4-category-tile {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  border: 1px solid #f5f5f7;
  transition: transform 0.3s ease;
}

.v4-category-tile:active {
  transform: scale(0.98);
}

.v4-category-tile__media {
  aspect-ratio: 16 / 10;
  background: #f5f5f7;
  height: 150px;
}

.v4-category-tile__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.v4-category-tile__placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d2d2d7;
  font-size: 2rem;
}

.v4-category-tile__body {
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.v4-category-tile__top {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}

.v4-category-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 4px;
  background: rgba(0, 113, 227, 0.05);
  color: #0071e3;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.v4-category-tile__top strong {
  display: block;
  width: 100%;
  font-size: 18px;
  font-weight: 700;
  color: #1d1d1f;
  line-height: 1.2;
}

.v4-category-tile__body p {
  margin: 0 0 16px;
  font-size: 0.95rem;
  line-height: 1.45;
  color: #48484a;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 1px;
}

.v4-category-tile__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.v4-category-tile__chips span {
  padding: 4px 8px;
  background: #f5f5f7;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #86868b;
}

.v4-category-tile__footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #f5f5f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #0071e3;
  font-weight: 600;
  font-size: 0.9rem;
}

.v4-category-tile__footer i {
  font-size: 1.1rem;
}

.v4-categories-state {
  text-align: center;
  padding: 48px 0;
}

.v4-footer-clean {
  padding: 40px 0;
  background: #f5f5f7;
}

.v4-footer-content {
  text-align: center;
  color: #86868b;
  font-size: 0.8rem;
}

/* Tablet & Desktop Enhancements */
@media (min-width: 768px) {
  .v4-header-glass {
    height: 64px;
  }

  .v4-container {
    width: min(92%, 1400px);
  }

  .v4-categories-hero {
    padding: 48px 0;
  }

  .v4-categories-hero h1 {
    font-size: 3.5rem;
  }

  .v4-categories-hero__actions {
    grid-template-columns: auto auto;
    width: fit-content;
  }

  .v4-categories-stats {
    display: flex;
    gap: 64px;
  }

  .v4-categories-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 32px;
  }

  .v4-category-tile {
    border-radius: 24px;
  }
}

@media (min-width: 1024px) {
  .v4-categories-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1400px) {
  .v4-categories-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 639px) {
  .v4-header-title {
    display: none;
  }
}

@media (min-width: 1360px) {
  .v4-categories-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .v4-container {
    width: 94%;
  }

  .v4-categories-hero {
    padding: 22px 0 18px;
  }

  .v4-categories-stat {
    min-height: 84px;
    padding: 16px;
  }

  .v4-category-tile {
    border-radius: 20px;
  }

  .v4-category-tile__body {
    gap: 12px;
    padding: 16px 16px 14px;
  }

  .v4-category-tile__body p {
    min-height: 0;
  }
}
</style>