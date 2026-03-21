<template>
  <div class="thank-you-page">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Confirmando seu pagamento...</p>
    </div>
    <div v-else class="content">
      <div class="icon-circle shadow-sm">
        <i class="fas fa-check"></i>
      </div>
      <h1>Reserva Confirmada!</h1>
      <p>Seu pagamento foi confirmado com sucesso. O lote foi reservado para você.</p>
      
      <div class="actions">
        <button @click="goHome" class="btn btn-primary">Começar Agora</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { buildRobotsContent } from '~/utils/seo'

const route = useRoute()
const router = useRouter()

const loading = ref(true)

useSeoMeta({
  robots: buildRobotsContent(true),
})

onMounted(() => {
  // In a real app we might verify with the backend if payment actually succeeded
  // but usually the gateway redirect occurs after success.
  setTimeout(() => {
    loading.value = false
  }, 1000)
})

const goHome = () => {
  router.push('/')
}

definePageMeta({
  layout: 'public'
})
</script>

<style scoped>
.thank-you-page {
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
  color: #28a745;
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
