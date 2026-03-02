<template>
  <div class="configuracoes-page">
    <div class="page-header">
      <div>
        <h1>Configurações do Sistema</h1>
        <p>Gerencie contatos do site e preferências da plataforma.</p>
      </div>
    </div>

    <div class="grid grid-cols-3">
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
              v-model="settings.contactWhatsapp" 
              type="text" 
              class="form-input"
              placeholder="(00) 00000-0000"
              v-maska="'(##) #####-####'"
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
    </div>
  </div>
</template>

<script setup>
const authStore = useAuthStore()
if (!authStore.isSysAdmin) {
  navigateTo('/painel')
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

onMounted(async () => {
  await fetchSettings()
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
</script>

