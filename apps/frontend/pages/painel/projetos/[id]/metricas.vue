<template>
  <div class="metrics-page">
    <div v-if="loading" class="loading-state"><div class="loading-spinner"></div></div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="loadData">Tentar novamente</button>
    </div>

    <template v-else>
      <div class="page-header" style="margin-bottom: 32px;">
        <div style="flex: 1;">
          <NuxtLink :to="`/painel/projetos/${projectId}`" class="btn btn-ghost btn-sm" style="padding-left: 0; margin-bottom: 8px;">
            &larr; Voltar ao Projeto
          </NuxtLink>
          <h1 style="margin: 0; font-size: 1.5rem;">Métricas e Analíticos</h1>
          <p style="margin: 0; color: var(--color-surface-400);">Desempenho e engajamento do empreendimento</p>
        </div>
      </div>

      <div class="metrics-grid">
        <!-- Lotes mais acessados -->
        <div class="card metrics-card">
          <div class="card-header">
            <h3 class="card-title">Lotes mais acessados</h3>
            <p class="card-subtitle">Top 10 unidades com mais cliques</p>
          </div>
          <div class="card-content">
            <div v-if="!lotMetrics.length" class="empty-state">Nenhum dado registrado ainda</div>
            <div v-else class="metrics-list">
              <div v-for="(m, i) in lotMetrics" :key="i" class="metrics-item">
                <div class="metrics-item-info">
                  <span class="metrics-item-label">Lote: <strong>{{ m.label }}</strong></span>
                  <div class="metrics-bar-bg">
                    <div class="metrics-bar-fill" :style="{ width: getPercentage(m._count.id, maxLotCount) + '%' }"></div>
                  </div>
                </div>
                <div class="metrics-item-value">{{ m._count.id }} <span>acessos</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Origem dos Leads (UTM Source) -->
        <div class="card metrics-card">
          <div class="card-header">
            <h3 class="card-title">Canais de Origem</h3>
            <p class="card-subtitle">De onde vêm os seus visitantes (UTM Source)</p>
          </div>
          <div class="card-content">
            <div v-if="!sourceMetrics.length" class="empty-state">Nenhuma origem identificada</div>
            <div v-else class="metrics-list">
              <div v-for="(m, i) in sourceMetrics" :key="i" class="metrics-item">
                <div class="metrics-item-info">
                  <span class="metrics-item-label">{{ m.utmSource || 'Direto / Orgânico' }}</span>
                  <div class="metrics-bar-bg">
                    <div class="metrics-bar-fill utm" :style="{ width: getPercentage(m._count.id, maxSourceCount) + '%' }"></div>
                  </div>
                </div>
                <div class="metrics-item-value">{{ m._count.id }} <span>visitas</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Corretores mais acessados -->
        <div class="card metrics-card">
          <div class="card-header">
            <h3 class="card-title">Cliques em Corretores</h3>
            <p class="card-subtitle">Engajamento por link de atendimento</p>
          </div>
          <div class="card-content">
            <div v-if="!realtorMetrics.length" class="empty-state">Nenhum clique registrado</div>
            <div v-else class="metrics-list">
              <div v-for="(m, i) in realtorMetrics" :key="i" class="metrics-item">
                <div class="metrics-item-info">
                  <span class="metrics-item-label">{{ m.label }}</span>
                  <div class="metrics-bar-bg">
                    <div class="metrics-bar-fill realtor" :style="{ width: getPercentage(m._count.id, maxRealtorCount) + '%' }"></div>
                  </div>
                </div>
                <div class="metrics-item-value">{{ m._count.id }} <span>cliques</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Páginas mais visitadas -->
        <div class="card metrics-card">
          <div class="card-header">
            <h3 class="card-title">Popularidade de Páginas</h3>
            <p class="card-subtitle">Visualizações por página (identificada)</p>
          </div>
          <div class="card-content">
            <div v-if="!pageMetrics.length" class="empty-state">Nenhum acesso registrado</div>
            <div v-else class="metrics-list">
              <div v-for="(m, i) in pageMetrics" :key="i" class="metrics-item">
                <div class="metrics-item-info">
                  <span class="metrics-item-label path" :title="m.path">{{ m.label || m.path }}</span>
                  <div class="metrics-bar-bg">
                    <div class="metrics-bar-fill page" :style="{ width: getPercentage(m.count || m._count?.id, maxPageCount) + '%' }"></div>
                  </div>
                </div>
                <div class="metrics-item-value">{{ m.count || m._count?.id }} <span>views</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const projectId = route.params.id as string
const { fetchApi } = useApi()

const loading = ref(true)
const error = ref('')

const lotMetrics = ref<any[]>([])
const realtorMetrics = ref<any[]>([])
const pageMetrics = ref<any[]>([])
const sourceMetrics = ref<any[]>([])

const maxLotCount = computed(() => Math.max(...lotMetrics.value.map(m => m.count || m._count?.id || 0), 0))
const maxRealtorCount = computed(() => Math.max(...realtorMetrics.value.map(m => m.count || m._count?.id || 0), 0))
const maxPageCount = computed(() => Math.max(...pageMetrics.value.map(m => m.count || m._count?.id || 0), 0))
const maxSourceCount = computed(() => Math.max(...sourceMetrics.value.map(m => m.count || m._count?.id || 0), 0))

function getPercentage(value: number, max: number) {
  if (max === 0) return 0
  return (value / max) * 100
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [lots, realtors, pages, sources] = await Promise.all([
      fetchApi(`/tracking/report/lots?projectId=${projectId}`),
      fetchApi(`/tracking/report/realtors?projectId=${projectId}`),
      fetchApi(`/tracking/report/pages?projectId=${projectId}`),
      fetchApi(`/tracking/report/sources?projectId=${projectId}`)
    ])
    
    lotMetrics.value = lots || []
    realtorMetrics.value = realtors || []
    pageMetrics.value = pages || []
    sourceMetrics.value = sources || []
  } catch (e: any) {
    error.value = 'Falha ao carregar métricas. ' + (e.message || '')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 24px;
}

@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}

.metrics-card {
  display: flex;
  flex-direction: column;
}

.card-header {
  margin-bottom: 24px;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-surface-50);
}

.card-subtitle {
  font-size: 0.875rem;
  color: var(--color-surface-400);
  margin: 4px 0 0;
}

.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metrics-item {
  display: flex;
  align-items: flex-end;
  gap: 16px;
}

.metrics-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metrics-item-label {
  font-size: 0.875rem;
  color: var(--color-surface-200);
}

.metrics-item-label.path {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--color-surface-400);
  word-break: break-all;
}

.metrics-bar-bg {
  height: 8px;
  background: var(--glass-bg);
  border-radius: 4px;
  overflow: hidden;
}

.metrics-bar-fill {
  height: 100%;
  background: var(--color-primary-500);
  border-radius: 4px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.metrics-bar-fill.realtor { background: #10b981; }
.metrics-bar-fill.page { background: #8b5cf6; }
.metrics-bar-fill.utm { background: #f59e0b; }

.metrics-item-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-surface-50);
  text-align: right;
  min-width: 60px;
}

.metrics-item-value span {
  display: block;
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--color-surface-400);
  text-transform: uppercase;
}

.empty-state {
  padding: 32px 0;
  text-align: center;
  color: var(--color-surface-500);
  font-style: italic;
}
</style>
