<script setup lang="ts">
const route = useRoute()
const { get, post, delete: del } = useApi()
const toast = useToast()

const campaignId = route.params.id as string
const loading = ref(true)
const performance = ref<any>(null)
const campaign = ref<any>(null)

const investmentForm = ref({
  amount: 0,
  date: getTodayInBrasilia(),
  notes: ''
})

const dateFilter = ref({
  startDate: '', // Default to last 30 days or similar? Empty = All time
  endDate: ''
})

async function fetchPerformance() {
  loading.value = true
  try {
    const [perfData, campData] = await Promise.all([
      get(`/campaigns/${campaignId}/performance`, { params: dateFilter.value }),
      get(`/campaigns/${campaignId}`)
    ])
    performance.value = perfData
    campaign.value = campData
  } catch (error) {
    console.error('Error fetching performance:', error)
    toast.error('Erro ao carregar performance')
  } finally {
    loading.value = false
  }
}

async function addInvestment() {
  if (investmentForm.value.amount <= 0) {
    toast.error('Informe um valor válido')
    return
  }
  try {
    await post(`/campaigns/${campaignId}/investments`, investmentForm.value)
    toast.success('Investimento registrado!')
    investmentForm.value = {
      amount: 0,
      date: getTodayInBrasilia(),
      notes: ''
    }
    fetchPerformance()
  } catch (error) {
    toast.error('Erro ao registrar investimento')
  }
}

async function removeInvestment(id: string) {
  if (!confirm('Excluir este registro de investimento?')) return
  try {
    await del(`/campaigns/${campaignId}/investments/${id}`)
    toast.success('Removido')
    fetchPerformance()
  } catch (error) {
    toast.error('Erro ao remover')
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatPercent(value: number) {
  return (value || 0).toFixed(1) + '%'
}

function getMax(type: 'sessions' | 'leads') {
  if (!performance.value?.dailyStats?.length) return 1;
  const max = Math.max(...performance.value.dailyStats.map((d: any) => d[type]));
  return max || 1;
}

function getBarHeight(value: number, type: 'sessions' | 'leads') {
  const max = getMax(type);
  const maxHeight = 100; // px
  return (value / max) * maxHeight + 'px';
}

onMounted(fetchPerformance)

definePageMeta({
  layout: 'default'
})
</script>

<template>
  <div class="page-container">
    <div v-if="loading && !performance" class="loading">Carregando...</div>
    
    <div v-else-if="campaign && performance" class="dashboard">
      <div class="header">
        <div class="breadcrumb">
          <NuxtLink to="/painel/campanhas" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
            Voltar para Campanhas
          </NuxtLink>
          <h1>{{ campaign.name }}</h1>
          <p class="subtitle">{{ campaign.project?.name }} • {{ campaign.utmSource }} / {{ campaign.utmMedium || '-' }}</p>
        </div>
        
        <div class="filters">
          <div class="form-group row-inline">
            <input type="date" v-model="dateFilter.startDate" class="form-input" @change="fetchPerformance" />
            <span>até</span>
            <input type="date" v-model="dateFilter.endDate" class="form-input" @change="fetchPerformance" />
          </div>
        </div>
      </div>

      <!-- Overview Cards -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Investimento Total</div>
          <div class="metric-value">{{ formatCurrency(performance.metrics.totalSpent) }}</div>
          <div class="metric-footer" v-if="campaign.budget">
            Meta: {{ formatCurrency(campaign.budget) }} ({{ formatPercent((performance.metrics.totalSpent / campaign.budget) * 100) }})
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-label">Total de Leads</div>
          <div class="metric-value">{{ performance.metrics.totalLeads }}</div>
          <div class="metric-footer">Conversão: {{ formatPercent(performance.metrics.conversionRate) }}</div>
        </div>

        <div class="metric-card primary">
          <div class="metric-label">Custo por Lead (CPL)</div>
          <div class="metric-value">{{ formatCurrency(performance.metrics.costPerLead) }}</div>
          <div class="metric-footer">Visitantes: {{ performance.metrics.totalSessions }}</div>
        </div>

        <div class="metric-card success">
          <div class="metric-label">Vendas Realizadas</div>
          <div class="metric-value">{{ performance.metrics.totalWonLeads }}</div>
          <div class="metric-footer">Tx. Venda: {{ formatPercent(performance.metrics.salesConversionRate) }}</div>
        </div>

        <div class="metric-card royal">
          <div class="metric-label">ROI da Campanha</div>
          <div class="metric-value" :class="{ 'negative': performance.metrics.roi < 0 }">
            {{ formatPercent(performance.metrics.roi) }}
          </div>
          <div class="metric-footer">Retorno: {{ formatCurrency(performance.metrics.totalRevenue) }}</div>
        </div>
      </div>

      <div class="main-content">
        <div class="content-left">
          <!-- TODO: Add Chart here using a simple SVG chart or similar -->
          <div class="chart-container card">
            <h2>Histórico da Campanha</h2>
            <div class="simple-chart" v-if="performance.dailyStats.length > 0">
              <div v-for="day in performance.dailyStats.slice(-15)" :key="day.date" class="chart-column">
                <div class="bar-group">
                  <div class="bar sessions" :style="{ height: getBarHeight(day.sessions, 'sessions') }" :title="'Sessões: ' + day.sessions"></div>
                  <div class="bar leads" :style="{ height: getBarHeight(day.leads, 'leads') }" :title="'Leads: ' + day.leads"></div>
                </div>
                <span class="day-label">{{ day.date.split('-')[2] }}</span>
              </div>
            </div>
            <div v-else class="empty-state">Sem dados para o período</div>
            <div class="chart-legend" v-if="performance.dailyStats.length > 0">
              <span class="legend-item"><span class="dot sessions"></span> Sessões</span>
              <span class="legend-item"><span class="dot leads"></span> Leads</span>
            </div>
          </div>
        </div>

        <div class="content-right">
          <!-- Investments List -->
           <div class="card investments-card">
             <div class="card-header">
               <h2>Registrar Investimento</h2>
             </div>
             <form @submit.prevent="addInvestment" class="investment-form">
               <div class="form-group">
                 <label>Valor</label>
                 <div class="input-with-prefix">
                   <span class="prefix">R$</span>
                   <input type="number" step="0.01" v-model="investmentForm.amount" class="form-input" required />
                 </div>
               </div>
               <div class="form-group mt-2">
                 <label>Data</label>
                 <input type="date" v-model="investmentForm.date" class="form-input" required />
               </div>
               <div class="form-group mt-2">
                 <label>Observação (Opcional)</label>
                 <input type="text" v-model="investmentForm.notes" class="form-input" placeholder="Ex: Patrocinado Março" />
               </div>
               <button type="submit" class="btn btn-primary w-full mt-4">Adicionar</button>
             </form>

             <div class="investments-list mt-6">
               <h3 class="mb-4">Histórico Recente</h3>
               <div v-if="performance.investments.length === 0" class="empty-mini">Nenhum investimento registrado</div>
               <div v-for="inv in performance.investments" :key="inv.id" class="investment-item">
                 <div class="inv-info">
                   <span class="inv-date">{{ formatDateToBrasilia(inv.date) }}</span>
                   <span class="inv-amount">{{ formatCurrency(inv.amount) }}</span>
                 </div>
                 <button class="btn-icon text-danger" @click="removeInvestment(inv.id)">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                 </button>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-surface-400);
  font-size: 0.875rem;
  margin-bottom: 8px;
  text-decoration: none;
}

.back-link:hover {
  color: var(--color-primary-500);
}

.subtitle {
  color: var(--color-surface-400);
  margin-top: 4px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.metric-card {
  background: var(--glass-bg);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--glass-border-subtle);
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.metric-card.primary { border-top: 4px solid var(--color-primary-500); }
.metric-card.success { border-top: 4px solid var(--color-success); }
.metric-card.royal { border-top: 4px solid #7c3aed; }

.metric-label {
  font-size: 0.75rem;
  color: var(--color-surface-400);
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-surface-50);
}

.metric-value.negative {
  color: var(--color-danger);
}

.metric-footer {
  margin-top: 8px;
  font-size: 0.75rem;
  color: var(--color-surface-500);
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
}

.card {
  background: var(--glass-bg);
  border-radius: 12px;
  border: 1px solid var(--glass-border-subtle);
  padding: 24px;
}

.chart-container {
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.chart-container h2 {
  font-size: 1.125rem;
  margin-bottom: 24px;
}

.simple-chart {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 2rem 0;
  border-bottom: 1px solid var(--glass-border-subtle);
}

.chart-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.bar-group {
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.bar {
  width: 12px;
  border-radius: 4px 4px 0 0;
  min-height: 2px;
}

.bar.sessions { background: rgba(16, 185, 129, 0.1); background-color: #3b82f633; border: 1px solid var(--color-primary-500); }
.bar.leads { background: rgba(16, 185, 129, 0.1); background-color: #10b98133; border: 1px solid var(--color-success); }

.day-label {
  font-size: 0.625rem;
  color: var(--color-surface-500);
}

.chart-legend {
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-surface-400);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot.sessions { background: var(--color-primary-500); }
.dot.leads { background: var(--color-success); }

.investment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--glass-border-subtle);
}

.inv-info {
  display: flex;
  flex-direction: column;
}

.inv-date {
  font-size: 0.75rem;
  color: var(--color-surface-500);
}

.inv-amount {
  font-weight: 600;
  color: var(--color-surface-200);
}

.empty-mini {
  padding: 1rem;
  text-align: center;
  color: var(--color-surface-500);
  font-size: 0.875rem;
  background: var(--glass-bg-heavy);
  border-radius: 8px;
}

.input-with-prefix {
  display: flex;
  align-items: center;
  position: relative;
}

.input-with-prefix .prefix {
  position: absolute;
  left: 0.75rem;
  color: var(--color-surface-500);
  font-weight: 500;
  pointer-events: none;
}

.input-with-prefix input {
  padding-left: 2.25rem;
}

.w-full { width: 100%; }
.mt-2 { margin-top: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 1.5rem; }
.mb-4 { margin-bottom: 1rem; }

.row-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-surface-400);
  font-size: 0.875rem;
}
</style>
