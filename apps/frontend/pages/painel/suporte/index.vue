<template>
  <div class="suporte-page">
    <div class="page-header">
      <div>
        <h1>Suporte</h1>
        <p v-if="authStore.isSysAdmin">Gerencie todos os tickets de suporte da plataforma.</p>
        <p v-else>Abra um ticket para solicitar ajuda. Nossa equipe responderá em breve.</p>
      </div>
      <button v-if="!authStore.isSysAdmin" class="btn btn-primary" @click="showCreateModal = true">
        <i class="pi pi-plus mr-2"></i>
        Novo Ticket
      </button>
    </div>

    <!-- Status filter tabs -->
    <div class="filter-tabs">
      <button
        v-for="tab in statusTabs"
        :key="tab.value"
        class="filter-tab"
        :class="{ active: activeTab === tab.value }"
        @click="activeTab = tab.value; fetchTickets()"
      >
        {{ tab.label }}
        <span v-if="tab.count !== undefined" class="tab-badge" :class="tab.value === 'OPEN' ? 'tab-badge-alert' : ''">{{ tab.count }}</span>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="tickets.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="2"/>
          <line x1="9" y1="12" x2="15" y2="12"/>
          <line x1="9" y1="16" x2="13" y2="16"/>
        </svg>
      </div>
      <h3>Nenhum ticket encontrado</h3>
      <p v-if="!authStore.isSysAdmin">Clique em "Novo Ticket" para abrir uma solicitação de suporte.</p>
      <p v-else>Nenhum ticket com este status no momento.</p>
    </div>

    <div v-else class="tickets-list">
      <NuxtLink
        v-for="ticket in tickets"
        :key="ticket.id"
        :to="`/painel/suporte/${ticket.id}`"
        class="ticket-card"
      >
        <div class="ticket-card-left">
          <div class="ticket-status-dot" :class="`status-${ticket.status.toLowerCase()}`"></div>
        </div>
        <div class="ticket-card-content">
          <div class="ticket-card-header">
            <span class="ticket-title">{{ ticket.title }}</span>
            <div class="ticket-badges">
              <span class="badge" :class="priorityClass(ticket.priority)">{{ priorityLabel(ticket.priority) }}</span>
              <span class="badge badge-neutral">{{ categoryLabel(ticket.category) }}</span>
            </div>
          </div>
          <div class="ticket-card-meta">
            <span v-if="authStore.isSysAdmin" class="ticket-author">
              <i class="pi pi-user"></i>
              {{ ticket.user?.name }} ({{ roleLabel(ticket.user?.role) }})
            </span>
            <span class="ticket-date">
              <i class="pi pi-clock"></i>
              {{ formatDateToBrasilia(ticket.createdAt) }}
            </span>
            <span class="ticket-msg-count">
              <i class="pi pi-comments"></i>
              {{ ticket._count?.messages ?? 0 }}
            </span>
          </div>
        </div>
        <div class="ticket-card-right">
          <span class="ticket-status-badge" :class="`status-badge-${ticket.status.toLowerCase()}`">
            {{ statusLabel(ticket.status) }}
          </span>
          <i class="pi pi-chevron-right ticket-arrow"></i>
        </div>
      </NuxtLink>
    </div>

    <!-- Pagination -->
    <div v-if="meta.totalPages > 1" class="pagination">
      <button :disabled="meta.page <= 1" @click="goToPage(meta.page - 1)" class="btn btn-ghost btn-sm">
        <i class="pi pi-chevron-left"></i>
      </button>
      <span class="page-info">{{ meta.page }} / {{ meta.totalPages }}</span>
      <button :disabled="meta.page >= meta.totalPages" @click="goToPage(meta.page + 1)" class="btn btn-ghost btn-sm">
        <i class="pi pi-chevron-right"></i>
      </button>
    </div>

    <!-- Create Ticket Modal -->
    <div v-if="showCreateModal" class="modal-overlay">
      <div class="modal-box">
        <div class="modal-header">
          <h3>Novo Ticket de Suporte</h3>
          <button class="modal-close" @click="showCreateModal = false">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <form @submit.prevent="submitTicket" class="modal-body">
          <div class="form-group">
            <label>Título *</label>
            <input v-model="form.title" type="text" class="form-control" placeholder="Descreva o problema brevemente" maxlength="200" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Categoria</label>
              <select v-model="form.category" class="form-control">
                <option value="GENERAL">Geral</option>
                <option value="TECHNICAL">Técnico</option>
                <option value="BILLING">Financeiro</option>
                <option value="FEATURE_REQUEST">Sugestão de Melhoria</option>
                <option value="BUG">Bug</option>
              </select>
            </div>
            <div class="form-group">
              <label>Prioridade</label>
              <select v-model="form.priority" class="form-control">
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Descrição *</label>
            <textarea
              v-model="form.description"
              class="form-control"
              rows="5"
              placeholder="Descreva seu problema em detalhes: o que aconteceu, o que esperava que acontecesse, passos para reproduzir..."
              required
              minlength="10"
              maxlength="5000"
            ></textarea>
            <span class="char-count">{{ form.description.length }}/5000</span>
          </div>
          <div v-if="createError" class="form-error">{{ createError }}</div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showCreateModal = false">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="createLoading">
              {{ createLoading ? 'Enviando...' : 'Abrir Ticket' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
const api = useApi()
const toast = useToast()
const authStore = useAuthStore()
const router = useRouter()

const loading = ref(true)
const tickets = ref([])
const meta = ref({ page: 1, totalPages: 1, total: 0 })
const activeTab = ref('all')
const counts = ref({})

const showCreateModal = ref(false)
const createLoading = ref(false)
const createError = ref('')
const form = ref({ title: '', description: '', category: 'GENERAL', priority: 'MEDIUM' })

const statusTabs = computed(() => {
  const tabs = [
    { value: 'all', label: 'Todos' },
    { value: 'OPEN', label: 'Abertos', count: counts.value.OPEN },
    { value: 'IN_PROGRESS', label: 'Em Andamento', count: counts.value.IN_PROGRESS },
    { value: 'WAITING_USER', label: 'Aguardando', count: counts.value.WAITING_USER },
    { value: 'RESOLVED', label: 'Resolvidos', count: counts.value.RESOLVED },
    { value: 'CLOSED', label: 'Fechados', count: counts.value.CLOSED },
  ]
  return tabs.filter(t => t.value === 'all' || t.count == null || t.count > 0 || activeTab.value === t.value)
})

async function fetchTickets(page = 1) {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(page), limit: '15' })
    if (activeTab.value !== 'all') params.set('status', activeTab.value)
    const res = await api.get(`/support/tickets?${params}`)
    tickets.value = res.data
    meta.value = res.meta
  } catch (e) {
    toast.fromError(e, 'Erro ao carregar tickets.')
  } finally {
    loading.value = false
  }
}

async function fetchCounts() {
  try {
    const statuses = ['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED']
    const results = await Promise.all(
      statuses.map(s => api.get(`/support/tickets?status=${s}&limit=1`).then(r => ({ s, count: r.meta.total })).catch(() => ({ s, count: 0 })))
    )
    counts.value = Object.fromEntries(results.map(r => [r.s, r.count]))
  } catch {}
}

async function submitTicket() {
  if (!form.value.title.trim() || !form.value.description.trim()) return
  createLoading.value = true
  createError.value = ''
  try {
    const ticket = await api.post('/support/tickets', {
      title: form.value.title.trim(),
      description: form.value.description.trim(),
      category: form.value.category,
      priority: form.value.priority,
    })
    toast.success('Ticket aberto com sucesso!')
    showCreateModal.value = false
    form.value = { title: '', description: '', category: 'GENERAL', priority: 'MEDIUM' }
    router.push(`/painel/suporte/${ticket.id}`)
  } catch (e) {
    createError.value = e.message || 'Erro ao criar ticket.'
  } finally {
    createLoading.value = false
  }
}

function goToPage(page) {
  fetchTickets(page)
  meta.value.page = page
}

function statusLabel(s) {
  const m = { OPEN: 'Aberto', IN_PROGRESS: 'Em Andamento', WAITING_USER: 'Aguardando Resposta', RESOLVED: 'Resolvido', CLOSED: 'Fechado' }
  return m[s] ?? s
}
function priorityLabel(p) {
  const m = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente' }
  return m[p] ?? p
}
function priorityClass(p) {
  return { LOW: 'badge-neutral', MEDIUM: 'badge-info', HIGH: 'badge-warning', URGENT: 'badge-danger' }[p] ?? 'badge-neutral'
}
function categoryLabel(c) {
  const m = { GENERAL: 'Geral', TECHNICAL: 'Técnico', BILLING: 'Financeiro', FEATURE_REQUEST: 'Melhoria', BUG: 'Bug' }
  return m[c] ?? c
}
function roleLabel(r) {
  return { SYSADMIN: 'Admin', LOTEADORA: 'Loteadora', IMOBILIARIA: 'Imobiliária', CORRETOR: 'Corretor' }[r] ?? r
}

onMounted(async () => {
  await Promise.all([fetchTickets(), fetchCounts()])
})
</script>

<style scoped>
.suporte-page { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1.5rem; gap: 1rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-surface-50); margin: 0 0 0.25rem; }
.page-header p { color: var(--color-surface-400); font-size: 0.875rem; margin: 0; }

.filter-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.filter-tab {
  padding: 0.5rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--glass-border);
  background: var(--glass-bg-light); color: var(--color-surface-300); font-size: 0.875rem;
  cursor: pointer; transition: all 150ms ease; display: flex; align-items: center; gap: 6px;
  font-family: inherit;
}
.filter-tab:hover { background: var(--glass-bg-hover); color: var(--color-surface-50); }
.filter-tab.active { background: rgba(16,185,129,0.12); color: var(--color-primary-400); border-color: rgba(16,185,129,0.3); font-weight: 600; }
.tab-badge { background: rgba(255,255,255,0.1); border-radius: 10px; padding: 0 6px; font-size: 0.75rem; min-width: 20px; text-align: center; }
.tab-badge-alert { background: rgba(234,179,8,0.2); color: #fbbf24; }

.loading-state { display: flex; justify-content: center; padding: 3rem; }
.loading-spinner { width: 36px; height: 36px; border: 3px solid rgba(52,211,153,0.15); border-top-color: var(--color-primary-400); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { text-align: center; padding: 4rem 2rem; }
.empty-icon { color: var(--color-surface-600); margin: 0 auto 1rem; display: inline-block; }
.empty-state h3 { font-size: 1.125rem; font-weight: 600; color: var(--color-surface-200); margin: 0 0 0.5rem; }
.empty-state p { color: var(--color-surface-400); font-size: 0.875rem; margin: 0; }

.tickets-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }

.ticket-card {
  display: flex; align-items: center; gap: 1rem;
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg); padding: 1rem 1.25rem; cursor: pointer;
  transition: all 150ms ease; text-decoration: none;
}
.ticket-card:hover { background: var(--glass-bg-hover); border-color: rgba(52,211,153,0.22); transform: translateY(-1px); }

.ticket-card-left { flex-shrink: 0; }
.ticket-status-dot { width: 10px; height: 10px; border-radius: 50%; }
.status-open { background: #34d399; }
.status-in_progress { background: #60a5fa; }
.status-waiting_user { background: #fbbf24; }
.status-resolved { background: #a78bfa; }
.status-closed { background: #6b7280; }

.ticket-card-content { flex: 1; min-width: 0; }
.ticket-card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
.ticket-title { font-size: 0.9375rem; font-weight: 600; color: var(--color-surface-100); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.ticket-badges { display: flex; gap: 0.4rem; flex-shrink: 0; }
.ticket-card-meta { display: flex; gap: 1rem; flex-wrap: wrap; }
.ticket-author, .ticket-date, .ticket-msg-count {
  display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: var(--color-surface-400);
}

.ticket-card-right { flex-shrink: 0; display: flex; align-items: center; gap: 0.75rem; }
.ticket-status-badge { font-size: 0.75rem; font-weight: 600; padding: 3px 8px; border-radius: var(--radius-sm); white-space: nowrap; }
.status-badge-open { background: rgba(52,211,153,0.12); color: #34d399; }
.status-badge-in_progress { background: rgba(96,165,250,0.12); color: #60a5fa; }
.status-badge-waiting_user { background: rgba(251,191,36,0.12); color: #fbbf24; }
.status-badge-resolved { background: rgba(167,139,250,0.12); color: #a78bfa; }
.status-badge-closed { background: rgba(107,114,128,0.12); color: #9ca3af; }
.ticket-arrow { color: var(--color-surface-600); font-size: 0.75rem; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; }
.page-info { font-size: 0.875rem; color: var(--color-surface-400); }

/* badges */
.badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 600; }
.badge-neutral { background: rgba(107,114,128,0.15); color: #9ca3af; }
.badge-info { background: rgba(96,165,250,0.12); color: #60a5fa; }
.badge-warning { background: rgba(251,191,36,0.12); color: #fbbf24; }
.badge-danger { background: rgba(239,68,68,0.12); color: #f87171; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem;
}
.modal-box {
  background: var(--glass-bg-heavy); border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl); width: 100%; max-width: 540px; box-shadow: var(--glass-shadow-lg);
  max-height: 90vh; overflow-y: auto;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--glass-border);
}
.modal-header h3 { font-size: 1rem; font-weight: 700; color: var(--color-surface-50); margin: 0; }
.modal-close {
  background: none; border: none; color: var(--color-surface-400); cursor: pointer;
  padding: 4px; border-radius: var(--radius-sm); transition: color 150ms ease; font-size: 1rem;
}
.modal-close:hover { color: var(--color-surface-100); }
.modal-body { padding: 1.5rem; }
.form-group { margin-bottom: 1rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
label { display: block; font-size: 0.8125rem; font-weight: 600; color: var(--color-surface-300); margin-bottom: 0.375rem; }
.form-control {
  width: 100%; padding: 0.625rem 0.875rem; border-radius: var(--radius-md); font-size: 0.875rem;
  background: var(--glass-bg); border: 1px solid var(--glass-border);
  color: var(--color-surface-100); font-family: inherit; transition: border-color 150ms ease;
  box-sizing: border-box;
}
.form-control:focus { outline: none; border-color: rgba(52,211,153,0.4); }
textarea.form-control { resize: vertical; min-height: 100px; }
.char-count { font-size: 0.75rem; color: var(--color-surface-500); float: right; margin-top: 4px; }
.form-error { background: rgba(239,68,68,0.1); color: #f87171; padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.875rem; margin-top: 0.5rem; border: 1px solid rgba(239,68,68,0.2); }
.modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--glass-border-subtle); }

@media (max-width: 767px) {
  .suporte-page { padding: 16px; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .page-header > a, .page-header > button { align-self: flex-end; }
  .ticket-card { flex-wrap: wrap; gap: 8px; }
  .ticket-card-right { margin-left: auto; }
  .form-row { grid-template-columns: 1fr !important; }
  .modal-box { margin: 16px; width: calc(100% - 32px); max-width: 100%; }
}
</style>
