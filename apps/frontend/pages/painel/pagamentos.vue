<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useApi } from '@/composables/useApi'
import { useToast } from '@/composables/useToast'

definePageMeta({
  layout: 'default'
})

const { get, post, patch, delete: del } = useApi()
const toast = useToast()

const configs = ref([])
const projects = ref([])
const loading = ref(true)
const showModal = ref(false)
const editingConfig = ref(null)

const form = ref({
  name: '',
  provider: 'STRIPE',
  keysJson: {},
  isActive: true,
  webhookSecret: ''
})

async function fetchData() {
  loading.value = true
  try {
    const [configsData, projectsRes] = await Promise.all([
      get('/admin/payment-config'),
      get('/projects')
    ])
    configs.value = configsData
    projects.value = projectsRes.data
  } catch (error) {
    console.error('Error fetching payment configs:', error)
    toast.error('Erro ao carregar dados')
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  try {
    const payload = { ...form.value }

    if (editingConfig.value) {
      await patch(`/admin/payment-config/${editingConfig.value.id}`, payload)
      toast.success('Configuração atualizada')
    } else {
      await post('/admin/payment-config', payload)
      toast.success('Configuração criada')
    }
    showModal.value = false
    fetchData()
  } catch (error) {
    toast.error(error?.data?.message || 'Erro ao salvar configuração')
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
  form.value = {
    name: '',
    provider: 'STRIPE',
    keysJson: {},
    isActive: true,
    webhookSecret: ''
  }
  showModal.value = true
}

function openEdit(config) {
  editingConfig.value = config
  form.value = {
    name: config.name,
    provider: config.provider,
    keysJson: config.keysJson || {},
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

onMounted(fetchData)
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Configurações de Pagamento</h1>
        <p class="page-subtitle">Gerencie suas chaves de API e gateways de forma centralizada.</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">
        <span>+ Novo Gateway</span>
      </button>
    </div>

    <div v-if="loading" class="flex justify-center p-12">
      <div class="loader"></div>
    </div>

    <div v-else-if="configs.length === 0" class="empty-state-container d-flex align-items-center justify-content-center py-5">
      <div class="card text-center p-5 rounded-5 max-w-500" style="backdrop-filter: blur(var(--glass-blur));">
        <div class="icon-blob mx-auto mb-4">💳</div>
        <h3 class="fw-bold mb-3">Nenhum gateway configurado</h3>
        <p class="mb-4 px-4">Configure um gateway (Stripe, Asaas, etc) para permitir reservas online nos seus projetos.</p>
        <button class="btn btn-primary btn-lg rounded-pill px-5" @click="openCreate">Configurar Primeiro Gateway</button>
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
            <button class="btn btn-sm btn-outline" @click="openEdit(config)">Editar</button>
            <button class="btn btn-sm btn-outline btn-danger" @click="removeConfig(config.id)">Remover</button>
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
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal" style="max-width: 600px;">
        <div class="modal-header">
          <h3>{{ editingConfig ? 'Editar' : 'Novo' }} Gateway de Pagamento</h3>
          <button class="close-btn" @click="showModal = false">&times;</button>
        </div>

        <form @submit.prevent="saveConfig" class="modal-body">
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
              <input v-model="form.keysJson.secretKey" type="password" class="form-input" placeholder="Insira sua Secret Key do Stripe" required />
            </div>
            <div class="form-group">
              <label class="form-label">Webhook Signing Secret (whsec_...)</label>
              <input v-model="form.webhookSecret" type="password" class="form-input" placeholder="Opcional" />
            </div>
          </div>

          <div v-if="form.provider === 'ASAAS'">
            <div class="form-group">
              <label class="form-label">API Key ($...)</label>
              <input v-model="form.keysJson.apiKey" type="password" class="form-input" placeholder="Access Token do Asaas" required />
            </div>
            <div class="flex items-center gap-2 mt-2">
              <input type="checkbox" v-model="form.keysJson.isSandbox" id="chkAsaasSandbox" />
              <label for="chkAsaasSandbox">Ambiente Sandbox</label>
            </div>
          </div>

          <div v-if="form.provider === 'MERCADO_PAGO'">
            <div class="form-group">
              <label class="form-label">Access Token (APP_USR-...)</label>
              <input v-model="form.keysJson.accessToken" type="password" class="form-input" required />
            </div>
          </div>

          <div v-if="form.provider === 'PAGAR_ME'">
            <div class="form-group">
              <label class="form-label">Secret Key (ak_...)</label>
              <input v-model="form.keysJson.secretKey" type="password" class="form-input" required />
            </div>
          </div>

          <div v-if="form.provider === 'PAGSEGURO'">
            <div class="form-group">
              <label class="form-label">Token de Acesso</label>
              <input v-model="form.keysJson.token" type="password" class="form-input" required />
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
</style>
