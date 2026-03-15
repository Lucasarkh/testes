<template>
  <div class="modal-overlay">
    <div class="modal-container animate-in">
      <header class="modal-header">
        <div class="header-info">
          <h2 class="modal-title">Novo Agendamento</h2>
          <p class="modal-subtitle">Organize uma nova visita ou reunião com agilidade.</p>
        </div>
        <button class="btn-close" @click="$emit('close')" aria-label="Fechar">
          <i class="pi pi-times"></i>
        </button>
      </header>

      <main class="modal-body custom-scroll">
        <form id="scheduling-form" @submit.prevent="save" class="form-layout">
          <fieldset :disabled="!canWriteScheduling" class="form-fieldset">
          <!-- Seção: Ativos e Horários -->
          <div class="form-section">
            <h3 class="section-label text-primary">Detalhes da Visita</h3>
            <div class="grid-2">
              <div class="form-group">
                <label>Projeto / Empreendimento</label>
                <div class="input-wrapper">
                  <select v-model="form.projectId" class="form-control" required @change="onProjectChange">
                    <option value="" disabled>Selecione o projeto</option>
                    <option v-for="p in projects" :key="p.id" :value="p.id" class="opt-fix">{{ p.name }}</option>
                  </select>
                  <i class="pi pi-building icon-left"></i>
                  <i class="pi pi-chevron-down icon-right"></i>
                </div>
              </div>
              <div class="form-group">
                <label>Data e Horário</label>
                <div class="input-wrapper">
                  <input v-model="form.scheduledAt" type="datetime-local" class="form-control" required>
                  <i class="pi pi-calendar icon-left"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- Seção: Participante (Lead) -->
          <div class="form-section">
            <h3 class="section-label">Participante</h3>
            <div class="form-group">
              <label>Vincular Lead</label>
              
              <div v-if="form.projectId">
                <!-- Se selecionado -->
                <div v-if="form.leadId" class="selected-lead-card animate-in">
                  <div class="lead-info">
                   <div class="lead-avatar">{{ selectedLeadName.charAt(0) }}</div>
                   <div class="lead-details">
                     <span class="lead-label">Lead Vinculado</span>
                     <h4 class="lead-name">{{ selectedLeadName }}</h4>
                   </div>
                  </div>
                  <button type="button" class="btn-clear-lead" @click="clearLead" title="Remover lead vinculado"><i class="pi pi-times"></i></button>
                </div>

                <!-- Campo de busca se não selecionado -->
                <div v-else class="search-container">
                  <div class="input-wrapper">
                    <input 
                      v-model="leadSearch" 
                      type="text" 
                      placeholder="Pesquise por nome, e-mail ou celular..." 
                      class="form-control"
                      @input="onLeadSearch"
                    >
                    <i class="pi pi-search icon-left"></i>
                    <i v-if="loadingLeads" class="pi pi-spin pi-spinner icon-right"></i>
                  </div>
                  
                  <Transition name="fade-slide">
                    <div v-if="leadSearch && leads.length > 0" class="search-dropdown custom-scroll shadow-lotio-lg">
                      <div 
                        v-for="l in leads" 
                        :key="l.id" 
                        class="search-item"
                        @click="selectLead(l)"
                      >
                         <div class="item-avatar">{{ l.name.charAt(0) }}</div>
                         <div class="item-info">
                           <div class="item-name">{{ l.name }}</div>
                           <div class="item-meta">{{ l.email || l.phone || 'Sem contato' }}</div>
                         </div>
                      </div>
                    </div>
                  </Transition>
                  <div v-if="leadSearch && leads.length === 0 && !loadingLeads" class="search-empty">Nenhum lead encontrado com seu critério de busca.</div>
                </div>
              </div>
              <div v-else class="project-not-selected">Selecione um projeto para buscar leads vinculados.</div>
            </div>

            <Transition name="expand">
              <div v-if="!form.leadId" class="new-lead-subform">
                <div class="subform-header d-flex justify-content-between">
                  <span>{{ leadSearch ? 'Você pode criar um novo Lead agora:' : 'Deseja cadastrar um novo Lead?' }}</span>
                </div>
                <div class="grid-1">
                  <div class="form-group">
                    <input v-model="form.leadName" type="text" placeholder="Nome completo" class="form-control-alt">
                  </div>
                </div>
                <div class="grid-2 mt-2">
                  <div class="form-group">
                    <input v-model="form.leadEmail" type="email" placeholder="E-mail" class="form-control-alt">
                  </div>
                  <div class="form-group">
                    <input :value="form.leadPhone" @input="onLeadPhoneInput" type="text" placeholder="Celular/WhatsApp" class="form-control-alt">
                  </div>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Seção: Notas -->
          <div class="form-section no-border">
            <label class="section-label">Observações Internas</label>
            <textarea v-model="form.notes" rows="3" class="form-control text-area" placeholder="Detalhes ou requisitos especiais para este agendamento..."></textarea>
          </div>
          </fieldset>
        </form>
      </main>

      <footer class="modal-footer">
        <button type="button" class="btn-ghost" @click="$emit('close')">Cancelar</button>
        <button type="submit" form="scheduling-form" class="btn-primary-action" :disabled="saving || !canWriteScheduling" :title="!canWriteScheduling ? writePermissionHint : undefined">
          <i v-if="!saving" class="pi pi-check-circle me-1"></i>
          <span v-else class="spinner-sm me-2"></span>
          <span>{{ saving ? 'Salvando...' : 'Confirmar Agendamento' }}</span>
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Modal Container & Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal-container {
  background: var(--glass-bg);
  width: 100%;
  max-width: 580px;
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Header */
.modal-header {
  padding: 24px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-surface-50);
  margin: 0;
}

.modal-subtitle {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.55);
  margin: 4px 0 0 0;
}

.btn-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--glass-bg-heavy);
  color: rgba(255, 255, 255, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #EF4444;
  color: white;
  transform: scale(1.1);
}

/* Body & Form */
.modal-body {
  padding: 32px;
  overflow-y: auto;
}

.form-layout {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.form-section.no-border {
  border-bottom: none;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 4px;
}

.text-primary { color: #3B82F6; }

/* Grid System */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 480px) { .grid-2 { grid-template-columns: 1fr; } }

/* Form Controls */
.form-group label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-surface-100);
  margin-bottom: 6px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.form-control {
  width: 100%;
  height: 46px;
  background: var(--glass-bg);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 0 16px 0 42px;
  font-size: 0.9375rem;
  color: var(--color-surface-50);
  transition: all 0.2s;
  appearance: none;
}

.form-control:focus {
  border-color: #3B82F6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  outline: none;
}

.form-control-alt {
  width: 100%;
  height: 42px;
  background: var(--glass-bg-heavy);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 0 12px;
  font-size: 0.875rem;
}

.text-area { padding-top: 12px; height: auto; padding-left: 16px; }

/* Icons */
.icon-left {
  position: absolute;
  left: 14px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 1.1rem;
}

.icon-right {
  position: absolute;
  right: 14px;
  color: rgba(255, 255, 255, 0.45);
  pointer-events: none;
}

/* Select Option Styling Fix */
.opt-fix {
  color: var(--color-surface-50) !important;
  background: var(--glass-bg) !important;
  padding: 12px;
}

/* Searchable Lead Components */
.search-container {
  position: relative;
}

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--glass-bg);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-height: 240px;
  overflow-y: auto;
  z-index: 100;
  margin-top: 8px;
  padding: 8px;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.4);
}

.search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.search-item:hover {
  background: var(--glass-bg-heavy);
}

.item-avatar {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.8rem;
}

.item-name {
  font-weight: 600;
  color: var(--color-surface-50);
  font-size: 0.875rem;
}

.item-meta {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.55);
}

.search-empty {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 8px;
  padding: 0 4px;
}

.selected-lead-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 12px;
  padding: 12px 16px;
}

.lead-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lead-avatar {
  width: 40px;
  height: 40px;
  background: #3B82F6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: 800;
}

.lead-details {
  display: flex;
  flex-direction: column;
}

.lead-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: #60a5fa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.lead-name {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #93c5fd;
}

.btn-clear-lead {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s;
}

.btn-clear-lead:hover {
  background: #EF4444;
  color: white;
}

.project-not-selected {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.45);
  font-style: italic;
  padding: 12px;
  background: var(--glass-bg-heavy);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}

/* Animations */
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.2s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateY(-8px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }

/* New Lead Subform */
.new-lead-subform {
  background: var(--glass-bg-heavy);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin-top: 8px;
}

.subform-header {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 12px;
}

/* Footer */
.modal-footer {
  padding: 24px 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}

.btn-ghost {
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  border: none;
  font-weight: 600;
  padding: 10px 20px;
  cursor: pointer;
}

.btn-primary-action {
  background: #3B82F6;
  color: white;
  border: none;
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 700;
  padding: 12px 28px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.2);
}

.btn-primary-action:hover:not(:disabled) {
  background: #2563EB;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
}

/* Animations */
.animate-in {
  animation: modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalIn {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.expand-enter-active, .expand-leave-active { transition: all 0.3s ease; max-height: 200px; overflow: hidden; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; transform: translateY(-10px); }

/* Scrollbar */
.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-track { background: transparent; }
.custom-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }
</style>

<script setup lang="ts">
const props = defineProps({
  initialDate: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'success']);
const api = useApi();
const toast = useToast();
const authStore = useAuthStore();
const canWriteScheduling = computed(() => authStore.canWriteFeature('scheduling'));
const writePermissionHint = 'Disponível apenas para usuários com permissão de edição';
const canLoadProjectsCatalog = computed(() => {
  return !authStore.isLoteadora || !authStore.hasPanelRestrictions || authStore.canReadFeature('projects');
});

const saving = ref(false);
const loadingLeads = ref(false);
type ProjectOption = {
  id: string;
  name: string;
};

type LeadOption = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

const projects = ref<ProjectOption[]>([]);
const leads = ref<LeadOption[]>([]);
const leadSearch = ref('');
const selectedLeadName = ref('');

const form = ref({
  projectId: '',
  scheduledAt: props.initialDate || '',
  leadId: '',
  leadName: '',
  leadEmail: '',
  leadPhone: '',
  notes: ''
});

const applyPhoneMask = (value: string) => value.replace(/\D/g, '').slice(0, 11)
  .replace(/(\d{2})(\d)/, '($1) $2')
  .replace(/(\d{5})(\d)/, '$1-$2');

const getInputValue = (event: Event) => (event.target as HTMLInputElement | null)?.value ?? '';

const onLeadPhoneInput = (event: Event) => {
  form.value.leadPhone = applyPhoneMask(getInputValue(event));
};

onMounted(async () => {
  if (!canLoadProjectsCatalog.value) {
    projects.value = [];
    return;
  }

  try {
    const res = await api.get('/projects');
    projects.value = Array.isArray(res) ? res : (res.data || []);
  } catch (e) {
    toast.error('Erro ao carregar projetos');
  }
});

let searchTimeout: any = null;
const onLeadSearch = () => {
    if (!form.value.projectId) return;
    if (searchTimeout) clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(async () => {
        if (!leadSearch.value) {
            // Load some default leads if search is empty
            const res = await api.get(`/leads?projectId=${form.value.projectId}&limit=10`);
            leads.value = Array.isArray(res) ? res : (res.data || []);
            return;
        }

        loadingLeads.value = true;
        try {
            const res = await api.get(`/leads?projectId=${form.value.projectId}&search=${leadSearch.value}&limit=20`);
            leads.value = Array.isArray(res) ? res : (res.data || []);
        } catch (e) {
            console.error('Search error', e);
        } finally {
            loadingLeads.value = false;
        }
    }, 400);
}

const selectLead = (lead: LeadOption) => {
    form.value.leadId = lead.id;
    selectedLeadName.value = lead.name;
    leadSearch.value = '';
}

const clearLead = () => {
    form.value.leadId = '';
    selectedLeadName.value = '';
}

const onProjectChange = async () => {
    if (!form.value.projectId) return;
    try {
        const res = await api.get(`/leads?projectId=${form.value.projectId}&limit=20`);
        leads.value = Array.isArray(res) ? res : (res.data || []);
        form.value.leadId = '';
        selectedLeadName.value = '';
    } catch (e) {
        toast.error('Erro ao carregar leads do projeto');
    }
}

const save = async () => {
  if (!canWriteScheduling.value) return;
  if (!form.value.projectId || !form.value.scheduledAt) {
     toast.error('Preencha os campos obrigatórios');
     return;
  }

  // Validação obrigatória de Lead (ou selecionar existente ou preencher dados de novo)
  if (!form.value.leadId && !form.value.leadName) {
    toast.error('É obrigatório vincular um lead ou preencher o nome para um novo cadastro.');
    return;
  }
  
  saving.value = true;
  try {
    // Garantir que a data seja enviada com o offset de Brasília (-03:00)
    // para evitar que o servidor a interprete erroneamente se estiver em outro fuso
    const payload = {
      ...form.value,
      leadId: form.value.leadId && form.value.leadId !== '' ? form.value.leadId : undefined,
      scheduledAt: form.value.scheduledAt.includes('Z') || form.value.scheduledAt.includes('-03:00')
        ? form.value.scheduledAt 
        : `${form.value.scheduledAt}:00-03:00`
    };

    await api.post('/scheduling', payload);
    toast.success('Agendamento criado com sucesso');
    emit('success');
    emit('close');
  } catch (e: any) {
    toast.error(e.message || 'Erro ao criar agendamento');
  } finally {
    saving.value = false;
  }
};
</script>
