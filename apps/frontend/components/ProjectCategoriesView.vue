<template>
  <div class="pub-page pub-categories-page">
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
      :tracking-label="'trust_bar_categories_interest'"
      :primary-href="brokerPrimaryHref"
      :sticky-offset="64"
    />

    <main class="v4-main-content">
      <section class="pub-categories-hero">
        <div class="v4-container">
          <div class="pub-categories-hero__content">
            <div>
              <span class="pub-categories-kicker">Organização de lotes</span>
              <h1>Explore por categoria</h1>
              <p>Escolha um card para ver somente os lotes daquele grupo e ir direto aos detalhes.</p>
            </div>
            <div class="pub-categories-hero__actions">
              <NuxtLink :to="unitsUrl" class="pub-categories-link">Ver unidades</NuxtLink>
              <button v-if="selectedCategorySlug" type="button" class="pub-categories-link pub-categories-link--ghost" @click="clearCategory">
                Limpar seleção
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="pub-categories-cards">
        <div class="v4-container">
          <div v-if="loading" class="pub-categories-loading">
            <div class="loading-spinner"></div>
            <p>Carregando categorias...</p>
          </div>

          <div v-else-if="error" class="pub-categories-error">
            <h2>Não foi possível carregar as categorias</h2>
            <p>{{ error }}</p>
          </div>

          <div v-else-if="categories.length === 0" class="pub-categories-empty">
            <h2>Nenhuma categoria publicada</h2>
            <p>As categorias deste empreendimento ainda não foram configuradas.</p>
          </div>

          <div v-else class="pub-categories-grid">
            <button
              v-for="category in categories"
              :key="category.id"
              type="button"
              class="pub-category-card"
              :class="{ active: selectedCategorySlug === category.slug }"
              @click="selectCategory(category.slug)"
            >
              <div class="pub-category-card__media" :class="{ 'has-image': !!category.imageUrl }">
                <img v-if="category.imageUrl" :src="category.imageUrl" :alt="`Imagem da categoria ${category.name}`" />
                <div v-else class="pub-category-card__placeholder">
                  <i class="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i>
                </div>
              </div>
              <div class="pub-category-card__body">
                <div class="pub-category-card__top">
                  <strong>{{ category.name }}</strong>
                  <span>{{ category.availableLots }} lotes</span>
                </div>
                <p>{{ category.description || 'Categoria criada para separar lotes semelhantes.' }}</p>
                <div v-if="category.teaserLots.length" class="pub-category-card__chips">
                  <span v-for="code in category.teaserLots" :key="code">{{ code }}</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      <section class="pub-categories-results">
        <div class="v4-container">
          <div v-if="!selectedCategory" class="pub-categories-results__placeholder">
            <h2>Selecione uma categoria</h2>
            <p>Ao clicar em um card, esta área passa a mostrar somente os lotes da categoria escolhida.</p>
          </div>

          <template v-else>
            <div class="pub-categories-results__head">
              <div>
                <span class="pub-categories-kicker">Categoria selecionada</span>
                <h2>{{ selectedCategory.name }}</h2>
                <p>{{ selectedCategory.description || 'Lotes agrupados nesta categoria.' }}</p>
              </div>
              <div class="pub-categories-results__meta">
                <span>{{ lotsTotal }} lote<span v-if="lotsTotal !== 1">s</span></span>
                <span v-if="lotsLoading">Atualizando...</span>
              </div>
            </div>

            <div v-if="lotsLoading" class="pub-categories-loading pub-categories-loading--inline">
              <div class="loading-spinner"></div>
              <p>Carregando lotes da categoria...</p>
            </div>

            <div v-else-if="lots.length === 0" class="pub-categories-results__placeholder">
              <h3>Sem lotes disponíveis nesta categoria</h3>
              <p>Escolha outra categoria para continuar explorando o empreendimento.</p>
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

                  <div class="v4-card-seals" v-if="lot.lotDetails?.tags?.length">
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
          </template>
        </div>
      </section>
    </main>
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
const router = useRouter()
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
const selectedCategorySlug = ref('')
const currentPage = ref(1)
const lotsPerPage = 12

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
const selectedCategory = computed(() => categories.value.find(category => category.slug === selectedCategorySlug.value) || null)
const brokerPrimaryHref = computed(() => `${projectUrl.value}#contato`)
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

const syncCategoryToRoute = async () => {
  const query = { ...route.query }
  if (corretorCode.value) {
    query.c = corretorCode.value
  }
  if (selectedCategorySlug.value) {
    query.category = selectedCategorySlug.value
  } else {
    delete query.category
    delete query.page
  }
  if (currentPage.value > 1 && selectedCategorySlug.value) {
    query.page = String(currentPage.value)
  } else {
    delete query.page
  }

  await router.replace({ path: route.path, query })
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
  if (!projectSlug.value || !selectedCategorySlug.value) {
    lots.value = []
    lotsTotal.value = 0
    return
  }

  lotsLoading.value = true
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(lotsPerPage),
      category: selectedCategorySlug.value,
    })
    const response = await fetchPublic(`/p/${projectSlug.value}/lots?${params.toString()}`)
    lots.value = response?.data || []
    lotsTotal.value = Number(response?.total || 0)
    currentPage.value = page
  } catch (fetchError: any) {
    error.value = fetchError?.message || 'Erro ao carregar lotes da categoria.'
  } finally {
    lotsLoading.value = false
  }
}

const selectCategory = async (slug: string) => {
  selectedCategorySlug.value = slug
  currentPage.value = 1
  await syncCategoryToRoute()
  await fetchLots(1)
}

const clearCategory = async () => {
  selectedCategorySlug.value = ''
  lots.value = []
  lotsTotal.value = 0
  currentPage.value = 1
  await syncCategoryToRoute()
}

const handlePageChange = async (page: number) => {
  if (!selectedCategorySlug.value) return
  currentPage.value = page
  await syncCategoryToRoute()
  await fetchLots(page)
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([fetchProject(), fetchCategories(), fetchCorretor()])
    const requestedCategory = String(route.query.category || '').trim()
    if (requestedCategory && categories.value.some(category => category.slug === requestedCategory)) {
      selectedCategorySlug.value = requestedCategory
      const requestedPage = Number(route.query.page || 1)
      await fetchLots(Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1)
    }
  } catch (loadError: any) {
    error.value = loadError?.message || 'Erro ao carregar a página de categorias.'
  } finally {
    loading.value = false
  }
})

watch(() => route.query.category, async (nextCategory) => {
  const normalized = String(nextCategory || '').trim()
  if (normalized === selectedCategorySlug.value) return
  if (!normalized) {
    selectedCategorySlug.value = ''
    lots.value = []
    lotsTotal.value = 0
    currentPage.value = 1
    return
  }
  if (!categories.value.some(category => category.slug === normalized)) return
  selectedCategorySlug.value = normalized
  const requestedPage = Number(route.query.page || 1)
  await fetchLots(Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1)
})
</script>

<style scoped>
.pub-categories-page {
  --v4-primary: #0071e3;
  --v4-text: #1d1d1f;
  --v4-text-muted: #6b7280;
  --v4-border: rgba(0, 0, 0, 0.08);
  background:
    radial-gradient(circle at top left, rgba(251, 191, 36, 0.16), transparent 32%),
    radial-gradient(circle at top right, rgba(34, 197, 94, 0.12), transparent 28%),
    linear-gradient(180deg, #08111f 0%, #0f172a 100%);
}

.v4-container {
  width: min(92%, 1400px);
  margin: 0 auto;
}

.pub-categories-hero {
  padding: 32px 0 12px;
}

.pub-categories-hero__content {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.pub-categories-kicker {
  display: inline-flex;
  margin-bottom: 10px;
  padding: 7px 12px;
  border-radius: 999px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.72rem;
  background: rgba(148, 163, 184, 0.14);
  color: rgba(226, 232, 240, 0.86);
}

.pub-categories-hero h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 0.95;
  letter-spacing: -0.05em;
  color: #f8fafc;
}

.pub-categories-hero p {
  margin: 12px 0 0;
  max-width: 620px;
  font-size: 1rem;
  color: rgba(226, 232, 240, 0.76);
}

.pub-categories-hero__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.pub-categories-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  background: #f8fafc;
  color: #0f172a;
  font-weight: 700;
  text-decoration: none;
}

.pub-categories-link--ghost {
  border: 1px solid rgba(248, 250, 252, 0.18);
  background: rgba(15, 23, 42, 0.48);
  color: #f8fafc;
}

.pub-categories-cards,
.pub-categories-results {
  padding: 20px 0 48px;
}

.pub-categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}

.pub-category-card {
  padding: 0;
  overflow: hidden;
  border-radius: 26px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.72);
  color: #f8fafc;
  text-align: left;
  box-shadow: 0 24px 60px rgba(2, 6, 23, 0.28);
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.pub-category-card:hover,
.pub-category-card.active {
  transform: translateY(-4px);
  border-color: rgba(250, 204, 21, 0.55);
  box-shadow: 0 28px 72px rgba(2, 6, 23, 0.36);
}

.pub-category-card__media {
  height: 180px;
  background: linear-gradient(135deg, rgba(146, 64, 14, 0.86), rgba(15, 23, 42, 0.82));
}

.pub-category-card__media.has-image {
  background: #0f172a;
}

.pub-category-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.pub-category-card__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.88);
  font-size: 2rem;
}

.pub-category-card__body {
  padding: 18px;
}

.pub-category-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.pub-category-card__top strong {
  font-size: 1.05rem;
}

.pub-category-card__top span {
  font-size: 0.78rem;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.1);
  color: rgba(248, 250, 252, 0.9);
  white-space: nowrap;
}

.pub-category-card__body p {
  margin: 0 0 12px;
  color: rgba(226, 232, 240, 0.76);
  min-height: 44px;
}

.pub-category-card__chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pub-category-card__chips span {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(250, 204, 21, 0.14);
  color: #fde68a;
  font-size: 0.76rem;
}

.pub-categories-results__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 18px;
  margin-bottom: 22px;
  flex-wrap: wrap;
}

.pub-categories-results__head h2 {
  margin: 0;
  color: #f8fafc;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
}

.pub-categories-results__head p {
  margin: 8px 0 0;
  color: rgba(226, 232, 240, 0.76);
}

.pub-categories-results__meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.pub-categories-results__meta span {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  color: rgba(248, 250, 252, 0.88);
}

.pub-categories-results__placeholder,
.pub-categories-empty,
.pub-categories-error,
.pub-categories-loading {
  padding: 54px 24px;
  border-radius: 28px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.66);
  text-align: center;
  color: #f8fafc;
}

.pub-categories-loading p,
.pub-categories-empty p,
.pub-categories-error p,
.pub-categories-results__placeholder p {
  margin: 10px 0 0;
  color: rgba(226, 232, 240, 0.74);
}

.pub-categories-loading--inline {
  margin-top: 18px;
}

@media (max-width: 768px) {
  .pub-categories-hero__actions {
    width: 100%;
  }

  .pub-categories-link,
  .pub-categories-link--ghost {
    flex: 1 1 100%;
  }
}
</style>