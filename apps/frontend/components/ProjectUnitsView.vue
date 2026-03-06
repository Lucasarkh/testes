<template>
  <div class="pub-page">
    <!-- Header -->
    <nav class="v4-header-glass">
      <div class="v4-container">
        <div class="v4-header-inner">
          <NuxtLink :to="projectUrl" class="v4-back-btn">
            <span class="v4-icon">←</span> Ver Projeto
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
            <h1>Encontre seu lote ideal</h1>
            <p>Explore as melhores oportunidades disponíveis agora.</p>

            <div class="v4-search-bar-wrapper">
              <div class="v4-search-bar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="v4-search-icon" style="color: #86868b; margin-left: 12px; opacity: 0.7;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input 
                  v-model="searchQuery" 
                  type="text" 
                  placeholder="Busque pelo código do lote (ex: L01, QUADRA A...)" 
                  style="margin-left: 0;"
                />
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
            
            <!-- Quick Stats -->
            <div class="v4-filter-stats" v-if="!loading && project">
              <span>{{ filteredLots.length }} unidades encontradas</span>
              <span v-if="selectedFilters.length || searchQuery" class="v4-clear-btn" @click="clearFilters">Limpar filtros</span>
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
                    <span class="m-val">R$ {{ lot.lotDetails.pricePerM2.toLocaleString('pt-BR') }}</span>
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
                    <span class="p-val">R$ {{ lot.lotDetails.price.toLocaleString('pt-BR') }}</span>
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
          <span class="v4-footer-badge">SISTEMA OFICIAL</span>
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
  const host = process.client ? window.location.host : ''
  const isMainDomain = host.includes('lotio.com.br') || host.includes('localhost:3000')
  return isMainDomain ? `/${projectSlug.value}` : ''
})

const loading = ref(true)
const error = ref('')
const project = ref<any>(null)

const searchQuery = ref('')
const selectedFilters = ref<string[]>([])
const codesFilter = ref<string[]>([])
const matchMode = ref<'any' | 'exact'>('any')
const lotsPage = ref(1)
const lotsPerPage = 12

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
watch([searchQuery, selectedFilters, matchMode], scheduleLotsRefetch, { deep: true })
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

    if (initTags.length)  selectedFilters.value = initTags
    if (initCodes.length) codesFilter.value = initCodes
    if (initMatch === 'exact') matchMode.value = 'exact'

    const lotsParams = new URLSearchParams({ page: '1', limit: String(lotsPerPage) })
    if (initTags.length)  lotsParams.set('tags',      initTags.join(','))
    if (initCodes.length) lotsParams.set('codes',     initCodes.join(','))
    if (initMatch === 'exact') lotsParams.set('matchMode', 'exact')

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
}
.v4-back-btn:hover { color: var(--v4-primary); }

.v4-header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
}
.v4-dot { width: 4px; height: 4px; background: var(--v4-border); border-radius: 50%; }

/* Main Content Padding */
.v4-main-content {
  padding-top: 100px;
}

/* Filter Section */
.v4-filter-section {
  background: var(--v4-bg-alt);
  padding: 80px 0 60px;
  border-bottom: 1px solid var(--v4-border);
}

.v4-search-hero {
  text-align: center;
}
.v4-search-hero h1 { font-size: 48px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px; }
.v4-search-hero p { font-size: 21px; color: var(--v4-text-muted); margin-bottom: 40px; }

.v4-search-bar-wrapper {
  max-width: 600px;
  margin: 0 auto 32px;
}

.v4-search-bar {
  background: white;
  border: 1px solid var(--v4-border);
  border-radius: 100px;
  padding: 4px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  transition: all 0.2s;
}
.v4-search-bar:focus-within {
  border-color: var(--v4-primary);
  box-shadow: 0 8px 30px rgba(0, 113, 227, 0.1);
}
.v4-search-bar input {
  border: none;
  flex: 1;
  padding: 14px 0;
  font-size: 17px;
  outline: none;
  background: transparent;
}

.v4-tags-filter {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.v4-filter-label { font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--v4-text-muted); letter-spacing: 0.1em; }

.v4-tags-scroll {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  max-width: 800px;
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
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: #fdfdfd;
  padding: 16px;
  border-radius: 20px;
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
  margin-top: 32px;
  font-size: 14px;
  color: var(--v4-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
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
  .v4-search-hero h1 { font-size: 28px; }
  .v4-tags-scroll { padding: 0 16px; gap: 8px; }
  .v4-search-hero p { font-size: 16px; margin-bottom: 24px; }
  .v4-filter-section { padding: 60px 0 40px; }
  .v4-main-content { padding-top: 60px; }
}
</style>
