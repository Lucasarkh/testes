<script setup lang="ts">
definePageMeta({ layout: false })
import {
  getPasswordPolicyError,
  PASSWORD_POLICY_HINT
} from '~/utils/passwordPolicy'

const { get, post } = usePublicApi()
const route = useRoute()
const router = useRouter()
const { success: toastSuccess, error: toastError } = useToast()

const code = route.params.code as string

const loading = ref(false)
const validating = ref(true)
const errorMsg = ref('')
const codeData = ref<{ tenantName: string; role: string; description: string | null } | null>(null)
const success = ref(false)

const form = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  creci: '',
  agencyName: ''
})

const isImobiliaria = computed(() => codeData.value?.role === 'IMOBILIARIA')

const roleName = computed(() => {
  if (!codeData.value) return ''
  return codeData.value.role === 'IMOBILIARIA' ? 'Imobiliária' : 'Corretor de Imóveis'
})

async function fetchCodeData() {
  try {
    const data = await get(`/agencies/invite-codes/public/${code}`)
    codeData.value = data
  } catch (err: any) {
    errorMsg.value = err.message || 'Link de cadastro inválido ou expirado.'
  } finally {
    validating.value = false
  }
}

async function register() {
  errorMsg.value = ''

  if (!form.value.name || !form.value.email || !form.value.password) {
    errorMsg.value = 'Preencha todos os campos obrigatórios.'
    return
  }

  if (isImobiliaria.value && !form.value.agencyName) {
    errorMsg.value = 'Informe o nome da imobiliária.'
    return
  }

  const pwd = form.value.password
  const passwordError = getPasswordPolicyError(pwd)
  if (passwordError) {
    errorMsg.value = passwordError
    return
  }

  if (pwd !== form.value.confirmPassword) {
    errorMsg.value = 'As senhas não coincidem.'
    return
  }

  loading.value = true
  try {
    const payload: any = {
      name: form.value.name,
      email: form.value.email,
      password: form.value.password,
      phone: form.value.phone || undefined,
      creci: form.value.creci || undefined,
    }
    if (isImobiliaria.value) {
      payload.agencyName = form.value.agencyName
    }

    await post(`/agencies/invite-codes/public/${code}/register`, payload)
    success.value = true
    toastSuccess('Cadastro realizado com sucesso!')
    setTimeout(() => router.push('/login?registered=1'), 2500)
  } catch (err: any) {
    errorMsg.value = err.message || 'Erro ao realizar cadastro. Tente novamente.'
    toastError(errorMsg.value)
  } finally {
    loading.value = false
  }
}

onMounted(fetchCodeData)
</script>

<template>
  <div class="register-page">
    <div class="register-card">
      <div class="brand">
        <img src="/img/logo.svg" alt="Lotio" class="logo" />
      </div>

      <!-- Validating -->
      <div v-if="validating" class="state-center">
        <div class="spinner"></div>
        <p>Verificando link...</p>
      </div>

      <!-- Invalid link -->
      <div v-else-if="!codeData" class="state-center error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h2>Link inválido</h2>
        <p>{{ errorMsg || 'Este link de cadastro não é mais válido.' }}</p>
        <NuxtLink to="/login" class="btn btn-primary">Ir para o login</NuxtLink>
      </div>

      <!-- Success -->
      <div v-else-if="success" class="state-center success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <h2>Cadastro realizado!</h2>
        <p>Sua conta foi criada com sucesso. Redirecionando para o login...</p>
      </div>

      <!-- Registration Form -->
      <template v-else>
        <div class="card-header">
          <h1>Cadastro de {{ roleName }}</h1>
          <p>
            Você foi convidado para se cadastrar como <strong>{{ roleName }}</strong>
            na plataforma da <strong>{{ codeData.tenantName }}</strong>.
          </p>
          <p v-if="codeData.description" class="invite-note">{{ codeData.description }}</p>
        </div>

        <form class="form" @submit.prevent="register">
          <div v-if="isImobiliaria" class="form-group">
            <label class="form-label">Nome da Imobiliária <span class="required">*</span></label>
            <input v-model="form.agencyName" type="text" class="form-input" placeholder="Nome da sua imobiliária" required />
          </div>

          <div class="form-group">
            <label class="form-label">Seu Nome Completo <span class="required">*</span></label>
            <input v-model="form.name" type="text" class="form-input" placeholder="Nome completo" required />
          </div>

          <div class="form-group">
            <label class="form-label">E-mail <span class="required">*</span></label>
            <input v-model="form.email" type="email" class="form-input" placeholder="seu@email.com" required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Telefone</label>
              <input v-model="form.phone" type="tel" class="form-input" placeholder="(11) 99999-9999" />
            </div>
            <div class="form-group">
              <label class="form-label">CRECI</label>
              <input v-model="form.creci" type="text" class="form-input" placeholder="Opcional" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Senha <span class="required">*</span></label>
            <AppPasswordInput v-model="form.password" :placeholder="PASSWORD_POLICY_HINT" required />
            <div v-if="form.password && getPasswordPolicyError(form.password)" class="alert-error">
              {{ getPasswordPolicyError(form.password) }}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Confirmar Senha <span class="required">*</span></label>
            <AppPasswordInput v-model="form.confirmPassword" placeholder="Repita a senha" required />
          </div>

          <div v-if="errorMsg" class="alert-error">{{ errorMsg }}</div>

          <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
            {{ loading ? 'Criando conta...' : 'Criar minha conta' }}
          </button>

          <p class="footer-note">
            Ao criar sua conta você concorda com os
            <NuxtLink to="/termos-de-uso" target="_blank">Termos de Uso</NuxtLink>
            e a
            <NuxtLink to="/politica-de-privacidade" target="_blank">Política de Privacidade</NuxtLink>
            do Lotio.
          </p>
        </form>
      </template>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.register-page {
  min-height: 100vh;
  background: #f9fafb;
  display: flex; justify-content: center; align-items: flex-start;
  padding: 40px 16px;
}

.register-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  border: 1px solid #e5e7eb;
  width: 100%; max-width: 480px;
  padding: 32px 28px;
}

@media (max-width: 480px) {
  .register-card { padding: 24px 20px; }
  .register-page { padding: 24px 12px; }
}

.brand { text-align: center; margin-bottom: 24px; }
.logo { height: 44px; }

.card-header { text-align: center; margin-bottom: 24px; }
.card-header h1 { font-size: 1.375rem; font-weight: 800; color: #111827; margin: 0 0 8px; }
.card-header p { font-size: 0.875rem; color: #4b5563; margin: 0 0 4px; line-height: 1.5; }
.card-header strong { color: #111827; }
.invite-note {
  display: inline-block; margin-top: 8px;
  font-size: 0.8125rem; color: #059669;
  background: #f0fdf4; border: 1px solid #d1fae5;
  border-radius: 8px; padding: 6px 12px;
}

.state-center {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 32px 0; text-align: center;
  color: #6b7280;
}
.state-center h2 { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0; }
.state-center p { margin: 0; font-size: 0.875rem; }
.state-center.error { color: #dc2626; }
.state-center.error h2 { color: #b91c1c; }
.state-center.success { color: #059669; }
.state-center.success h2 { color: #047857; }

.spinner {
  width: 36px; height: 36px;
  border: 3px solid #e5e7eb;
  border-top-color: #10b981;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.form { display: flex; flex-direction: column; gap: 14px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-label { font-size: 0.875rem; font-weight: 600; color: #374151; }
.required { color: #ef4444; }

.form-input {
  padding: 11px 14px; border-radius: 8px;
  border: 1.5px solid #d1d5db; background: white;
  color: #111827; font-size: 0.9375rem;
  transition: all 150ms ease; width: 100%;
}
.form-input:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
.form-input::placeholder { color: #9ca3af; }

.alert-error {
  padding: 10px 14px; border-radius: 8px;
  background: #fef2f2; color: #b91c1c;
  border: 1px solid rgba(239,68,68,0.2);
  font-size: 0.875rem;
}

.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 12px 24px; border-radius: 8px;
  font-weight: 700; font-size: 1rem;
  cursor: pointer; transition: all 150ms ease; border: none;
  text-decoration: none;
}
.btn-primary { background: #059669; color: white; }
.btn-primary:hover:not(:disabled) { background: #047857; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-full { width: 100%; }

.footer-note {
  font-size: 0.75rem; color: #9ca3af; text-align: center; margin: 4px 0 0;
}
.footer-note a { color: #059669; text-decoration: none; }
.footer-note a:hover { text-decoration: underline; }
</style>
