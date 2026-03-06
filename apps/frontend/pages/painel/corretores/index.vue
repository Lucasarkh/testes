<script setup lang="ts">
import {
  getPasswordPolicyError,
  PASSWORD_POLICY_HINT
} from '~/utils/passwordPolicy'
const auth = useAuthStore()
const { get, post, patch, delete: del } = useApi()
const toast = useToast()
const router = useRouter()

const realtors = ref([])
const projects = ref([])
const loading = ref(true)
const showModal = ref(false)
const showInviteModal = ref(false)
const editingRealtor = ref(null)
const approvingId = ref<string | null>(null)

const emailError = ref('')
const codeError = ref('')
const emailAvailable = ref(false)
const codeAvailable = ref(false)
const emailLoading = ref(false)
const codeLoading = ref(false)

const inviteForm = ref({
  email: '',
  role: 'CORRETOR',
  agencyId: ''
})

let emailDebounceTimer: any = null
let codeDebounceTimer: any = null

const { maskPhone } = useMasks()

const form = ref({
  name: '',
  phone: '',
  creci: '',
  code: '',
  projectIds: [],
  accountEmail: '',
  accountPassword: ''
})
const accountPasswordError = computed(() => {
  if (editingRealtor.value || !form.value.accountPassword) return ''
  return getPasswordPolicyError(form.value.accountPassword)
})

watch(() => form.value.phone, (v) => { if (v) form.value.phone = maskPhone(v) })

watch(() => form.value.accountEmail, (email) => {
  if (editingRealtor.value) return
  emailError.value = ''
  emailAvailable.value = false
  if (!email || !email.includes('@')) return
  
  clearTimeout(emailDebounceTimer)
  emailDebounceTimer = setTimeout(async () => {
    emailLoading.value = true
    try {
      const res = await get(`/realtor-links/check-email?email=${email}`)
      if (!res.available) {
        emailError.value = 'Já existe um usuário com este email.'
      } else {
        emailAvailable.value = true
      }
    } catch {
      // Ignora erro na verificação
    } finally {
      emailLoading.value = false
    }
  }, 600)
})

watch(() => form.value.code, (code) => {
  codeError.value = ''
  codeAvailable.value = false
  if (!code) return
  
  clearTimeout(codeDebounceTimer)
  codeDebounceTimer = setTimeout(async () => {
    codeLoading.value = true
    try {
      const excludeId = editingRealtor.value?.id || ''
      const res = await get(`/realtor-links/check-code?code=${code}&excludeId=${excludeId}`)
      if (!res.available) {
        codeError.value = 'Este código já está sendo usado por outro corretor.'
      } else {
        codeAvailable.value = true
      }
    } catch {
      // Ignora erro na verificação
    } finally {
      codeLoading.value = false
    }
  }, 600)
})

const slugManuallyEdited = ref(false)

function onNameInput() {
  if (!slugManuallyEdited.value) {
    form.value.code = form.value.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}

async function fetchData() {
  loading.value = true
  try {
    const res = await get('/realtor-links')
    realtors.value = res
    const projectsRes = await get('/projects')
    projects.value = projectsRes.data
  } catch (error) {
    console.error('Error fetching realtors:', error)
    toast.error('Erro ao carregar dados')
  } finally {
    loading.value = false
  }
}

async function saveRealtor() {
  if (emailError.value || codeError.value) {
    toast.error('Por favor, corrija os erros no formulário antes de salvar.')
    return
  }
  if (!editingRealtor.value && accountPasswordError.value) {
    toast.error(accountPasswordError.value)
    return
  }

  try {
    const payload = {
      ...form.value,
      phone: form.value.phone.replace(/\D/g, '')
    }

    // Don't send empty account fields
    if (!payload.accountEmail) delete payload.accountEmail
    if (!payload.accountPassword) delete payload.accountPassword

    if (editingRealtor.value) {
      // Remove account fields on edit (cannot change via this form)
      delete payload.accountEmail
      delete payload.accountPassword
      await patch(`/realtor-links/${editingRealtor.value.id}`, payload)
      toast.success('Corretor atualizado com sucesso')
    } else {
      await post('/realtor-links', payload)
      toast.success('Corretor criado com sucesso')
    }
    showModal.value = false
    slugManuallyEdited.value = false
    emailError.value = ''
    codeError.value = ''
    emailAvailable.value = false
    codeAvailable.value = false
    fetchData()
  } catch (error) {
    toast.error(error?.data?.message || 'Erro ao salvar corretor')
  }
}

async function removeRealtor(id: string) {
  if (!confirm('Tem certeza que deseja remover este corretor?')) return
  try {
    await del(`/realtor-links/${id}`)
    toast.success('Corretor removido')
    fetchData()
  } catch (error) {
    toast.error('Erro ao remover corretor')
  }
}

function openCreate() {
  editingRealtor.value = null
  form.value = { name: '', phone: '', creci: '', code: '', projectIds: [], accountEmail: '', accountPassword: '' }
  slugManuallyEdited.value = false
  emailError.value = ''
  codeError.value = ''
  emailAvailable.value = false
  codeAvailable.value = false
  showModal.value = true
}

function openEdit(realtor) {
  editingRealtor.value = realtor
  form.value = {
    name: realtor.name,
    phone: realtor.phone,
    creci: realtor.creci || '',
    code: realtor.code,
    projectIds: realtor.projects?.map(p => p.id) || [],
    accountEmail: '',
    accountPassword: ''
  }
  slugManuallyEdited.value = true
  emailError.value = ''
  codeError.value = ''
  emailAvailable.value = false
  codeAvailable.value = false
  showModal.value = true
}

function getProjectNames(realtor) {
  if (!realtor.projects || realtor.projects.length === 0) return 'Todos'
  return realtor.projects.map(p => p.name).join(', ')
}

function isPendingRealtor(realtor: any) {
  return realtor?.isPending || (typeof realtor?.notes === 'string' && realtor.notes.includes('[PENDING_APPROVAL_REQUEST]'))
}

async function approvePendingRealtor(realtor: any) {
  approvingId.value = realtor.id
  try {
    await patch(`/realtor-links/${realtor.id}`, { enabled: true })
    toast.success('Solicitação aprovada. Corretor ativado com sucesso.')
    await fetchData()
  } catch (error) {
    toast.error(error?.data?.message || 'Erro ao aprovar solicitação do corretor')
  } finally {
    approvingId.value = null
  }
}

function copyLink(realtor, project = null) {
  let url = ''
  
  if (project) {
    url = `${window.location.origin}/${project.slug}?c=${realtor.code}`
  } else if (realtor.projects?.length > 0) {
    // If no specific project provided, copy the first one
    const p = realtor.projects[0]
    url = `${window.location.origin}/${p.slug}?c=${realtor.code}`
  } else {
    // Fallback if no projects
    url = `${window.location.origin}/p?c=${realtor.code}`
  }
  
  navigator.clipboard.writeText(url)
  toast.success('Link copiado!')
}

async function sendInvite() {
  if (!inviteForm.value.email) {
    toast.error('O e-mail é obrigatório para o convite')
    return
  }

  try {
    await post('/agencies/invite', inviteForm.value)
    toast.success('Convite enviado por e-mail!')
    showInviteModal.value = false
    await fetchData() // Refresh
  } catch (err: any) {
    toast.error(err.data?.message || 'Erro ao processar convite')
  }
}

function openInvite() {
  inviteForm.value.email = ''
  inviteForm.value.role = 'CORRETOR'
  // No agencyId = Direct broker if LOTEADORA, or the API will handle if it's IMOBILIARIA
  inviteForm.value.agencyId = ''
  showInviteModal.value = true
}

onMounted(fetchData)

definePageMeta({
  layout: 'default'
})
</script>

<template>
  <div class="page-container">
    <div class="header">
      <div>
        <h1>Gestão de Corretores</h1>
        <p class="subtitle">Gerencie os links e CRECI dos corretores</p>
      </div>
      <div class="header-actions" style="display: flex; gap: 12px;">
        <button class="btn btn-outline" @click="openInvite">
          Convidar Corretor via E-mail
        </button>
        <button class="btn btn-primary" @click="openCreate">
          Vincular Corretor Manualmente
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Carregando...</div>
    
    <div v-else class="card">
      <div v-if="realtors.length === 0" class="empty-state-container d-flex align-items-center justify-content-center py-5">
        <div class="card text-center p-5 rounded-5 max-w-500" style="backdrop-filter: blur(var(--glass-blur));">
          <div class="icon-blob mx-auto mb-4">🤝</div>
          <h3 class="fw-bold mb-3">Nenhum corretor cadastrado</h3>
          <p class="mb-4 px-4">Cadastre corretores para gerenciar links de divulgação dos seus loteamentos.</p>
        </div>
      </div>
      
      <table v-else class="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>CRECI</th>
            <th>Projetos / Links</th>
            <th>Telefone</th>
            <th>Conta</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="realtor in realtors" :key="realtor.id" class="clickable-row" @click="router.push(`/painel/corretores/${realtor.id}`)">
            <td>
              <div class="realtor-name">
                <div class="realtor-avatar-placeholder">{{ realtor.name[0] }}</div>
                <strong>{{ realtor.name }}</strong>
              </div>
            </td>
            <td>{{ realtor.creci || '-' }}</td>
            <td>
              <div v-if="realtor.projects?.length" class="project-links">
                <div v-for="p in realtor.projects" :key="p.id" class="p-link-item">
                  <span class="p-name">{{ p.name }}</span>
                  <button class="btn-copy-small" @click="copyLink(realtor, p)" title="Copiar Link deste projeto">
                    Copiar Link
                  </button>
                </div>
              </div>
              <div v-else class="text-muted">Nenhum projeto selecionado</div>
            </td>
            <td>{{ realtor.phone }}</td>
            <td>
              <div class="account-status-col">
                <span v-if="isPendingRealtor(realtor)" class="badge badge-pending">Pendente</span>
                <span v-else-if="realtor.user" class="badge badge-success">{{ realtor.user.email }}</span>
                <span v-else class="badge badge-neutral">Sem conta</span>
                <button
                  v-if="isPendingRealtor(realtor)"
                  class="btn-copy-small btn-approve"
                  :disabled="approvingId === realtor.id"
                  @click.stop="approvePendingRealtor(realtor)"
                >
                  {{ approvingId === realtor.id ? 'Aprovando...' : 'Aprovar' }}
                </button>
              </div>
            </td>
            <td class="text-right actions vertical-actions">
              <button class="btn-icon" @click.stop="openEdit(realtor)" title="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon text-danger" @click.stop="removeRealtor(realtor.id)" title="Remover">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay">
        <div class="modal modal-lg" @click.stop>
          <div class="modal-header">
            <h2>{{ editingRealtor ? 'Editar Corretor' : 'Novo Corretor' }}</h2>
            <button class="modal-close" @click="showModal = false">&times;</button>
          </div>
          <div class="modal-body">
          <form @submit.prevent="saveRealtor">
            <div class="form-grid">
              <div class="form-group span-2">
                <label class="form-label">Nome do Corretor <span class="required">*</span></label>
                <input v-model="form.name" type="text" class="form-input" placeholder="Nome completo" required @input="onNameInput">
              </div>

              <div class="form-group">
                <label class="form-label">Código de Indicação (Slug) <span class="required">*</span></label>
                <div class="input-wrapper">
                  <input v-model="form.code" type="text" class="form-input" :class="{ 'is-invalid': codeError, 'is-valid': codeAvailable }" placeholder="joao-corretor" required>
                  <span v-if="codeAvailable" class="valid-icon">✓</span>
                </div>
                <span v-if="codeError" class="error-text">{{ codeError }}</span>
                <span v-else-if="codeLoading" class="help-text">Verificando...</span>
                <small v-else class="help-text">Usado no link: ?c={{ form.code || '...' }}</small>
              </div>

              <div class="form-group">
                <label class="form-label">CRECI</label>
                <input v-model="form.creci" type="text" class="form-input" placeholder="Ex: 12345-F">
              </div>

              <div class="form-group">
                <label class="form-label">Telefone (WhatsApp) <span class="required">*</span></label>
                <input v-model="form.phone" type="text" class="form-input" placeholder="(DD) 9XXXX-XXXX" required>
              </div>
            </div>

            <!-- Account credentials section (only for new corretores) -->
            <div v-if="!editingRealtor" class="form-section">
              <h3 class="form-section-title">Conta de Acesso</h3>
              <p class="help-text" style="margin-bottom: 12px;">Crie uma conta para o corretor acessar o painel e acompanhar seus leads e campanhas.</p>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Email de Acesso *</label>
                  <div class="input-wrapper">
                    <input v-model="form.accountEmail" type="email" class="form-input" :class="{ 'is-invalid': emailError, 'is-valid': emailAvailable }" placeholder="corretor@email.com" required autocomplete="off">
                    <span v-if="emailAvailable" class="valid-icon">✓</span>
                  </div>
                  <span v-if="emailError" class="error-text">{{ emailError }}</span>
                  <span v-else-if="emailLoading" class="help-text">Verificando...</span>
                </div>
                <div class="form-group">
                  <label class="form-label">Senha Inicial *</label>
                  <AppPasswordInput v-model="form.accountPassword" :placeholder="PASSWORD_POLICY_HINT" required autocomplete="new-password" />
                  <span v-if="accountPasswordError" class="error-text">{{ accountPasswordError }}</span>
                  <small class="help-text">O corretor poderá alterar depois no painel.</small>
                </div>
              </div>
            </div>

            <div v-if="editingRealtor && editingRealtor.user" class="form-section">
              <h3 class="form-section-title">Conta de Acesso</h3>
              <p class="help-text">{{ editingRealtor.user.email }} — Conta ativa</p>
            </div>

            <div class="form-group projects-selection">
              <label class="form-label">Empreendimentos Vinculados</label>
              <div class="projects-grid">
                <label v-for="p in projects" :key="p.id" class="project-checkbox">
                  <input type="checkbox" :value="p.id" v-model="form.projectIds">
                  <span>{{ p.name }}</span>
                </label>
              </div>
              <p class="help-text" v-if="projects.length === 0">Nenhum empreendimento cadastrado.</p>
              <p class="help-text" v-else>Selecione os empreendimentos que este corretor poderá divulgar.</p>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-ghost" @click="showModal = false">Cancelar</button>
              <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Invite Modal -->
    <Teleport to="body">
      <div v-if="showInviteModal" class="modal-overlay">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h2>Convidar Corretor</h2>
            <button class="modal-close" @click="showInviteModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <p style="color: var(--color-surface-200); margin-bottom: 20px; font-size: 0.875rem;">Envie um e-mail de convite para o corretor se cadastrar sozinho.</p>
          
            <form @submit.prevent="sendInvite">
              <div class="form-group">
                <label class="form-label">E-mail do Corretor</label>
                <input 
                  v-model="inviteForm.email" 
                  type="email" 
                  class="form-input" 
                  placeholder="email@corretor.com.br" 
                  required
                >
              </div>

              <div class="modal-actions">
                <button type="button" class="btn btn-ghost" @click="showInviteModal = false">
                  Cancelar
                </button>
                <button type="submit" class="btn btn-primary" :disabled="!inviteForm.email">
                  Enviar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.page-container {
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

h1 {
  font-size: 24px;
  margin: 0 0 8px 0;
}
.header-actions button {
  color: #fff;
}
.subtitle {
  color: var(--color-surface-400);
  margin: 0;
}

.card {
  background: var(--glass-bg);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
  overflow: hidden;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  padding: 12px 16px;
  background: var(--glass-bg-heavy);
  color: var(--color-surface-400);
  font-weight: 600;
  font-size: 14px;
}

.table td {
  padding: 16px;
  border-bottom: 1px solid var(--glass-border-subtle);
}

.clickable-row {
  cursor: pointer;
  transition: background 150ms;
}
.clickable-row:hover td {
  background: rgba(255, 255, 255, 0.03);
}

.realtor-name {
  display: flex;
  align-items: center;
  gap: 12px;
}

.realtor-photo {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--glass-bg-heavy);
}

.realtor-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.realtor-avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.project-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.p-link-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 8px;
  background: var(--glass-bg-heavy);
  border-radius: 4px;
  font-size: 13px;
}

.p-name {
  font-weight: 500;
  color: var(--color-surface-100);
}

.btn-copy-small {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  color: var(--color-surface-400);
  transition: all 0.2s;
}

.btn-copy-small:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--color-surface-400);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--glass-bg-heavy);
  color: #2563eb;
}

.btn-icon.text-danger:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.btn-icon svg {
  width: 18px;
  height: 18px;
}

/* Modal form specifics */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.span-2 {
  grid-column: span 2;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .span-2 {
    grid-column: span 1;
  }
}

.form-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--glass-border-subtle);
}

.form-section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--color-surface-100);
}

.help-text {
  font-size: 12px;
  color: var(--color-surface-400);
  margin-top: 4px;
}

.error-text {
  font-size: 12px;
  color: #ef4444;
  margin-top: 4px;
}

.form-input.is-invalid {
  border-color: #ef4444;
}

.form-input.is-invalid:focus {
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.1);
}

.form-input.is-valid {
  border-color: #10b981;
  padding-right: 32px;
}

.form-input.is-valid:focus {
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.1);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper .form-input {
  width: 100%;
}

.valid-icon {
  position: absolute;
  right: 10px;
  color: #10b981;
  font-weight: bold;
  font-size: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--glass-border-subtle);
}

.empty-state {
  padding: 48px;
  text-align: center;
  color: var(--color-surface-400);
}

.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.badge-success {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
}

.badge-neutral {
  background: var(--glass-bg-heavy);
  color: var(--color-surface-400);
}

.badge-pending {
  background: rgba(251, 191, 36, 0.14);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.2);
}

.account-status-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.btn-copy-small.btn-approve {
  border-color: rgba(251, 191, 36, 0.35);
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.08);
}

.btn-copy-small.btn-approve:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.text-right {
  text-align: right;
}

.required {
  color: #ef4444;
  margin-left: 2px;
}
</style>
