<template>
  <div>
    <div class="page-header d-flex justify-content-between align-items-center">
      <div>
        <h1>Gestão de Leads</h1>
        <p>Acompanhe o funil de vendas e gerencie interessados em tempo real.</p>
      </div>
      <div class="d-flex gap-2">
        <div class="view-toggle">
          <button 
            type="button"
            class="toggle-btn" 
            :class="{ active: viewMode === 'kanban' }" 
            @click="viewMode = 'kanban'"
          >
            Kanban
          </button>
          <button 
            type="button"
            class="toggle-btn" 
            :class="{ active: viewMode === 'table' }" 
            @click="viewMode = 'table'"
          >
            Tabela
          </button>
        </div>
        <button class="btn btn-primary" :disabled="!canWriteLeads" :title="!canWriteLeads ? writePermissionHint : undefined" @click="showCreateModal = true">+ Novo Lead</button>
      </div>
    </div>

    <!-- Enhanced Filters -->
    <div class="filter-card">
      <div class="filter-group">
        <label class="form-label">Projeto</label>
        <select v-model="filters.projectId" class="form-select" @change="loadLeads(filters)">
          <option value="">Todos os projetos</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="form-label">Status</label>
        <select v-model="filters.status" class="form-select" @change="loadLeads(filters)">
          <option value="">Todos os status</option>
          <option value="NEW">Novo</option>
          <option value="CONTACTED">Contatado</option>
          <option value="QUALIFIED">Qualificado</option>
          <option value="NEGOTIATING">Negociando</option>
          <option value="RESERVATION">Reserva solicitada</option>
          <option value="WON">Convertido</option>
          <option value="LOST">Perdido</option>
          <option value="ABANDONED">Abandonou Checkout</option>
        </select>
      </div>
      <div class="filter-group flex-2">
        <label class="form-label">Buscar nome ou e-mail</label>
        <input v-model="filters.search" type="text" class="form-input" placeholder="Pesquisar..." @keyup.enter="loadLeads(filters)">
      </div>
      <div class="filter-actions mt-auto">
        <button class="btn btn-secondary btn-sm" @click="resetFilters">Limpar</button>
      </div>
    </div>

    <div v-if="meta.totalItems > 0" class="leads-count-bar">
      <span>{{ meta.totalItems }} lead{{ meta.totalItems !== 1 ? 's' : '' }} encontrado{{ meta.totalItems !== 1 ? 's' : '' }}</span>
      <span v-if="meta.totalPages > 1" class="text-muted">— página {{ meta.currentPage }} de {{ meta.totalPages }}</span>
    </div>

    <div v-if="loading" class="loading-state flex-center py-12">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="leads.length === 0" class="empty-state-container d-flex align-items-center justify-content-center py-5">
      <div class="card text-center p-5 rounded-5 max-w-500" style="backdrop-filter: blur(var(--glass-blur));">
        <div class="icon-blob mx-auto mb-4"><i class="bi bi-inbox-fill" aria-hidden="true"></i></div>
        <h3 class="fw-bold mb-3">Nenhum lead encontrado</h3>
        <p class="mb-4 px-4">Ajuste os filtros ou cadastre um novo lead manual.</p>
      </div>
    </div>

    <div v-else class="content-view">
      <!-- Kanban View -->
      <LeadsLeadKanban 
        v-if="viewMode === 'kanban'" 
        :leads="leads" 
        @select="viewLead" 
      />

      <!-- Table View -->
      <div v-else class="table-wrapper">
        <table class="table-modern">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>Projeto</th>
              <th>Corretor</th>
              <th>Status</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lead in leads" :key="lead.id" class="clickable-row" @click="viewLead(lead)">
              <td>
                <div class="d-flex flex-column">
                  <strong>{{ lead.name }}</strong>
                  <span v-if="lead.isRecurrent" class="badge-recurrent-tag">Recorrente</span>
                  <span v-if="lead.aiChatTranscript" class="badge-ai-tag">IA</span>
                </div>
              </td>
              <td>
                <div class="small-info">
                  <span>{{ lead.email || '—' }}</span>
                  <span>{{ lead.phone || '—' }}</span>
                </div>
              </td>
              <td>{{ lead.project?.name || '—' }}</td>
              <td>{{ lead.realtorLink?.name || 'Direto' }}</td>
              <td><LeadsLeadStatusBadge :status="lead.status" /></td>
              <td>{{ formatDateToBrasilia(lead.createdAt) }}</td>
              <td @click.stop>
                <div class="d-flex gap-1">
                  <button class="btn-icon btn-sm" :disabled="!canWriteLeads" :title="!canWriteLeads ? writePermissionHint : 'Editar'" @click="editLead(lead)"><i class="bi bi-pencil-fill" aria-hidden="true"></i></button>
                  <button class="btn-icon btn-sm" :disabled="!canWriteLeads" :title="!canWriteLeads ? writePermissionHint : 'Excluir'" @click="onDeleteLead(lead)"><i class="bi bi-trash3-fill" aria-hidden="true"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="p-4 border-top">
          <CommonPagination :meta="meta" @change="loadLeads(filters, $event)" />
        </div>
      </div>
    </div>

    <!-- Modals -->
    <LeadsLeadFormModal 
      v-if="showCreateModal" 
      :projects="projects"
      @close="showCreateModal = false" 
      @saved="loadLeads(filters)" 
    />

    <LeadsLeadFormModal 
      v-if="showEditModal" 
      :lead="editingLead"
      :projects="projects"
      @close="showEditModal = false" 
      @saved="loadLeads(filters)" 
    />

    <LeadsLeadDetailsModal 
      v-if="selectedLead" 
      :lead="selectedLead" 
      @close="selectedLead = undefined" 
      @refresh="onDetailsRefresh"
      @edit="onDetailsEdit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

type LeadRecord = Record<string, any> & {
  id?: string
  name?: string
}

const { leads, loading, meta, projects, loadLeads, loadProjects, getLead } = useLeads()
const authStore = useAuthStore()
const { fromError, success: toastSuccess } = useToast()
const route = useRoute()
const canWriteLeads = computed(() => {
  if (authStore.isLoteadora || authStore.isSysAdmin) {
    return authStore.canWriteFeature('leads')
  }
  return true
})
const writePermissionHint = 'Disponível apenas para usuários com permissão de edição'

const viewMode = ref('kanban')

// Persistence of view preference
onMounted(() => {
  const savedView = localStorage.getItem('lotio_leads_view_mode')
  if (savedView) {
    viewMode.value = savedView
  }
})

watch(viewMode, (newVal) => {
  localStorage.setItem('lotio_leads_view_mode', newVal)
})

const filters = ref({ projectId: '', status: '', search: '', realtorLinkId: '' })
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingLead = ref<LeadRecord | undefined>(undefined)
const selectedLead = ref<LeadRecord | undefined>(undefined)

// Debounced search
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(() => filters.value.search, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadLeads(filters.value), 400)
})

const resetFilters = () => {
  filters.value = { projectId: '', status: '', search: '', realtorLinkId: '' }
  loadLeads()
}

const viewLead = async (lead: LeadRecord) => {
  if (!lead.id) return
  const fullLead = await getLead(lead.id)
  selectedLead.value = fullLead
}

const editLead = (lead: LeadRecord) => {
  if (!canWriteLeads.value) return
  editingLead.value = lead
  showEditModal.value = true
}

const onDetailsEdit = (lead: LeadRecord) => {
  selectedLead.value = undefined
  editLead(lead)
}

const onDetailsRefresh = async () => {
  if (selectedLead.value?.id) {
    selectedLead.value = await getLead(selectedLead.value.id)
  }
  await loadLeads(filters.value)
}

const onDeleteLead = async (lead: LeadRecord) => {
  if (!canWriteLeads.value) return
  if (!lead.id) return
  if (!confirm(`Deseja realmente excluir o lead ${lead.name}?`)) return
  try {
    const { fetchApi } = useApi()
    await fetchApi(`/leads/${lead.id}`, { method: 'DELETE' })
    toastSuccess('Lead excluído')
    await loadLeads(filters.value)
  } catch (e) {
    fromError(e, 'Erro ao excluir lead')
  }
}

onMounted(async () => {
  // Support pre-filtering by realtorLinkId from URL (e.g. from corretor detail page)
  if (route.query.realtorLinkId) {
    filters.value.realtorLinkId = route.query.realtorLinkId as string
  }
  await loadProjects()
  await loadLeads(filters.value)
})
</script>

<style scoped>
.page-header { margin-bottom: 24px; border-bottom: 2px solid var(--glass-border-subtle); padding-bottom: 16px; }

.view-toggle { 
  background: var(--glass-bg); 
  border-radius: var(--radius-md); 
  display: flex; 
  padding: 4px; 
  gap: 4px;
  height: 48px;
}
.toggle-btn { 
  border: none; 
  background: none; 
  padding: 0 16px; 
  font-weight: 600; 
  font-size: 0.875rem; 
  color: var(--color-surface-400); 
  cursor: pointer; 
  border-radius: var(--radius-sm);
  transition: all 200ms ease;
  flex: 1;
  white-space: nowrap;
}
.toggle-btn.active { 
  background: rgba(255, 255, 255, 0.06); 
  color: var(--color-primary-500); 
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.filter-card { 
  background: var(--glass-bg); 
  border-radius: var(--radius-lg); 
  padding: 20px; 
  margin-bottom: 24px; 
  box-shadow: 0 2px 4px rgba(0,0,0,0.3); 
  display: flex; 
  gap: 20px; 
  align-items: flex-end; 
  flex-wrap: wrap; 
  border: 1px solid var(--glass-border-subtle); 
}
.filter-group { flex: 1; min-width: 200px; }
.flex-2 { flex: 2; }
.filter-actions { padding-bottom: 4px; }

.table-modern { width: 100%; border-collapse: collapse; }
.clickable-row { cursor: pointer; transition: background 150ms; }
.clickable-row:hover { background: var(--glass-bg-heavy); }

.small-info { display: flex; flex-direction: column; font-size: 0.8125rem; color: var(--color-surface-200); gap: 2px; }

.badge-recurrent-tag {
  font-size: 0.625rem;
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 700;
  width: fit-content;
  margin-top: 2px;
}

.badge-ai-tag {
  font-size: 0.625rem;
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 700;
  width: fit-content;
  margin-top: 2px;
}

.table-wrapper { 
  background: var(--glass-bg); 
  border: 1px solid var(--glass-border-subtle); 
  border-radius: var(--radius-lg); 
  overflow: hidden; 
}

.loading-state, .empty-state {
  text-align: center;
  background: var(--glass-bg);
  border-radius: var(--radius-lg);
  border: 1px solid var(--glass-border-subtle);
}

.empty-icon { font-size: 2.5rem; margin-bottom: 16px; }

.d-flex { display: flex; }
.justify-content-between { justify-content: space-between; }
.align-items-center { align-items: center; }
.flex-column { flex-direction: column; }
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.mt-auto { margin-top: auto; }
.py-12 { padding-top: 48px; padding-bottom: 48px; }
.p-4 { padding: 16px; }
.border-top { border-top: 1px solid var(--glass-border-subtle); }

.leads-count-bar { font-size: 0.8125rem; color: var(--color-surface-400); margin-bottom: 12px; display: flex; gap: 8px; align-items: center; }
.text-muted { color: var(--color-surface-500); }
.btn-icon { background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: var(--radius-sm); font-size: 1rem; transition: background 150ms; }
.btn-icon:hover { background: var(--glass-bg-heavy); }

@media (max-width: 767px) {
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .page-header > div { width: 100%; justify-content: space-between; }
  .filter-group { min-width: 100%; flex: unset; }
  .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .table-modern { min-width: 600px; }
  .view-toggle { align-self: flex-start; }
}
</style>
