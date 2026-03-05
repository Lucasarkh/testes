<template>
  <div class="auth-page">
    <div class="auth-card">
      <NuxtLink to="/login" class="back-home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"></polyline></svg>
        Voltar para Login
      </NuxtLink>
      <div class="auth-brand">
        <img src="/img/logo.svg" alt="Lotio" class="login-logo" />
        <p class="auth-subtitle">Redefinir senha</p>
      </div>

      <div v-if="!token" class="alert alert-error">
        Link inválido. Solicite um novo link de recuperação de senha.
      </div>

      <div v-else-if="success" class="alert alert-success">
        Senha redefinida com sucesso! Você já pode fazer login com sua nova senha.
        <NuxtLink to="/login" class="btn btn-primary btn-lg" style="width:100%; margin-top: var(--space-4); display: block; text-align: center;">
          Ir para Login
        </NuxtLink>
      </div>

      <form v-else @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label">Nova Senha</label>
          <AppPasswordInput v-model="password" :placeholder="PASSWORD_POLICY_HINT" required />
          <div v-if="passwordPolicyError" class="form-error">
            {{ passwordPolicyError }}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Confirmar Nova Senha</label>
          <AppPasswordInput v-model="confirmPassword" placeholder="Repita a nova senha" required />
          <div v-if="confirmPassword && confirmPassword !== password" class="form-error">
            As senhas não coincidem
          </div>
        </div>
        <div v-if="error" class="alert alert-error">{{ error }}</div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%" :disabled="loading || !!passwordPolicyError || (confirmPassword && confirmPassword !== password)">
          {{ loading ? 'Redefinindo...' : 'Redefinir Senha' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getPasswordPolicyError, PASSWORD_POLICY_HINT } from '~/utils/passwordPolicy'

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)
const config = useRuntimeConfig()
const route = useRoute()

const token = computed(() => route.query.token as string || '')
const passwordPolicyError = computed(() => getPasswordPolicyError(password.value))

definePageMeta({
  layout: 'public'
})

const handleSubmit = async () => {
  if (passwordPolicyError.value) {
    error.value = passwordPolicyError.value
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'As senhas não coincidem'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${config.public.apiBase}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.value, password: password.value }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.message || 'Erro ao redefinir senha')
    }
    success.value = true
  } catch (e) {
    error.value = e.message === 'Token inválido ou expirado' 
      ? 'Link expirado ou já utilizado. Solicite um novo link.' 
      : (e.message || 'Erro ao redefinir senha. Tente novamente.')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  display: flex; justify-content: center; align-items: center;
  min-height: 100vh; background: var(--gray-50); padding: var(--space-6);
}
.auth-card {
  background: white; padding: var(--space-10); border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg); width: 100%; max-width: 420px; border: 1px solid var(--gray-200);
}
.auth-brand { text-align: center; margin-bottom: var(--space-8); }
.login-logo {
  height: 48px;
  margin-bottom: var(--space-4);
}
.auth-subtitle { font-size: 0.875rem; color: var(--gray-500); }
.back-home {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--gray-500);
  text-decoration: none;
  font-size: 0.875rem;
  margin-bottom: var(--space-6);
  transition: color 0.2s;
}
.back-home:hover {
  color: var(--primary);
}
.form-error {
  color: var(--color-error, #dc2626);
  font-size: 0.8125rem;
  margin-top: 4px;
}
</style>
