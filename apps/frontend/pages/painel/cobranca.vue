<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

definePageMeta({ layout: 'default' })

const { get, post, put, delete: del } = useApi()
const toast = useToast()

// ─── State ────────────────────────────────────────────
const loading = ref(true)
const tenants = ref<any[]>([])
const pricingTables = ref<any[]>([])
const selectedTenant = ref<any>(null)
const showPricingTableModal = ref(false)
const showAssignModal = ref(false)
const showAnchorModal = ref(false)
const showLimitsModal = ref(false)
const showTrialModal = ref(false)
const saving = ref(false)

// ─── Pricing Table form (volume pricing) ──────────────
const pricingTableForm = ref({
  id: null as string | null,
  name: '',
  description: '',
  basePriceReais: '',
  volumeTiers: [] as { projectNumber: number; discountPercent: number }[],
})

// ─── Assign Pricing Table form ────────────────────────
const assignForm = ref({
  pricingTableId: '',
  discountPercent: 0,
  freeProjects: 0,
})

// ─── Billing Anchor ──────────────────────────────────
const billingDay = ref<number | null>(null)

// ─── Trial Control ──────────────────────────────────
const trialForm = ref({
  trialMonths: 1,
})

// ─── Tenant Limits (read-only view) ──────────────────
const tenantLimits = ref<any>(null)

// ─── Fetch Data ───────────────────────────────────────
async function fetchData() {
  loading.value = true
  try {
    const [tenantsRes, tablesRes] = await Promise.all([
      get('/tenants').catch(() => []),
      get('/billing/admin/pricing-tables').catch(() => []),
    ])
    tenants.value = Array.isArray(tenantsRes) ? tenantsRes : tenantsRes?.data || []
    pricingTables.value = tablesRes || []
  } catch (e: any) {
    toast.error('Erro ao carregar dados: ' + e.message)
  } finally {
    loading.value = false
  }
}

// ─── Pricing Table CRUD ──────────────────────────────
function openPricingTableModal(table?: any) {
  if (table && table.tiers?.length > 0) {
    const sorted = [...table.tiers].sort((a: any, b: any) => a.projectNumber - b.projectNumber)
    const baseCents = sorted[0].priceCents
    pricingTableForm.value = {
      id: table.id,
      name: table.name,
      description: table.description || '',
      basePriceReais: (baseCents / 100).toFixed(2),
      volumeTiers: sorted.slice(1).map((t: any) => ({
        projectNumber: t.projectNumber,
        discountPercent: baseCents > 0 ? Math.round((1 - t.priceCents / baseCents) * 100) : 0,
      })),
    }
  } else {
    pricingTableForm.value = {
      id: null,
      name: '',
      description: '',
      basePriceReais: '',
      volumeTiers: [{ projectNumber: 2, discountPercent: 10 }],
    }
  }
  showPricingTableModal.value = true
}

function addVolumeTier() {
  const last = pricingTableForm.value.volumeTiers[pricingTableForm.value.volumeTiers.length - 1]
  pricingTableForm.value.volumeTiers.push({
    projectNumber: (last?.projectNumber || 1) + 1,
    discountPercent: 0,
  })
}

function removeVolumeTier(idx: number) {
  pricingTableForm.value.volumeTiers.splice(idx, 1)
}

async function savePricingTable() {
  saving.value = true
  try {
    const baseCents = Math.round(Number(pricingTableForm.value.basePriceReais) * 100)
    if (isNaN(baseCents) || baseCents <= 0) {
      toast.error('Preencha o preço base por projeto corretamente.')
      saving.value = false
      return
    }

    const tiers = [
      { projectNumber: 1, priceCents: baseCents },
      ...pricingTableForm.value.volumeTiers.map((vt) => ({
        projectNumber: Number(vt.projectNumber),
        priceCents: Math.round(baseCents * (1 - (vt.discountPercent || 0) / 100)),
      })),
    ]

    if (tiers.some((t) => isNaN(t.priceCents) || t.priceCents < 0)) {
      toast.error('Valores inválidos nos tiers.')
      saving.value = false
      return
    }

    await post('/billing/admin/pricing-tables', {
      id: pricingTableForm.value.id || undefined,
      name: pricingTableForm.value.name,
      description: pricingTableForm.value.description || undefined,
      tiers,
    })
    toast.success('Tabela de preços salva')
    showPricingTableModal.value = false
    await fetchData()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao salvar tabela')
  } finally {
    saving.value = false
  }
}

async function deletePricingTable(tableId: string) {
  if (!confirm('Excluir esta tabela de preços?')) return
  try {
    await del(`/billing/admin/pricing-tables/${tableId}`)
    toast.success('Tabela de preços excluída')
    await fetchData()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao excluir tabela')
  }
}

// ─── Assign Pricing Table to Tenant ──────────────────
function openAssignModal(tenant: any) {
  selectedTenant.value = tenant
  assignForm.value = {
    pricingTableId: tenant.pricingTableId || '',
    discountPercent: tenant.discountPercent || 0,
    freeProjects: tenant.freeProjects ?? 0,
  }
  showAssignModal.value = true
}

async function saveAssign() {
  if (!selectedTenant.value || !assignForm.value.pricingTableId) return
  saving.value = true
  try {
    await put(`/billing/admin/tenants/${selectedTenant.value.id}/pricing-table`, {
      pricingTableId: assignForm.value.pricingTableId,
      discountPercent: Number(assignForm.value.discountPercent) || 0,
      freeProjects: Number(assignForm.value.freeProjects) || 0,
    })
    toast.success(`Tabela de preços atribuída para ${selectedTenant.value.name}`)
    showAssignModal.value = false
    await fetchData()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao atribuir tabela')
  } finally {
    saving.value = false
  }
}

// ─── Tenant Project Limits ───────────────────────────
async function openLimitsModal(tenant: any) {
  selectedTenant.value = tenant
  tenantLimits.value = null
  showLimitsModal.value = true
  try {
    tenantLimits.value = await get(`/billing/admin/tenants/${tenant.id}/project-limits`)
  } catch (e: any) {
    toast.error(e.message || 'Erro ao buscar limites')
  }
}

// ─── Sync Subscription ──────────────────────────────
async function syncSubscription(tenant: any) {
  try {
    await post(`/billing/admin/tenants/${tenant.id}/sync-subscription`)
    toast.success(`Assinatura sincronizada para ${tenant.name}`)
  } catch (e: any) {
    toast.error(e.message || 'Erro ao sincronizar')
  }
}

// ─── Billing Anchor ───────────────────────────────────
function openAnchorModal(tenant: any) {
  selectedTenant.value = tenant
  billingDay.value = tenant.subscriptions?.[0]?.billingDay ?? null
  showAnchorModal.value = true
}

async function saveAnchor() {
  if (!selectedTenant.value || !billingDay.value) return
  saving.value = true
  try {
    await put(`/billing/admin/tenants/${selectedTenant.value.id}/billing-anchor`, {
      billingDay: Number(billingDay.value),
    })
    toast.success('Dia de vencimento atualizado')
    showAnchorModal.value = false
    await fetchData()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao salvar')
  } finally {
    saving.value = false
  }
}

function openTrialModal(tenant: any) {
  selectedTenant.value = tenant
  trialForm.value = {
    trialMonths: Number(tenant?.trialMonths || 1),
  }
  showTrialModal.value = true
}

async function saveTrial() {
  if (!selectedTenant.value) return
  saving.value = true
  try {
    await put(`/billing/admin/tenants/${selectedTenant.value.id}/trial`, {
      trialMonths: Number(trialForm.value.trialMonths),
    })
    toast.success(`Período de teste atualizado para ${selectedTenant.value.name}`)
    showTrialModal.value = false
    await fetchData()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao configurar período de teste')
  } finally {
    saving.value = false
  }
}

async function interruptTrial(tenant: any) {
  if (!confirm(`Interromper o período de teste de ${tenant.name} agora?`)) return
  try {
    await post(`/billing/admin/tenants/${tenant.id}/trial/interrupt`)
    toast.success(`Período de teste interrompido para ${tenant.name}`)
    await fetchData()
  } catch (e: any) {
    toast.error(e.message || 'Erro ao interromper período de teste')
  }
}

// ─── Fix Payment Methods (for existing subscriptions) ─
async function fixPaymentMethods(tenant: any) {
  try {
    await post(`/billing/admin/tenants/${tenant.id}/fix-payment-methods`)
    toast.success(`Métodos de pagamento corrigidos para ${tenant.name} (boleto habilitado)`)
  } catch (e: any) {
    toast.error(e.message || 'Erro ao corrigir métodos de pagamento')
  }
}

// ─── Helpers ──────────────────────────────────────────
function formatCents(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function addMonths(dateStr: string, months: number) {
  const dt = new Date(dateStr)
  dt.setMonth(dt.getMonth() + Math.max(1, Number(months || 1)))
  return dt
}

function getTrialMeta(tenant: any) {
  const startedAt = tenant?.trialStartedAt
  if (!startedAt) {
    return {
      configured: false,
      active: false,
      endDate: null as Date | null,
    }
  }

  const interrupted = !!tenant?.trialInterruptedAt
  const endDate = addMonths(startedAt, tenant?.trialMonths || 1)
  const active = !interrupted && endDate.getTime() > Date.now()

  return {
    configured: true,
    active,
    endDate,
  }
}

function formatTrialEndDate(tenant: any) {
  const meta = getTrialMeta(tenant)
  if (!meta.endDate) return '—'
  return meta.endDate.toLocaleDateString('pt-BR')
}

function getTenantPricingTableName(tenant: any) {
  if (!tenant.pricingTableId) return '—'
  const table = pricingTables.value.find((t: any) => t.id === tenant.pricingTableId)
  return table?.name || '—'
}

const assignVolumePreview = computed(() => {
  const table = pricingTables.value.find((t: any) => t.id === assignForm.value.pricingTableId)
  if (!table?.tiers?.length) return []
  const sorted = [...table.tiers].sort((a: any, b: any) => a.projectNumber - b.projectNumber)
  const baseCents = sorted[0]?.priceCents || 0
  const addDiscount = assignForm.value.discountPercent || 0
  const freeProjects = assignForm.value.freeProjects || 0

  return sorted.map((t: any, idx: number) => {
    let unitCents = t.priceCents
    if (addDiscount > 0) {
      unitCents = Math.round(unitCents * (1 - addDiscount / 100))
    }
    const isFree = t.projectNumber <= freeProjects
    const paidCount = isFree ? 0 : Math.max(0, t.projectNumber - freeProjects)
    return {
      projectNumber: t.projectNumber,
      unitPriceCents: isFree ? 0 : unitCents,
      totalCents: paidCount * unitCents,
      volumeDiscount: baseCents > 0 ? Math.round((1 - t.priceCents / baseCents) * 100) : 0,
      isFree,
      isLast: idx === sorted.length - 1,
    }
  })
})

/** Computed volume pricing preview for the pricing table form */
const volumePreview = computed(() => {
  const base = Number(pricingTableForm.value.basePriceReais)
  if (!base || base <= 0) return []
  const baseCents = Math.round(base * 100)
  const allTiers = [
    { projectNumber: 1, discountPercent: 0 },
    ...pricingTableForm.value.volumeTiers,
  ]
  return allTiers.map((t, idx) => {
    const unitCents = Math.round(baseCents * (1 - (t.discountPercent || 0) / 100))
    return {
      projectNumber: t.projectNumber,
      unitPriceCents: unitCents,
      totalCents: t.projectNumber * unitCents,
      discountPercent: t.discountPercent || 0,
      isLast: idx === allTiers.length - 1,
    }
  })
})

/** Build volume pricing info from a pricing table for card display */
function computeVolumeTiers(table: any) {
  if (!table?.tiers?.length) return []
  const sorted = [...table.tiers].sort((a: any, b: any) => a.projectNumber - b.projectNumber)
  const baseCents = sorted[0]?.priceCents || 0
  return sorted.map((t: any, idx: number) => ({
    projectNumber: t.projectNumber,
    unitPriceCents: t.priceCents,
    totalCents: t.projectNumber * t.priceCents,
    discountPercent: baseCents > 0 ? Math.round((1 - t.priceCents / baseCents) * 100) : 0,
    isLast: idx === sorted.length - 1,
  }))
}

const billingStatusLabel: Record<string, { label: string; cls: string }> = {
  OK: { label: 'Em dia', cls: 'badge-success' },
  GRACE_PERIOD: { label: 'Pendente', cls: 'badge-warning' },
  INADIMPLENTE: { label: 'Inadimplente', cls: 'badge-error' },
  CANCELLED: { label: 'Cancelado', cls: 'badge-error' },
}

onMounted(fetchData)
</script>

<template>
  <div class="page-container">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Cobrança por Projeto</h1>
        <p class="page-subtitle">Gerencie tabelas de preço e assinaturas de cada loteadora.</p>
      </div>
      <button class="btn btn-primary" @click="openPricingTableModal()">
        + Nova Tabela de Preço
      </button>
    </div>

    <div v-if="loading" class="flex justify-center p-12">
      <div class="loader"></div>
    </div>

    <template v-else>
      <!-- Pricing Tables Section -->
      <section class="mb-8">
        <h2 class="section-title">Tabelas de Preço (Desconto por Volume)</h2>
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));">
          <div v-for="table in pricingTables" :key="table.id" class="card pricing-table-card">
            <div class="flex justify-between items-start mb-3">
              <div>
                <h4 class="fw-bold mb-1"><i class="bi bi-clipboard-check" aria-hidden="true"></i> {{ table.name }}</h4>
                <span v-if="table.isDefault" class="badge badge-accent">Padrão</span>
              </div>
              <div class="flex gap-2">
                <button class="btn btn-sm btn-outline" @click="openPricingTableModal(table)"><i class="bi bi-pencil-fill" aria-hidden="true"></i></button>
                <button class="btn btn-sm btn-ghost" style="color: #ef4444;" @click="deletePricingTable(table.id)"><i class="bi bi-trash3-fill" aria-hidden="true"></i></button>
              </div>
            </div>
            <p v-if="table.description" class="text-sm mb-3" style="color: var(--color-surface-400);">{{ table.description }}</p>

            <!-- Volume pricing table -->
            <div class="volume-table">
              <div class="volume-row volume-header">
                <span class="vol-col-qty">Quantidade</span>
                <span class="vol-col-unit">Valor/Projeto</span>
                <span class="vol-col-total">Total Mensal</span>
                <span class="vol-col-disc">Desconto</span>
              </div>
              <div
                v-for="tier in computeVolumeTiers(table)"
                :key="tier.projectNumber"
                class="volume-row"
              >
                <span class="vol-col-qty fw-bold">{{ tier.projectNumber }}{{ tier.isLast ? ' ou mais' : '' }}</span>
                <span class="vol-col-unit">{{ formatCents(tier.unitPriceCents) }}</span>
                <span class="vol-col-total">{{ formatCents(tier.totalCents) }}{{ tier.isLast ? '+' : '' }}</span>
                <span class="vol-col-disc" :class="{ 'discount-active': tier.discountPercent > 0 }">
                  {{ tier.discountPercent > 0 ? `${tier.discountPercent}%` : '—' }}
                </span>
              </div>
            </div>

            <div class="text-sm mt-2" style="color: var(--color-surface-500);">
              {{ (table._count?.tenants || 0) }} loteadora(s) usando
            </div>
          </div>
        </div>
        <div v-if="pricingTables.length === 0" class="empty-hint">
          Nenhuma tabela de preço cadastrada. Clique em "+ Nova Tabela de Preço" para começar.
        </div>
      </section>

      <!-- Tenants Billing Table -->
      <section>
        <h2 class="section-title">Assinaturas por Loteadora</h2>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Loteadora</th>
                <th>Tabela de Preço</th>
                <th>Desc. Adicional / Grátis</th>
                <th>Período de Teste</th>
                <th>Status</th>
                <th>Stripe</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in tenants" :key="t.id">
                <td>
                  <div style="font-weight: 600;">{{ t.name }}</div>
                  <div class="text-sm" style="color: var(--color-surface-400);">{{ t.slug }}</div>
                </td>
                <td>
                  <span v-if="t.pricingTableId" class="badge badge-accent">
                    {{ getTenantPricingTableName(t) }}
                  </span>
                  <span v-else class="text-sm" style="color: var(--color-surface-400);">Auto (padrão)</span>
                </td>
                <td>
                  <div class="flex gap-2 flex-wrap">
                    <span v-if="t.discountPercent > 0" class="badge badge-success">
                      -{{ t.discountPercent }}% add.
                    </span>
                    <span v-if="t.freeProjects > 0" class="badge badge-outline">
                      {{ t.freeProjects }} grátis
                    </span>
                    <span v-if="!t.discountPercent && !t.freeProjects" class="text-sm" style="color: var(--color-surface-400);">—</span>
                  </div>
                </td>
                <td>
                  <div class="flex gap-2 flex-wrap" style="align-items: center;">
                    <span v-if="getTrialMeta(t).active" class="badge badge-success">
                      Ativo ({{ t.trialMonths || 1 }}m)
                    </span>
                    <span v-else-if="t.trialInterruptedAt" class="badge badge-warning">
                      Interrompido
                    </span>
                    <span v-else-if="t.trialStartedAt" class="badge badge-outline">
                      Encerrado
                    </span>
                    <span v-else class="text-sm" style="color: var(--color-surface-400);">Não iniciado</span>
                    <div v-if="t.trialStartedAt" class="text-xs" style="color: var(--color-surface-500); width: 100%;">
                      Fim previsto: {{ formatTrialEndDate(t) }}
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge" :class="billingStatusLabel[t.billingStatus]?.cls || 'badge-outline'">
                    {{ billingStatusLabel[t.billingStatus]?.label || t.billingStatus || 'OK' }}
                  </span>
                </td>
                <td>
                  <code v-if="t.stripeCustomerId" class="text-sm">{{ t.stripeCustomerId }}</code>
                  <span v-else class="text-sm" style="color: var(--color-surface-400);">—</span>
                </td>
                <td>
                  <div class="flex gap-2 flex-wrap">
                    <button class="btn btn-sm btn-primary" @click="openAssignModal(t)" title="Atribuir tabela de preço">
                      <i class="bi bi-clipboard-check" aria-hidden="true"></i> Tabela
                    </button>
                    <button class="btn btn-sm btn-outline" @click="openLimitsModal(t)" title="Ver limites de projeto">
                      <i class="bi bi-bar-chart-line-fill" aria-hidden="true"></i> Limites
                    </button>
                    <button class="btn btn-sm btn-outline" @click="openAnchorModal(t)" title="Definir vencimento">
                      <i class="bi bi-calendar-event-fill" aria-hidden="true"></i> Vencimento
                    </button>
                    <button class="btn btn-sm btn-outline" @click="openTrialModal(t)" title="Definir período de teste">
                      <i class="bi bi-hourglass-split" aria-hidden="true"></i> Teste
                    </button>
                    <button
                      v-if="getTrialMeta(t).active"
                      class="btn btn-sm btn-ghost"
                      style="color: #f59e0b;"
                      @click="interruptTrial(t)"
                      title="Interromper período de teste imediatamente"
                    >
                      <i class="bi bi-stop-circle-fill" aria-hidden="true"></i> Interromper
                    </button>
                    <button class="btn btn-sm btn-accent" @click="syncSubscription(t)" title="Sincronizar assinatura no Stripe">
                      <i class="bi bi-arrow-repeat" aria-hidden="true"></i> Sync
                    </button>
                    <button class="btn btn-sm btn-ghost" @click="fixPaymentMethods(t)" title="Habilitar boleto na assinatura existente">
                      <i class="bi bi-wrench-adjustable-circle-fill" aria-hidden="true"></i> Boleto
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="tenants.length === 0">
                <td colspan="7" class="text-center py-4" style="color: var(--color-surface-400);">
                  Nenhuma loteadora cadastrada.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <!-- ─── Pricing Table Modal (Volume Pricing) ───────── -->
    <div v-if="showPricingTableModal" class="modal-overlay">
      <div class="modal modal-lg" @click.stop>
        <div class="modal-header">
          <div>
            <h3>{{ pricingTableForm.id ? 'Editar' : 'Nova' }} Tabela de Preço</h3>
            <p class="text-sm" style="color: var(--color-surface-400); margin: 0;">
              Defina o preço base por projeto e os descontos por volume.
            </p>
          </div>
          <button class="modal-close" @click="showPricingTableModal = false">&times;</button>
        </div>
        <form @submit.prevent="savePricingTable" class="modal-body">
          <div class="grid gap-4" style="grid-template-columns: 1fr 1fr;">
            <div class="form-group">
              <label class="form-label">Nome da Tabela</label>
              <input v-model="pricingTableForm.name" class="form-input" placeholder="Ex: Tabela Padrão" required />
            </div>
            <div class="form-group">
              <label class="form-label">Descrição</label>
              <input v-model="pricingTableForm.description" class="form-input" placeholder="Opcional" />
            </div>
          </div>

          <!-- Base price -->
          <div class="form-group mt-4">
            <label class="form-label">Preço base por projeto (1 empreendimento)</label>
            <div class="input-with-prefix">
              <span class="input-prefix">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                v-model="pricingTableForm.basePriceReais"
                class="form-input"
                placeholder="1200.00"
                required
              />
            </div>
          </div>

          <!-- Volume discount tiers -->
          <div class="form-group mt-4">
            <label class="form-label mb-2">Descontos por Volume</label>
            <p class="text-sm mb-3" style="color: var(--color-surface-400);">
              Quando o cliente tem mais projetos, todos recebem o mesmo desconto de volume.
              O último nível se repete para quantidades maiores.
            </p>

            <div class="tiers-editor">
              <!-- Tier 1 is always 0% (base price) -->
              <div class="tier-edit-row tier-base">
                <div class="tier-num-badge">#1</div>
                <div class="flex-1 tier-base-label">
                  1 empreendimento — preço cheio (sem desconto)
                </div>
              </div>

              <!-- Volume tiers 2+ -->
              <div v-for="(vt, idx) in pricingTableForm.volumeTiers" :key="idx" class="tier-edit-row">
                <div class="tier-num-badge">#{{ vt.projectNumber }}</div>
                <div class="flex-row-inputs">
                  <div class="input-group">
                    <label class="input-group-label">Empreendimentos</label>
                    <input
                      type="number"
                      min="2"
                      v-model.number="vt.projectNumber"
                      class="form-input input-sm"
                      style="width: 80px;"
                    />
                  </div>
                  <div class="input-group">
                    <label class="input-group-label">Desconto (%)</label>
                    <div class="input-with-suffix">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        v-model.number="vt.discountPercent"
                        class="form-input input-sm"
                        style="width: 80px;"
                        required
                      />
                      <span class="input-suffix">%</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  class="btn btn-sm btn-ghost"
                  style="color: #ef4444;"
                  @click="removeVolumeTier(idx)"
                >✕</button>
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-outline mt-3" @click="addVolumeTier">
              + Adicionar Nível de Volume
            </button>
          </div>

          <!-- Preview table -->
          <div v-if="volumePreview.length > 0" class="form-group mt-4">
            <label class="form-label mb-2">Pré-visualização</label>
            <div class="volume-table">
              <div class="volume-row volume-header">
                <span class="vol-col-qty">Quantidade</span>
                <span class="vol-col-unit">Valor/Empreendimento</span>
                <span class="vol-col-total">Valor Total Mensal</span>
                <span class="vol-col-disc">Desconto Aplicado</span>
              </div>
              <div v-for="row in volumePreview" :key="row.projectNumber" class="volume-row">
                <span class="vol-col-qty fw-bold">
                  {{ row.projectNumber }}{{ row.isLast ? ' ou mais' : '' }}
                  {{ row.projectNumber === 1 ? 'empreendimento' : 'empreendimentos' }}
                </span>
                <span class="vol-col-unit">{{ formatCents(row.unitPriceCents) }}</span>
                <span class="vol-col-total">{{ formatCents(row.totalCents) }}{{ row.isLast ? '+' : '' }}</span>
                <span class="vol-col-disc" :class="{ 'discount-active': row.discountPercent > 0 }">
                  {{ row.discountPercent > 0 ? `${row.discountPercent}%` : '0%' }}
                </span>
              </div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" @click="showPricingTableModal = false">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Salvando...' : 'Salvar Tabela' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ─── Assign Pricing Table Modal ─────────────────── -->
    <div v-if="showAssignModal" class="modal-overlay">
      <div class="modal modal-lg" @click.stop>
        <div class="modal-header">
          <div>
            <h3>Atribuir Tabela — {{ selectedTenant?.name }}</h3>
            <p class="text-sm" style="color: var(--color-surface-400); margin: 0;">
              Selecione a tabela de preços e configurações adicionais opcionais.
            </p>
          </div>
          <button class="modal-close" @click="showAssignModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="grid gap-4" style="grid-template-columns: 1fr 1fr 1fr;">
            <div class="form-group">
              <label class="form-label">Tabela de Preço</label>
              <select v-model="assignForm.pricingTableId" class="form-input" required>
                <option value="" disabled>Selecione...</option>
                <option v-for="t in pricingTables" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Desconto Adicional (%)</label>
              <input v-model.number="assignForm.discountPercent" type="number" min="0" max="100" step="0.5" class="form-input" placeholder="0" />
              <span class="text-xs" style="color: var(--color-surface-500);">Aplicado sobre o preço da tabela</span>
            </div>
            <div class="form-group">
              <label class="form-label">Projetos Grátis</label>
              <input v-model.number="assignForm.freeProjects" type="number" min="0" max="100" step="1" class="form-input" placeholder="0" />
            </div>
          </div>

          <!-- Volume pricing preview for this tenant -->
          <div v-if="assignVolumePreview.length > 0" class="mt-4">
            <label class="form-label mb-2">Simulação para este cliente</label>
            <div class="volume-table">
              <div class="volume-row volume-header">
                <span class="vol-col-qty">Qtd</span>
                <span class="vol-col-unit">Valor/Projeto</span>
                <span class="vol-col-total">Total</span>
                <span class="vol-col-disc">Desc. Volume</span>
              </div>
              <div v-for="tier in assignVolumePreview" :key="tier.projectNumber" class="volume-row">
                <span class="vol-col-qty fw-bold">{{ tier.projectNumber }}{{ tier.isLast ? '+' : '' }}</span>
                <span v-if="tier.isFree" class="vol-col-unit badge badge-success" style="font-size: 0.75rem;">Grátis</span>
                <span v-else class="vol-col-unit">{{ formatCents(tier.unitPriceCents) }}</span>
                <span class="vol-col-total">{{ tier.isFree ? 'R$ 0' : formatCents(tier.totalCents) }}</span>
                <span class="vol-col-disc" :class="{ 'discount-active': tier.volumeDiscount > 0 }">
                  {{ tier.volumeDiscount > 0 ? `${tier.volumeDiscount}%` : '—' }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="showAssignModal = false">Cancelar</button>
          <button class="btn btn-primary" :disabled="saving || !assignForm.pricingTableId" @click="saveAssign">
            {{ saving ? 'Salvando...' : 'Atribuir Tabela' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Limits Modal ───────────────────────────────── -->
    <div v-if="showLimitsModal" class="modal-overlay">
      <div class="modal" style="max-width: 450px;" @click.stop>
        <div class="modal-header">
          <h3>Limites — {{ selectedTenant?.name }}</h3>
          <button class="modal-close" @click="showLimitsModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="!tenantLimits" class="flex justify-center p-6">
            <div class="loader"></div>
          </div>
          <template v-else>
            <div class="limits-grid">
              <div class="limit-item">
                <div class="limit-label">Projetos Ativos</div>
                <div class="limit-value">{{ tenantLimits.activeProjectCount }}</div>
              </div>
              <div class="limit-item">
                <div class="limit-label">Limite Máximo</div>
                <div class="limit-value">{{ tenantLimits.maxProjects }}</div>
              </div>
              <div class="limit-item">
                <div class="limit-label">Pode Criar</div>
                <div class="limit-value">
                  <span :class="tenantLimits.canCreateProject ? 'text-green' : 'text-red'">
                    {{ tenantLimits.canCreateProject ? 'Sim' : 'Não' }}
                  </span>
                </div>
              </div>
              <div class="limit-item">
                <div class="limit-label">Próximo Projeto</div>
                <div class="limit-value">
                  <template v-if="tenantLimits.nextProjectPriceCents === 0">Grátis</template>
                  <template v-else-if="tenantLimits.nextProjectPriceCents != null">{{ formatCents(tenantLimits.nextProjectPriceCents) }}/mês</template>
                  <template v-else>—</template>
                </div>
              </div>
            </div>
          </template>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="showLimitsModal = false">Fechar</button>
        </div>
      </div>
    </div>

    <!-- ─── Anchor Modal ───────────────────────────────── -->
    <div v-if="showAnchorModal" class="modal-overlay">
      <div class="modal" style="max-width: 400px;" @click.stop>
        <div class="modal-header">
          <h3>Data de Vencimento — {{ selectedTenant?.name }}</h3>
          <button class="modal-close" @click="showAnchorModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <p class="text-sm mb-4" style="color: var(--color-surface-400);">
            Defina o dia do mês para vencimento (1 a 28). A primeira cobrança será sempre no mês seguinte.
            O cliente terá 15 dias de tolerância após o vencimento antes de qualquer restrição.
          </p>
          <div class="form-group">
            <label class="form-label">Dia do Vencimento</label>
            <select v-model.number="billingDay" class="form-input" required>
              <option :value="null" disabled>Selecione o dia...</option>
              <option v-for="d in 28" :key="d" :value="d">Dia {{ d }}</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="showAnchorModal = false">Cancelar</button>
          <button class="btn btn-primary" :disabled="saving || !billingDay" @click="saveAnchor">
            {{ saving ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Trial Modal ────────────────────────────────── -->
    <div v-if="showTrialModal" class="modal-overlay">
      <div class="modal" style="max-width: 430px;" @click.stop>
        <div class="modal-header">
          <h3>Período de Teste — {{ selectedTenant?.name }}</h3>
          <button class="modal-close" @click="showTrialModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <p class="text-sm mb-4" style="color: var(--color-surface-400);">
            Defina por quantos meses a loteadora ficará em teste. Durante esse período,
            o sistema não deve exibir nem vincular cobranças para esse cliente.
          </p>

          <div class="form-group">
            <label class="form-label">Duração do Teste (meses)</label>
            <input
              v-model.number="trialForm.trialMonths"
              type="number"
              min="1"
              max="24"
              step="1"
              class="form-input"
              placeholder="Ex: 3"
              required
            />
          </div>

          <div class="text-sm mt-3" style="color: var(--color-surface-500);">
            Esta ação reinicia o período de teste a partir de agora e desativa cobrança enquanto durar.
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="showTrialModal = false">Cancelar</button>
          <button class="btn btn-primary" :disabled="saving || !trialForm.trialMonths" @click="saveTrial">
            {{ saving ? 'Salvando...' : 'Salvar Período de Teste' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
.page-subtitle { font-size: 0.9rem; color: var(--color-surface-400); margin: 4px 0 0; }
.section-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--glass-border-subtle); }

.pricing-table-card {
  padding: 16px;
  border-left: 4px solid #8b5cf6;
  transition: all 0.2s;
}
.pricing-table-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

/* ─── Volume pricing table ────────────── */
.volume-table {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--glass-border-subtle);
}
.volume-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.5fr 1fr;
  gap: 8px;
  padding: 10px 14px;
  align-items: center;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--glass-border-subtle);
}
.volume-row:last-child { border-bottom: none; }
.volume-header {
  background: rgba(139, 92, 246, 0.08);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-surface-400);
}
.vol-col-qty { }
.vol-col-unit { text-align: right; }
.vol-col-total { text-align: right; color: var(--color-primary-300, #a5b4fc); font-weight: 600; }
.vol-col-disc { text-align: right; }
.discount-active { color: #10b981; font-weight: 700; }

/* ─── Tier editor (modal form) ──────── */
.tiers-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tier-edit-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.tier-base {
  opacity: 0.7;
  padding: 8px 0;
}
.tier-base-label {
  font-size: 0.85rem;
  color: var(--color-surface-400);
  font-style: italic;
}
.tier-num-badge {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--color-primary-900, #1a1a2e);
  color: var(--color-primary-300, #a5b4fc);
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.flex-row-inputs {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  flex: 1;
}
.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.input-group-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--color-surface-500);
}
.input-sm { height: 36px; font-size: 0.85rem; }
.input-with-prefix {
  display: flex;
  align-items: center;
  gap: 8px;
}
.input-prefix {
  font-weight: 600;
  color: var(--color-surface-400);
  font-size: 0.9rem;
}
.input-with-suffix {
  display: flex;
  align-items: center;
  gap: 4px;
}
.input-suffix {
  font-weight: 600;
  color: var(--color-surface-400);
  font-size: 0.85rem;
}

/* ─── Limits ──────────────────────────── */
.limits-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.limit-item {
  text-align: center;
  padding: 16px;
  border-radius: 8px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
}
.limit-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-surface-400);
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}
.limit-value {
  font-size: 1.25rem;
  font-weight: 700;
}
.text-green { color: #10b981; }
.text-red { color: #ef4444; }

.badge-accent { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }
.badge-success { background: #10b981; color: white; }
.badge-warning { background: #f59e0b; color: #1a1a2e; }
.badge-error { background: #ef4444; color: white; }
.badge-outline { border: 1px solid var(--glass-border); background: transparent; }
.empty-hint {
  text-align: center;
  padding: 32px;
  color: var(--color-surface-400);
  font-size: 0.9rem;
}
.mb-3 { margin-bottom: 12px; }
.mb-8 { margin-bottom: 32px; }
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 12px; }
.mt-4 { margin-top: 16px; }
.text-sm { font-size: 0.85rem; }
.text-xs { font-size: 0.75rem; }
.fw-bold { font-weight: 600; }
.flex-1 { flex: 1; }
</style>
