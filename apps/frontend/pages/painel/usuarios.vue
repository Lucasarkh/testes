<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Usuários</h1>
        <p>{{ authStore.isSysAdmin ? 'Gerenciar usuários internos da Lotio' : 'Gerenciar usuários que acessam o sistema da loteadora' }}</p>
      </div>
      <button class="btn btn-primary" :disabled="!canWriteUsers" :title="!canWriteUsers ? writePermissionHint : undefined" @click="showCreate = true">+ Novo Usuário</button>
    </div>

    <div v-if="!authStore.isSysAdmin" class="permissions-intro card">
      <strong>Escopo deste cadastro</strong>
      <p>
        Este gerenciador controla apenas usuários internos do sistema. Imobiliárias e corretores continuam sendo criados
        nos menus próprios, com seus fluxos específicos.
      </p>
    </div>

    <div v-if="loading" class="loading-state"><div class="loading-spinner"></div></div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button class="btn btn-primary" style="margin-top: 16px;" @click="loadUsers">Tentar novamente</button>
    </div>

    <div v-else-if="users.length === 0" class="empty-state-container d-flex align-items-center justify-content-center py-5">
      <div class="card text-center p-5 rounded-5 max-w-500" style="backdrop-filter: blur(var(--glass-blur));">
        <div class="icon-blob mx-auto mb-4"><i class="bi bi-person-fill" aria-hidden="true"></i></div>
        <h3 class="fw-bold mb-3">Nenhum usuário</h3>
        <p class="mb-4 px-4">Os usuários internos do sistema aparecerão aqui.</p>
      </div>
    </div>

    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Tipo</th>
            <th>Acessos</th>
            <th>Data</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td><strong>{{ u.name }}</strong></td>
            <td>{{ u.email }}</td>
            <td>
              <span class="badge" :class="roleBadge(u.role)">{{ roleLabel(u.role) }}</span>
            </td>
            <td>
              <div v-if="u.role === 'SYSADMIN'" class="permission-tags">
                <span class="permission-chip permission-chip--write">Acesso total</span>
              </div>
              <div v-else class="permission-tags">
                <span
                  v-for="permission in permissionPreview(u.panelPermissions)"
                  :key="`${u.id}-${permission.key}`"
                  class="permission-chip"
                  :class="permission.level === 'write' ? 'permission-chip--write' : 'permission-chip--read'"
                >
                  {{ permission.label }}: {{ permissionLevelLabel(permission.level) }}
                </span>
                <span v-if="permissionPreview(u.panelPermissions).length === 0" class="permission-empty">Sem acessos definidos</span>
              </div>
            </td>
            <td>{{ formatDateToBrasilia(u.createdAt) }}</td>
            <td>
              <div class="flex gap-2">
                <button class="btn btn-secondary btn-sm" :disabled="!canWriteUsers" :title="!canWriteUsers ? writePermissionHint : undefined" @click="startEdit(u)">Editar</button>
                <button class="btn btn-danger btn-sm" @click="deleteUser(u)" :disabled="!canWriteUsers || u.id === authStore.user?.id" :title="!canWriteUsers ? writePermissionHint : undefined">Excluir</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="meta.totalPages > 1" style="margin-top: 16px; padding: 0 16px 16px;">
        <CommonPagination
          :current-page="meta.currentPage"
          :total-pages="meta.totalPages"
          @change="loadUsers"
        />
      </div>
    </div>

    <div v-if="showCreate || editingUser" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingUser ? 'Editar Usuário' : 'Novo Usuário' }}</h2>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <form @submit.prevent="editingUser ? saveEdit() : createUser()">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nome</label>
              <input v-model="form.name" class="form-input" required minlength="2" />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input v-model="form.email" class="form-input" type="email" required :disabled="!!editingUser" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ editingUser ? 'Nova Senha (deixe vazio para manter)' : 'Senha' }}</label>
              <AppPasswordInput v-model="form.password" :required="!editingUser" :placeholder="editingUser ? 'Deixe vazio para manter a atual' : PASSWORD_POLICY_HINT" />
              <div v-if="modalPasswordError" class="form-error">{{ modalPasswordError }}</div>
            </div>
            <div class="form-group">
              <label class="form-label">Tipo de usuário</label>
              <div class="form-static-value">
                {{ authStore.isSysAdmin ? 'Administrador do sistema' : 'Usuário interno do sistema' }}
              </div>
            </div>
            <div v-if="!authStore.isSysAdmin" class="form-group">
              <label class="form-label">Permissões por funcionalidade</label>
              <div class="permissions-grid">
                <div v-for="feature in panelFeatures" :key="feature.key" class="permission-row">
                  <div class="permission-row__info">
                    <strong>{{ feature.label }}</strong>
                    <small>{{ feature.description }}</small>
                  </div>
                  <select v-model="form.panelPermissions[feature.key]" class="form-select permission-select">
                    <option value="none">Oculto</option>
                    <option value="read">Leitura</option>
                    <option value="write">Edição</option>
                  </select>
                </div>
              </div>
              <small class="form-hint">Tudo que ficar como oculto será removido do menu e bloqueado nas rotas.</small>
            </div>
            <div v-if="formError" class="alert alert-error">{{ formError }}</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-ghost" @click="closeModal">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="formLoading">
              {{ formLoading ? 'Salvando...' : editingUser ? 'Salvar' : 'Criar' }}
            </button>
          </div>
        </form>
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
import {
  buildEmptyPanelPermissions,
  countAssignedPanelFeatures,
  normalizePanelPermissions,
  PANEL_FEATURES,
} from '~/utils/panelPermissions'

const { fetchApi } = useApi()
const authStore = useAuthStore()
const { success: toastSuccess, fromError: toastFromError } = useToast()

const loading = ref(true)
const error = ref('')
const users = ref([])
const meta = ref({ total: 0, page: 1, limit: 10, totalPages: 0, currentPage: 1 })
const showCreate = ref(false)
const editingUser = ref(null)
const formLoading = ref(false)
const formError = ref('')
const panelFeatures = PANEL_FEATURES
const canWriteUsers = computed(() => authStore.isSysAdmin || authStore.canWriteFeature('users'))
const writePermissionHint = 'Disponível apenas para usuários com permissão de edição'

const getDefaultRole = () => (authStore.isSysAdmin ? 'SYSADMIN' : 'LOTEADORA')
const buildDefaultForm = () => ({
  name: '',
  email: '',
  password: '',
  role: getDefaultRole(),
  panelPermissions: buildEmptyPanelPermissions()
})

const form = ref(buildDefaultForm())

const modalPasswordError = computed(() => {
  if (!form.value.password) return ''
  return getPasswordPolicyError(form.value.password)
})

const roleBadge = (r) => ({ SYSADMIN: 'badge-danger', LOTEADORA: 'badge-primary', IMOBILIARIA: 'badge-info', CORRETOR: 'badge-neutral' }[r] || 'badge-neutral')
const roleLabel = (r) => ({ SYSADMIN: 'System Admin', LOTEADORA: 'Usuário do sistema', IMOBILIARIA: 'Imobiliária', CORRETOR: 'Corretor' }[r] || r)
const permissionLevelLabel = (level) => ({ read: 'Leitura', write: 'Edição', none: 'Oculto' }[level] || level)

const permissionPreview = (permissions) => {
  const normalized = normalizePanelPermissions(permissions)
  return panelFeatures
    .filter(feature => normalized[feature.key] !== 'none')
    .map(feature => ({ key: feature.key, label: feature.label, level: normalized[feature.key] }))
}

const loadUsers = async (page = 1) => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetchApi(`/users?page=${page}&limit=10`)
    users.value = res.data
    meta.value = res.meta
  } catch (e) {
    error.value = 'Não foi possível carregar os usuários.'
    toastFromError(e, 'Erro ao carregar usuários')
  }
  loading.value = false
}

const closeModal = () => {
  showCreate.value = false
  editingUser.value = null
  formError.value = ''
  form.value = buildDefaultForm()
}

const validateTenantPermissions = () => {
  if (authStore.isSysAdmin) return true
  if (countAssignedPanelFeatures(form.value.panelPermissions) === 0) {
    formError.value = 'Selecione pelo menos uma funcionalidade com leitura ou edição.'
    return false
  }
  return true
}

const createUser = async () => {
  if (!canWriteUsers.value) return
  const passwordError = getPasswordPolicyError(form.value.password)
  if (passwordError) {
    formError.value = passwordError
    return
  }
  if (!validateTenantPermissions()) return

  formLoading.value = true
  formError.value = ''
  try {
    const payload = {
      name: form.value.name,
      email: form.value.email,
      password: form.value.password,
      role: form.value.role,
      panelPermissions: authStore.isSysAdmin ? undefined : form.value.panelPermissions,
    }
    await fetchApi('/users', { method: 'POST', body: JSON.stringify(payload) })
    await loadUsers(1)
    closeModal()
    toastSuccess('Usuário criado com sucesso!')
  } catch (e) {
    formError.value = e.message
    toastFromError(e, 'Erro ao criar usuário')
  }
  formLoading.value = false
}

const startEdit = (u) => {
  if (!canWriteUsers.value) return
  editingUser.value = u
  form.value = {
    name: u.name,
    email: u.email,
    password: '',
    role: authStore.isSysAdmin ? u.role : 'LOTEADORA',
    panelPermissions: normalizePanelPermissions(u.panelPermissions),
  }
}

const saveEdit = async () => {
  if (!canWriteUsers.value) return
  if (form.value.password) {
    const passwordError = getPasswordPolicyError(form.value.password)
    if (passwordError) {
      formError.value = passwordError
      return
    }
  }
  if (!validateTenantPermissions()) return

  formLoading.value = true
  formError.value = ''
  try {
    const payload = {
      name: form.value.name,
      role: form.value.role,
      panelPermissions: authStore.isSysAdmin ? undefined : form.value.panelPermissions,
    }
    if (form.value.password) payload.password = form.value.password
    const u = await fetchApi(`/users/${editingUser.value.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    Object.assign(editingUser.value, u)
    closeModal()
    toastSuccess('Usuário atualizado!')
  } catch (e) {
    formError.value = e.message
    toastFromError(e, 'Erro ao atualizar usuário')
  }
  formLoading.value = false
}

const deleteUser = async (u) => {
  if (!canWriteUsers.value) return
  if (!confirm(`Excluir "${u.name}"?`)) return
  try {
    await fetchApi(`/users/${u.id}`, { method: 'DELETE' })
    users.value = users.value.filter(x => x.id !== u.id)
    toastSuccess('Usuário excluído')
  } catch (e) {
    toastFromError(e, 'Erro ao excluir usuário')
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.permissions-intro {
  margin-bottom: 20px;
  padding: 16px 18px;
}

.permissions-intro p {
  margin: 8px 0 0;
  color: var(--color-surface-300);
}

.permission-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.permission-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(148, 163, 184, 0.14);
  color: var(--color-surface-100);
}

.permission-chip--read {
  background: rgba(59, 130, 246, 0.16);
  color: #bfdbfe;
}

.permission-chip--write {
  background: rgba(16, 185, 129, 0.16);
  color: #bbf7d0;
}

.permission-empty {
  color: var(--color-surface-400);
  font-size: 0.8125rem;
}

.form-static-value {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--glass-border-subtle, rgba(255, 255, 255, 0.08));
  background: rgba(255, 255, 255, 0.03);
  color: var(--color-surface-100);
}

.permissions-grid {
  display: grid;
  gap: 12px;
}

.permission-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--glass-border-subtle, rgba(255, 255, 255, 0.08));
  background: rgba(255, 255, 255, 0.03);
}

.permission-row__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.permission-row__info small,
.form-hint {
  color: var(--color-surface-400);
}

.permission-select {
  min-width: 0;
}

@media (max-width: 900px) {
  .permission-row {
    grid-template-columns: 1fr;
  }
}
</style>