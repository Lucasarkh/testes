<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'
import { formatCents } from '@/composables/useBilling'

definePageMeta({ layout: 'default' })

const route = useRoute()
const { get, post } = useApi()
const toast = useToast()

const loading = ref(true)
const status = ref<any>(null)
const plans = ref<any>(null)
const paymentMethods = ref<any[]>([])
const invoices = ref<any[]>([])
const activeTab = ref<'planos' | 'faturas' | 'metodos'>('planos')

async function fetchAll() {
  loading.value = true
  try {
    const [s, p, pm, inv] = await Promise.all([
      get('/billing/status').catch(() => null),
      get('/billing/plans').catch(() => null),
      get('/billing/payment-methods').catch(() => []),
      get('/billing/invoices').catch(() => []),
    ])
    status.value = s
    plans.value = p
    paymentMethods.value = pm || []
    invoices.value = inv || []
  } catch (e: any) {
    toast.error(e.message)
  } finally {
    loading.value = false
  }
}

async function openPortal() {
  try {
    const res = await post('/billing/portal')
    if (res?.url) window.location.href = res.url
  } catch (e: any) {
    toast.error(e.message || 'Erro ao abrir portal')
  }
}

async function openCheckout() {
  try {
    const res = await post('/billing/checkout')
    if (res?.url) window.location.href = res.url
  } catch (e: any) {
    toast.error(e.message || 'Erro ao abrir checkout')
  }
}

async function subscribeToPlan(projectCount: number) {
  try {
    const res = await post('/billing/subscribe', { projectCount })
    if (res?.url) window.location.href = res.url
  } catch (e: any) {
    toast.error(e.message || 'Erro ao iniciar assinatura')
  }
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

const billingStatusMap: Record<string, { label: string; cls: string; icon: string }> = {
  OK: { label: 'Em dia', cls: 'status-ok', icon: '✅' },
  GRACE_PERIOD: { label: 'Pagamento pendente', cls: 'status-warning', icon: '⚠️' },
  INADIMPLENTE: { label: 'Inadimplente', cls: 'status-danger', icon: '🚫' },
  CANCELLED: { label: 'Cancelado', cls: 'status-danger', icon: '❌' },
}

const statusInfo = computed(() => {
  return billingStatusMap[status.value?.billingStatus] || billingStatusMap['OK']
})

const totalFormatted = computed(() => {
  if (!status.value) return 'R$ 0,00'
  return formatCents(status.value.totalMonthlyCents)
})

const nextDue = computed(() => {
  return formatDate(status.value?.subscription?.currentPeriodEnd)
})

const invoiceStatusMap: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Pago', cls: 'badge-success' },
  open: { label: 'Aberto', cls: 'badge-warning' },
  draft: { label: 'Rascunho', cls: 'badge-outline' },
  void: { label: 'Cancelado', cls: 'badge-error' },
  uncollectible: { label: 'Irrecuperável', cls: 'badge-error' },
}

function getPlanLabel(plan: any) {
  if (plan.isLastTier) return `${plan.projectCount} ou mais`
  if (plan.projectCount === 1) return '1 Projeto'
  return `${plan.projectCount} Projetos`
}

const trialDaysLeft = computed(() => {
  const endDate = status.value?.trialEndDate
  if (!endDate) return 0
  const diff = new Date(endDate).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)))
})

onMounted(async () => {
  // Capture state before clearing params
  const isLimitReached = route.query.limit_reached === 'true'
  const checkoutStatus = route.query.status

  // Clear query params immediately to avoid re-triggering, 
  // but keep the state in variables for the logic below
  if (isLimitReached || checkoutStatus) {
    navigateTo('/painel/assinatura', { replace: true })
  }

  // Handle toasts AFTER navigation/cleanup to ensure they survive
  if (isLimitReached) {
    setTimeout(() => {
      toast.error('Limite do plano atingido. Faça upgrade para criar novos projetos.')
    }, 100)
  }

  // After checkout return, trigger billing sync so subscription is ready
  if (checkoutStatus === 'success' || checkoutStatus === 'subscribed') {
    try {
      await post('/billing/sync')
    } catch { /* continue */ }
    
    setTimeout(() => {
      if (checkoutStatus === 'subscribed') {
        toast.success('Assinatura ativada com sucesso! Agora você pode criar seus projetos.')
      } else {
        toast.success('Forma de pagamento configurada!')
      }
    }, 100)
  }

  await fetchAll()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Minha Assinatura</h1>
        <p class="page-subtitle">Escolha o plano ideal e gerencie sua assinatura.</p>
      </div>
      <button class="btn btn-primary" @click="openPortal">
        💳 Gerenciar Pagamento
      </button>
    </div>

    <div v-if="loading" class="flex justify-center p-12">
      <div class="loader"></div>
    </div>

    <template v-else-if="status">
      <!-- Free trial banner (active) -->
      <div v-if="status.isOnFreeTier" class="alert alert-free mb-6">
        <span>🎉</span>
        <div>
          <strong>Seu primeiro mês é gratuito!</strong>
          <p class="mb-0">
            Aproveite para configurar seu loteamento. Restam <strong>{{ trialDaysLeft }}</strong> dia{{ trialDaysLeft !== 1 ? 's' : '' }} de teste.
            Para adicionar mais projetos, escolha um plano abaixo.
          </p>
        </div>
      </div>

      <!-- Trial expired banner -->
      <div v-else-if="status.trialExpired && status.requiresSubscription" class="alert alert-expired mb-6">
        <span>⏰</span>
        <div>
          <strong>Seu período de teste expirou</strong>
          <p class="mb-0">Assine um plano para continuar usando a plataforma e gerenciar seus projetos.</p>
        </div>
      </div>

      <!-- Warning Banners -->
      <div v-if="status.billingStatus === 'GRACE_PERIOD'" class="alert alert-warning mb-6">
        <span>⚠️</span>
        <div>
          <strong>Pagamento pendente</strong>
          <p class="mb-0">Regularize até <strong>{{ formatDate(status.gracePeriodEnd) }}</strong> para evitar o bloqueio.</p>
        </div>
        <button class="btn btn-sm btn-warning" @click="openPortal">Resolver agora</button>
      </div>

      <div v-if="status.billingStatus === 'INADIMPLENTE'" class="alert alert-danger mb-6">
        <span>🚫</span>
        <div>
          <strong>Acesso bloqueado por inadimplência</strong>
          <p class="mb-0">Entre em contato com o suporte ou regularize o pagamento.</p>
        </div>
        <button class="btn btn-sm btn-danger" @click="openPortal">Regularizar</button>
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid mb-8">
        <div class="summary-card">
          <div class="summary-label">Plano Atual</div>
          <div class="summary-value primary">
            <template v-if="status.isOnFreeTier">
              1 Projeto <span class="summary-trial-badge">teste</span>
            </template>
            <template v-else>
              {{ status.activeProjectCount }} {{ status.activeProjectCount === 1 ? 'Projeto' : 'Projetos' }}
            </template>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Valor Mensal</div>
          <div class="summary-value primary">
            <template v-if="status.isOnFreeTier">
              R$ 0,00 <span class="summary-trial-badge">grátis</span>
            </template>
            <template v-else>
              {{ totalFormatted }}
            </template>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-label">
            <template v-if="status.isOnFreeTier">Fim do Teste</template>
            <template v-else>Próximo Vencimento</template>
          </div>
          <div class="summary-value">
            <template v-if="status.isOnFreeTier && status.trialEndDate">
              {{ formatDate(status.trialEndDate) }}
            </template>
            <template v-else>{{ nextDue }}</template>
          </div>
        </div>
        <div class="summary-card">
          <div class="summary-label">Status</div>
          <div class="summary-value">
            <span :class="['status-badge', statusInfo?.cls]">{{ statusInfo?.icon }} {{ statusInfo?.label }}</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs mb-6">
        <button :class="['tab', { active: activeTab === 'planos' }]" @click="activeTab = 'planos'">Planos</button>
        <button :class="['tab', { active: activeTab === 'faturas' }]" @click="activeTab = 'faturas'">Faturas</button>
        <button :class="['tab', { active: activeTab === 'metodos' }]" @click="activeTab = 'metodos'">Métodos de Pagamento</button>
      </div>

      <!-- Tab: Plans (Volume Pricing) -->
      <div v-if="activeTab === 'planos'">
        <div v-if="plans && plans.plans.length > 0" class="plans-section">
          <p class="plans-subtitle">
            Todos os seus projetos compartilham o mesmo desconto por volume.
            Quanto mais projetos, menor o custo por projeto.
          </p>

          <div class="plans-grid">
            <div
              v-for="plan in plans.plans"
              :key="plan.projectCount"
              class="plan-card"
              :class="{
                'plan-current': plan.isCurrent,
                'plan-available': !plan.isCurrent && plan.projectCount > (plans.paidPlanLevel || 0),
                'plan-used': !plan.isCurrent && plan.projectCount < (plans.paidPlanLevel || 0),
              }"
            >
              <!-- Current badge -->
              <div v-if="plan.isCurrent" class="plan-badge">Plano Atual</div>

              <!-- Plan header -->
              <div class="plan-header">
                <div class="plan-slots">{{ getPlanLabel(plan) }}</div>
                <!-- Free during trial -->
                <template v-if="status.isOnFreeTier && plan.projectCount <= Math.max(status?.freeProjects || 0, 1)">
                  <div class="plan-total plan-total-free">Gratuito</div>
                  <div class="plan-trial-hint">durante o período de teste</div>
                  <div class="plan-after-trial">Depois: {{ formatCents(plan.unitPriceCents) }}/mês</div>
                </template>
                <template v-else-if="!plan.isLastTier">
                  <div class="plan-total">
                    {{ formatCents(plan.totalMonthlyCents) }}
                    <span class="plan-period">/mês</span>
                  </div>
                </template>
                <template v-else>
                  <div class="plan-total">
                    {{ formatCents(plan.unitPriceCents) }}
                    <span class="plan-period">/projeto/mês</span>
                  </div>
                </template>
              </div>

              <!-- Volume pricing info -->
              <div class="plan-breakdown">
                <!-- During trial: free tier -->
                <template v-if="status.isOnFreeTier && plan.projectCount <= Math.max(status?.freeProjects || 0, 1)">
                  <div class="plan-info-row">
                    <span class="plan-info-label">Valor por projeto</span>
                    <span class="plan-info-value price-free">R$ 0,00</span>
                  </div>
                  <div class="plan-info-row">
                    <span class="plan-info-label">Total mensal</span>
                    <span class="plan-info-value plan-info-total price-free">R$ 0,00</span>
                  </div>
                  <div class="plan-info-row plan-after-trial-row">
                    <span class="plan-info-label">Após o teste</span>
                    <span class="plan-info-value">{{ formatCents(plan.unitPriceCents) }}/mês</span>
                  </div>
                  <div class="plan-discount-badge plan-free-badge">Grátis por {{ trialDaysLeft }} dia{{ trialDaysLeft !== 1 ? 's' : '' }}</div>
                </template>
                <template v-else>
                  <div class="plan-info-row">
                    <span class="plan-info-label">Valor por projeto</span>
                    <span class="plan-info-value">{{ formatCents(plan.unitPriceCents) }}</span>
                  </div>
                  <div v-if="!plan.isLastTier" class="plan-info-row">
                    <span class="plan-info-label">Total mensal</span>
                    <span class="plan-info-value plan-info-total">{{ formatCents(plan.totalMonthlyCents) }}</span>
                  </div>
                  <div v-else class="plan-info-row">
                    <span class="plan-info-label">Total mensal</span>
                    <span class="plan-info-value plan-info-total">a partir de {{ formatCents(plan.totalMonthlyCents) }}</span>
                  </div>
                  <div v-if="plan.discountPercent > 0" class="plan-discount-badge">
                    {{ plan.discountPercent }}% de desconto
                  </div>
                </template>
              </div>

              <!-- Action -->
              <div class="plan-action">
                <template v-if="plan.isCurrent && status.isOnFreeTier && plan.projectCount <= Math.max(status?.freeProjects || 0, 1)">
                  <span class="plan-hint-free">🎉 Grátis por {{ trialDaysLeft }}d</span>
                </template>
                <template v-else-if="plan.isCurrent">
                  <span class="plan-hint-current">&#10003; Seu plano atual</span>
                </template>
                <template v-else-if="plan.projectCount > (plans.paidPlanLevel || 0)">
                  <button class="btn btn-sm btn-primary w-full" @click="subscribeToPlan(plan.projectCount)">
                    Fazer upgrade
                  </button>
                </template>
                <template v-else>
                  <span class="plan-hint-done">&#10003; Incluído</span>
                </template>
              </div>
            </div>
          </div>

          <!-- Current projects detail -->
          <div v-if="status.projects.length > 0" class="current-projects mt-8">
            <h3 class="section-subtitle">Seus projetos ativos</h3>
            <div class="projects-grid">
              <div
                v-for="proj in status.projects"
                :key="proj.projectId"
                class="project-card"
                :class="{ 'project-free': proj.isFree }"
              >
                <div class="project-info">
                  <div class="project-tier">Projeto #{{ proj.tierNumber }}</div>
                  <h4>{{ proj.projectName }}</h4>
                  <span v-if="proj.isFree" class="badge badge-success">Gratuito</span>
                  <span v-else-if="proj.discountPercent > 0" class="badge badge-accent">
                    {{ proj.discountPercent }}% desc. volume
                  </span>
                </div>
                <div class="project-price">
                  <template v-if="proj.isFree">
                    <span class="price-free">R$ 0</span>
                  </template>
                  <template v-else>
                    {{ formatCents(proj.effectivePriceCents) }}
                  </template>
                  <span class="text-sm">/mês</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <p>Nenhuma tabela de preços configurada. Entre em contato com o suporte.</p>
        </div>
      </div>

      <!-- Tab: Invoices -->
      <div v-if="activeTab === 'faturas'">
        <div class="table-wrapper" v-if="invoices.length > 0">
          <table>
            <thead>
              <tr>
                <th>Período</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Pago em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in invoices" :key="inv.id">
                <td>{{ formatDate(inv.periodStart) }} — {{ formatDate(inv.periodEnd) }}</td>
                <td>{{ formatCents(inv.amountDue) }}</td>
                <td>
                  <span class="badge" :class="invoiceStatusMap[inv.status]?.cls || 'badge-outline'">
                    {{ invoiceStatusMap[inv.status]?.label || inv.status }}
                  </span>
                </td>
                <td>{{ inv.paidAt ? formatDate(inv.paidAt) : '—' }}</td>
                <td>
                  <a v-if="inv.invoiceUrl" :href="inv.invoiceUrl" target="_blank" class="btn btn-sm btn-outline">Ver</a>
                  <a v-if="inv.invoicePdf" :href="inv.invoicePdf" target="_blank" class="btn btn-sm btn-ghost">PDF</a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">
          <p>Nenhuma fatura encontrada.</p>
        </div>
      </div>

      <!-- Tab: Payment Methods -->
      <div v-if="activeTab === 'metodos'">
        <div class="payment-methods-grid" v-if="paymentMethods.length > 0">
          <div v-for="pm in paymentMethods" :key="pm.id" class="pm-card">
            <div class="pm-brand">
              <template v-if="pm.type === 'boleto'">📄 BOLETO</template>
              <template v-else>💳 {{ pm.brand?.toUpperCase() || 'CARTÃO' }}</template>
            </div>
            <div class="pm-number" v-if="pm.type === 'card'">•••• •••• •••• {{ pm.last4 }}</div>
            <div class="pm-number" v-else-if="pm.type === 'boleto'">CPF/CNPJ •••{{ pm.last4 }}</div>
            <div class="pm-expiry" v-if="pm.expMonth && pm.expYear">{{ String(pm.expMonth).padStart(2, '0') }}/{{ pm.expYear }}</div>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>Nenhum método de pagamento salvo.</p>
          <button class="btn btn-primary mt-4" @click="openCheckout">Adicionar Cartão de Crédito</button>
          <p class="text-sm mt-2" style="color: var(--color-surface-400);">
            Boleto estará disponível como opção de pagamento nas suas faturas.
          </p>
        </div>
      </div>
    </template>

    <!-- No subscription -->
    <div v-else class="empty-state-container d-flex align-items-center justify-content-center py-5">
      <div class="card text-center p-5 rounded-5 max-w-500" style="backdrop-filter: blur(var(--glass-blur));">
        <div class="icon-blob mx-auto mb-4">💳</div>
        <h3 class="fw-bold mb-3">Assinatura não configurada</h3>
        <p class="mb-4 px-4">Sua assinatura ainda não foi configurada. Entre em contato com o suporte.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
.page-subtitle { font-size: 0.9rem; color: var(--color-surface-400); margin: 4px 0 0; }

/* ─── Summary ─────────────────────────── */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}
.summary-card {
  padding: 20px;
  border-radius: 12px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
  text-align: center;
}
.summary-label { font-size: 0.8rem; color: var(--color-surface-400); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.summary-value { font-size: 1.5rem; font-weight: 700; }
.summary-value.primary { color: var(--color-primary-400, #818cf8); }
.summary-trial-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  padding: 2px 8px;
  border-radius: 6px;
  vertical-align: middle;
  margin-left: 6px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 99px;
  font-size: 0.85rem;
  font-weight: 600;
}
.status-ok { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.status-warning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.status-danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

/* ─── Tabs ────────────────────────────── */
.tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--glass-border-subtle);
}
.tab {
  padding: 10px 20px;
  background: none;
  border: none;
  color: var(--color-surface-400);
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}
.tab:hover { color: var(--color-surface-200); }
.tab.active {
  color: var(--color-primary-400, #818cf8);
  border-bottom-color: var(--color-primary-400, #818cf8);
}

/* ─── Plans ───────────────────────────── */
.plans-section {}
.plans-subtitle {
  font-size: 0.9rem;
  color: var(--color-surface-300);
  margin-bottom: 24px;
  line-height: 1.5;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.plan-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: var(--glass-bg);
  border: 2px solid var(--glass-border-subtle);
  padding: 24px 20px 20px;
  transition: all 0.25s ease;
}
.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
}

.plan-current {
  border-color: var(--color-primary-400, #818cf8);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.04) 100%);
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.2);
}

.plan-used {
  opacity: 0.7;
}

/* Plan badge */
.plan-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-primary-500, #6366f1);
  color: white;
  padding: 4px 16px;
  border-radius: 99px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  white-space: nowrap;
}

/* Plan header */
.plan-header {
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--glass-border-subtle);
}
.plan-slots {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 8px;
}
.plan-total {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-primary-300, #a5b4fc);
}
.plan-period {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--color-surface-400);
}

/* Plan breakdown — volume info */
.plan-breakdown {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.plan-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}
.plan-info-label {
  color: var(--color-surface-400);
}
.plan-info-value {
  font-weight: 600;
  color: var(--color-surface-200);
}
.plan-info-total {
  color: var(--color-primary-300, #a5b4fc);
}
.plan-discount-badge {
  display: inline-block;
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  text-align: center;
  margin-top: 4px;
}

/* Plan action area */
.plan-action {
  text-align: center;
}
.plan-hint-current {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-primary-400, #818cf8);
}
.plan-hint-done {
  font-size: 0.85rem;
  font-weight: 500;
  color: #10b981;
}
.plan-hint-free {
  font-size: 0.85rem;
  font-weight: 600;
  color: #10b981;
}
.plan-total-free {
  color: #10b981 !important;
}
.plan-trial-hint {
  font-size: 0.75rem;
  color: rgba(16, 185, 129, 0.7);
  margin-top: 2px;
}
.plan-after-trial {
  font-size: 0.75rem;
  color: var(--color-surface-400);
  margin-top: 4px;
  font-style: italic;
}
.plan-after-trial-row .plan-info-label,
.plan-after-trial-row .plan-info-value {
  color: var(--color-surface-400);
  font-style: italic;
  font-size: 0.8rem;
}
.plan-free-badge {
  background: rgba(16, 185, 129, 0.18);
  color: #10b981;
}
.w-full { width: 100%; }

/* ─── Section subtitle ────────────────── */
.section-subtitle {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--color-surface-200);
}

/* ─── Current Projects ────────────────── */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.project-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 12px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
  border-left: 4px solid var(--color-primary-500);
  transition: all 0.2s;
}
.project-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
.project-card.project-free { border-left-color: #10b981; }
.project-info { flex: 1; }
.project-tier { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: var(--color-surface-400); margin-bottom: 2px; }
.project-info h4 { margin: 0 0 4px; font-size: 0.95rem; font-weight: 600; }
.project-price { font-weight: 700; font-size: 1rem; text-align: right; white-space: nowrap; }
.project-price .text-sm { font-size: 0.75rem; color: var(--color-surface-400); font-weight: 400; }
.price-free { color: #10b981; }

/* ─── Payment Methods ─────────────────── */
.payment-methods-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.pm-card {
  padding: 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--color-surface-800) 0%, var(--color-surface-700) 100%);
  border: 1px solid var(--glass-border);
}
.pm-brand { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--color-primary-400); margin-bottom: 16px; }
.pm-number { font-size: 1.1rem; font-weight: 600; letter-spacing: 2px; margin-bottom: 8px; }
.pm-expiry { font-size: 0.85rem; color: var(--color-surface-400); }

/* ─── Alerts ──────────────────────────── */
.alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 12px;
}
.alert p { margin: 4px 0 0; font-size: 0.85rem; }
.alert-free { background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; }
.alert-expired { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.4); color: #fbbf24; }
.alert-warning { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); color: #fbbf24; }
.alert-danger { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; }
.btn-warning { background: #f59e0b; color: #1a1a2e; }
.btn-danger { background: #ef4444; color: white; }

/* ─── Misc ────────────────────────────── */
.empty-state { text-align: center; padding: 40px; color: var(--color-surface-400); }
.badge-accent { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }
.badge-success { background: #10b981; color: white; }
.badge-warning { background: #f59e0b; color: #1a1a2e; }
.badge-error { background: #ef4444; color: white; }
.badge-outline { border: 1px solid var(--glass-border); background: transparent; }
.mb-0 { margin-bottom: 0; }
.mb-6 { margin-bottom: 24px; }
.mb-8 { margin-bottom: 32px; }
.mt-4 { margin-top: 16px; }
.mt-8 { margin-top: 32px; }
.text-sm { font-size: 0.85rem; }
</style>
