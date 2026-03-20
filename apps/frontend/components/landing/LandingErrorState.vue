<script setup lang="ts">
defineProps<{
  error: string
}>()
</script>

<template>
  <div class="pub-error">
    <div class="pub-error-card card">
      <h2>Projeto não encontrado</h2>
      <p>{{ error }}</p>
      <NuxtLink to="/" class="v4-btn-primary" style="display: inline-flex; align-items: center; gap: 8px; margin-top: 1rem;"><i class="bi bi-arrow-left-short back-nav-icon" aria-hidden="true"></i><span class="back-nav-label">Voltar ao início</span></NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.pub-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 40px 20px;
}

.pub-error-card {
  text-align: center;
  max-width: 480px;
  padding: 40px;
}
</style>
