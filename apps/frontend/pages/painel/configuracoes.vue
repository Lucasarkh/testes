<template>
  <div class="configuracoes-page">
    <div class="page-header">
      <div>
        <h1>Configurações do Sistema</h1>
        <p>Gerencie contatos do site e preferências da plataforma.</p>
      </div>
    </div>

    <div class="grid grid-cols-3" style="gap: 24px;">
      <!-- Settings Card -->
      <div class="card col-span-1">
        <h2 class="card-title" style="margin-bottom: 20px;">
          <i class="pi pi-cog mr-2 text-primary"></i>
          Landing Page
        </h2>

        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
        </div>
        <form v-else @submit.prevent="saveSettings">
          <div class="form-group">
            <label class="form-label">WhatsApp de Contato</label>
            <input
              :value="settings.contactWhatsapp"
              @input="settings.contactWhatsapp = applyPhoneMask($event.target.value)"
              type="text"
              class="form-input"
              placeholder="(00) 00000-0000"
            >
            <p class="text-xs text-gray-400 mt-1" style="color: var(--color-surface-400); font-size: 0.75rem; margin-top: 4px;">Se preenchido, o site mostrará o botão de WhatsApp.</p>
          </div>

          <div class="form-group">
            <label class="form-label">E-mail de Contato</label>
            <input
              v-model="settings.contactEmail"
              type="email"
              class="form-input"
              placeholder="contato@empresa.com"
            >
          </div>

          <div class="form-group flex items-center gap-2" style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
            <input v-model="settings.leadFormEnabled" type="checkbox" id="form-en" style="width: 16px; height: 16px;">
            <label for="form-en" class="form-label" style="margin-bottom: 0;">Ativar formulário de lead no site</label>
          </div>

          <button
            type="submit"
            class="btn btn-primary w-full"
            style="width: 100%;"
            :disabled="saving"
          >
            {{ saving ? 'Salvando...' : 'Salvar Alterações' }}
          </button>
        </form>
      </div>

      <!-- Maintenance Mode Card -->
      <div class="card col-span-1">
        <h2 class="card-title" style="margin-bottom: 20px;">
          <i class="pi pi-wrench mr-2" style="color: #f59e0b;"></i>
          Modo Manutenção
        </h2>

        <div v-if="maintenanceLoading" class="loading-state">
          <div class="loading-spinner"></div>
        </div>
        <div v-else>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
            <span
              class="badge"
              :class="maintenance.enabled ? 'badge-danger' : 'badge-success'"
              style="font-size: 0.8rem; padding: 4px 12px;"
            >
              {{ maintenance.enabled ? 'ATIVO' : 'INATIVO' }}
            </span>
            <span v-if="maintenance.enabled && maintenance.enabledAt" style="color: var(--color-surface-400); font-size: 0.8rem;">
              Desde {{ formatDate(maintenance.enabledAt) }}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">Mensagem de Manutenção</label>
            <textarea
              v-model="maintenance.message"
              class="form-input"
              rows="3"
              placeholder="Sistema em manutenção. Voltaremos em breve."
              style="resize: vertical;"
            ></textarea>
            <p style="color: var(--color-surface-400); font-size: 0.75rem; margin-top: 4px;">
              Mensagem exibida aos visitantes durante a manutenção.
            </p>
          </div>

          <button
            v-if="!maintenance.enabled"
            class="btn w-full"
            style="width: 100%; background: #f59e0b; color: #000; font-weight: 600;"
            :disabled="maintenanceSaving"
            @click="toggleMaintenance(true)"
          >
            {{ maintenanceSaving ? 'Ativando...' : 'Ativar Manutenção' }}
          </button>
          <button
            v-else
            class="btn btn-primary w-full"
            style="width: 100%;"
            :disabled="maintenanceSaving"
            @click="toggleMaintenance(false)"
          >
            {{ maintenanceSaving ? 'Desativando...' : 'Desativar Manutenção' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const authStore = useAuthStore()
if (!authStore.isSysAdmin) {
  navigateTo(authStore.getDashboardRoute())
}

const api = useApi()
const toast = useToast()

const loading = ref(true)
const saving = ref(false)
const settings = ref({
  contactWhatsapp: '',
  contactEmail: '',
  leadFormEnabled: true
})

const maintenanceLoading = ref(true)
const maintenanceSaving = ref(false)
const maintenance = ref({
  enabled: false,
  message: '',
  enabledAt: null,
  enabledBy: null
})

onMounted(async () => {
  await Promise.all([fetchSettings(), fetchMaintenance()])
})

async function fetchSettings() {
  loading.value = true
  try {
    // Actually our public endpoint is safer if we want to pre-fill
    const publicData = await api.get('/p/settings')
    if (publicData) settings.value = { ...publicData }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  try {
    await api.patch('/settings', settings.value)
    toast.success('Configurações salvas com sucesso!')
  } catch (e) {
    toast.error('Erro ao salvar configurações.')
  } finally {
    saving.value = false
  }
}

async function fetchMaintenance() {
  maintenanceLoading.value = true
  try {
    const data = await api.get('/settings/maintenance')
    if (data) maintenance.value = data
  } catch (e) {
    console.error(e)
  } finally {
    maintenanceLoading.value = false
  }
}

async function toggleMaintenance(enabled) {
  maintenanceSaving.value = true
  try {
    const data = await api.post('/settings/maintenance', {
      enabled,
      message: maintenance.value.message || ''
    })
    if (data) maintenance.value = data
    toast.success(enabled ? 'Modo manutenção ativado!' : 'Modo manutenção desativado!')
  } catch (e) {
    toast.error('Erro ao alterar modo manutenção.')
  } finally {
    maintenanceSaving.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
