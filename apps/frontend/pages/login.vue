<template>
  <div class="auth-page">
    <div class="auth-card">
      <NuxtLink to="/" class="back-home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"></polyline></svg>
        Voltar para Home
      </NuxtLink>
      <div class="auth-brand">
        <img src="/img/logo.svg" alt="Lotio" class="login-logo" />
        <p class="auth-subtitle">Entre na sua conta</p>
      </div>

      <div v-if="successMessage" class="alert alert-success">{{ successMessage }}</div>

      <!-- 2FA Code Entry -->
      <form v-if="twoFactorPending" @submit.prevent="handleVerify2FA">
        <div class="info-box">
          <p>Um código de verificação foi enviado para o seu e-mail. Digite-o abaixo para continuar.</p>
        </div>
        <div class="form-group">
          <label class="form-label">Código de Verificação</label>
          <input v-model="twoFactorCode" type="text" class="form-input" placeholder="000000" required maxlength="6" pattern="[0-9]{6}" inputmode="numeric" style="text-align: center; font-size: 1.25rem; letter-spacing: 4px;" />
        </div>
        <div v-if="error" class="alert alert-error">{{ error }}</div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%" :disabled="loading">
          {{ loading ? 'Verificando...' : 'Verificar Código' }}
        </button>
        <p class="auth-footer-link">
          <a href="#" @click.prevent="twoFactorPending = false; error = ''">Voltar para login</a>
        </p>
      </form>

      <!-- Normal Login -->
      <form v-else @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input v-model="email" type="email" class="form-input" placeholder="seu@email.com" required />
        </div>
        <div class="form-group">
          <label class="form-label">Senha</label>
          <AppPasswordInput v-model="password" placeholder="********" required />
        </div>
        <div v-if="error" class="alert alert-error">{{ error }}</div>
        <div style="text-align: right; margin-bottom: var(--space-2);">
          <NuxtLink to="/esqueci-senha" class="forgot-link">Esqueceu sua senha?</NuxtLink>
        </div>
        <button type="submit" class="btn btn-primary btn-lg" style="width:100%" :disabled="loading">
          {{ loading ? 'Entrando...' : 'Entrar' }}
        </button>
        <p class="auth-footer-link">
          Entre com as credenciais fornecidas pela sua empresa.
        </p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const successMessage = ref('')
const twoFactorPending = ref(false)
const twoFactorUserId = ref('')
const twoFactorCode = ref('')
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const config = useRuntimeConfig()
const apiBase = (config.public.apiBase || '').replace(/\/+$/, '')
const { success: toastSuccess, fromError: toastFromError } = useToast()

definePageMeta({
  layout: 'public'
})

onMounted(() => {
  if (route.query.registered) successMessage.value = 'Conta criada com sucesso! Faça seu login.'
})

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.message || 'Falha no login')
    }
    const data = await res.json()
    
    // Check if 2FA is required
    if (data.requiresTwoFactor) {
      twoFactorPending.value = true
      twoFactorUserId.value = data.userId
      successMessage.value = ''
      toastSuccess('Código de verificação enviado para seu e-mail')
      return
    }
    
    authStore.setAuth(data)
    toastSuccess('Bem-vindo!')
    router.push(authStore.getDashboardRoute())
  } catch (e) {
    error.value = e.message === 'Unauthorized' ? 'E-mail ou senha incorretos' : e.message
    toastFromError(e, 'Falha no login')
  } finally {
    loading.value = false
  }
}

const handleVerify2FA = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${apiBase}/api/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: twoFactorUserId.value, code: twoFactorCode.value }),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.message || 'Código inválido')
    }
    const data = await res.json()
    authStore.setAuth(data)
    toastSuccess('Bem-vindo!')
    router.push(authStore.getDashboardRoute())
  } catch (e) {
    error.value = e.message || 'Código inválido. Tente novamente.'
    toastFromError(e, 'Verificação falhou')
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
.auth-brand h1 { font-size: 1.5rem; margin-bottom: var(--space-1); }
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
.auth-footer-link { text-align: center; margin-top: var(--space-5); font-size: 0.8125rem; color: var(--gray-500); }
.auth-footer-link a { color: var(--primary); font-weight: 600; }
.forgot-link {
  color: var(--primary);
  font-size: 0.8125rem;
  font-weight: 500;
  text-decoration: none;
  transition: opacity 0.2s;
}
.forgot-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}
.info-box {
  background: var(--gray-50, #f8fafc);
  border-left: 4px solid var(--primary, #2563eb);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: var(--space-5);
  font-size: 0.875rem;
  color: var(--gray-600, #475569);
  line-height: 1.5;
}
.info-box p { margin: 0; }
</style>
