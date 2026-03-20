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
                  <NuxtLink :to="categoriesUrl" class="v4-category-btn v4-category-btn--ghost">Ver todas as categorias</NuxtLink>
                  <NuxtLink :to="unitsUrl" class="v4-category-btn v4-category-btn--primary">Ver todas as unidades</NuxtLink>
                </div>
              </div>

              <div class="v4-category-hero-side">
                <div class="v4-category-badge-box">
                  <strong>{{ category.availableLots }}</strong>
                  <span>lotes publicados</span>
                </div>
                <div v-if="category.teaserLots.length" class="v4-category-teasers">
                  <span v-for="code in category.teaserLots" :key="`${category.id}-${code}`">{{ code }}</span>
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
              <h2>Lotes da categoria</h2>
              <p>{{ lotsTotal }} resultado<span v-if="lotsTotal !== 1">s</span> disponível<span v-if="lotsTotal !== 1">eis</span>.</p>
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
    await Promise.all([fetchProject(), fetchCategories()])
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
  background: #f5f7fb;
  min-height: 100vh;
}

.v4-category-hero {
  padding: 32px 0 24px;
}

.v4-category-hero-card {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  padding: 24px;
  border-radius: 28px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.06);
}

.v4-category-kicker {
  display: inline-flex;
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(0, 113, 227, 0.08);
  color: #0071e3;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.v4-category-hero-copy h1 {
  margin: 0;
  color: #111827;
  font-size: clamp(2rem, 6vw, 3.2rem);
  line-height: 0.96;
  letter-spacing: -0.04em;
}

.v4-category-hero-copy p {
  margin: 14px 0 0;
  color: #6b7280;
  font-size: 1rem;
  line-height: 1.65;
}

.v4-category-hero-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.v4-category-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 18px;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 700;
}

.v4-category-btn--primary {
  background: #0071e3;
  color: #fff;
}

.v4-category-btn--ghost {
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: #fff;
  color: #111827;
}

.v4-category-hero-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.v4-category-badge-box {
  padding: 18px;
  border-radius: 22px;
  background: #0f172a;
  color: #fff;
}

.v4-category-badge-box strong {
  display: block;
  font-size: 2rem;
  line-height: 1;
}

.v4-category-badge-box span {
  display: block;
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.72);
}

.v4-category-teasers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.v4-category-teasers span {
  padding: 8px 12px;
  border-radius: 999px;
  background: #eef2ff;
  color: #3730a3;
  font-size: 0.78rem;
  font-weight: 700;
}

.v4-category-results-head {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.v4-category-results-head h2 {
  margin: 0;
  color: #111827;
  font-size: clamp(1.7rem, 4vw, 2.3rem);
}

.v4-category-results-head p,
.v4-category-results-loading {
  margin: 0;
  color: #6b7280;
}

.v4-lots-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.v4-lot-card-v2 {
  background: white;
  border: 1px solid #eee;
  border-radius: 18px;
  padding: 16px;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.3s ease;
}

.v4-lot-card-v2:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.1);
  border-color: rgba(0, 113, 227, 0.24);
}

.v4-card-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.v4-card-id .v4-label {
  font-size: 8px;
  font-weight: 700;
  color: #86868b;
  letter-spacing: 0.1em;
}

.v4-card-id .v4-code {
  margin: 2px 0 0;
  color: #111827;
  font-size: 18px;
}

.v4-card-status {
  font-size: 8px;
  font-weight: 700;
  color: #32d74b;
  background: rgba(50, 215, 75, 0.1);
  padding: 2px 8px;
  border-radius: 100px;
}

.v4-card-seals {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.v4-seal {
  background: #f0f7ff;
  color: #0071e3;
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 64px;
  border: 1px solid #e0efff;
}

.v4-card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.v4-metric {
  display: flex;
  flex-direction: column;
}

.v4-metric .m-val {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.v4-metric .m-unit {
  font-size: 9px;
  font-weight: 600;
  color: #86868b;
  text-transform: uppercase;
  margin-top: 2px;
}

.v4-card-footer {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #f5f5f7;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.v4-price .p-label {
  display: block;
  font-size: 9px;
  font-weight: 600;
  color: #86868b;
  margin-bottom: 2px;
}

.v4-price .p-val {
  font-size: 15px;
  font-weight: 700;
  color: #0071e3;
}

.v4-cta-arrow {
  display: none;
}

.v4-results-section {
  padding: 12px 0 56px;
}

.v4-empty-state,
.v4-results-loading,
.v4-category-state {
  padding: 64px 20px;
  border-radius: 24px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: #fff;
  text-align: center;
}

.v4-empty-state h3,
.v4-category-state h2 {
  margin: 0;
  color: #111827;
}

.v4-empty-state p,
.v4-results-loading p,
.v4-category-state p {
  margin: 10px 0 0;
  color: #6b7280;
}

.v4-pagination-wrap {
  margin-top: 32px;
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

@media (min-width: 768px) {
  .v4-category-hero-actions {
    flex-direction: row;
  }

  .v4-category-results-head {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }

  .v4-lots-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
  }

  .v4-card-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }

  .v4-card-id .v4-label {
    font-size: 10px;
  }

  .v4-card-id .v4-code {
    font-size: 24px;
  }

  .v4-card-status {
    font-size: 10px;
    padding: 4px 10px;
  }

  .v4-card-body {
    flex-direction: row;
    gap: 24px;
  }

  .v4-metric .m-val {
    font-size: 18px;
  }

  .v4-metric .m-unit,
  .v4-price .p-label {
    font-size: 10px;
  }

  .v4-price .p-val {
    font-size: 18px;
  }

  .v4-cta-arrow {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #6b7280;
    font-size: 12px;
    font-weight: 700;
  }
}

@media (min-width: 1024px) {
  .v4-category-hero-card {
    grid-template-columns: minmax(0, 1fr) 280px;
    align-items: flex-start;
  }

  .v4-lots-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1440px) {
  .v4-lots-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>