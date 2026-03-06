<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Loteadoras</h1>
        <p>Gerenciamento global de clientes e métricas</p>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        Nova Loteadora
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Carregando loteadoras...</span>
    </div>

    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Loteadora</th>
            <th>Projetos</th>
            <th>Corretores</th>
            <th>Leads</th>
            <th>Status</th>
            <th>Cadastrada em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in tenants" :key="t.id">
            <td>
              <div style="font-weight: 600;">{{ t.name }}</div>
              <div style="font-size: 0.8rem; color: var(--color-surface-400);">{{ t.slug }}</div>
              <div v-if="t.customDomain" style="font-size: 0.75rem; color: var(--color-primary-500);">🌐 {{ t.customDomain }}</div>
            </td>
            <td>{{ t.metrics.projects }}</td>
            <td>{{ t.metrics.brokers }}</td>
            <td>{{ t.metrics.leads }}</td>
            <td>
              <span class="badge" :class="t.isActive ? 'badge-success' : 'badge-error'">
                {{ t.isActive ? 'Ativa' : 'Desativada' }}
              </span>
            </td>
            <td>{{ formatDate(t.createdAt) }}</td>
            <td>
              <div class="flex gap-2">
                <button class="btn btn-sm btn-ghost" @click="openProjectList(t)" title="Ver Empreendimentos">
                  📂 Ver Projetos
                </button>
                <button class="btn btn-sm btn-ghost" @click="openEditModal(t)" title="Editar Loteadora">
                  ✏️
                </button>
                <button class="btn btn-sm btn-outline" @click="toggleStatus(t)">
                  {{ t.isActive ? 'Desativar' : 'Ativar' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Tenant Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal modal-lg" @click.stop>
        <div class="modal-header">
          <h2>{{ editingId ? 'Editar Loteadora' : 'Nova Loteadora' }}</h2>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
        <form @submit.prevent="handleCreate">
          <div class="form-group">
            <label class="form-label">Nome da Empresa</label>
            <input v-model="form.tenantName" class="form-input" placeholder="Ex: Loteadora Vista Verde" required @input="generateSlug" />
          </div>
          <div class="form-group">
            <label class="form-label">Slug (URL)</label>
            <input v-model="form.tenantSlug" class="form-input" placeholder="vista-verde" required />
          </div>
          <div class="form-group">
            <label class="form-label">Domínio Customizado (Ex: vendas.loteadora.com)</label>
            <input v-model="form.customDomain" class="form-input" placeholder="vendas.meu-site.com.br" />
          </div>

          <h3 style="margin: 20px 0 12px;">Dados Jurídicos</h3>
          <div class="form-group">
            <label class="form-label">Razão Social</label>
            <input v-model="form.legalName" class="form-input" placeholder="Razão social da empresa" />
          </div>
          <div class="form-group">
            <label class="form-label">CNPJ</label>
            <input v-model="form.cnpj" class="form-input" placeholder="00.000.000/0000-00" />
          </div>
          <div class="form-group">
            <label class="form-label">Inscrição Estadual</label>
            <input v-model="form.stateRegistration" class="form-input" placeholder="Opcional" />
          </div>
          <div class="form-group">
            <label class="form-label">Inscrição Municipal</label>
            <input v-model="form.municipalRegistration" class="form-input" placeholder="Opcional" />
          </div>
          <div class="form-group">
            <label class="form-label">Representante Legal</label>
            <input v-model="form.legalRepresentative" class="form-input" placeholder="Nome do representante legal" />
          </div>
          <div class="form-group">
            <label class="form-label">CRECI</label>
            <input v-model="form.creci" class="form-input" placeholder="CRECI da empresa/responsável" />
          </div>

          <h3 style="margin: 20px 0 12px;">Dados de Contato</h3>
          <div class="form-group">
            <label class="form-label">Nome do Contato Comercial</label>
            <input v-model="form.contactName" class="form-input" placeholder="Nome do responsável comercial" />
          </div>
          <div class="form-group">
            <label class="form-label">E-mail de Contato</label>
            <input v-model="form.contactEmail" class="form-input" type="email" placeholder="comercial@empresa.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Telefone de Contato</label>
            <input v-model="form.contactPhone" class="form-input" placeholder="(00) 0000-0000" />
          </div>
          <div class="form-group">
            <label class="form-label">Telefone Principal</label>
            <input v-model="form.phone" class="form-input" placeholder="(00) 0000-0000" />
          </div>
          <div class="form-group">
            <label class="form-label">WhatsApp</label>
            <input v-model="form.whatsapp" class="form-input" placeholder="(00) 00000-0000" />
          </div>
          <div class="form-group">
            <label class="form-label">E-mail Público</label>
            <input v-model="form.publicEmail" class="form-input" type="email" placeholder="contato@empresa.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Website</label>
            <input v-model="form.website" class="form-input" placeholder="https://empresa.com.br" />
          </div>

          <h3 style="margin: 20px 0 12px;">Endereço</h3>
          <div class="form-group">
            <label class="form-label">CEP</label>
            <input v-model="form.addressZipCode" class="form-input" placeholder="00000-000" />
          </div>
          <div class="form-group">
            <label class="form-label">Logradouro</label>
            <input v-model="form.addressStreet" class="form-input" placeholder="Rua, avenida, etc." />
          </div>
          <div class="form-group">
            <label class="form-label">Número</label>
            <input v-model="form.addressNumber" class="form-input" placeholder="123" />
          </div>
          <div class="form-group">
            <label class="form-label">Complemento</label>
            <input v-model="form.addressComplement" class="form-input" placeholder="Sala, bloco, etc." />
          </div>
          <div class="form-group">
            <label class="form-label">Bairro</label>
            <input v-model="form.addressDistrict" class="form-input" placeholder="Bairro" />
          </div>
          <div class="form-group">
            <label class="form-label">Cidade</label>
            <input v-model="form.addressCity" class="form-input" placeholder="Cidade" />
          </div>
          <div class="form-group">
            <label class="form-label">Estado (UF)</label>
            <input v-model="form.addressState" class="form-input" placeholder="UF" />
          </div>
          <div class="form-group">
            <label class="form-label">País</label>
            <input v-model="form.addressCountry" class="form-input" placeholder="Brasil" />
          </div>

          <hr v-if="!editingId" style="margin: 24px 0; border: 0; border-top: 1px solid var(--glass-border-subtle);" />
          <div v-if="!editingId">
            <h3 style="margin-bottom: 16px;">Usuário Administrador</h3>
            <div class="form-group">
              <label class="form-label">Nome do Responsável</label>
              <input v-model="form.name" class="form-input" placeholder="João Silva" required />
            </div>
            <div class="form-group">
              <label class="form-label">Email de Acesso</label>
              <input v-model="form.email" type="email" class="form-input" placeholder="admin@empresa.com" required autocomplete="off" />
            </div>
            <div class="form-group">
              <label class="form-label">Senha Inicial</label>
              <AppPasswordInput v-model="form.password" :placeholder="PASSWORD_POLICY_HINT" required autocomplete="new-password" />
              <div v-if="tenantPasswordError" class="form-error">{{ tenantPasswordError }}</div>
              <small style="color: var(--color-surface-400)">O cliente poderá alterar esta senha depois.</small>
            </div>
          </div>
          
          <div v-if="error" class="alert alert-error">{{ error }}</div>
          
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" @click="showModal = false">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Processando...' : (editingId ? 'Salvar Alterações' : 'Criar Loteadora') }}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>

    <!-- Projects List Modal -->
    <div v-if="showProjectsModal" class="modal-overlay">
      <div class="modal modal-xl" @click.stop>
        <div class="modal-header">
          <div>
            <h2>Empreendimentos - {{ selectedTenant?.name }}</h2>
            <p style="font-size: 0.85rem; color: var(--color-surface-200); margin: 0;">Configure domínios customizados para projetos desta loteadora.</p>
          </div>
          <button class="modal-close" @click="showProjectsModal = false">&times;</button>
        </div>
        
        <div v-if="loadingProjects" class="loading-state">
          <div class="loading-spinner"></div>
        </div>
        <div v-else-if="tenantProjects.length === 0" class="empty-state">
          <p>Nenhum empreendimento cadastrado para esta loteadora.</p>
        </div>
        <div v-else class="table-wrapper" style="max-height: 400px; overflow-y: auto;">
          <table>
            <thead>
              <tr>
                <th>Empreendimento</th>
                <th>Slug</th>
                <th>Domínio Customizado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in tenantProjects" :key="p.id">
                <td><strong>{{ p.name }}</strong></td>
                <td>/{{ p.slug }}</td>
                <td>
                  <div v-if="editingProjectId === p.id" style="display: flex; gap: 8px;">
                    <input v-model="projectForm.customDomain" class="form-input btn-sm" placeholder="vendas.site.com" @keyup.enter="saveProjectDomain(p)" />
                    <button class="btn btn-sm btn-primary" @click="saveProjectDomain(p)">💾</button>
                    <button class="btn btn-sm btn-ghost" @click="editingProjectId = null">✕</button>
                  </div>
                  <div v-else @dblclick="editProjectDomain(p)" style="cursor: pointer; min-height: 20px;">
                    {{ p.customDomain || '—' }} <span style="opacity: 0.5; font-size: 0.75rem;">✏️</span>
                  </div>
                </td>
                <td>
                  <button class="btn btn-sm btn-ghost" @click="editProjectDomain(p)">
                    Configurar Domínio
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" @click="showProjectsModal = false">Fechar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import {
  getPasswordPolicyError,
  PASSWORD_POLICY_HINT
} from '~/utils/passwordPolicy'

const { fetchApi } = useApi()
const toast = useToast()

const tenants = ref([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const error = ref('')
const editingId = ref(null)

const showProjectsModal = ref(false)
const selectedTenant = ref(null)
const loadingProjects = ref(false)
const tenantProjects = ref([])
const editingProjectId = ref(null)
const projectForm = ref({ customDomain: '' })

const form = ref({
  tenantName: '',
  tenantSlug: '',
  customDomain: '',
  legalName: '',
  cnpj: '',
  creci: '',
  stateRegistration: '',
  municipalRegistration: '',
  legalRepresentative: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  phone: '',
  whatsapp: '',
  publicEmail: '',
  website: '',
  addressZipCode: '',
  addressStreet: '',
  addressNumber: '',
  addressComplement: '',
  addressDistrict: '',
  addressCity: '',
  addressState: '',
  addressCountry: '',
  name: '',
  email: '',
  password: ''
})
const tenantPasswordError = computed(() => {
  if (editingId.value || !form.value.password) return ''
  return getPasswordPolicyError(form.value.password)
})

function generateSlug() {
  if (editingId.value) return
  form.value.tenantSlug = form.value.tenantName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function loadTenants() {
  loading.value = true
  try {
    tenants.value = await fetchApi('/tenants')
  } catch (err) {
    toast.error('Erro ao carregar loteadoras')
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingId.value = null
  form.value = {
    tenantName: '',
    tenantSlug: '',
    customDomain: '',
    legalName: '',
    cnpj: '',
    creci: '',
    stateRegistration: '',
    municipalRegistration: '',
    legalRepresentative: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    phone: '',
    whatsapp: '',
    publicEmail: '',
    website: '',
    addressZipCode: '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    addressDistrict: '',
    addressCity: '',
    addressState: '',
    addressCountry: '',
    name: '',
    email: '',
    password: ''
  }
  showModal.value = true
  error.value = ''
}

async function openEditModal(tenant) {
  let details = tenant
  try {
    details = await fetchApi(`/tenants/${tenant.id}`)
  } catch (_err) {
    toast.error('Nao foi possivel carregar todos os dados da loteadora. Exibindo dados basicos.')
    // Fallback to table payload when details request fails
  }

  editingId.value = tenant.id
  form.value = {
    tenantName: details.name,
    tenantSlug: details.slug,
    customDomain: details.customDomain || '',
    legalName: details.legalName || '',
    cnpj: details.cnpj || '',
    creci: details.creci || '',
    stateRegistration: details.stateRegistration || '',
    municipalRegistration: details.municipalRegistration || '',
    legalRepresentative: details.legalRepresentative || '',
    contactName: details.contactName || '',
    contactEmail: details.contactEmail || '',
    contactPhone: details.contactPhone || '',
    phone: details.phone || '',
    whatsapp: details.whatsapp || '',
    publicEmail: details.publicEmail || '',
    website: details.website || '',
    addressZipCode: details.addressZipCode || '',
    addressStreet: details.addressStreet || '',
    addressNumber: details.addressNumber || '',
    addressComplement: details.addressComplement || '',
    addressDistrict: details.addressDistrict || '',
    addressCity: details.addressCity || '',
    addressState: details.addressState || '',
    addressCountry: details.addressCountry || '',
    name: '—', // Not editable here
    email: '—',
    password: '—'
  }
  showModal.value = true
  error.value = ''
}

async function handleCreate() {
  if (!editingId.value && tenantPasswordError.value) {
    error.value = tenantPasswordError.value
    return
  }

  saving.value = true
  error.value = ''
  try {
    if (editingId.value) {
      // Logic for Update
      await fetchApi(`/tenants/${editingId.value}`, {
        method: 'PATCH',
        body: {
          name: form.value.tenantName,
          slug: form.value.tenantSlug,
          customDomain: form.value.customDomain || null,
          legalName: form.value.legalName || null,
          cnpj: form.value.cnpj || null,
          creci: form.value.creci || null,
          stateRegistration: form.value.stateRegistration || null,
          municipalRegistration: form.value.municipalRegistration || null,
          legalRepresentative: form.value.legalRepresentative || null,
          contactName: form.value.contactName || null,
          contactEmail: form.value.contactEmail || null,
          contactPhone: form.value.contactPhone || null,
          phone: form.value.phone || null,
          whatsapp: form.value.whatsapp || null,
          publicEmail: form.value.publicEmail || null,
          website: form.value.website || null,
          addressZipCode: form.value.addressZipCode || null,
          addressStreet: form.value.addressStreet || null,
          addressNumber: form.value.addressNumber || null,
          addressComplement: form.value.addressComplement || null,
          addressDistrict: form.value.addressDistrict || null,
          addressCity: form.value.addressCity || null,
          addressState: form.value.addressState || null,
          addressCountry: form.value.addressCountry || null,
        }
      })
      toast.success('Loteadora atualizada!')
    } else {
      // Logic for Create
      await fetchApi('/tenants', {
        method: 'POST',
        body: form.value
      })
      toast.success('Loteadora criada com sucesso!')
    }
    showModal.value = false
    loadTenants()
  } catch (err) {
    error.value = err.data?.message || 'Erro ao processar'
  } finally {
    saving.value = false
  }
}

async function toggleStatus(tenant) {
  const newStatus = !tenant.isActive
  try {
    await fetchApi(`/tenants/${tenant.id}/status`, {
      method: 'PATCH',
      body: { isActive: newStatus }
    })
    tenant.isActive = newStatus
    toast.success(`Loteadora ${newStatus ? 'ativada' : 'desativada'} com sucesso!`)
  } catch (err) {
    toast.error('Erro ao alterar status')
  }
}

// ── Projects Management ──────────────────────────────────
async function openProjectList(tenant) {
  selectedTenant.value = tenant
  showProjectsModal.value = true
  loadingProjects.value = true
  try {
    // We use the tenant ID as a header to resolve context via Middleware
    const res = await fetchApi('/projects', {
      headers: { 'x-tenant-id': tenant.id }
    })
    tenantProjects.value = res.data
  } catch (err) {
    toast.error('Erro ao carregar empreendimentos')
  } finally {
    loadingProjects.value = false
  }
}

function editProjectDomain(project) {
  editingProjectId.value = project.id
  projectForm.value.customDomain = project.customDomain || ''
}

async function saveProjectDomain(project) {
  try {
    const updated = await fetchApi(`/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'x-tenant-id': selectedTenant.value.id },
      body: { customDomain: projectForm.value.customDomain || null }
    })
    
    // Update locally
    project.customDomain = updated.customDomain
    editingProjectId.value = null
    toast.success('Domínio do projeto atualizado!')
  } catch (err) {
    toast.error(err.data?.message || 'Erro ao atualizar domínio')
  }
}

function formatDate(date) {
  return formatDateToBrasilia(date)
}

onMounted(loadTenants)
</script>
