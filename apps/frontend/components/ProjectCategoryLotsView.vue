<template>
  <div class="pub-page v4-category-lots-shell">
    <nav class="v4-header-glass">
      <div class="v4-container">
        <div class="v4-header-inner">
          <NuxtLink :to="categoriesUrl" class="v4-back-btn">
            <span class="v4-icon" aria-hidden="true"><i class="bi bi-arrow-left-short back-nav-icon"></i></span>
            <span class="back-nav-label">Voltar às categorias</span>
          </NuxtLink>
          <div v-if="project" class="v4-header-title">
            <strong>{{ project.name }}</strong>
            <span class="v4-dot"></span>
            <span>{{ category?.name || 'Categoria' }}</span>
          </div>
        </div>
      </div>
    </nav>

    <LandingTrustBar
      v-if="corretor"
      :corretor="corretor"
      :show-with-pre-launch="false"
      :primary-interest-label="'Entrar na fila de preferencia'"
      :tracking-label="'trust_bar_category_interest'"
      :primary-href="brokerPrimaryHref"
      :sticky-offset="64"
    />

    <main class="v4-main-content">
      <section class="v4-category-hero">
        <div class="v4-container">
          <div v-if="loading" class="v4-category-state">
            <div class="loading-spinner"></div>
            <p>Carregando categoria...</p>
          </div>

          <div v-else-if="error" class="v4-category-state v4-category-state--error">
            <h2>Categoria não encontrada</h2>
            <p>{{ error }}</p>
          </div>

          <template v-else-if="category">
            <div class="v4-category-hero-card">
              <div class="v4-category-hero-copy">
                <span class="v4-category-kicker">Categoria selecionada</span>
                <h1>{{ category.name }}</h1>
                <p>{{ category.description || 'Explore abaixo todos os lotes publicados desta categoria.' }}</p>

                <div class="v4-category-hero-actions">
                  <NuxtLink :to="unitsUrl" class="v4-category-btn v4-category-btn--primary">Ver todas as unidades</NuxtLink>
                  <NuxtLink :to="categoriesUrl" class="v4-category-btn v4-category-btn--ghost">Outras categorias</NuxtLink>
                </div>
              </div>

              <div class="v4-category-hero-side">
                <div class="v4-category-badge-box">
                  <strong>{{ category.availableLots }}</strong>
                  <span>lotes publicados</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </section>

      <section v-if="!loading && !error && category" class="v4-results-section">
        <div class="v4-container">
          <div class="v4-category-results-head">
            <div>
              <h2>Unidades disponíveis</h2>
              <p>{{ lotsTotal }} resultado<span v-if="lotsTotal !== 1">s</span> nesta categoria.</p>
            </div>
            <span v-if="lotsLoading" class="v4-category-results-loading">Atualizando...</span>
          </div>

          <div v-if="lotsLoading && !lots.length" class="v4-results-loading">
            <div class="loading-spinner"></div>
            <p>Sincronizando disponibilidade...</p>
          </div>

          <div v-else-if="!lots.length" class="v4-empty-state">
            <h3>Sem lotes disponíveis nesta categoria</h3>
            <p>Volte para a lista de categorias e escolha outro grupo.</p>
            <NuxtLink :to="categoriesUrl" class="v4-category-btn v4-category-btn--primary">Voltar às categorias</NuxtLink>
          </div>

          <div v-else class="v4-grid-wrap">
            <div class="v4-lots-grid">
              <NuxtLink
                v-for="lot in lots"
                :key="lot.id"
                :to="lotPageUrl(lot)"
                class="v4-lot-card-v2"
                @click="tracking.trackLotClick(lot.code || lot.name || lot.id, lot.id)"
              >
                <div class="v4-card-header">
                  <div class="v4-card-id">
                    <span class="v4-label">
                      <span v-if="lot.lotDetails?.block || lot.lotDetails?.lotNumber">
                        QUADRA {{ normalizeBlockLabel(lot.lotDetails?.block) }} · LOTE {{ lot.lotDetails?.lotNumber || '---' }}
                      </span>
                      <span v-else>LOTE</span>
                    </span>
                    <h3 class="v4-code">{{ lot.code || lot.name || lot.id }}</h3>
                  </div>
                  <div class="v4-card-status">Disponível</div>
                </div>

                <div v-if="lot.lotDetails?.tags?.length" class="v4-card-seals">
                  <span v-for="tag in lot.lotDetails.tags" :key="tag" class="v4-seal">{{ tag }}</span>
                </div>

                <div class="v4-card-body">
                  <div class="v4-metric">
                    <span class="m-val">{{ lot.lotDetails?.areaM2 || '---' }}</span>
                    <span class="m-unit">m² totais</span>
                  </div>
                  <div class="v4-metric" v-if="lot.lotDetails?.pricePerM2">
                    <span class="m-val">{{ formatCurrencyToBrasilia(lot.lotDetails.pricePerM2) }}</span>
                    <span class="m-unit">valor m²</span>
                  </div>
                  <div class="v4-metric" v-else-if="lot.lotDetails?.frontage">
                    <span class="m-val">{{ lot.lotDetails.frontage }}</span>
                    <span class="m-unit">m frente</span>
                  </div>
                </div>

                <div class="v4-card-footer">
                  <div class="v4-price" v-if="lot.lotDetails?.price">
                    <span class="p-label">Investimento</span>
                    <span class="p-val">{{ formatCurrencyToBrasilia(lot.lotDetails.price) }}</span>
                  </div>
                  <div class="v4-cta-arrow">
                    <span>Detalhes</span>
                    <span class="arrow">→</span>
                  </div>
                </div>
              </NuxtLink>
            </div>

            <div v-if="totalPages > 1" class="v4-pagination-wrap">
              <CommonPagination :meta="paginationMeta" @change="handlePageChange" />
            </div>
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
import { computed, onMounted, ref, watch } from 'vue'
import CommonPagination from '~/components/common/Pagination.vue'
import { useTracking } from '~/composables/useTracking'
import { formatCurrencyToBrasilia } from '~/utils/money'
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
const tenantStore = useTenantStore()
const tracking = useTracking()
const { fetchPublic } = usePublicApi()

const project = ref<any>(null)
const corretor = ref<any>(null)
const categories = ref<PublicCategory[]>([])
const lots = ref<any[]>([])
const lotsTotal = ref(0)
const loading = ref(true)
const lotsLoading = ref(false)
const error = ref('')
const currentPage = ref(1)
const lotsPerPage = 12

const projectSlug = computed(() => (tenantStore.config?.project?.slug || props.slug || route.params.slug || '') as string)
const categorySlug = computed(() => String(route.params.category || '').trim())
const corretorCode = computed(() => String(route.query.c || ''))
const pathPrefix = computed(() => (projectSlug.value ? `/${projectSlug.value}` : ''))
const projectUrl = computed(() => {
  const base = pathPrefix.value || '/'
  return corretorCode.value ? `${base}${base.includes('?') ? '&' : '?'}c=${corretorCode.value}` : base
})
const categoriesUrl = computed(() => {
  const base = `${pathPrefix.value || ''}/categorias` || '/categorias'
  return corretorCode.value ? `${base}?c=${corretorCode.value}` : base
})
const unitsUrl = computed(() => {
  const base = `${pathPrefix.value || ''}/unidades` || '/unidades'
  return corretorCode.value ? `${base}?c=${corretorCode.value}` : base
})
const brokerPrimaryHref = computed(() => `${projectUrl.value}#contato`)
const category = computed(() => categories.value.find(item => item.slug === categorySlug.value) || null)
const totalPages = computed(() => Math.ceil(lotsTotal.value / lotsPerPage))
const paginationMeta = computed(() => ({
  totalItems: lotsTotal.value,
  itemCount: lots.value.length,
  itemsPerPage: lotsPerPage,
  totalPages: totalPages.value,
  currentPage: currentPage.value
}))

const normalizeBlockLabel = (value?: string | null) => {
  const block = String(value ?? '').trim()
  if (!block) return '---'
  const withoutPrefix = block.replace(/^quadra\s*/i, '').trim()
  return withoutPrefix || block
}

const lotPageUrl = (lot: any) => {
  const code = encodeURIComponent(String(lot?.code || lot?.name || lot?.id || '').trim())
  const base = `${pathPrefix.value}/${code}`
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

const fetchLots = async (page = 1) => {
  if (!projectSlug.value || !categorySlug.value) {
    lots.value = []
    lotsTotal.value = 0
    return
  }

  lotsLoading.value = true
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(lotsPerPage),
      category: categorySlug.value,
    })
    const response = await fetchPublic(`/p/${projectSlug.value}/lots?${params.toString()}`)
    lots.value = response?.data || []
    lotsTotal.value = Number(response?.total || 0)
    currentPage.value = page
  } catch (fetchError: any) {
    error.value = fetchError?.message || 'Erro ao carregar os lotes da categoria.'
  } finally {
    lotsLoading.value = false
  }
}

const handlePageChange = async (page: number) => {
  currentPage.value = page
  await fetchLots(page)
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([fetchProject(), fetchCategories(), fetchCorretor()])
    if (!category.value) {
      error.value = 'A categoria solicitada não existe ou não está publicada.'
      return
    }
    const requestedPage = Number(route.query.page || 1)
    await fetchLots(Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1)
  } catch (loadError: any) {
    error.value = loadError?.message || 'Erro ao carregar a categoria.'
  } finally {
    loading.value = false
  }
})

watch(() => route.query.page, async (nextPage) => {
  const page = Number(nextPage || 1)
  if (!Number.isFinite(page) || page < 1 || page === currentPage.value || !category.value) return
  await fetchLots(page)
})
</script>

<style scoped>
.v4-category-lots-shell {
  --v4-primary: #0071e3;
  --v4-text: #1d1d1f;
  --v4-text-muted: #6b7280;
  --v4-border: rgba(0, 0, 0, 0.08);
  background: #fdfdfe;
  min-height: 100vh;
  color: #1d1d1f;
  -webkit-font-smoothing: antialiased;
}

.v4-container {
  width: min(92%, 1400px);
  margin: 0 auto;
}

.v4-header-glass {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
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
  gap: 4px;
  color: #1d1d1f;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.v4-back-btn:hover {
  opacity: 0.7;
}

.v4-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #86868b;
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.v4-header-title strong {
  color: #1d1d1f;
  font-weight: 600;
}

.v4-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #d2d2d7;
}

.v4-category-hero {
  padding: 32px 0;
}

.v4-category-hero-card {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 32px;
  border-radius: 24px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.02);
}

.v4-category-kicker {
  display: inline-flex;
  margin-bottom: 8px;
  color: #0071e3;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.v4-category-hero-copy h1 {
  margin: 0;
  color: #1d1d1f;
  font-size: 2.25rem;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-weight: 700;
}

.v4-category-hero-copy p {
  margin: 16px 0 0;
  color: #424245;
  font-size: 1.0625rem;
  line-height: 1.5;
  max-width: 600px;
}

.v4-category-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 32px;
}

.v4-category-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 24px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9375rem;
  text-decoration: none;
  transition: all 0.2s ease;
}

.v4-category-btn--primary {
  background: #0071e3;
  color: #fff;
}

.v4-category-btn--primary:hover {
  background: #0077ed;
  transform: translateY(-1px);
}

.v4-category-btn--ghost {
  background: #f5f5f7;
  color: #1d1d1f;
}

.v4-category-btn--ghost:hover {
  background: #e8e8ed;
}

.v4-category-hero-side {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 24px;
  border-top: 1px solid #f5f5f7;
}

.v4-category-badge-box {
  display: flex;
  flex-direction: column;
}

.v4-category-badge-box strong {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #1d1d1f;
  line-height: 1;
}

.v4-category-badge-box span {
  display: block;
  margin-top: 4px;
  color: #86868b;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.v4-results-section {
  padding: 0 0 48px;
}

.v4-category-results-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.v4-category-results-head h2 {
  margin: 0;
  color: #1d1d1f;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.v4-category-results-head p {
  margin: 4px 0 0;
  color: #86868b;
  font-size: 0.9375rem;
}

.v4-lots-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.v4-lot-card-v2 {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 16px;
  padding: 16px;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.v4-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  flex-direction: column;
  gap: 6px;
}

.v4-card-id .v4-code {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1d1d1f;
  margin: 2px 0 0;
}

.v4-card-status {
  font-size: 0.625rem;
  font-weight: 700;
  color: #32d74b;
  background: rgba(50, 215, 75, 0.1);
  padding: 2px 8px;
  border-radius: 100px;
}

.v4-card-body {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.v4-metric .m-val {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1d1d1f;
}

.v4-metric .m-unit {
  font-size: 0.625rem;
  font-weight: 600;
  color: #86868b;
  text-transform: uppercase;
  display: block;
}

.v4-price .p-val {
  font-size: 1rem;
  font-weight: 700;
  color: #0071e3;
}

.v4-cta-arrow {
  display: none;
}

@media (min-width: 768px) {
  .v4-lots-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 32px;
  }

  .v4-lot-card-v2 {
    border-radius: 20px;
    padding: 24px;
  }

  .v4-card-header {
    flex-direction: row;
    margin-bottom: 16px;
  }

  .v4-card-id .v4-code {
    font-size: 1.75rem;
  }

  .v4-card-status {
    font-size: 0.6875rem;
    padding: 4px 12px;
  }

  .v4-card-body {
    gap: 24px;
  }

  .v4-metric .m-val {
    font-size: 1.25rem;
  }

  .v4-metric .m-unit {
    font-size: 0.6875rem;
  }

  .v4-price .p-val {
    font-size: 1.25rem;
  }

  .v4-cta-arrow {
    display: flex;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #86868b;
    align-items: center;
    gap: 6px;
  }
}

@media (min-width: 1024px) {
  .v4-lots-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1400px) {
  .v4-lots-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.v4-card-id .v4-label {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #86868b;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.v4-card-id .v4-code {
  margin: 4px 0 0;
  color: #1d1d1f;
  font-size: 1.375rem;
  font-weight: 700;
  line-height: 1.2;
}

.v4-card-status {
  font-size: 0.6875rem;
  font-weight: 700;
  color: #1d7c40;
  background: #e6f4ea;
  padding: 4px 10px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.v4-card-seals {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 20px;
}

.v4-seal {
  background: #f5f5f7;
  color: #424245;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.03);
}

.v4-card-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 20px 0;
  border-top: 1px solid #f5f5f7;
  border-bottom: 1px solid #f5f5f7;
}

.v4-metric {
  display: flex;
  flex-direction: column;
}

.v4-metric .m-val {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1d1d1f;
}

.v4-metric .m-unit {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #86868b;
  margin-top: 2px;
}

.v4-card-footer {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.v4-price {
  flex: 1 1 auto;
  min-width: 0;
}

.v4-price .p-label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #86868b;
  margin-bottom: 4px;
}

.v4-price .p-val {
  font-size: clamp(1.05rem, 1.6vw, 1.375rem);
  font-weight: 700;
  color: #1d1d1f;
  letter-spacing: -0.01em;
  line-height: 1.15;
}

.v4-cta-arrow {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #0071e3;
  font-weight: 600;
  font-size: 0.9375rem;
  transition: gap 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.v4-lot-card-v2:hover .v4-cta-arrow {
  gap: 10px;
}

/* Tablet & Desktop Enhancements */
@media (min-width: 768px) {
  .v4-header-glass {
    height: 64px;
  }

  .v4-category-hero {
    padding: 48px 0;
  }

  .v4-category-hero-card {
    flex-direction: row;
    align-items: stretch;
    justify-content: space-between;
    padding: 40px;
    border-radius: 32px;
  }

  .v4-category-hero-copy h1 {
    font-size: 3.5rem;
  }

  .v4-category-hero-side {
    padding-top: 0;
    padding-left: 64px;
    border-top: 0;
    border-left: 1px solid #f5f5f7;
    min-width: 320px;
    justify-content: center;
  }

  .v4-category-badge-box strong {
    font-size: 3rem;
  }

  .v4-category-results-head {
    margin-bottom: 48px;
    padding-bottom: 24px;
  }

  .v4-category-results-head h2 {
    font-size: 2rem;
  }

  .v4-lots-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 32px;
  }
}

@media (min-width: 1024px) {
  .v4-lots-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1400px) {
  .v4-lots-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 639px) {
  .v4-header-title {
    display: none;
  }
  
  .v4-category-hero-copy h1 {
    font-size: 1.875rem;
  }
  
  .v4-category-btn {
    width: 100%;
  }
}

.v4-empty-state,
.v4-results-loading,
.v4-category-state {
  padding: 80px 24px;
  border-radius: 24px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  background: #fff;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.02);
}

.v4-empty-state h3 {
  margin: 0;
  color: #1d1d1f;
  font-size: 1.5rem;
}

.v4-pagination-wrap {
  margin-top: 48px;
  display: flex;
  justify-content: center;
}

.v4-footer-clean {
  padding: 48px 0;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}

.v4-footer-content {
  display: flex;
  justify-content: center;
  color: #6b7280;
  font-size: 0.85rem;
  text-align: center;
}
</style>