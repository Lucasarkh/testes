<template>
  <div>
    <div class="page-header d-flex justify-content-between align-items-center">
      <div>
        <h1>Gestão de Leads</h1>
        <p>{{ pageMode === 'prelaunch' ? 'Gerencie a fila por empreendimento e por lote sem perder a distribuição rotativa de corretores.' : 'Acompanhe o funil de vendas e gerencie interessados em tempo real.' }}</p>
      </div>
      <div class="d-flex gap-2">
        <div class="view-toggle page-mode-toggle">
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: pageMode === 'leads' }"
            @click="pageMode = 'leads'"
          >
            Leads
          </button>
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: pageMode === 'prelaunch' }"
            @click="pageMode = 'prelaunch'"
          >
            Pré-lançamento
          </button>
        </div>
        <div v-if="pageMode === 'leads'" class="view-toggle">
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
        <button v-if="pageMode === 'leads'" class="btn btn-primary" :disabled="!canWriteLeads" :title="!canWriteLeads ? writePermissionHint : undefined" @click="showCreateModal = true">+ Novo Lead</button>
      </div>
    </div>

    <!-- Enhanced Filters -->
    <div v-if="pageMode === 'leads'" class="filter-card">
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

    <div v-else class="queue-layout">
      <div class="queue-summary-grid">
        <article class="queue-summary-card">
          <span class="queue-summary-card__label">Na fila</span>
          <strong class="queue-summary-card__value">{{ preLaunchQueueSummary.active }}</strong>
        </article>
        <article class="queue-summary-card">
          <span class="queue-summary-card__label">Contatados</span>
          <strong class="queue-summary-card__value">{{ preLaunchQueueSummary.contacted }}</strong>
        </article>
        <article class="queue-summary-card">
          <span class="queue-summary-card__label">Convertidos</span>
          <strong class="queue-summary-card__value">{{ preLaunchQueueSummary.converted }}</strong>
        </article>
        <article class="queue-summary-card">
          <span class="queue-summary-card__label">Removidos</span>
          <strong class="queue-summary-card__value">{{ preLaunchQueueSummary.removed }}</strong>
        </article>
      </div>

      <div class="queue-buckets-grid">
        <section class="queue-bucket-card">
          <div class="queue-bucket-card__header">
            <h2>Empreendimentos na fila</h2>
            <span>{{ preLaunchProjectBuckets.length }}</span>
          </div>
          <div v-if="preLaunchProjectBuckets.length" class="queue-chip-list">
            <button
              v-for="bucket in preLaunchProjectBuckets"
              :key="bucket.projectId"
              type="button"
              class="queue-chip"
              :class="{ active: queueFilters.projectId === bucket.projectId }"
              @click="applyProjectBucket(bucket.projectId)"
            >
              <span>{{ bucket.projectName }}</span>
              <strong>{{ bucket.total }}</strong>
            </button>
          </div>
          <p v-else class="queue-muted">Nenhum empreendimento com fila ativa no momento.</p>
        </section>

        <section class="queue-bucket-card">
          <div class="queue-bucket-card__header">
            <h2>Lotes com fila</h2>
            <span>{{ filteredLotBuckets.length }}</span>
          </div>
          <div v-if="filteredLotBuckets.length" class="queue-chip-list">
            <button
              v-for="bucket in filteredLotBuckets"
              :key="bucket.mapElementId"
              type="button"
              class="queue-chip"
              :class="{ active: queueFilters.mapElementId === bucket.mapElementId }"
              @click="applyLotBucket(bucket.mapElementId, bucket.projectId)"
            >
              <span>{{ bucket.lotCode }}</span>
              <strong>{{ bucket.total }}</strong>
            </button>
          </div>
          <p v-else class="queue-muted">Selecione um empreendimento ou aguarde novos interessados na fila.</p>
        </section>
      </div>

      <div class="filter-card">
        <div class="filter-group">
          <label class="form-label">Empreendimento</label>
          <select v-model="queueFilters.projectId" class="form-select" @change="onQueueProjectChange">
            <option value="">Todos os empreendimentos</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="form-label">Lote</label>
          <select v-model="queueFilters.mapElementId" class="form-select" @change="loadPreLaunchQueue(queueFilters)">
            <option value="">Todos os lotes</option>
            <option v-for="bucket in filteredLotBuckets" :key="bucket.mapElementId" :value="bucket.mapElementId">{{ bucket.lotCode }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="form-label">Status da fila</label>
          <select v-model="queueFilters.status" class="form-select" @change="loadPreLaunchQueue(queueFilters)">
            <option value="">Todos</option>
            <option value="ACTIVE">Na fila</option>
            <option value="CONTACTED">Contatado</option>
            <option value="CONVERTED">Convertido</option>
            <option value="REMOVED">Removido</option>
          </select>
        </div>
        <div class="filter-group flex-2">
          <label class="form-label">Buscar lead, corretor, lote ou e-mail</label>
          <input v-model="queueFilters.search" type="text" class="form-input" placeholder="Pesquisar..." @keyup.enter="loadPreLaunchQueue(queueFilters)">
        </div>
        <div class="filter-actions mt-auto">
          <button class="btn btn-secondary btn-sm" @click="resetQueueFilters">Limpar</button>
        </div>
      </div>
    </div>

    <div v-if="pageMode === 'leads' && meta.totalItems > 0" class="leads-count-bar">
      <span>{{ meta.totalItems }} lead{{ meta.totalItems !== 1 ? 's' : '' }} encontrado{{ meta.totalItems !== 1 ? 's' : '' }}</span>
      <span v-if="meta.totalPages > 1" class="text-muted">— página {{ meta.currentPage }} de {{ meta.totalPages }}</span>
    </div>

    <div v-else-if="pageMode === 'prelaunch' && preLaunchQueueMeta.totalItems > 0" class="leads-count-bar">
      <span>{{ preLaunchQueueMeta.totalItems }} registro{{ preLaunchQueueMeta.totalItems !== 1 ? 's' : '' }} na fila</span>
      <span v-if="preLaunchQueueMeta.totalPages > 1" class="text-muted">— página {{ preLaunchQueueMeta.currentPage }} de {{ preLaunchQueueMeta.totalPages }}</span>
    </div>

    <div v-if="pageMode === 'leads' && loading" class="loading-state flex-center py-12">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="pageMode === 'prelaunch' && queueLoading" class="loading-state flex-center py-12">
      <div class="loading-spinner"></div>
    </div>

    <div v-else-if="pageMode === 'leads' && leads.length === 0" class="empty-state-container d-flex align-items-center justify-content-center py-5">
      <div class="card text-center p-5 rounded-5 max-w-500" style="backdrop-filter: blur(var(--glass-blur));">
        <div class="icon-blob mx-auto mb-4"><i class="bi bi-inbox-fill" aria-hidden="true"></i></div>
        <h3 class="fw-bold mb-3">Nenhum lead encontrado</h3>
        <p class="mb-4 px-4">Ajuste os filtros ou cadastre um novo lead manual.</p>
      </div>
    </div>

    <div v-else-if="pageMode === 'prelaunch' && preLaunchQueue.length === 0" class="empty-state-container d-flex align-items-center justify-content-center py-5">
      <div class="card text-center p-5 rounded-5 max-w-500" style="backdrop-filter: blur(var(--glass-blur));">
        <div class="icon-blob mx-auto mb-4"><i class="bi bi-hourglass-split" aria-hidden="true"></i></div>
        <h3 class="fw-bold mb-3">Nenhum interessado na fila</h3>
        <p class="mb-4 px-4">Quando o pré-lançamento captar novos interessados, a gestão por empreendimento e lote aparecerá aqui.</p>
      </div>
    </div>

    <div v-else-if="pageMode === 'leads'" class="content-view">
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

    <div v-else class="table-wrapper queue-table-wrapper">
      <table class="table-modern">
        <thead>
          <tr>
            <th>Posição</th>
            <th>Lead</th>
            <th>Empreendimento</th>
            <th>Lote</th>
            <th>Corretor</th>
            <th>Status</th>
            <th>Entrada</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in preLaunchQueue" :key="entry.id" class="clickable-row" @click="viewQueueLead(entry)">
            <td><span class="queue-position-badge">#{{ entry.position }}</span></td>
            <td>
              <div class="d-flex flex-column">
                <strong>{{ entry.lead?.name || 'Lead sem nome' }}</strong>
                <span class="small-info-single">{{ entry.lead?.email || entry.lead?.phone || 'Sem contato' }}</span>
              </div>
            </td>
            <td>{{ entry.project?.name || '—' }}</td>
            <td>{{ entry.mapElement?.code || entry.mapElement?.name || '—' }}</td>
            <td>{{ entry.realtorLink?.name || 'Direto' }}</td>
            <td>
              <span class="queue-status-badge" :class="`queue-status-badge--${String(entry.status || '').toLowerCase()}`">
                {{ queueStatusLabel(entry.status) }}
              </span>
            </td>
            <td>{{ formatDateToBrasilia(entry.createdAt) }}</td>
            <td @click.stop>
              <div class="queue-actions">
                <button class="btn btn-secondary btn-sm" :disabled="!canWriteLeads || entry.status === 'CONTACTED'" :title="!canWriteLeads ? writePermissionHint : 'Marcar como contatado'" @click="changeQueueStatus(entry, 'CONTACTED')">Contatado</button>
                <button class="btn btn-primary btn-sm" :disabled="!canWriteLeads || entry.status === 'CONVERTED'" :title="!canWriteLeads ? writePermissionHint : 'Marcar como convertido'" @click="changeQueueStatus(entry, 'CONVERTED')">Converter</button>
                <button class="btn btn-danger btn-sm" :disabled="!canWriteLeads || entry.status === 'REMOVED'" :title="!canWriteLeads ? writePermissionHint : 'Remover da fila'" @click="changeQueueStatus(entry, 'REMOVED')">Remover</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="p-4 border-top">
        <CommonPagination :meta="preLaunchQueueMeta" @change="loadPreLaunchQueue(queueFilters, $event)" />
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
import { computed, ref, onMounted, watch } from 'vue'

type LeadRecord = Record<string, any> & {
  id?: string
  name?: string
}

type PreLaunchQueueRecord = Record<string, any> & {
  id?: string
}

const {
  leads,
  loading,
  queueLoading,
  meta,
  projects,
  preLaunchQueue,
  preLaunchQueueMeta,
  preLaunchQueueSummary,
  preLaunchProjectBuckets,
  preLaunchLotBuckets,
  loadLeads,
  loadProjects,
  loadPreLaunchQueue,
  getLead,
  updatePreLaunchQueueEntry,
} = useLeads()
const authStore = useAuthStore()
const { fromError, success: toastSuccess } = useToast()
const route = useRoute()
const router = useRouter()
const canWriteLeads = computed(() => {
  if (authStore.isLoteadora || authStore.isSysAdmin) {
    return authStore.canWriteFeature('leads')
  }
  return true
})
const writePermissionHint = 'Disponível apenas para usuários com permissão de edição'

const pageMode = ref(route.query.view === 'prelaunch' ? 'prelaunch' : 'leads')
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
const queueFilters = ref({ projectId: '', mapElementId: '', status: 'ACTIVE', search: '' })
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingLead = ref<LeadRecord | undefined>(undefined)
const selectedLead = ref<LeadRecord | undefined>(undefined)
const filteredLotBuckets = computed(() => {
  if (!queueFilters.value.projectId) return preLaunchLotBuckets.value
  return preLaunchLotBuckets.value.filter(bucket => bucket.projectId === queueFilters.value.projectId)
})

// Debounced search
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(() => filters.value.search, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadLeads(filters.value), 400)
})

let queueSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(() => queueFilters.value.search, () => {
  if (queueSearchTimer) clearTimeout(queueSearchTimer)
  queueSearchTimer = setTimeout(() => {
    if (pageMode.value === 'prelaunch') loadPreLaunchQueue(queueFilters.value)
  }, 400)
})

watch(pageMode, async (newVal) => {
  await router.replace({
    query: {
      ...route.query,
      view: newVal === 'prelaunch' ? 'prelaunch' : undefined,
    },
  })

  if (newVal === 'prelaunch') {
    await loadPreLaunchQueue(queueFilters.value)
    return
  }

  await loadLeads(filters.value)
})

watch(() => route.query.view, (view) => {
  const nextMode = view === 'prelaunch' ? 'prelaunch' : 'leads'
  if (pageMode.value !== nextMode) {
    pageMode.value = nextMode
  }
})

const resetFilters = () => {
  filters.value = { projectId: '', status: '', search: '', realtorLinkId: '' }
  loadLeads()
}

const resetQueueFilters = () => {
  queueFilters.value = { projectId: '', mapElementId: '', status: 'ACTIVE', search: '' }
  loadPreLaunchQueue(queueFilters.value)
}

const onQueueProjectChange = () => {
  queueFilters.value.mapElementId = ''
  loadPreLaunchQueue(queueFilters.value)
}

const applyProjectBucket = (projectId: string) => {
  queueFilters.value.projectId = queueFilters.value.projectId === projectId ? '' : projectId
  queueFilters.value.mapElementId = ''
  loadPreLaunchQueue(queueFilters.value)
}

const applyLotBucket = (mapElementId: string, projectId?: string) => {
  queueFilters.value.projectId = projectId || queueFilters.value.projectId
  queueFilters.value.mapElementId = queueFilters.value.mapElementId === mapElementId ? '' : mapElementId
  loadPreLaunchQueue(queueFilters.value)
}

const viewLead = async (lead: LeadRecord) => {
  if (!lead.id) return
  const fullLead = await getLead(lead.id)
  selectedLead.value = fullLead
}

const viewQueueLead = async (entry: PreLaunchQueueRecord) => {
  if (!entry.lead?.id) return
  const fullLead = await getLead(entry.lead.id)
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

const queueStatusLabel = (status?: string) => ({
  ACTIVE: 'Na fila',
  CONTACTED: 'Contatado',
  CONVERTED: 'Convertido',
  REMOVED: 'Removido',
}[status || ''] || status || '—')

const changeQueueStatus = async (entry: PreLaunchQueueRecord, status: 'CONTACTED' | 'CONVERTED' | 'REMOVED') => {
  if (!canWriteLeads.value || !entry.id) return

  const notes = window.prompt(`Observação opcional para ${queueStatusLabel(status).toLowerCase()}:`, entry.notes || '')
  if (notes === null) return

  await updatePreLaunchQueueEntry(entry.id, {
    status,
    notes: notes.trim() || undefined,
  })
  await loadPreLaunchQueue(queueFilters.value, preLaunchQueueMeta.value.currentPage)
}

onMounted(async () => {
  // Support pre-filtering by realtorLinkId from URL (e.g. from corretor detail page)
  if (route.query.realtorLinkId) {
    filters.value.realtorLinkId = route.query.realtorLinkId as string
  }
  await loadProjects()
  if (pageMode.value === 'prelaunch') {
    await loadPreLaunchQueue(queueFilters.value)
    return
  }
  await loadLeads(filters.value)
})
</script>

<style scoped>
.page-header { margin-bottom: 24px; border-bottom: 2px solid var(--glass-border-subtle); padding-bottom: 16px; }

.page-mode-toggle {
  min-width: 240px;
}

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

.queue-layout {
  display: grid;
  gap: 24px;
  margin-bottom: 24px;
}

.queue-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 16px;
}

.queue-summary-card,
.queue-bucket-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.queue-summary-card {
  padding: 18px 20px;
}

.queue-summary-card__label {
  display: block;
  font-size: 0.8rem;
  color: var(--color-surface-400);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.queue-summary-card__value {
  font-size: 2rem;
  line-height: 1;
}

.queue-buckets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.queue-bucket-card {
  padding: 18px 20px;
}

.queue-bucket-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.queue-bucket-card__header h2 {
  margin: 0;
  font-size: 1rem;
}

.queue-bucket-card__header span {
  color: var(--color-surface-400);
  font-size: 0.875rem;
}

.queue-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.queue-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--glass-border-subtle);
  background: rgba(255,255,255,0.03);
  color: var(--color-surface-100);
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 180ms ease;
}

.queue-chip.active {
  border-color: rgba(251, 191, 36, 0.45);
  background: rgba(251, 191, 36, 0.12);
  color: #fcd34d;
}

.queue-chip strong {
  font-size: 0.8rem;
}

.queue-muted {
  color: var(--color-surface-400);
  margin: 0;
}

.table-modern { width: 100%; border-collapse: collapse; }
.clickable-row { cursor: pointer; transition: background 150ms; }
.clickable-row:hover { background: var(--glass-bg-heavy); }

.small-info { display: flex; flex-direction: column; font-size: 0.8125rem; color: var(--color-surface-200); gap: 2px; }

.small-info-single {
  font-size: 0.8125rem;
  color: var(--color-surface-300);
}

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

.queue-table-wrapper {
  overflow: hidden;
}

.queue-position-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.14);
  color: #fcd34d;
  font-weight: 700;
}

.queue-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.queue-status-badge--active {
  background: rgba(59, 130, 246, 0.12);
  color: #93c5fd;
}

.queue-status-badge--contacted {
  background: rgba(245, 158, 11, 0.12);
  color: #fcd34d;
}

.queue-status-badge--converted {
  background: rgba(16, 185, 129, 0.12);
  color: #6ee7b7;
}

.queue-status-badge--removed {
  background: rgba(239, 68, 68, 0.12);
  color: #fca5a5;
}

.queue-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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
  .page-mode-toggle,
  .view-toggle { width: 100%; }
  .page-header > div:last-child { flex-direction: column; }
  .queue-actions { flex-direction: column; }
}
</style>
