<script setup lang="ts">
const { get, post, patch, delete: del } = useApi()
const toast = useToast()

const campaigns = ref<any[]>([])
const projects = ref<any[]>([])
const loading = ref(true)
const showModal = ref(false)
const editingCampaign = ref<any>(null)

const form = ref({
  projectId: '',
  name: '',
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmContent: '',
  utmTerm: '',
  budget: 0,
  active: true
})

async function fetchData() {
  loading.value = true
  try {
    const [campaignsData, projectsRes] = await Promise.all([
      get('/campaigns'),
      get('/projects')
    ])
    campaigns.value = campaignsData
    projects.value = projectsRes.data
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    toast.error('Erro ao carregar dados')
  } finally {
    loading.value = false
  }
}

async function saveCampaign() {
  try {
    if (editingCampaign.value) {
      await patch(`/campaigns/${editingCampaign.value.id}`, form.value)
      toast.success('Campanha atualizada com sucesso')
    } else {
      await post('/campaigns', form.value)
      toast.success('Campanha criada com sucesso')
    }
    showModal.value = false
    fetchData()
  } catch (error) {
    toast.error('Erro ao salvar campanha')
  }
}

async function removeCampaign(id: string) {
  if (!confirm('Tem certeza que deseja remover esta campanha?')) return
  try {
    await del(`/campaigns/${id}`)
    toast.success('Campanha removida')
    fetchData()
  } catch (error) {
    toast.error('Erro ao remover campanha')
  }
}

function openCreate() {
  editingCampaign.value = null
  form.value = {
    projectId: '',
    name: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmContent: '',
    utmTerm: '',
    budget: 0,
    active: true
  }
  showModal.value = true
}

function openEdit(campaign: any) {
  editingCampaign.value = campaign
  form.value = {
    projectId: campaign.projectId,
    name: campaign.name,
    utmSource: campaign.utmSource,
    utmMedium: campaign.utmMedium || '',
    utmCampaign: campaign.utmCampaign,
    utmContent: campaign.utmContent || '',
    utmTerm: campaign.utmTerm || '',
    budget: campaign.budget || 0,
    active: campaign.active
  }
  showModal.value = true
}

function generateLink(campaign: any) {
  if (!campaign.project) return ''
  const projectSlug = campaign.project.slug
  
  // Build URL with query params
  let url = `${window.location.origin}/${projectSlug}?utm_source=${campaign.utmSource}&utm_campaign=${campaign.utmCampaign}`
  
  if (campaign.utmMedium) url += `&utm_medium=${campaign.utmMedium}`
  if (campaign.utmContent) url += `&utm_content=${campaign.utmContent}`
  if (campaign.utmTerm) url += `&utm_term=${campaign.utmTerm}`
  
  return url
}

function copyLink(campaign: any) {
  const url = generateLink(campaign)
  if (!url) return
  navigator.clipboard.writeText(url)
  toast.success('Link UTM copiado!')
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
        <h1>Gestão de Campanhas</h1>
        <p class="subtitle">Crie e gerencie links UTM para seus empreendimentos</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-plus"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Nova Campanha
      </button>
    </div>

    <div v-if="loading" class="loading">Carregando...</div>
    
    <div v-else class="card">
      <div v-if="campaigns.length === 0" class="empty-state-container d-flex align-items-center justify-content-center py-5">
        <div class="text-center p-5 max-w-500">
          <div class="icon-blob mx-auto mb-4">📢</div>
          <h3 class="fw-bold mb-3">Nenhuma campanha cadastrada</h3>
          <p class="mb-4 px-4">Crie campanhas UTM para rastrear a origem dos seus leads.</p>
        </div>
      </div>
      
      <table v-else class="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Empreendimento</th>
            <th>Parâmetros UTM</th>
            <th>Status</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="campaign in campaigns" :key="campaign.id">
            <td>
              <div class="campaign-info">
                <strong>{{ campaign.name }}</strong>
              </div>
            </td>
            <td>{{ campaign.project?.name || '-' }}</td>
            <td>
              <div class="utm-preview">
                <span class="badge">src: {{ campaign.utmSource }}</span>
                <span class="badge">cmp: {{ campaign.utmCampaign }}</span>
              </div>
            </td>
            <td>
              <span :class="['status-badge', campaign.active ? 'active' : 'inactive']">
                {{ campaign.active ? 'Ativa' : 'Inativa' }}
              </span>
            </td>
            <td class="text-right actions">
              <NuxtLink :to="`/painel/campanhas/${campaign.id}`" class="btn btn-sm btn-outline">
                Performance
              </NuxtLink>
              <button class="btn btn-sm btn-outline" @click="copyLink(campaign)">
                Copiar Link
              </button>
              <button class="btn-icon" @click="openEdit(campaign)" title="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon text-danger" @click="removeCampaign(campaign.id)" title="Remover">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click="showModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>{{ editingCampaign ? 'Editar Campanha' : 'Nova Campanha' }}</h2>
            <button class="btn-icon" @click="showModal = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          
          <form @submit.prevent="saveCampaign" class="form mt-6">
            <div class="form-group">
              <label class="form-label">Nome da Campanha (Interno)</label>
              <input v-model="form.name" type="text" class="form-input" placeholder="Ex: Campanha Facebook Março" required />
            </div>

            <div class="form-group">
              <label class="form-label">Empreendimento</label>
              <select v-model="form.projectId" class="form-select" required>
                <option value="" disabled>Selecione um projeto</option>
                <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>

            <div class="row">
              <div class="form-group">
                <label class="form-label">UTM Source</label>
                <input v-model="form.utmSource" type="text" class="form-input" placeholder="Ex: facebook, google" required />
              </div>
              <div class="form-group">
                <label class="form-label">UTM Medium</label>
                <input v-model="form.utmMedium" type="text" class="form-input" placeholder="Ex: cpc, organic" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">UTM Campaign</label>
              <input v-model="form.utmCampaign" type="text" class="form-input" placeholder="Ex: lancamento_fase1" required />
            </div>

            <div class="row">
              <div class="form-group">
                <label class="form-label">UTM Content</label>
                <input v-model="form.utmContent" type="text" class="form-input" placeholder="Ex: anuncio_A" />
              </div>
              <div class="form-group">
                <label class="form-label">UTM Term</label>
                <input v-model="form.utmTerm" type="text" class="form-input" placeholder="Ex: palavra_chave" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Verba Mensal Estimada (Opcional)</label>
              <div class="input-with-prefix">
                <span class="prefix">R$</span>
                <input v-model.number="form.budget" type="number" step="0.01" class="form-input" placeholder="0,00" />
              </div>
            </div>

            <div class="form-group flex items-center gap-2">
              <input type="checkbox" v-model="form.active" id="active-check" />
              <label for="active-check" class="form-label mb-0">Campanha Ativa</label>
            </div>

            <div class="modal-actions mt-8">
              <button type="button" class="btn btn-secondary" @click="showModal = false">Cancelar</button>
              <button type="submit" class="btn btn-primary">
                {{ editingCampaign ? 'Salvar Alterações' : 'Criar Campanha' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.page-container {
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.subtitle {
  color: var(--color-surface-400);
  margin-top: 4px;
}

.card {
  background: var(--glass-bg);
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  border: 1px solid var(--glass-border-subtle);
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  padding: 16px;
  background: var(--glass-bg-heavy);
  color: var(--color-surface-400);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--glass-border-subtle);
}

.table td {
  padding: 16px;
  border-bottom: 1px solid var(--glass-border-subtle);
  color: var(--color-surface-200);
  vertical-align: middle;
}

.utm-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge {
  padding: 2px 8px;
  background: var(--glass-bg);
  border-radius: 6px;
  font-size: 0.6875rem;
  color: var(--color-surface-200);
}

.status-badge {
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.active {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-success);
}

.status-badge.inactive {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-danger);
}

.actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.text-danger {
  color: var(--color-danger);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--glass-bg);
  padding: 32px;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 12px 24px rgba(0,0,0,0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.empty-state, .loading {
  padding: 48px;
  text-align: center;
  color: var(--color-surface-500);
}

.mt-6 { margin-top: 1.5rem; }
.mt-8 { margin-top: 2rem; }
.mb-0 { margin-bottom: 0; }
.flex { display: flex; }
.items-center { align-items: center; }
.gap-2 { gap: 0.5rem; }
</style>
