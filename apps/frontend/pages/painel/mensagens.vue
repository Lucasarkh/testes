<template>
  <div class="mensagens-page">
    <div class="page-header">
      <div>
        <h1>Mensagens do Site</h1>
        <p>Interessados que preencheram o formulário na landing page da plataforma.</p>
      </div>
      <button @click="fetchLeads" class="btn btn-secondary">
        <i class="pi pi-refresh mr-2" :class="{ 'pi-spin': leadsLoading }"></i>
        Atualizar
      </button>
    </div>

    <div v-if="leadsLoading" class="loading-state">
      <div class="loading-spinner"></div>
    </div>
    
    <div v-else-if="leads.length === 0" class="empty-state-container d-flex align-items-center justify-content-center py-5">
      <div class="card text-center p-5 rounded-5 max-w-500" style="backdrop-filter: blur(var(--glass-blur));">
        <div class="icon-blob mx-auto mb-4">✉️</div>
        <h3 class="fw-bold mb-3">Nenhuma mensagem</h3>
        <p class="mb-4 px-4">Mensagens aparecerão aqui quando alguém se interessar pela plataforma.</p>
      </div>
    </div>

    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Contato</th>
            <th>Data</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="lead in leads" :key="lead.id">
            <td>
              <div style="font-weight: 600; color: var(--color-surface-50);">{{ lead.name }}</div>
              <div v-if="lead.message" style="font-size: 0.75rem; color: var(--color-surface-400); margin-top: 2px;">
                "{{ lead.message }}"
              </div>
            </td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 4px;">
                <a :href="'mailto:' + lead.email" class="text-primary" style="font-size: 0.8125rem;" v-if="lead.email">{{ lead.email }}</a>
                <a :href="'https://wa.me/' + lead.phone.replace(/\D/g, '')" target="_blank" style="color: var(--color-success); font-size: 0.8125rem; display: flex; align-items: center; gap: 4px;" v-if="lead.phone">
                  <i class="pi pi-whatsapp"></i>
                  {{ lead.phone }}
                </a>
              </div>
            </td>
            <td>
              {{ formatDateToBrasilia(lead.createdAt) }}
            </td>
            <td>
              <span 
                class="badge"
                :class="lead.status === 'NEW' ? 'badge-primary' : 'badge-neutral'"
              >
                {{ lead.status === 'NEW' ? 'Novo' : lead.status }}
              </span>
            </td>
            <td>
              <button 
                v-if="lead.status === 'NEW'" 
                @click="markContacted(lead.id)"
                class="btn btn-ghost btn-sm"
              >
                Marcar Contato
              </button>
            </td>
          </tr>
        </tbody>
      </table>
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

const leadsLoading = ref(true)
const leads = ref([])

onMounted(async () => {
  await fetchLeads()
})

async function fetchLeads() {
  leadsLoading.value = true
  try {
    leads.value = await api.get('/settings/leads')
  } catch (e) {
    toast.error('Erro ao carregar mensagens.')
  } finally {
    leadsLoading.value = false
  }
}

async function markContacted(id) {
  try {
    await api.patch(`/settings/leads/${id}`, { status: 'CONTACTED' })
    toast.success('Status atualizado!')
    await fetchLeads()
  } catch (e) {
    toast.error('Erro ao atualizar status.')
  }
}
</script>

<style scoped>
.mensagens-page {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
