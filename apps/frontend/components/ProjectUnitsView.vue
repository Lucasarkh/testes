<template>
  <div class="pub-page">
    <!-- Header -->
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
            <span>Unidades</span>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="v4-main-content">
      <!-- Search & Filters -->
      <section class="v4-filter-section">
        <div class="v4-container">
          <div class="v4-search-hero">
            <div class="v4-search-header">
              <div class="v4-search-title">
                <h1>Encontre seu lote ideal</h1>
                <p>Busca rápida por código, preço, metragem e dimensões.</p>
              </div>
              <div class="v4-filter-stats" v-if="!loading && project">
                <span>{{ filteredLots.length }} unidades encontradas</span>
                <span v-if="selectedFilters.length || searchQuery || hasAnySmartFilter" class="v4-clear-btn" @click="clearFilters">Limpar filtros</span>
              </div>
            </div>

            <div class="v4-smart-filters-panel v4-smart-filters-panel--slim">
              <div class="v4-toolbar-row">
                <div class="v4-search-bar-wrapper">
                  <div class="v4-search-bar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="v4-search-icon" style="color: #86868b; margin-left: 12px; opacity: 0.7;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input 
                      v-model="searchQuery" 
                      type="text" 
                      placeholder="Código do lote (ex: L01, QUADRA A...)" 
                      style="margin-left: 0;"
                    />
                  </div>
                </div>
                <label class="v4-smart-toggle v4-smart-toggle--pill">
                  <input v-model="smartFilters.sortByLowestPricePerM2" type="checkbox" />
                  <span>Menor valor/m²</span>
                </label>
              </div>

              <div class="v4-smart-filters-grid v4-smart-filters-grid--slim">
                <label class="v4-smart-input">
                  <span>Área min</span>
                  <input v-model="smartFilters.minArea" type="number" min="0" step="1" placeholder="250 m²" />
                </label>
                <label class="v4-smart-input">
                  <span>Área max</span>
                  <input v-model="smartFilters.maxArea" type="number" min="0" step="1" placeholder="420 m²" />
                </label>
                <label class="v4-smart-input">
                  <span>Valor min</span>
                  <input v-model="smartFilters.minPrice" type="number" min="0" step="1000" placeholder="R$ 90.000" />
                </label>
                <label class="v4-smart-input">
                  <span>Valor max</span>
                  <input v-model="smartFilters.maxPrice" type="number" min="0" step="1000" placeholder="R$ 180.000" />
                </label>
                <label class="v4-smart-input">
                  <span>Teto valor/m²</span>
                  <input v-model="smartFilters.maxPricePerM2" type="number" min="0" step="10" placeholder="R$ 650" />
                </label>
                <label class="v4-smart-input">
                  <span>Largura min</span>
                  <input v-model="smartFilters.minFrontage" type="number" min="0" step="0.1" placeholder="10 m" />
                </label>
                <label class="v4-smart-input">
                  <span>Altura min</span>
                  <input v-model="smartFilters.minDepth" type="number" min="0" step="0.1" placeholder="25 m" />
                </label>
              </div>
            </div>

            <!-- Tags Filter -->
            <div v-if="allAvailableTags.length" class="v4-tags-filter">
              <span class="v4-filter-label">Características:</span>
              <div class="v4-tags-scroll">
                <button 
                  v-for="tag in allAvailableTags" 
                  :key="tag"
                  class="v4-filter-tag"
                  :class="{ active: selectedFilters.includes(tag) }"
                  @click="() => { toggleFilter(tag); tracking.trackClick(`Filtro: Selo ${tag}`, 'LIST_FILTER'); }"
                >
                  {{ tag }}
                </button>
              </div>

              <!-- Match Mode Toggle -->
              <div v-if="selectedFilters.length > 1" class="v4-match-mode-toggle">
                <span class="v4-mode-label">Lote deve conter</span>
                <div class="v4-mode-btns">
                  <button 
                    class="v4-mode-btn" 
                    :class="{ active: matchMode === 'any' }"
                    @click="matchMode = 'any'"
                  >
                    Algum selo selecionado
                  </button>
                  <button 
                    class="v4-mode-btn" 
                    :class="{ active: matchMode === 'exact' }"
                    @click="matchMode = 'exact'"
                  >
                    Todos os selos selecionados
                  </button>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      <!-- Results Grid -->
      <section class="v4-results-section">
        <div class="v4-container">
          <!-- Loading -->
          <div v-if="loading" class="v4-results-loading">
            <div class="loading-spinner"></div>
            <p>Sincronizando disponibilidade...</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="filteredLots.length === 0" class="v4-empty-state">
            <div class="v4-empty-icon" style="margin-bottom: 24px; opacity: 0.5;">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h3>Nenhum lote corresponde à sua busca</h3>
            <p>Tente remover alguns filtros ou buscar por outro código.</p>
            <button class="v4-btn-primary" @click="clearFilters">Limpar todos os filtros</button>
          </div>

          <!-- Grid -->
          <div v-else class="v4-grid-wrap">
            <div class="v4-lots-grid">
              <NuxtLink 
                v-for="lot in paginatedLots" 
                :key="lot.id" 
                :to="lotPageUrl(lot)"
                class="v4-lot-card-v2"
                @click="tracking.trackLotClick(lot.code || lot.name || lot.id, lot.id)"
              >
                <div class="v4-card-header">
                  <div class="v4-card-id">
                    <span class="v4-label">
                      <span v-if="lot.lotDetails?.block || lot.lotDetails?.lotNumber">
                        QUADRA {{ normalizeBlockLabel(lot.lotDetails?.block) }} · LOTE {{ lot.lotDetails.lotNumber || '---' }}
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

            <!-- Pagination -->
            <div v-if="totalPages > 1" class="v4-pagination-wrap">
              <CommonPagination :meta="paginationMeta" @change="lotsPage = $event" />
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
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
import { ref, computed, watch, onMounted } from 'vue'
import { useTenantStore } from '~/stores/tenant'
import { useAiChatStore } from '~/stores/aiChat'
import { useTracking } from '~/composables/useTracking'
import CommonPagination from '~/components/common/Pagination.vue'
import { formatCurrencyToBrasilia } from '~/utils/money'

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
const chatStore = useAiChatStore()
const tracking = useTracking()
const { fetchPublic } = usePublicApi()

const projectSlug = computed(() => (tenantStore.config?.project?.slug || props.slug || route.params.slug || '') as string)
const isPreview = computed(() => !!props.id || !!route.query.previewId)
const previewId = computed(() => (props.id || route.query.previewId) as string)
const corretorCode = route.query.c || ''

const projectUrl = computed(() => {
  if (isPreview.value) {
    const base = `/preview/${previewId.value}`
    return corretorCode ? `${base}?c=${corretorCode}` : base
  }
  const base = pathPrefix.value || '/'
  return corretorCode ? `${base}${base.includes('?') ? '&' : '?'}c=${corretorCode}` : base
})

const pathPrefix = computed(() => {
  if (isPreview.value) {
    return `/preview/${previewId.value}`
  }
  return projectSlug.value ? `/${projectSlug.value}` : ''
})

const loading = ref(true)
const error = ref('')
const project = ref<any>(null)

const searchQuery = ref('')
const selectedFilters = ref<string[]>([])
const codesFilter = ref<string[]>([])
const matchMode = ref<'any' | 'exact'>('any')
const smartFilters = ref({
  minArea: '',
  maxArea: '',
  minPrice: '',
  maxPrice: '',
  maxPricePerM2: '',
  minFrontage: '',
  minDepth: '',
  sortByLowestPricePerM2: false
})
const lotsPage = ref(1)
const lotsPerPage = 12

const parseFilterNumber = (value: string) => {
  if (!value?.trim()) return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

const hasAnySmartFilter = computed(() => {
  const f = smartFilters.value
  return !!(
    f.minArea ||
    f.maxArea ||
    f.minPrice ||
    f.maxPrice ||
    f.maxPricePerM2 ||
    f.minFrontage ||
    f.minDepth ||
    f.sortByLowestPricePerM2
  )
})

/** â”€â”€ Server-side lots (public path) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const lots = ref<any[]>([])
const lotsTotal = ref(0)
const availableTags = ref<string[]>([])
const lotsLoading = ref(false)

const normalizeBlockLabel = (value?: string | null) => {
  const block = String(value ?? '').trim()
  if (!block) return '---'

  const withoutPrefix = block.replace(/^quadra\s*/i, '').trim()
  return withoutPrefix || block
}

async function fetchLots() {
  if (isPreview.value || !projectSlug.value) return
  lotsLoading.value = true
  try {
    const params = new URLSearchParams({ page: String(lotsPage.value), limit: String(lotsPerPage) })
    if (searchQuery.value) params.set('search', searchQuery.value)
    if (selectedFilters.value.length > 0) params.set('tags', selectedFilters.value.join(','))
    if (matchMode.value === 'exact') params.set('matchMode', 'exact')
    if (codesFilter.value.length > 0) params.set('codes', codesFilter.value.join(','))
    const minArea = parseFilterNumber(smartFilters.value.minArea)
    const maxArea = parseFilterNumber(smartFilters.value.maxArea)
    const minPrice = parseFilterNumber(smartFilters.value.minPrice)
    const maxPrice = parseFilterNumber(smartFilters.value.maxPrice)
    const maxPricePerM2 = parseFilterNumber(smartFilters.value.maxPricePerM2)
    const minFrontage = parseFilterNumber(smartFilters.value.minFrontage)
    const minDepth = parseFilterNumber(smartFilters.value.minDepth)
    if (minArea != null) params.set('minArea', String(minArea))
    if (maxArea != null) params.set('maxArea', String(maxArea))
    if (minPrice != null) params.set('minPrice', String(minPrice))
    if (maxPrice != null) params.set('maxPrice', String(maxPrice))
    if (maxPricePerM2 != null) params.set('maxPricePerM2', String(maxPricePerM2))
    if (minFrontage != null) params.set('minFrontage', String(minFrontage))
    if (minDepth != null) params.set('minDepth', String(minDepth))
    if (smartFilters.value.sortByLowestPricePerM2) params.set('sortBy', 'pricePerM2Asc')
    const res = await fetchPublic(`/p/${projectSlug.value}/lots?${params}`)
    if (res) {
      lots.value = res.data || []
      lotsTotal.value = res.total || 0
      if (res.availableTags?.length && lotsPage.value === 1 && !searchQuery.value && !selectedFilters.value.length && !codesFilter.value.length) {
        availableTags.value = res.availableTags
      }
    }
  } catch (_) { /* non-critical */ }
  lotsLoading.value = false
}

// â”€â”€ Preview fallback â€” legacy lot processing from project.mapElements / mapData â”€â”€
function calcContractArea(lot: any): number | null {
  const poly: Array<{x:number,y:number}> = lot.polygon ?? []
  if (poly.length < 2) return null
  const lengths = poly.map((p: any, i: number) => {
    const q = poly[(i + 1) % poly.length]!
    return Math.sqrt((q.x - p.x) ** 2 + (q.y - p.y) ** 2)
  })
  const sm: Array<{meters: number | null}> = lot.sideMetrics ?? []
  const m = sm.map(s => s.meters)
  if (sm.length === 4 && m.every(v => v !== null && v > 0)) {
    return ((m[0]! + m[2]!) / 2) * ((m[1]! + m[3]!) / 2)
  }
  const scales: (number | null)[] = lengths.map((len: number, i: number) => {
    const mv = sm[i]?.meters
    return (mv != null && mv > 0 && len > 0) ? mv / len : null
  })
  const validScales = scales.filter((s): s is number => s !== null)
  if (validScales.length < Math.min(1, Math.ceil(sm.length * 0.5))) return null
  const product = validScales.reduce((a, b) => a * b, 1)
  const geometricMean = Math.pow(product, 1 / validScales.length)
  return (lot.area ?? 0) * geometricMean * geometricMean
}

const mapDataLots = computed(() => {
  const raw = project.value?.mapData
  if (!raw) return []
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!data.lots) return []
    if (Array.isArray(data.lots)) return data.lots.map(([, l]: [any, any]) => l)
    return Object.values(data.lots)
  } catch { return [] }
})

const lotElements = computed(() => (project.value?.mapElements || []).filter((e: any) => e.type === 'LOT'))
const availableLotElements = computed(() => lotElements.value.filter((e: any) => (e.lotDetails?.status || 'AVAILABLE') === 'AVAILABLE'))

const previewLots = computed<any[]>(() => {
  if (!isPreview.value) return []
  if (project.value?.mapData) {
    const raw = project.value.mapData
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    const PPM = Number(data.pixelsPerMeter) || 10
    return mapDataLots.value
      .filter((l: any) => l.status === 'available')
      .map((l: any) => {
        const contractArea = calcContractArea(l)
        let finalAreaM2 = Number(l.area) > 0 ? Number(l.area) / (PPM * PPM) : 0
        if (l.manualAreaM2 != null) finalAreaM2 = Number(l.manualAreaM2)
        else if (contractArea !== null) finalAreaM2 = contractArea
        const finalFrontage = l.manualFrontage != null ? Number(l.manualFrontage) : (Number(l.frontage) > 0 ? Number(l.frontage) / PPM : 0)
        return {
          id: l.id, name: l.label, code: l.code,
          lotDetails: {
            areaM2: parseFloat(finalAreaM2.toFixed(2)),
            frontage: parseFloat(finalFrontage.toFixed(2)),
            price: l.price, pricePerM2: l.pricePerM2,
            tags: l.tags || [], block: l.block, lotNumber: l.lotNumber, status: 'AVAILABLE'
          }
        }
      })
  }
  return availableLotElements.value.map((e: any) => ({ ...e, lotDetails: { ...e.lotDetails, tags: e.lotDetails?.tags || [] } }))
})

const allAvailableTags = computed(() => {
  if (!isPreview.value) return availableTags.value
  const tags = new Set<string>()
  previewLots.value.forEach((l: any) => (l.lotDetails?.tags || []).forEach((t: string) => tags.add(t)))
  return Array.from(tags).sort()
})

const filteredLots = computed(() => {
  if (!isPreview.value) return lots.value
  let list = previewLots.value

  const minArea = parseFilterNumber(smartFilters.value.minArea)
  const maxArea = parseFilterNumber(smartFilters.value.maxArea)
  const minPrice = parseFilterNumber(smartFilters.value.minPrice)
  const maxPrice = parseFilterNumber(smartFilters.value.maxPrice)
  const maxPricePerM2 = parseFilterNumber(smartFilters.value.maxPricePerM2)
  const minFrontage = parseFilterNumber(smartFilters.value.minFrontage)
  const minDepth = parseFilterNumber(smartFilters.value.minDepth)

  if (codesFilter.value.length > 0) list = list.filter((l: any) => codesFilter.value.includes(l.code))
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((l: any) => (l.code || '').toLowerCase().includes(q) || (l.name || '').toLowerCase().includes(q))
  }
  if (selectedFilters.value.length > 0) {
    list = list.filter((l: any) => {
      const tags = l.lotDetails?.tags || []
      return matchMode.value === 'exact' ? selectedFilters.value.every(f => tags.includes(f)) : selectedFilters.value.some(f => tags.includes(f))
    })
  }

  list = list.filter((l: any) => {
    const areaM2 = Number(l.lotDetails?.areaM2)
    const price = Number(l.lotDetails?.price)
    const pricePerM2 = Number(l.lotDetails?.pricePerM2)
    const frontage = Number(l.lotDetails?.frontage)
    const depth = Number(l.lotDetails?.depth)

    if (minArea != null && (!Number.isFinite(areaM2) || areaM2 < minArea)) return false
    if (maxArea != null && (!Number.isFinite(areaM2) || areaM2 > maxArea)) return false
    if (minPrice != null && (!Number.isFinite(price) || price < minPrice)) return false
    if (maxPrice != null && (!Number.isFinite(price) || price > maxPrice)) return false
    if (maxPricePerM2 != null && (!Number.isFinite(pricePerM2) || pricePerM2 > maxPricePerM2)) return false
    if (minFrontage != null && (!Number.isFinite(frontage) || frontage < minFrontage)) return false
    if (minDepth != null && (!Number.isFinite(depth) || depth < minDepth)) return false
    return true
  })

  if (smartFilters.value.sortByLowestPricePerM2) {
    list = [...list].sort((a: any, b: any) => {
      const aVal = Number(a.lotDetails?.pricePerM2)
      const bVal = Number(b.lotDetails?.pricePerM2)
      const aOrder = Number.isFinite(aVal) ? aVal : Number.POSITIVE_INFINITY
      const bOrder = Number.isFinite(bVal) ? bVal : Number.POSITIVE_INFINITY
      if (aOrder === bOrder) return String(a.code || '').localeCompare(String(b.code || ''))
      return aOrder - bOrder
    })
  }

  return list
})

const paginatedLots = computed(() => {
  if (!isPreview.value) return filteredLots.value
  const start = (lotsPage.value - 1) * lotsPerPage
  return filteredLots.value.slice(start, start + lotsPerPage)
})

const totalPages = computed(() =>
  Math.ceil((isPreview.value ? filteredLots.value.length : lotsTotal.value) / lotsPerPage)
)
const paginationMeta = computed(() => ({
  totalItems: isPreview.value ? filteredLots.value.length : lotsTotal.value,
  itemCount: paginatedLots.value.length,
  itemsPerPage: lotsPerPage,
  totalPages: totalPages.value,
  currentPage: lotsPage.value
}))

let _lotsDebounce: ReturnType<typeof setTimeout> | null = null
function scheduleLotsRefetch() {
  if (_lotsDebounce) clearTimeout(_lotsDebounce)
  _lotsDebounce = setTimeout(() => {
    lotsPage.value = 1
    fetchLots()
  }, 300)
}
watch([searchQuery, selectedFilters, matchMode, smartFilters], scheduleLotsRefetch, { deep: true })
watch(lotsPage, () => { if (!isPreview.value) fetchLots() })

function toggleFilter(tag: string) {
  lotsPage.value = 1
  const idx = selectedFilters.value.indexOf(tag)
  if (idx > -1) selectedFilters.value.splice(idx, 1)
  else selectedFilters.value.push(tag)
}

function clearFilters() {
  searchQuery.value = ''
  selectedFilters.value = []
  codesFilter.value = []
  smartFilters.value = {
    minArea: '',
    maxArea: '',
    minPrice: '',
    maxPrice: '',
    maxPricePerM2: '',
    minFrontage: '',
    minDepth: '',
    sortByLowestPricePerM2: false
  }
  lotsPage.value = 1
}

const lotPageUrl = (lot: any) => {
  const code = lot.code || lot.name || lot.id
  const base = pathPrefix.value === ''
    ? `/${encodeURIComponent(code)}`
    : `${pathPrefix.value}/${encodeURIComponent(code)}`
  return corretorCode ? `${base}${base.includes('?') ? '&' : '?'}c=${corretorCode}` : base
}

onMounted(async () => {
  try {
    const baseUrl = isPreview.value ? `/p/preview/${previewId.value}` : `/p/${projectSlug.value}`

    const initTags  = route.query.tags  ? (route.query.tags  as string).split(',') : []
    const initCodes = route.query.codes ? (route.query.codes as string).split(',') : []
    const initMatch = route.query.match === 'exact' ? 'exact' : 'any'
    const initSortByLowestPricePerM2 = route.query.sortBy === 'pricePerM2Asc'

    const toQueryNumber = (value: unknown) => {
      const text = String(value ?? '').trim()
      if (!text) return ''
      const parsed = Number(text)
      return Number.isFinite(parsed) ? String(parsed) : ''
    }

    const initMinArea = toQueryNumber(route.query.minArea)
    const initMaxArea = toQueryNumber(route.query.maxArea)
    const initMinPrice = toQueryNumber(route.query.minPrice)
    const initMaxPrice = toQueryNumber(route.query.maxPrice)
    const initMaxPricePerM2 = toQueryNumber(route.query.maxPricePerM2)
    const initMinFrontage = toQueryNumber(route.query.minFrontage)
    const initMinDepth = toQueryNumber(route.query.minDepth)

    if (initTags.length)  selectedFilters.value = initTags
    if (initCodes.length) codesFilter.value = initCodes
    if (initMatch === 'exact') matchMode.value = 'exact'
    smartFilters.value = {
      minArea: initMinArea,
      maxArea: initMaxArea,
      minPrice: initMinPrice,
      maxPrice: initMaxPrice,
      maxPricePerM2: initMaxPricePerM2,
      minFrontage: initMinFrontage,
      minDepth: initMinDepth,
      sortByLowestPricePerM2: initSortByLowestPricePerM2
    }

    const lotsParams = new URLSearchParams({ page: '1', limit: String(lotsPerPage) })
    if (initTags.length)  lotsParams.set('tags',      initTags.join(','))
    if (initCodes.length) lotsParams.set('codes',     initCodes.join(','))
    if (initMatch === 'exact') lotsParams.set('matchMode', 'exact')
    if (initMinArea) lotsParams.set('minArea', initMinArea)
    if (initMaxArea) lotsParams.set('maxArea', initMaxArea)
    if (initMinPrice) lotsParams.set('minPrice', initMinPrice)
    if (initMaxPrice) lotsParams.set('maxPrice', initMaxPrice)
    if (initMaxPricePerM2) lotsParams.set('maxPricePerM2', initMaxPricePerM2)
    if (initMinFrontage) lotsParams.set('minFrontage', initMinFrontage)
    if (initMinDepth) lotsParams.set('minDepth', initMinDepth)
    if (initSortByLowestPricePerM2) lotsParams.set('sortBy', 'pricePerM2Asc')

    const [p, lotsRes] = await Promise.allSettled([
      fetchPublic(baseUrl),
      !isPreview.value && projectSlug.value
        ? fetchPublic(`/p/${projectSlug.value}/lots?${lotsParams}`)
        : Promise.resolve(null)
    ])

    if (p.status === 'fulfilled' && p.value) {
      project.value = p.value
      chatStore.setProject(p.value)
      useHead({ title: `Busca de Unidades — ${p.value.name}` })
    } else {
      error.value = 'Projeto não encontrado'
    }

    if (lotsRes.status === 'fulfilled' && lotsRes.value) {
      lots.value = lotsRes.value.data || []
      lotsTotal.value = lotsRes.value.total || 0
      if (lotsRes.value.availableTags) availableTags.value = lotsRes.value.availableTags
    }
  } catch (e: any) {
    error.value = e.message || 'Erro ao carregar projeto'
  }

  loading.value = false
})

</script>

<style scoped>
.pub-page {
  --v4-primary: #0071e3;
  --v4-primary-hover: #0077ed;
  --v4-text: #1d1d1f;
  --v4-text-muted: #86868b;
  --v4-bg: #ffffff;
  --v4-bg-alt: #f5f5f7;
  --v4-border: #d2d2d7;
  --v4-radius-lg: 24px;
  --v4-shadow-soft: 0 4px 24px rgba(0,0,0,0.04);
  --v4-shadow-elevated: 0 20px 40px rgba(0,0,0,0.08);
  
  background: var(--v4-bg);
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.v4-container {
  width: 90%;
  max-width: 1100px;
  margin: 0 auto;
}

/* Header V4 */
.v4-header-glass {
  position: fixed;
  top: 0; left: 0; right: 0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: saturate(180%) blur(20px);
  z-index: 1000;
  border-bottom: 1px solid var(--v4-border);
  padding: 16px 0;
}

.v4-header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.v4-back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--v4-text-muted);
  text-decoration: none;
  font-weight: 500;
  font-size: 14px;
  transition: color 0.2s;
  flex-shrink: 0;
}
.v4-back-btn:hover { color: var(--v4-primary); }

.v4-header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  justify-content: flex-end;
  flex: 1;
  min-width: 0;
}
.v4-header-title strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.v4-dot { width: 4px; height: 4px; background: var(--v4-border); border-radius: 50%; }

/* Main Content Padding */
.v4-main-content {
  padding-top: 100px;
}

/* Filter Section */
.v4-filter-section {
  background: var(--v4-bg-alt);
  padding: 24px 0 20px;
  border-bottom: 1px solid var(--v4-border);
}

.v4-search-hero {
  text-align: left;
}

.v4-search-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 14px;
  margin-bottom: 10px;
}

.v4-search-title h1 { font-size: clamp(24px, 3vw, 34px); font-weight: 700; letter-spacing: -0.02em; margin-bottom: 2px; }
.v4-search-title p { font-size: 14px; color: var(--v4-text-muted); margin: 0; }

.v4-search-bar-wrapper {
  flex: 1;
  margin: 0;
}

.v4-search-bar {
  background: white;
  border: 1px solid var(--v4-border);
  border-radius: 14px;
  padding: 2px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
  transition: all 0.2s;
}
.v4-search-bar:focus-within {
  border-color: var(--v4-primary);
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.14);
}
.v4-search-bar input {
  border: none;
  flex: 1;
  min-width: 0;
  padding: 10px 0;
  font-size: 14px;
  outline: none;
  background: transparent;
}

.v4-toolbar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.v4-smart-filters-panel {
  margin: 0 0 10px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 10px;
  box-shadow: 0 8px 22px rgba(2, 19, 45, 0.05);
  overflow: hidden;
}

.v4-smart-filters-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
}

.v4-smart-filters-grid--slim {
  grid-template-columns: repeat(7, minmax(92px, 1fr));
}

.v4-smart-input {
  display: flex;
  flex-direction: column;
  gap: 3px;
  text-align: left;
  min-width: 0;
}

.v4-smart-input span {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #86868b;
}

.v4-smart-input input {
  border: 1px solid #d8dde6;
  border-radius: 10px;
  background: #fff;
  padding: 8px 9px;
  font-size: 12px;
  color: #1d1d1f;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.v4-smart-input input:focus {
  outline: none;
  border-color: #0071e3;
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.16);
}

.v4-smart-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #1d1d1f;
  font-weight: 600;
  cursor: pointer;
}

.v4-smart-toggle--pill {
  margin: 0;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px 10px;
  white-space: nowrap;
}

.v4-smart-toggle input {
  width: 14px;
  height: 14px;
}

.v4-tags-filter {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.v4-filter-label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--v4-text-muted); letter-spacing: 0.1em; }

.v4-tags-scroll {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 100%;
}

.v4-filter-tag {
  background: white;
  border: 1px solid var(--v4-border);
  padding: 8px 18px;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.v4-filter-tag:hover { border-color: var(--v4-primary); background: #f0f7ff; }
.v4-filter-tag.active { background: var(--v4-primary); color: white; border-color: var(--v4-primary); }

.v4-match-mode-toggle {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  background: #fdfdfd;
  padding: 10px;
  border-radius: 12px;
  border: 1px dashed var(--v4-border);
}
.v4-mode-label { font-size: 11px; font-weight: 700; color: #86868b; text-transform: uppercase; }
.v4-mode-btns { display: flex; gap: 8px; }
.v4-mode-btn {
  background: white;
  border: 1px solid var(--v4-border);
  padding: 6px 14px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: #86868b;
}
.v4-mode-btn.active {
  background: #0071e3;
  color: white;
  border-color: #0071e3;
}

.v4-filter-stats {
  margin-top: 0;
  font-size: 13px;
  color: var(--v4-text-muted);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  white-space: nowrap;
}
.v4-clear-btn { color: var(--v4-primary); font-weight: 600; cursor: pointer; border-bottom: 1px dashed var(--v4-primary); }

/* Results Section */
.v4-results-section {
  padding: 60px 0;
}

@media (max-width: 768px) {
  .v4-results-section { padding: 24px 0; }
}

.v4-lots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 32px;
}

@media (max-width: 768px) {
  .v4-lots-grid { 
    grid-template-columns: 1fr 1fr; 
    gap: 12px;
  }
}

/* Lot Card V2 */
.v4-lot-card-v2 {
  background: white;
  border: 1px solid #eee;
  border-radius: var(--v4-radius-lg);
  padding: 32px;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 24px;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  position: relative;
}

@media (max-width: 768px) {
  .v4-lot-card-v2 {
    padding: 16px;
    gap: 12px;
    border-radius: 16px;
  }
}

.v4-lot-card-v2:hover {
  transform: translateY(-8px);
  box-shadow: var(--v4-shadow-elevated);
  border-color: var(--v4-primary);
}

.v4-card-header { display: flex; justify-content: space-between; align-items: flex-start; }

@media (max-width: 768px) {
  .v4-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
.v4-card-id .v4-label { font-size: 10px; font-weight: 700; color: #86868b; letter-spacing: 0.1em; }

@media (max-width: 768px) {
  .v4-card-id .v4-label { font-size: 8px; }
}

.v4-card-id .v4-code { font-size: 28px; font-weight: 700; color: #1d1d1f; margin: 4px 0 0; }

@media (max-width: 768px) {
  .v4-card-id .v4-code { font-size: 18px; margin: 2px 0 0; }
}

.v4-card-status { font-size: 11px; font-weight: 700; color: #32d74b; background: rgba(50, 215, 75, 0.1); padding: 4px 12px; border-radius: 100px; }

@media (max-width: 768px) {
  .v4-card-status { 
    font-size: 8px; 
    padding: 2px 8px;
    position: static;
    align-self: flex-start;
  }
}

.v4-card-seals { display: flex; flex-wrap: wrap; gap: 6px; }

@media (max-width: 768px) {
  .v4-card-seals { gap: 4px; }
}

.v4-seal { background: #f0f7ff; color: #0071e3; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 64px; text-transform: capitalize; border: 1px solid #e0efff; }

@media (max-width: 768px) {
  .v4-seal { font-size: 9px; padding: 2px 6px; }
}

.v4-card-body { display: flex; gap: 24px; }

@media (max-width: 768px) {
  .v4-card-body { gap: 12px; flex-direction: column; }
}

.v4-metric { display: flex; flex-direction: column; }
.v4-metric .m-val { font-size: 20px; font-weight: 600; color: #1d1d1f; }

@media (max-width: 768px) {
  .v4-metric .m-val { font-size: 15px; }
}

.v4-metric .m-unit { font-size: 11px; font-weight: 600; color: #86868b; text-transform: uppercase; margin-top: 2px; }

@media (max-width: 768px) {
  .v4-metric .m-unit { font-size: 9px; }
}

.v4-card-footer {
  margin-top: auto;
  padding-top: 24px;
  border-top: 1px solid #f5f5f7;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

@media (max-width: 768px) {
  .v4-card-footer { padding-top: 12px; }
}

.v4-price .p-label { display: block; font-size: 11px; font-weight: 600; color: #86868b; margin-bottom: 2px; }

@media (max-width: 768px) {
  .v4-price .p-label { font-size: 9px; }
}

.v4-price .p-val { font-size: 20px; font-weight: 700; color: var(--v4-primary); }

@media (max-width: 768px) {
  .v4-price .p-val { font-size: 15px; }
}

.v4-cta-arrow { font-size: 13px; font-weight: 600; color: var(--v4-text-muted); display: flex; align-items: center; gap: 6px; }

@media (max-width: 768px) {
  .v4-cta-arrow { display: none; }
}

.v4-lot-card-v2:hover .v4-cta-arrow { color: var(--v4-primary); }
.v4-lot-card-v2:hover .arrow { transform: translateX(4px); transition: transform 0.2s; }

/* States */
.v4-empty-state { text-align: center; padding: 120px 0; }
.v4-empty-icon { font-size: 64px; margin-bottom: 24px; }
.v4-empty-state h3 { font-size: 24px; font-weight: 600; margin-bottom: 12px; }
.v4-empty-state p { color: var(--v4-text-muted); margin-bottom: 32px; }

.v4-results-loading { text-align: center; padding: 100px 0; color: var(--v4-text-muted); }
.loading-spinner { margin-inline: auto; margin-bottom: 16px; width: 40px; height: 40px; border: 4px solid rgba(0, 113, 227, 0.1); border-top-color: var(--v4-primary); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Pagination */
.v4-pagination-wrap { margin-top: 80px; display: flex; justify-content: center; }

@media (max-width: 768px) {
  .v4-pagination-wrap { margin-top: 40px; }
}

/* Footer */
.v4-footer-clean { padding: 60px 0; border-top: 1px solid #f2f2f2; background: #fff; }

@media (max-width: 768px) {
  .v4-footer-clean { padding: 40px 0; }
}

.v4-footer-content { display: flex; justify-content: space-between; align-items: center; color: var(--v4-text-muted); font-size: 13px; }

@media (max-width: 768px) {
  .v4-footer-content { flex-direction: column; gap: 12px; text-align: center; }
}

.v4-footer-badge { background: #000; color: #fff; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 10px; letter-spacing: 0.05em; }

@media (max-width: 768px) {
  .v4-header-inner { gap: 8px; }
  .v4-back-btn { font-size: 13px; }
  .v4-header-title { gap: 8px; font-size: 13px; }
  .v4-header-title strong { max-width: 56vw; }
  .v4-search-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
  .v4-search-title h1 { font-size: 24px; }
  .v4-search-title p { font-size: 13px; }
  .v4-smart-filters-panel { padding: 10px; border-radius: 12px; }
  .v4-toolbar-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .v4-smart-toggle--pill {
    width: 100%;
    justify-content: center;
  }
  .v4-smart-filters-grid,
  .v4-smart-filters-grid--slim { grid-template-columns: 1fr 1fr; }
  .v4-search-bar-wrapper { width: 100%; }
  .v4-tags-scroll { gap: 6px; }
  .v4-filter-section { padding: 18px 0 14px; }
  .v4-main-content { padding-top: 60px; }
  .v4-filter-stats { width: 100%; justify-content: flex-start; }
  .v4-mode-btns {
    width: 100%;
    flex-direction: column;
  }
}

@media (max-width: 560px) {
  .v4-container { width: 94%; }
  .v4-smart-filters-grid,
  .v4-smart-filters-grid--slim { grid-template-columns: 1fr; }
  .v4-smart-input span { font-size: 9px; }
  .v4-filter-tag { padding: 7px 12px; font-size: 13px; }
  .v4-lots-grid { grid-template-columns: 1fr; }
}
</style>
