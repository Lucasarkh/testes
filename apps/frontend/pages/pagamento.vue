<template>
  <div class="cancel-page">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Processando cancelamento...</p>
    </div>
    <div v-else class="content">
      <div class="icon-circle shadow-sm">
        <i class="fas fa-times"></i>
      </div>
      <h1>Pagamento Cancelado</h1>
      <p>Você cancelou o processo de pagamento. A reserva não foi concluída.</p>
      
      <div class="actions">
        <button @click="goHome" class="btn btn-primary"><i class="bi bi-arrow-left-short back-nav-icon" aria-hidden="true"></i><span class="back-nav-label">Voltar ao Início</span></button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePublicApi } from '~/composables/usePublicApi'
const route = useRoute()
const router = useRouter()
const publicApi = usePublicApi()

const loading = ref(true)

onMounted(async () => {
  const leadId = route.query.leadId as string
  if (leadId) {
    try {
      await publicApi.post('/payment/cancel', { leadId })
    } catch (e) {
      console.error('Error logging cancellation', e)
    }
  }
  loading.value = false
})

const goHome = () => {
  router.push('/')
}

definePageMeta({
  layout: 'public'
})
</script>

<style scoped>
.cancel-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 2rem;
  text-align: center;
}
.icon-circle {
  width: 80px;
  height: 80px;
  background: #f8f9fa;
  color: #dc3545;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin: 0 auto 1.5rem;
}
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0,0,0,0.1);
  border-left-color: #0071e3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}
@keyframes spin { to { transform: rotate(360deg); } }
h1 { margin-bottom: 1rem; color: #333; }
p { color: #666; margin-bottom: 2rem; }
</style>
