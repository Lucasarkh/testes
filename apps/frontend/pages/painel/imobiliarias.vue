<script setup lang="ts">
import { ref, onMounted } from 'vue'
const { get, post, put } = useApi()
const toast = useToast()

const agencies = ref<any[]>([])
const search = ref('')
const meta = ref({
  total: 0,
  page: 1,
  limit: 12,
  totalPages: 1
})
const loading = ref(true)
const showModal = ref(false)
const showInviteModal = ref(false)
const editingAgency = ref(null)

const form = ref({
  name: '',
  email: '',
  phone: '',
  creci: ''
})

const inviteForm = ref({
  email: '',
  role: 'IMOBILIARIA',
  agencyId: ''
})

let searchTimeout: any = null
async function fetchAgencies(page = 1) {
  loading.value = true
  try {
    const query = new URLSearchParams({
      page: page.toString(),
      limit: '12',
      search: search.value
    }).toString()
    
    const res: any = await get(`/agencies?${query}`)
    agencies.value = res.items || []
    meta.value = res.meta || meta.value
  } catch (err) {
    console.error('Fetch error:', err)
    toast.error('Erro ao conectar com o servidor')
    agencies.value = []
  } finally {
    loading.value = false
  }
}

function onSearchInput() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchAgencies(1)
  }, 400)
}

const goToPage = (page: number) => {
  if (page < 1 || page > meta.value.totalPages) return
  fetchAgencies(page)
}

async function saveAgency() {
  if (!form.value.name || !form.value.email) {
    toast.error('Nome e Email são obrigatórios')
    return
  }

  try {
    if (editingAgency.value) {
      await put(`/agencies/${(editingAgency.value as any).id}`, form.value)
      toast.success('Imobiliária atualizada com sucesso')
    } else {
      await post('/agencies', form.value)
      toast.success('Imobiliária cadastrada com sucesso')
    }
    showModal.value = false
    await fetchAgencies()
  } catch (err) {
    toast.error('Ocorreu um erro ao salvar os dados')
  }
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
    await fetchAgencies() // Refresh to show link button
  } catch (err: any) {
    toast.error(err.data?.message || 'Erro ao processar convite')
  }
}

async function copyInviteLink(agency: any) {
  let token = agency.invites?.[0]?.token

  if (!token) {
    try {
      const res = await post('/agencies/invite', {
        email: agency.email,
        role: 'IMOBILIARIA',
        agencyId: agency.id
      })
      token = res.token
      await fetchAgencies()
    } catch (err: any) {
      toast.error('Erro ao gerar link de convite')
      return
    }
  }

  const magicLink = `${window.location.origin}/aceitar-convite?token=${token}`
  try {
    await navigator.clipboard.writeText(magicLink)
    toast.success('Link de convite copiado!')
  } catch {
    toast.error('Erro ao copiar para a área de transferência')
  }
}

function openEdit(agency: any) {
  editingAgency.value = agency
  form.value = { 
    name: agency.name, 
    email: agency.email, 
    phone: agency.phone || '', 
    creci: agency.creci || '' 
  }
  showModal.value = true
}

function openInvite(agency: any) {
  inviteForm.value.agencyId = agency.id
  inviteForm.value.email = agency.email // Auto-populate with registered email
  inviteForm.value.role = 'IMOBILIARIA'
  showInviteModal.value = true
}

onMounted(fetchAgencies)
</script>

<template>
  <div class="painel-layout">
    <div class="container-fluid py-5 px-lg-5">
      <!-- Header de Alta Performance -->
      <header class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-4">
        <div class="header-content">
          <h1 class="display-5 fw-bold tracking-tight mb-2" style="color: var(--color-surface-50);">Imobiliárias</h1>
          <p class="lead text-secondary opacity-75 mb-0">Gestão centralizada de parceiros e canais de venda.</p>
        </div>
        <div class="header-actions d-flex gap-3 mb-2">
          <div class="search-box-minimal">
            <i class="pi pi-search"></i>
            <input 
              v-model="search" 
              type="text" 
              placeholder="Buscar por nome, email ou CRECI..." 
              @input="onSearchInput"
            >
          </div>
          <button 
            class="btn btn-primary rounded-pill px-4 shadow-sm d-flex align-items-center gap-2"
            @click="editingAgency = null; form = { name: '', email: '', phone: '', creci: '' }; showModal = true"
          >
            <span class="fs-4 line-height-1">+</span>
            <span class="fw-bold">Nova Imobiliária</span>
          </button>
        </div>
      </header>

      <!-- Grid de Conteúdo com Loading Skeleton -->
      <div v-if="loading" class="row g-4 mt-2">
        <div v-for="i in 3" :key="i" class="col-12 col-md-6 col-lg-4">
          <div class="skeleton-card"></div>
        </div>
      </div>

      <div v-else-if="agencies.length === 0" class="empty-state-container d-flex align-items-center justify-content-center py-5">
        <div class="card text-center p-5 rounded-5 max-w-500" style="backdrop-filter: blur(var(--glass-blur));">
          <div class="icon-blob mx-auto mb-4">🏢</div>
          <h3 class="fw-bold mb-3" style="color: var(--color-surface-50);">Expanda sua rede de vendas</h3>
          <p class="mb-4 px-4" style="color: var(--color-surface-200);">Conecte-se com imobiliárias parceiras para multiplicar o alcance dos seus empreendimentos.</p>
          <button class="btn btn-primary btn-lg rounded-pill px-5" @click="showModal = true">Começar Agora</button>
        </div>
      </div>

      <!-- Grid Section Apple/Samsung Style -->
      <div v-else>
        <div class="row g-4 lotio-grid-v2">
          <div v-for="agency in agencies" :key="agency.id" class="col-12 col-md-4 col-xl-3">
            <div class="minimal-agency-card shadow-sm-hover animate-in">
              <!-- Top Metadata & Symbol -->
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="agency-symbol-modern">
                   <span v-if="agency.isPending" class="symbol-inner bg-warning"><i class="pi pi-clock"></i></span>
                   <span v-else class="symbol-inner bg-primary-soft-v2"><i class="pi pi-building text-primary"></i></span>
                </div>
                <div :class="['minimal-badge', agency.isActive ? 'active' : 'inactive']">
                  {{ agency.isActive ? 'Ativa' : 'Inativa' }}
                </div>
              </div>

              <!-- Main Info -->
              <div class="minimal-card-main mb-4 flex-grow-1">
                <h3 class="minimal-agency-name" :title="agency.name">
                  {{ agency.name }}
                </h3>
                <p class="minimal-agency-email">
                   {{ agency.email }}
                </p>
              </div>

              <!-- Compact Stats -->
              <div class="minimal-stats-row mb-4">
                <div class="stat-minimal-item">
                  <span class="label">EQUIPE</span>
                  <span class="value">{{ agency._count?.realtors || 0 }}</span>
                </div>
                <div class="stat-minimal-divider"></div>
                <div class="stat-minimal-item">
                    <span class="label">CRECI</span>
                    <span class="value text-truncate w-100px">{{ agency.creci || '---' }}</span>
                </div>
              </div>

              <!-- Refined Actions -->
              <div class="d-flex align-items-center gap-3 mt-4">
                <button class="btn btn-action-minimal" style="min-width: 100px;" @click="openEdit(agency)">
                  Ajustar
                </button>
                
                <div class="d-flex align-items-center gap-2">
                  <template v-if="agency.isPending">
                      <button class="btn btn-icon-minimal btn-primary-minimal" @click="openInvite(agency)" title="Enviar E-mail">
                        <i class="pi pi-envelope"></i>
                      </button>
                      <button class="btn btn-icon-minimal" @click="copyInviteLink(agency)" title="Copiar Link">
                        <i class="pi pi-link"></i>
                      </button>
                  </template>
                  <div v-else class="verified-indicator" title="Imobiliária Ativa">
                      <i class="pi pi-check-circle"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination Bar -->
        <div v-if="meta.totalPages > 1" class="pagination-footer mt-5 d-flex justify-content-center">
            <nav class="apple-pagination d-flex align-items-center gap-2">
                <button 
                  class="btn-page-nav" 
                  :disabled="meta.page === 1" 
                  @click="goToPage(meta.page - 1)"
                >
                  <i class="pi pi-chevron-left"></i>
                </button>
                
                <div class="page-numbers d-flex gap-1">
                  <button 
                    v-for="p in meta.totalPages" 
                    :key="p" 
                    class="btn-page-num" 
                    :class="{ 'is-active': meta.page === p }"
                    @click="goToPage(p)"
                  >
                    {{ p }}
                  </button>
                </div>

                <button 
                  class="btn-page-nav" 
                  :disabled="meta.page === meta.totalPages" 
                  @click="goToPage(meta.page + 1)"
                >
                  <i class="pi pi-chevron-right"></i>
                </button>
            </nav>
        </div>
      </div>
    </div>

    <!-- Modal Padrão -->
    <Teleport to="body">
      <div v-if="showModal || showInviteModal" class="modal-overlay">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h2>{{ showInviteModal ? 'Enviar Convite' : (editingAgency ? 'Editar Imobiliária' : 'Nova Imobiliária') }}</h2>
            <button class="modal-close" @click="showModal = false; showInviteModal = false">&times;</button>
          </div>
          <div class="modal-body">
            <!-- Main Form -->
            <form v-if="showModal" @submit.prevent="saveAgency">
              <div class="form-group">
                <label class="form-label">Nome Fantasia</label>
                <input v-model="form.name" type="text" class="form-input" placeholder="Ex: Central Brokers S/A">
              </div>
              <div class="form-group">
                <label class="form-label">E-mail Corporativo</label>
                <input v-model="form.email" type="email" class="form-input" placeholder="contato@empresa.com.br">
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="form-group">
                  <label class="form-label">Telefone</label>
                  <input v-model="form.phone" type="text" class="form-input" placeholder="(00) 00000-0000">
                </div>
                <div class="form-group">
                  <label class="form-label">CRECI Jurídico</label>
                  <input v-model="form.creci" type="text" class="form-input" placeholder="00.000-J">
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-ghost" @click="showModal = false">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar Registro</button>
              </div>
            </form>

            <!-- Invite Form -->
            <form v-if="showInviteModal" @submit.prevent="sendInvite">
              <div class="info-box">
                <span>💡</span>
                <p>Este link permitirá que o administrador defina sua credencial de acesso exclusiva para esta imobiliária.</p>
              </div>
              <div class="form-group">
                <label class="form-label">E-mail do Destinatário</label>
                <input v-model="inviteForm.email" type="email" class="form-input" placeholder="admin@parceiro.com.br">
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-ghost" @click="showInviteModal = false">Cancelar</button>
                <button type="submit" class="btn btn-primary">Gerar Link &amp; Enviar</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.painel-layout {
  min-height: 100vh;
}

.tracking-tight { letter-spacing: -0.025em; }
.fw-black { font-weight: 900; }
.text-xs { font-size: 0.75rem; }

.info-box {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.15);
}
.info-box span { font-size: 1.25rem; flex-shrink: 0; }
.info-box p { font-size: 0.875rem; color: var(--color-surface-200); margin: 0; line-height: 1.5; }

/* Custom Grid System */
.lotio-grid-container {
  display: flex !important;
  flex-wrap: wrap !important;
  margin: 1.5rem 0 !important;
  padding: 0 !important;
}

.lotio-grid-item {
  width: 100% !important;
  box-sizing: border-box !important;
}

@media (min-width: 768px) {
  .lotio-grid-item { width: 50% !important; }
}

@media (min-width: 1200px) {
  .lotio-grid-item { width: 33.333% !important; }
}

/* THE SENIOR CARD ARCHITECTURE */
.agency-glass-card {
  background: var(--glass-bg) !important;
  border-radius: 32px !important;
  border: 1px solid var(--glass-border-subtle) !important;
  padding: 32px !important;
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  position: relative !important;
  overflow: hidden !important;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.2) !important;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

.agency-glass-card:hover {
  transform: translateY(-12px) scale(1.01) !important;
  box-shadow: 0 30px 60px -12px rgba(15, 23, 42, 0.12) !important;
  border-color: var(--glass-border-subtle) !important;
}

/* Card Section: Header */
.card-header-premium {
  display: flex !important;
  justify-content: space-between !important;
  align-items: flex-start !important;
  margin-bottom: 28px !important;
}

.agency-icon-wrapper {
  width: 64px !important;
  height: 64px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: var(--glass-bg-heavy) !important;
  border-radius: 20px !important;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.2) !important;
  border: 4px solid var(--glass-border-subtle) !important;
}

.status-badge-premium {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 8px 16px !important;
  border-radius: 100px !important;
  font-size: 0.7rem !important;
  font-weight: 900 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.1em !important;
}

.status-badge-premium.is-active {
  background: rgba(16, 185, 129, 0.12) !important;
  color: #059669 !important;
}

.status-badge-pending {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 8px 16px !important;
  border-radius: 100px !important;
  font-size: 0.7rem !important;
  font-weight: 900 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.1em !important;
  background: rgba(245, 158, 11, 0.1) !important;
  color: #d97706 !important;
}

.status-dot {
  width: 8px !important;
  height: 8px !important;
  border-radius: 50% !important;
  background: currentColor !important;
}

/* Card Section: Content */
.card-body-premium {
  margin-bottom: 32px !important;
}

.agency-name-title {
  font-size: 1.5rem !important;
  font-weight: 900 !important;
  color: var(--color-surface-50) !important;
  letter-spacing: -0.04em !important;
  margin-bottom: 8px !important;
  line-height: 1.1 !important;
}

.agency-email-row {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  color: var(--color-surface-400) !important;
  font-size: 0.95rem !important;
  font-weight: 500 !important;
}

/* Card Section: Stats Bar (The Fix) */
.card-stats-premium {
  background: var(--glass-bg-heavy) !important;
  border: 1px solid var(--glass-border-subtle) !important;
  border-radius: 24px !important;
  display: flex !important;
  padding: 20px 0 !important;
  margin-bottom: 32px !important;
  margin-top: auto !important;
}

.stat-item {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 4px !important;
}

.stat-label {
  font-size: 0.65rem !important;
  font-weight: 900 !important;
  text-transform: uppercase !important;
  color: var(--color-surface-400) !important;
  letter-spacing: 0.15em !important;
}

.stat-value {
  font-size: 1.25rem !important;
  font-weight: 900 !important;
  color: var(--color-surface-100) !important;
  line-height: 1 !important;
}

/* Card Section: Actions */
.card-actions-premium {
  display: flex !important;
  gap: 12px !important;
}

.btn-lotio-primary, .btn-lotio-secondary {
  flex: 1 !important;
  padding: 14px !important;
  border-radius: 16px !important;
  font-weight: 800 !important;
  font-size: 0.85rem !important;
  transition: all 0.2s !important;
  border: none !important;
  cursor: pointer !important;
}

.btn-lotio-primary {
  background: #2563eb !important;
  color: white !important;
  box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.3) !important;
}

.btn-lotio-primary:hover {
  background: #1d4ed8 !important;
  transform: translateY(-2px) !important;
}

.btn-lotio-secondary {
  background: var(--glass-bg-heavy) !important;
  color: var(--color-surface-200) !important;
  border: 1px solid var(--glass-border-subtle) !important;
}

.btn-lotio-secondary:hover {
  background: rgba(255, 255, 255, 0.06) !important;
}


.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 6px;
}

/* NOVO ESTILO MINIMALISTA (APPLE/SAMSUNG) */
.minimal-agency-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-subtle);
  border-radius: 20px;
  padding: 1.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.minimal-agency-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 30px -10px rgba(0,0,0,0.4) !important;
  border-color: #3b82f6;
}

.agency-symbol-modern {
  width: 44px;
  height: 44px;
}

.symbol-inner {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  border: 1px solid var(--glass-border-subtle);
}

.bg-primary-soft-v2 {
  background: rgba(59, 130, 246, 0.1);
}

.minimal-badge {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 50px;
  letter-spacing: 0.05em;
}

.minimal-badge.active { background: rgba(16, 185, 129, 0.12); color: #10b981; }
.minimal-badge.inactive { background: rgba(239, 68, 68, 0.12); color: #ef4444; }

.minimal-agency-name {
  color: var(--color-surface-50);
  font-size: 1.15rem;
  font-weight: 800;
  margin-top: 1.25rem;
  margin-bottom: 0.25rem;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.minimal-agency-email {
  font-size: 0.85rem;
  color: var(--color-surface-400);
  margin-bottom: 1.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.minimal-stats-row {
  display: flex;
  align-items: center;
  gap: 24px;
  background: var(--glass-bg-heavy);
  padding: 14px 20px;
  border-radius: 14px;
  border: 1px solid var(--glass-border-subtle);
}

.stat-minimal-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.stat-minimal-item .label {
  font-size: 0.6rem;
  font-weight: 800;
  color: var(--color-surface-400);
  letter-spacing: 0.12em;
}

.stat-minimal-item .value {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--color-surface-100);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.stat-minimal-divider {
  width: 1px;
  height: 28px;
  background: rgba(255, 255, 255, 0.06);
}

.w-100px { width: 100px; }

.btn-action-minimal {
  background: var(--glass-bg-heavy);
  border: 1px solid var(--glass-border-subtle);
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--color-surface-200);
  padding: 10px 16px;
  margin-right: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-action-minimal:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border);
  color: var(--color-surface-50);
}

.btn-icon-minimal {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--glass-border-subtle);
  background: var(--glass-bg-heavy);
  color: var(--color-surface-200);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  transition: all 0.2s;
}

.btn-icon-minimal:hover {
  background: var(--glass-bg);
  border-color: var(--glass-border);
  color: var(--color-surface-50);
}

.btn-primary-minimal {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.btn-primary-minimal:hover {
  background: #2563eb;
  color: white;
}

.verified-indicator {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  font-size: 1.4rem;
  margin-left: 4px;
}

/* SEARCH BOX */
.search-box-minimal {
  position: relative;
  width: 300px;
}

.search-box-minimal i {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-surface-400);
  font-size: 0.9rem;
}

.search-box-minimal input {
  width: 100%;
  padding: 14px 14px 14px 40px;
  background: var(--glass-bg-heavy);
  border: 1px solid var(--glass-border-subtle);
  border-radius: 14px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-surface-100);
  transition: all 0.3s;
}

.search-box-minimal input:focus {
  outline: none;
  border-color: #3b82f6;
  background: var(--glass-bg);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);
}

/* PAGINAÇÃO APPLE STYLE */
.apple-pagination {
  background: var(--glass-bg-heavy);
  padding: 8px;
  border-radius: 16px;
  border: 1px solid var(--glass-border-subtle);
}

.btn-page-nav, .btn-page-num {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: var(--color-surface-400);
  font-weight: 700;
  font-size: 0.85rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-page-num.is-active {
  background: var(--glass-bg);
  color: #3b82f6;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.btn-page-num:hover:not(.is-active) {
  background: var(--glass-bg);
  color: var(--color-surface-50);
}

.btn-page-nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.lotio-grid-v2 {
  margin-top: 10px;
}

/* REMOÇÃO DO ESTILO ANTIGO (GAPS) */
.lotio-grid-container { display: none; }

.skeleton-card {
  height: 280px;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 200% 100%;
  border-radius: 28px;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.icon-blob {
  width: 100px;
  height: 100px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: blob-morph 8s infinite alternate ease-in-out;
}

@keyframes blob-morph {
  to { border-radius: 70% 30% 50% 50% / 30% 60% 40% 70%; }
}

.btn-lotio-link {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 48px !important;
  height: 48px !important;
  background: var(--glass-bg-heavy) !important;
  color: var(--color-surface-200) !important;
  border: 1px solid var(--glass-border-subtle) !important;
  border-radius: 16px !important;
  transition: all 0.3s ease !important;
  flex-shrink: 0 !important;
}

.btn-lotio-link:hover {
  background: rgba(255, 255, 255, 0.06) !important;
  color: var(--color-surface-50) !important;
  transform: translateY(-2px) !important;
}

.btn-lotio-primary:disabled {
  background: var(--glass-bg-heavy) !important;
  color: var(--color-surface-400) !important;
  border-color: var(--glass-border-subtle) !important;
  opacity: 0.7 !important;
  cursor: not-allowed !important;
}
</style>


<style scoped>
.painel-container {
  max-width: 1200px;
  margin: 0 auto;
}

.agency-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid var(--glass-border-subtle);
}

.agency-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.5);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1.5rem;
}

.modal-container {
  background: var(--glass-bg) !important;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.animate-in {
  animation: modalScale 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalScale {
  from { opacity: 0; transform: scale(0.9) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.badge-tag {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 99px;
  letter-spacing: 0.5px;
}

.badge-success { background: var(--success-light); color: var(--color-success); }
.badge-danger { background: var(--danger-light); color: var(--color-danger); }
</style>

