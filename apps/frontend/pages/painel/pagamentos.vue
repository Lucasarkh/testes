<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

definePageMeta({
  layout: 'default'
})

const { get, post, patch, delete: del } = useApi()
const toast = useToast()
const authStore = useAuthStore()
const canWritePayments = computed(() => authStore.canWriteFeature('payments'))
const writePermissionHint = 'Disponível apenas para usuários com permissão de edição'

type PaymentProvider = 'STRIPE' | 'ASAAS' | 'MERCADO_PAGO' | 'PAGAR_ME' | 'PAGSEGURO'

type PaymentKeys = {
  secretKey: string
  apiKey: string
  accessToken: string
  token: string
  isSandbox: boolean
}

type PaymentConfigRecord = {
  id: string
  name: string
  provider: PaymentProvider
  keysJson?: Partial<PaymentKeys>
  isActive: boolean
  webhookSecret?: string | null
  projects?: Array<{ id: string }>
}

type ApiError = {
  data?: {
    message?: string
  }
}

const configs = ref<PaymentConfigRecord[]>([])
const loading = ref(true)
const showModal = ref(false)
const editingConfig = ref<PaymentConfigRecord | null>(null)

const form = ref({
  name: '',
  provider: 'STRIPE' as PaymentProvider,
  keysJson: {
    secretKey: '',
    apiKey: '',
    accessToken: '',
    token: '',
    isSandbox: false
  } as PaymentKeys,
  isActive: true,
  webhookSecret: ''
})

// Auto-reset when modal closes or opens to ensure clean state
watch(showModal, (val) => {
  if (!val) return
  if (!editingConfig.value) {
    if (typeof window !== 'undefined' && typeof window.crypto?.getRandomValues === 'function') {
      // Force a re-render of inputs by clearing and resetting
      form.value.keysJson = {
        secretKey: '',
        apiKey: '',
        accessToken: '',
        token: '',
        isSandbox: false
      }
    }
  }
})

async function fetchData() {
  loading.value = true
  try {
    const configsData = await get('/admin/payment-config')
    configs.value = configsData
  } catch (error) {
    console.error('Error fetching payment configs:', error)
    toast.error('Erro ao carregar dados')
  } finally {
    loading.value = false
  }
}

const formErrors = ref<string[]>([])

function validateForm(): boolean {
  formErrors.value = []
  
  if (!form.value.name?.trim()) {
    formErrors.value.push('Nome do perfil é obrigatório.')
  }

  const keys = form.value.keysJson || {}
  const provider = form.value.provider

  // Skip key validation if we are EDITING and the field is empty (masked)
  const isEditing = !!editingConfig.value

  if (provider === 'STRIPE') {
    if (!isEditing && (!keys.secretKey || typeof keys.secretKey !== 'string' || !keys.secretKey.trim())) {
      formErrors.value.push('Secret Key do Stripe é obrigatória.')
    }
  } else if (provider === 'ASAAS') {
    if (!isEditing && (!keys.apiKey || typeof keys.apiKey !== 'string' || !keys.apiKey.trim())) {
      formErrors.value.push('API Key do Asaas é obrigatória.')
    }
  } else if (provider === 'MERCADO_PAGO') {
    if (!isEditing && (!keys.accessToken || typeof keys.accessToken !== 'string' || !keys.accessToken.trim())) {
      formErrors.value.push('Access Token do Mercado Pago é obrigatório.')
    }
  } else if (provider === 'PAGAR_ME') {
    if (!isEditing && (!keys.secretKey || typeof keys.secretKey !== 'string' || !keys.secretKey.trim())) {
      formErrors.value.push('Secret Key do Pagar.me é obrigatória.')
    }
  } else if (provider === 'PAGSEGURO') {
    if (!isEditing && (!keys.token || typeof keys.token !== 'string' || !keys.token.trim())) {
      formErrors.value.push('Token de Acesso do PagSeguro é obrigatório.')
    }
  }

  return formErrors.value.length === 0
}

async function saveConfig() {
  if (!validateForm()) {
    toast.error(formErrors.value[0] || 'Revise os campos obrigatórios.')
    return
  }
  try {
    const payload = { ...form.value }

    // If we're editing, we only want to send the keys that actually have NEW content.
    // However, since Backend now merges, we just need to ensure we're not sending empty strings 
    // for fields that were previously masked.
    if (editingConfig.value) {
      const filteredKeys = Object.fromEntries(
        Object.entries(payload.keysJson).filter(([, value]) => Boolean(value))
      ) as Partial<PaymentKeys>
      payload.keysJson = filteredKeys as PaymentKeys
      
      await patch(`/admin/payment-config/${editingConfig.value.id}`, payload)
      toast.success('Configuração atualizada')
    } else {
      await post('/admin/payment-config', payload)
      toast.success('Configuração criada')
    }
    showModal.value = false
    fetchData()
  } catch (error) {
    toast.error((error as ApiError)?.data?.message || 'Erro ao salvar configuração')
  }
}

async function removeConfig(id: string) {
  if (!confirm('Tem certeza que deseja remover este gateway? Projetos que o utilizam deixarão de aceitar pagamentos.')) return
  try {
    await del(`/admin/payment-config/${id}`)
    toast.success('Configuração removida')
    fetchData()
  } catch (error) {
    toast.error('Erro ao remover configuração')
  }
}

function openCreate() {
  editingConfig.value = null
  formErrors.value = []
  form.value = {
    name: '',
    provider: 'STRIPE',
    keysJson: {
      secretKey: '',
      apiKey: '',
      accessToken: '',
      token: '',
      isSandbox: false
    },
    isActive: true,
    webhookSecret: ''
  }
  showModal.value = true
}

function openEdit(config: PaymentConfigRecord) {
  editingConfig.value = config
  formErrors.value = []
  
  // Ensure keysJson is initialized even if empty in DB
  const baseKeys = {
    secretKey: '',
    apiKey: '',
    accessToken: '',
    token: '',
    isSandbox: false
  }

  form.value = {
    name: config.name,
    provider: config.provider,
    keysJson: { ...baseKeys, ...(config.keysJson || {}) },
    isActive: config.isActive,
    webhookSecret: config.webhookSecret || ''
  }
  showModal.value = true
}

function getWebhookUrl(provider: string) {
  if (!process.client) return ''
  const base = window.location.origin.replace('3000', '3001')
  return `${base}/payment/webhook/${provider.toLowerCase()}`
}

function copyWebhookUrl(provider: string) {
  const url = getWebhookUrl(provider)
  navigator.clipboard.writeText(url)
  toast.success('URL copiada!')
}

// Reset keysJson when provider changes (only for new gateways)
watch(() => form.value.provider, () => {
  if (!editingConfig.value) {
    form.value.keysJson = {
      secretKey: '',
      apiKey: '',
      accessToken: '',
      token: '',
      isSandbox: false
    }
    form.value.webhookSecret = ''
  }
  formErrors.value = []
})

onMounted(fetchData)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Configurações de Pagamento</h1>
        <p class="page-subtitle">Gerencie suas chaves de API e gateways de forma centralizada.</p>
      </div>
      <button class="btn btn-primary" :disabled="!canWritePayments" :title="!canWritePayments ? writePermissionHint : undefined" @click="openCreate">
        <span>+ Novo Gateway</span>
      </button>
    </div>

    <div v-if="loading" class="flex justify-center p-12">
      <div class="loader"></div>
    </div>

    <div v-else-if="configs.length === 0" class="empty-state-container d-flex align-items-center justify-content-center py-5">
      <div class="card text-center p-5 rounded-5 max-w-500" style="backdrop-filter: blur(var(--glass-blur));">
        <div class="icon-blob mx-auto mb-4"><i class="bi bi-credit-card-2-front-fill" aria-hidden="true"></i></div>
        <h3 class="fw-bold mb-3">Nenhum gateway configurado</h3>
        <p class="mb-4 px-4">Configure um gateway (Stripe, Asaas, etc) para permitir reservas online nos seus projetos.</p>
        <button class="btn btn-primary btn-lg rounded-pill px-5" :disabled="!canWritePayments" :title="!canWritePayments ? writePermissionHint : undefined" @click="openCreate">Configurar Primeiro Gateway</button>
      </div>
    </div>

    <div v-else class="grid gap-6">
      <div v-for="config in configs" :key="config.id" class="card payment-config-card">
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-4">
            <div class="provider-badge" :class="config.provider.toLowerCase()">
              {{ config.provider }}
            </div>
            <div>
              <h3 class="config-name">{{ config.name }}</h3>
              <p class="config-status" :class="{ 'status-active': config.isActive }">
                {{ config.isActive ? '● Ativo Globalmente' : '○ Desativado' }}
              </p>
            </div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-outline" :disabled="!canWritePayments" :title="!canWritePayments ? writePermissionHint : undefined" @click="openEdit(config)">Editar</button>
            <button class="btn btn-sm btn-outline btn-danger" :disabled="!canWritePayments" :title="!canWritePayments ? writePermissionHint : undefined" @click="removeConfig(config.id)">Remover</button>
          </div>
        </div>

        <div class="config-details mt-4">
          <div class="detail-item">
            <span class="label">Projetos vinculados:</span>
            <span class="value">{{ config.projects?.length || 0 }}</span>
          </div>
          <div class="detail-item mt-2">
            <span class="label">Webhook URL:</span>
            <div class="webhook-box">
              <code>{{ getWebhookUrl(config.provider) }}</code>
              <button @click="copyWebhookUrl(config.provider)" class="btn-copy">Copiar</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Form -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal" style="max-width: 600px;">
        <div class="modal-header">
          <h3>{{ editingConfig ? 'Editar' : 'Novo' }} Gateway de Pagamento</h3>
          <button class="close-btn" @click="showModal = false">&times;</button>
        </div>

        <form @submit.prevent="saveConfig" class="modal-body">
          <!-- Validation errors -->
          <div v-if="formErrors.length > 0" class="form-errors mb-4">
            <p v-for="err in formErrors" :key="err" class="form-error-msg"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i> {{ err }}</p>
          </div>

          <div class="form-group">
            <label class="form-label">Nome do Perfil (Ex: Stripe Principal)</label>
            <input v-model="form.name" type="text" class="form-input" placeholder="Identificador para uso interno" required />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="form-group">
              <label class="form-label">Gateway Operador</label>
              <select v-model="form.provider" class="form-input">
                <option value="STRIPE">Stripe</option>
                <option value="ASAAS">Asaas</option>
                <option value="MERCADO_PAGO">Mercado Pago</option>
                <option value="PAGAR_ME">Pagar.me</option>
                <option value="PAGSEGURO">PagSeguro</option>
              </select>
            </div>
            <div class="form-group flex items-end">
              <div class="flex items-center gap-2 mb-2">
                <input type="checkbox" v-model="form.isActive" id="chkActive" />
                <label for="chkActive" class="form-label mb-0">Ativo</label>
              </div>
            </div>
          </div>

          <hr class="my-6" />

          <!-- Provider Specific Fields -->
          <div v-if="form.provider === 'STRIPE'">
            <div class="form-group">
              <label class="form-label">Secret Key (sk_...)</label>
              <AppPasswordInput v-model="form.keysJson.secretKey" placeholder="Insira sua Secret Key do Stripe" required autocomplete="new-password" />
            </div>
            <div class="form-group">
              <label class="form-label">Webhook Signing Secret (whsec_...)</label>
              <AppPasswordInput v-model="form.webhookSecret" placeholder="Opcional" autocomplete="new-password" />
            </div>
          </div>

          <div v-if="form.provider === 'ASAAS'">
            <div class="form-group">
              <label class="form-label">API Key ($...)</label>
              <AppPasswordInput v-model="form.keysJson.apiKey" placeholder="Access Token do Asaas" required autocomplete="new-password" />
            </div>
            <div class="flex items-center gap-2 mt-2">
              <input type="checkbox" v-model="form.keysJson.isSandbox" id="chkAsaasSandbox" />
              <label for="chkAsaasSandbox">Ambiente Sandbox</label>
            </div>
          </div>

          <div v-if="form.provider === 'MERCADO_PAGO'">
            <div class="form-group">
              <label class="form-label">Access Token (APP_USR-...)</label>
              <AppPasswordInput v-model="form.keysJson.accessToken" required autocomplete="new-password" />
            </div>
          </div>

          <div v-if="form.provider === 'PAGAR_ME'">
            <div class="form-group">
              <label class="form-label">Secret Key (ak_...)</label>
              <AppPasswordInput v-model="form.keysJson.secretKey" required autocomplete="new-password" />
            </div>
          </div>

          <div v-if="form.provider === 'PAGSEGURO'">
            <div class="form-group">
              <label class="form-label">Token de Acesso</label>
              <AppPasswordInput v-model="form.keysJson.token" required autocomplete="new-password" />
            </div>
            <div class="flex items-center gap-2 mt-2">
              <input type="checkbox" v-model="form.keysJson.isSandbox" id="chkPagSeguroSandbox" />
              <label for="chkPagSeguroSandbox">Ambiente Sandbox</label>
            </div>
          </div>

          <div class="modal-footer mt-6">
            <button type="button" class="btn btn-outline" @click="showModal = false">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar Perfil</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  padding: 24px;
}
.payment-config-card {
  border-left: 4px solid var(--color-surface-600);
  transition: all 0.2s;
}
.payment-config-card:hover {
  border-left-color: var(--color-primary-500);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.provider-badge {
  padding: 4px 12px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
}
.stripe { background: #635bff; }
.asaas { background: #0062ff; }
.mercado_pago { background: #009ee3; }
.pagar_me { background: #3c5af4; }
.pagseguro { background: #3fb43f; }

.config-name {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.config-status {
  font-size: 0.8rem;
  margin: 4px 0 0 0;
  color: var(--color-surface-400);
}
.status-active { color: #10b981; }

.webhook-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--glass-bg);
  padding: 8px 12px;
  border-radius: 6px;
  margin-top: 4px;
}
.webhook-box code {
  font-size: 0.8rem;
  color: var(--color-surface-200);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}
.btn-copy {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  cursor: pointer;
}
.btn-copy:hover { background: var(--glass-bg-heavy); }

.detail-item .label {
  font-size: 0.85rem;
  color: var(--color-surface-400);
}
.detail-item .value {
  font-size: 0.85rem;
  font-weight: 600;
  margin-left: 8px;
}
.form-errors {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
}
.form-error-msg {
  color: #ef4444;
  font-size: 0.85rem;
  margin: 2px 0;
}
</style>
