<script setup lang="ts">

const { fetchApi } = useApi()
const { success: toastSuccess, error: toastError } = useToast()
const authStore = useAuthStore()

if (!authStore.isLoteadora) {
  await navigateTo('/painel')
}

interface InviteCode {
  id: string
  code: string
  description: string | null
  role: string
  isActive: boolean
  usageCount: number
  maxUses: number | null
  expiresAt: string | null
  createdAt: string
}

const codes = ref<InviteCode[]>([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const copiedId = ref<string | null>(null)

const form = ref({
  description: '',
  role: 'CORRETOR' as 'CORRETOR' | 'IMOBILIARIA',
  maxUses: '',
  expiresAt: ''
})

const baseUrl = computed(() => {
  if (import.meta.client) {
    return window.location.origin
  }
  return ''
})

function registrationLink(code: string) {
  return `${baseUrl.value}/cadastro/${code}`
}

async function fetchCodes() {
  loading.value = true
  try {
    const data = await fetchApi('/agencies/invite-codes')
    codes.value = Array.isArray(data) ? data : []
  } catch (err: any) {
    console.error('Failed to load invite codes:', err?.message)
    codes.value = []
  } finally {
    loading.value = false
  }
}

function openModal() {
  form.value = { description: '', role: 'CORRETOR', maxUses: '', expiresAt: '' }
  showModal.value = true
}

async function saveCode() {
  saving.value = true
  try {
    const payload: any = {
      role: form.value.role,
      description: form.value.description || undefined,
      maxUses: form.value.maxUses ? parseInt(form.value.maxUses) : undefined,
      expiresAt: form.value.expiresAt || undefined
    }
    await fetchApi('/agencies/invite-codes', { method: 'POST', body: payload })
    toastSuccess('Link de cadastro criado com sucesso.')
    showModal.value = false
    fetchCodes()
  } catch (err: any) {
    toastError(err.message || 'Erro ao criar link.')
  } finally {
    saving.value = false
  }
}

async function toggleActive(code: InviteCode) {
  try {
    await fetchApi(`/agencies/invite-codes/${code.id}`, {
      method: 'PATCH',
      body: { isActive: !code.isActive }
    })
    code.isActive = !code.isActive
    toastSuccess(code.isActive ? 'Link ativado.' : 'Link desativado.')
  } catch {
    toastError('Erro ao atualizar link.')
  }
}

async function deleteCode(code: InviteCode) {
  if (!confirm(`Excluir o link "${code.description || code.code}"? Esta ação não pode ser desfeita.`)) return
  try {
    await fetchApi(`/agencies/invite-codes/${code.id}`, { method: 'DELETE' })
    codes.value = codes.value.filter(c => c.id !== code.id)
    toastSuccess('Link excluído.')
  } catch {
    toastError('Erro ao excluir link.')
  }
}

async function copyLink(code: InviteCode) {
  const link = registrationLink(code.code)
  try {
    await navigator.clipboard.writeText(link)
    copiedId.value = code.id
    setTimeout(() => { copiedId.value = null }, 2000)
  } catch {
    toastError('Não foi possível copiar o link.')
  }
}

function roleLabel(role: string) {
  return role === 'IMOBILIARIA' ? 'Imobiliária' : 'Corretor'
}

function formatDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('pt-BR')
}

onMounted(fetchCodes)
</script>

<template>
  <div class="links-page">
    <div class="page-header">
      <div>
        <h1>Links de Cadastro</h1>
        <p>Compartilhe links para que imobiliárias e corretores se cadastrem e se vinculem automaticamente à sua loteadora.</p>
      </div>
      <button class="btn btn-primary" @click="openModal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo Link
      </button>
    </div>

    <!-- Info box -->
    <div class="info-box">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="flex-shrink:0; color:var(--color-primary-400)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>Qualquer pessoa com o link pode se cadastrar e acessar o painel vinculado à sua conta. Desative links não utilizados para manter o controle de acesso.</span>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="codes.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
      </svg>
      <h3>Nenhum link criado</h3>
      <p>Crie seu primeiro link de cadastro para compartilhar com imobiliárias e corretores.</p>
      <button class="btn btn-primary" @click="openModal">Criar Link</button>
    </div>

    <div v-else class="codes-grid">
      <div v-for="code in codes" :key="code.id" class="code-card" :class="{ inactive: !code.isActive }">
        <div class="code-card-header">
          <div class="code-meta">
            <span class="role-badge" :class="code.role === 'IMOBILIARIA' ? 'imob' : 'corr'">
              {{ roleLabel(code.role) }}
            </span>
            <span v-if="!code.isActive" class="inactive-badge">Inativo</span>
          </div>
          <div class="code-actions">
            <button class="icon-btn" :title="code.isActive ? 'Desativar' : 'Ativar'" @click="toggleActive(code)">
              <svg v-if="code.isActive" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2v10"/><path d="M5.636 5.636a9 9 0 1 0 12.728 12.728"/></svg>
            </button>
            <button class="icon-btn danger" title="Excluir" @click="deleteCode(code)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            </button>
          </div>
        </div>

        <div class="code-description">{{ code.description || 'Sem descrição' }}</div>

        <div class="code-url-row">
          <span class="code-url">{{ registrationLink(code.code) }}</span>
          <button class="copy-btn" :class="{ copied: copiedId === code.id }" @click="copyLink(code)">
            <svg v-if="copiedId !== code.id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
            {{ copiedId === code.id ? 'Copiado!' : 'Copiar' }}
          </button>
        </div>

        <div class="code-stats">
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            {{ code.usageCount }} uso{{ code.usageCount !== 1 ? 's' : '' }}{{ code.maxUses ? ` / ${code.maxUses}` : '' }}
          </span>
          <span v-if="code.expiresAt">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16.5 12"/></svg>
            Expira em {{ formatDate(code.expiresAt) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal">
          <div class="modal-header">
            <h2>Novo Link de Cadastro</h2>
            <button class="modal-close" @click="showModal = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Perfil de acesso <span class="required">*</span></label>
              <div class="role-options">
                <label class="role-option" :class="{ selected: form.role === 'CORRETOR' }">
                  <input type="radio" v-model="form.role" value="CORRETOR" />
                  <span>Corretor</span>
                </label>
                <label class="role-option" :class="{ selected: form.role === 'IMOBILIARIA' }">
                  <input type="radio" v-model="form.role" value="IMOBILIARIA" />
                  <span>Imobiliária</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Descrição (opcional)</label>
              <input v-model="form.description" type="text" class="form-input" placeholder="Ex: Link para corretores da Remax" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Limite de usos (opcional)</label>
                <input v-model="form.maxUses" type="number" class="form-input" placeholder="Ilimitado" min="1" />
              </div>
              <div class="form-group">
                <label class="form-label">Expira em (opcional)</label>
                <input v-model="form.expiresAt" type="date" class="form-input" />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showModal = false">Cancelar</button>
            <button class="btn btn-primary" :disabled="saving" @click="saveCode">
              {{ saving ? 'Criando...' : 'Criar Link' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.page-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  margin-bottom: 24px; flex-wrap: wrap;
}
.page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-surface-50); margin: 0 0 4px; }
.page-header p { font-size: 0.875rem; color: var(--color-surface-300); margin: 0; }

.info-box {
  display: flex; align-items: flex-start; gap: 10px;
  background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: var(--radius-md); padding: 12px 16px;
  font-size: 0.875rem; color: var(--color-surface-300);
  margin-bottom: 24px;
}

.loading-state { display: flex; justify-content: center; padding: 64px; }
.spinner {
  width: 36px; height: 36px;
  border: 3px solid rgba(16,185,129,0.15);
  border-top-color: var(--color-primary-500);
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state {
  text-align: center; padding: 64px 32px;
  color: var(--color-surface-400);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.empty-state h3 { font-size: 1.125rem; font-weight: 600; color: var(--color-surface-200); margin: 0; }
.empty-state p { margin: 0; font-size: 0.875rem; }

.codes-grid { display: flex; flex-direction: column; gap: 12px; }

.code-card {
  background: var(--glass-bg, rgba(255,255,255,0.04));
  border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  transition: border-color 150ms ease;
}
.code-card:hover { border-color: rgba(16,185,129,0.2); }
.code-card.inactive { opacity: 0.6; }

.code-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.code-meta { display: flex; align-items: center; gap: 8px; }
.code-actions { display: flex; align-items: center; gap: 6px; }

.role-badge {
  font-size: 0.75rem; font-weight: 600; padding: 2px 10px;
  border-radius: 99px; text-transform: uppercase; letter-spacing: 0.04em;
}
.role-badge.corr { background: rgba(59,130,246,0.12); color: #93c5fd; border: 1px solid rgba(59,130,246,0.2); }
.role-badge.imob { background: rgba(168,85,247,0.12); color: #c4b5fd; border: 1px solid rgba(168,85,247,0.2); }
.inactive-badge {
  font-size: 0.7rem; font-weight: 600; padding: 2px 8px;
  border-radius: 99px; background: rgba(239,68,68,0.1); color: #fca5a5;
  border: 1px solid rgba(239,68,68,0.15);
}

.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: var(--radius-sm);
  border: none; background: none; cursor: pointer;
  color: var(--color-surface-400); transition: all 150ms ease;
}
.icon-btn:hover { background: rgba(255,255,255,0.06); color: var(--color-surface-100); }
.icon-btn.danger:hover { background: rgba(239,68,68,0.1); color: #fca5a5; }

.code-description { font-size: 0.875rem; color: var(--color-surface-300); margin-bottom: 12px; }

.code-url-row {
  display: flex; align-items: center; gap: 8px;
  background: rgba(0,0,0,0.2); border-radius: var(--radius-sm);
  padding: 8px 12px; margin-bottom: 12px;
}
.code-url {
  flex: 1; font-size: 0.8125rem; font-family: monospace;
  color: var(--color-primary-300); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.copy-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: var(--radius-sm);
  border: 1px solid rgba(16,185,129,0.2); background: rgba(16,185,129,0.06);
  color: var(--color-primary-400); font-size: 0.75rem; font-weight: 600;
  cursor: pointer; transition: all 150ms ease; white-space: nowrap;
}
.copy-btn:hover { background: rgba(16,185,129,0.12); }
.copy-btn.copied { background: rgba(16,185,129,0.15); color: var(--color-primary-300); }

.code-stats {
  display: flex; align-items: center; gap: 16px;
  font-size: 0.8125rem; color: var(--color-surface-400);
}
.code-stats span { display: flex; align-items: center; gap: 4px; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 16px;
}
.modal {
  background: var(--color-surface-900, #111827);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius-xl); width: 100%; max-width: 480px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 0; margin-bottom: 20px;
}
.modal-header h2 { font-size: 1.125rem; font-weight: 700; color: var(--color-surface-50); margin: 0; }
.modal-close {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: var(--radius-sm);
  border: none; background: none; cursor: pointer;
  color: var(--color-surface-400); transition: all 150ms ease;
}
.modal-close:hover { background: rgba(255,255,255,0.06); color: var(--color-surface-100); }
.modal-body { padding: 0 24px; display: flex; flex-direction: column; gap: 16px; }
.modal-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 10px;
  padding: 20px 24px;
}

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-label { font-size: 0.875rem; font-weight: 600; color: var(--color-surface-200); }
.required { color: #f87171; }
.form-input {
  width: 100%; padding: 10px 14px; border-radius: var(--radius-md);
  border: 1.5px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04); color: var(--color-surface-50);
  font-size: 0.9375rem; transition: all 150ms ease; box-sizing: border-box;
}
.form-input:focus { outline: none; border-color: var(--color-primary-500); box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
.form-input::placeholder { color: var(--color-surface-500); }

.role-options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.role-option {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px; border-radius: var(--radius-md);
  border: 1.5px solid rgba(255,255,255,0.1);
  cursor: pointer; font-size: 0.9375rem; font-weight: 600;
  color: var(--color-surface-300); transition: all 150ms ease;
}
.role-option input { display: none; }
.role-option.selected { border-color: var(--color-primary-500); color: var(--color-primary-400); background: rgba(16,185,129,0.08); }

.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 20px; border-radius: var(--radius-md);
  font-weight: 600; font-size: 0.9375rem;
  cursor: pointer; transition: all 150ms ease; border: none;
}
.btn-primary { background: var(--color-primary-600); color: white; }
.btn-primary:hover:not(:disabled) { background: var(--color-primary-500); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost { background: transparent; color: var(--color-surface-300); border: 1px solid rgba(255,255,255,0.1); }
.btn-ghost:hover { background: rgba(255,255,255,0.06); color: var(--color-surface-100); }
</style>
