<template>
  <div class="modal-overlay">
    <div class="modal modal-lg">
      <div class="modal-header">
        <h2>{{ isEdit ? 'Editar Lead' : 'Novo Lead' }}</h2>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <form @submit.prevent="save">
          <div class="row">
            <div class="col-md-8 form-group mb-3">
              <label class="form-label">Nome Completo</label>
              <input v-model="form.name" type="text" class="form-control" required placeholder="Ex: João da Silva">
            </div>
            <div class="col-md-4 form-group mb-3 text-dark position-relative">
              <label class="form-label" style="color: var(--color-surface-50) !important;">Projeto</label>
              
              <!-- Custom Select for absolute color control -->
              <div class="custom-select-wrapper" v-click-outside="() => showDropdown = false">
                <div 
                  class="custom-select-trigger" 
                  :class="{ 'disabled': isEdit }"
                  @click="!isEdit && (showDropdown = !showDropdown)"
                >
                  <span class="text-dark">{{ selectedProjectName }}</span>
                  <span class="arrow">▼</span>
                </div>
                
                <div v-if="showDropdown" class="custom-options-container">
                  <div 
                    class="custom-option"
                    @click.stop="selectProject('')"
                  >
                    Selecione um projeto
                  </div>
                  <div 
                    v-for="p in localProjects" 
                    :key="p.id" 
                    class="custom-option"
                    @click.stop="selectProject(p.id)"
                  >
                    {{ p.name }}
                  </div>
                </div>
              </div>
              
              <input type="hidden" v-model="form.projectId" required />
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 form-group mb-3">
              <label class="form-label">Email</label>
              <input v-model="form.email" type="email" class="form-control" placeholder="joao@email.com">
            </div>
            <div class="col-md-6 form-group mb-3">
              <label class="form-label">Telefone</label>
              <input :value="form.phone" @input="form.phone = applyPhoneMask($event.target.value)" type="text" class="form-control" placeholder="(00) 00000-0000">
            </div>
          </div>

          <div class="row">
            <div class="col-md-4 form-group mb-3">
              <label class="form-label">CPF</label>
              <input :value="form.cpf" @input="form.cpf = applyCpfMask($event.target.value)" type="text" class="form-control" placeholder="000.000.000-00">
            </div>
            <div class="col-md-4 form-group mb-3">
              <label class="form-label">RG</label>
              <input v-model="form.rg" type="text" class="form-control">
            </div>
            <div class="col-md-4 form-group mb-3">
              <label class="form-label">Data de Nasc.</label>
              <input v-model="form.birthDate" type="date" class="form-control">
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 form-group mb-3">
              <label class="form-label">Estado Civil</label>
              <select v-model="form.maritalStatus" class="form-select">
                <option value="">Selecione...</option>
                <option value="Solteiro">Solteiro(a)</option>
                <option value="Casado">Casado(a)</option>
                <option value="Divorciado">Divorciado(a)</option>
                <option value="Viúvo">Viúvo(a)</option>
                <option value="União Estável">União Estável</option>
              </select>
            </div>
            <div class="col-md-6 form-group mb-3">
              <label class="form-label">Profissão</label>
              <input v-model="form.occupation" type="text" class="form-control">
            </div>
          </div>

          <hr class="my-4">

          <div class="row">
            <div class="col-md-8 form-group mb-3">
              <label class="form-label">Endereço</label>
              <input v-model="form.address" type="text" class="form-control">
            </div>
            <div class="col-md-4 form-group mb-3">
              <label class="form-label">CEP</label>
              <input :value="form.addressZip" @input="form.addressZip = applyCepMask($event.target.value)" type="text" class="form-control">
            </div>
          </div>

          <div class="row">
            <div class="col-md-6 form-group mb-3">
              <label class="form-label">Cidade</label>
              <input v-model="form.addressCity" type="text" class="form-control">
            </div>
            <div class="col-md-6 form-group mb-3">
              <label class="form-label">Estado (UF)</label>
              <input v-model="form.addressState" type="text" class="form-control" maxlength="2">
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label">Mensagem / Observações</label>
            <textarea v-model="form.message" class="form-control" rows="3"></textarea>
          </div>

          <div v-if="!isEdit" class="form-group mb-3">
            <label class="form-label">Código do Corretor (Opcional)</label>
            <input v-model="form.realtorCode" type="text" class="form-control" placeholder="Ex: JOAO123">
          </div>

          <div class="text-end mt-4">
            <button type="button" class="btn btn-neutral me-2" @click="$emit('close')">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? 'Salvando...' : 'Salvar Lead' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  lead: { type: Object, default: null },
  projects: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'saved'])
const { createLead, updateLead, loadProjects, projects: availableProjects } = useLeads()
const loading = ref(false)
const showDropdown = ref(false)

const localProjects = ref([])

const isEdit = computed(() => !!props.lead)

const selectedProjectName = computed(() => {
  if (!form.value.projectId) return 'Selecione um projeto'
  const p = localProjects.value.find(p => p.id === form.value.projectId)
  return p ? p.name : 'Selecione um projeto'
})

const selectProject = (id) => {
  form.value.projectId = id
  showDropdown.value = false
}

// Custom directive for clicking outside the dropdown
const vClickOutside = {
  mounted: (el, binding) => {
    el.clickOutsideEvent = event => {
      if (!(el == event.target || el.contains(event.target))) {
        binding.value()
      }
    };
    document.addEventListener("click", el.clickOutsideEvent);
  },
  unmounted: el => {
    document.removeEventListener("click", el.clickOutsideEvent);
  },
};

const form = ref({
  name: '', email: '', phone: '', projectId: '',
  cpf: '', rg: '', birthDate: '', maritalStatus: '', occupation: '',
  address: '', addressCity: '', addressState: '', addressZip: '',
  message: '', realtorCode: ''
})

onMounted(async () => {
  // Try to use props projects first
  if (props.projects && props.projects.length > 0) {
    localProjects.value = props.projects
  } else {
    // If not provided by props, load them inside the modal
    await loadProjects()
    localProjects.value = availableProjects.value
  }

  if (props.lead) {
    const l = props.lead
    form.value = {
      name: l.name || '',
      email: l.email || '',
      phone: l.phone || '',
      projectId: l.projectId || '',
      cpf: l.cpf || '',
      rg: l.rg || '',
      birthDate: l.birthDate ? getISODateInBrasilia(l.birthDate) : '',
      maritalStatus: l.maritalStatus || '',
      occupation: l.occupation || '',
      address: l.address || '',
      addressCity: l.addressCity || '',
      addressState: l.addressState || '',
      addressZip: l.addressZip || '',
      message: l.message || '',
    }
  }
})

const save = async () => {
  loading.value = true
  try {
    const payload = { ...form.value }
    
    // Remove empty optional strings or non-serializable fields if any
    Object.keys(payload).forEach(key => {
      if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
        delete payload[key]
      }
    })

    // Ensure projectId is a string and present
    if (!payload.projectId) {
      alert('Por favor, selecione um projeto.')
      loading.value = false
      return
    }

    // Ensure birthDate is in ISO-8601 format (YYYY-MM-DDT00:00:00.000Z) if present
    if (payload.birthDate) {
      // Input date is typically YYYY-MM-DD
      payload.birthDate = new Date(`${payload.birthDate}T12:00:00Z`).toISOString()
    }

    if (isEdit.value) {
      await updateLead(props.lead.id, payload)
    } else {
      await createLead(payload)
    }
    emit('saved')
    emit('close')
  } catch (e) {
    // Error handled in useLeads
    console.error('Save lead error:', e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--glass-bg);
  border-radius: var(--radius-lg);
  box-shadow: 0 25px 50px rgba(0,0,0,0.6);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.modal-lg { width: 100%; max-width: 800px; }

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--glass-border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-surface-500);
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.modal-close:hover { color: var(--color-danger); }

/* Force select options visibility */
.form-select, .form-control {
  background: var(--glass-bg-heavy) !important;
  color: var(--color-surface-50) !important;
  border: 1px solid var(--glass-border);
}

select.form-select option {
  color: var(--color-surface-50) !important;
  background: var(--glass-bg) !important;
  appearance: none;
  -webkit-appearance: none;
}

/* Specific hack for dark mode browser overrides */
@media (prefers-color-scheme: dark) {
  select.form-select {
    background: var(--glass-bg-heavy) !important;
    color: var(--color-surface-50) !important;
  }
}

.text-dark {
  color: var(--color-surface-50) !important;
}

/* Custom Select Dropdown Styles */
.custom-select-wrapper {
  position: relative;
  user-select: none;
  width: 100%;
}

.custom-select-trigger {
  background: var(--glass-bg-heavy) !important;
  border: 1px solid var(--glass-border);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  height: 44px;
  color: var(--color-surface-50) !important;
}

.custom-select-trigger.disabled {
  background: var(--glass-bg) !important;
  cursor: not-allowed;
  opacity: 0.7;
}

.custom-select-trigger .arrow {
  font-size: 0.6rem;
  color: var(--color-surface-400);
}

.custom-options-container {
  position: absolute;
  top: 105%;
  left: 0;
  right: 0;
  background: var(--glass-bg) !important;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: 0 12px 24px rgba(0,0,0,0.5);
  z-index: 1050;
  max-height: 250px;
  overflow-y: auto;
}

.custom-option {
  padding: 12px 16px;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-surface-50) !important;
  background: var(--glass-bg) !important;
  border-bottom: 1px solid var(--glass-border-subtle);
  transition: background 0.2s;
}

.custom-option:last-child {
  border-bottom: none;
}

.custom-option:hover {
  background-color: rgba(16, 185, 129, 0.1) !important;
  color: var(--color-primary-500) !important;
}
</style>
