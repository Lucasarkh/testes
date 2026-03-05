<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getPasswordPolicyError,
  PASSWORD_POLICY_HINT
} from '~/utils/passwordPolicy'
const { get, post } = usePublicApi()
const route = useRoute()
const router = useRouter()
const { success: toastSuccess, error: toastError } = useToast()

const token = route.query.token as string
const loading = ref(false)
const validationLoading = ref(true)
const errorMsg = ref('')
const inviteData = ref<any>(null)

const form = ref({
  email: '',
  name: '',
  password: '',
  confirmPassword: ''
})

async function fetchInvite() {
  if (!token) return
  
  try {
    const data = await get(`/agencies/invite/${token}`)
    inviteData.value = data
    form.value.email = data.email
  } catch (err: any) {
    errorMsg.value = err.data?.message || 'Este convite não é mais válido.'
    toastError(errorMsg.value)
  } finally {
    validationLoading.value = false
  }
}

const roleName = computed(() => {
  if (!inviteData.value) return 'Sua conta'
  const map: Record<string, string> = {
    'IMOBILIARIA': 'Gestor de Imobiliária',
    'CORRETOR': 'Corretor de Imóveis',
    'LOTEADORA': 'Gestor da Loteadora'
  }
  return map[inviteData.value.role] || 'Usuário'
})

async function acceptInvite() {
  if (!form.value.name || !form.value.password) {
    errorMsg.value = 'Preencha todos os campos corretamente.'
    return
  }

  const password = form.value.password
  const passwordError = getPasswordPolicyError(password)
  if (passwordError) {
    errorMsg.value = passwordError
    return
  }
  
  if (form.value.password !== form.value.confirmPassword) {
    errorMsg.value = 'As senhas não coincidem.'
    return
  }

  loading.value = true
  errorMsg.value = ''
  
  try {
    await post('/agencies/invite/accept', {
      token,
      name: form.value.name,
      password: form.value.password
    })
    
    toastSuccess('Conta criada com sucesso! Redirecionando...')
    setTimeout(() => router.push('/login?registered=1'), 2000)
  } catch (err: any) {
    errorMsg.value = err.message || 'Erro ao aceitar convite. Verifique se o link ainda é válido.'
    toastError(errorMsg.value)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!token) {
    toastError('Token de convite não fornecido.')
    router.push('/login')
    return
  }
  fetchInvite()
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-brand">
        <img src="/img/logo.svg" alt="Lotio" class="login-logo" />
        <h1 class="auth-title">Finalizar Cadastro</h1>
        <p class="auth-subtitle">
          Complete seus dados para ativar sua conta de <strong>{{ roleName }}</strong> no Lotio.
        </p>
      </div>

      <form v-if="!validationLoading" @submit.prevent="acceptInvite" class="auth-form">
        <div class="form-group">
          <label class="form-label">E-mail</label>
          <input 
            v-model="form.email" 
            type="email" 
            class="form-input" 
            disabled
            placeholder="Seu e-mail"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Nome Completo</label>
          <input 
            v-model="form.name" 
            type="text" 
            class="form-input" 
            required 
            placeholder="Seu nome completo"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">Sua Senha</label>
          <AppPasswordInput
            v-model="form.password"
            required
            :placeholder="PASSWORD_POLICY_HINT"
          />
          <div v-if="form.password && getPasswordPolicyError(form.password)" class="alert alert-error">
            {{ getPasswordPolicyError(form.password) }}
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Confirmar Senha</label>
          <AppPasswordInput
            v-model="form.confirmPassword"
            required
            placeholder="••••••••"
          />
        </div>

        <div v-if="errorMsg" class="alert alert-error">
          {{ errorMsg }}
        </div>

        <button 
          type="submit" 
          class="btn btn-primary btn-lg" 
          style="width: 100%"
          :disabled="loading"
        >
          {{ loading ? 'Processando...' : 'Criar minha conta e acessar' }}
        </button>

        <p class="auth-footer-link">
          Ao clicar em aceitar, você concorda com nossos Termos de Uso.
        </p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex; 
  justify-content: center; 
  align-items: center;
  min-height: 100vh; 
  background: var(--gray-50); 
  padding: 16px;
}

.auth-card {
  background: white; 
  padding: 32px 28px; 
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg); 
  width: 100%; 
  max-width: 440px; 
  border: 1px solid var(--gray-200);
  box-sizing: border-box;
}

@media (max-width: 480px) {
  .auth-card {
    padding: 24px 20px;
    border-radius: var(--radius-lg);
  }
}

.auth-brand { 
  text-align: center; 
  margin-bottom: 24px; 
}

.login-logo {
  height: 48px;
  margin-bottom: 12px;
}

.auth-title { 
  font-size: 1.5rem; 
  font-weight: 800;
  color: #111827;
  margin-bottom: 4px; 
}

.auth-subtitle { 
  font-size: 0.875rem; 
  color: #4b5563; 
}

.auth-subtitle strong {
  color: #111827;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-footer-link {
  margin-top: 20px;
  text-align: center;
  font-size: 0.75rem;
  color: #9ca3af;
}

.alert {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  margin-bottom: 8px;
}

.alert-error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 1.5px solid #d1d5db;
  font-size: 1rem;
  color: #111827;
  transition: all 150ms ease;
  background: white;
  box-sizing: border-box;
}

.form-input:disabled {
  background: #f3f4f6;
  color: #6b7280;
  cursor: not-allowed;
}

.form-input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
}

.form-input::placeholder {
  color: #9ca3af;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 150ms ease;
  border: none;
}

.btn-primary {
  background: #059669;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #047857;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-lg {
  height: 52px;
}
</style>
