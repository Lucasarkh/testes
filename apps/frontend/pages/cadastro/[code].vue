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
const codeData = ref<{
  tenantName: string
  role: string
  description: string | null
  projectAssignmentMode?: 'NONE' | 'ALL' | 'SELECTED'
  projects?: Array<{ id: string; name: string; slug: string }>
} | null>(null)
const success = ref(false)

const form = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  creci: '',
  agencyName: '',
  sharingLinkCode: ''
})

const shareCodeChecking = ref(false)
const shareCodeAvailable = ref<boolean | null>(null)
const shareCodeError = ref('')
let shareCodeDebounceTimeout: ReturnType<typeof setTimeout> | null = null
let shareCodeValidationSeq = 0

const isImobiliaria = computed(() => codeData.value?.role === 'IMOBILIARIA')
const isCorretor = computed(() => codeData.value?.role === 'CORRETOR')

const roleName = computed(() => {
  if (!codeData.value) return ''
  return codeData.value.role === 'IMOBILIARIA' ? 'Imobiliária' : 'Corretor de Imóveis'
})

function normalizeSharingLinkCode(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function resetShareCodeValidation() {
  shareCodeAvailable.value = null
  shareCodeChecking.value = false
  shareCodeError.value = ''
}

async function validateSharingLinkAvailability(rawValue?: string) {
  if (!isCorretor.value) return true

  const normalizedCode = normalizeSharingLinkCode(rawValue ?? form.value.sharingLinkCode)
  if (!normalizedCode) {
    resetShareCodeValidation()
    return false
  }

  const requestSeq = ++shareCodeValidationSeq
  shareCodeChecking.value = true
  shareCodeError.value = ''
  try {
    const response = await get(
      `/agencies/invite-codes/public/${code}/check-sharing-link?value=${encodeURIComponent(normalizedCode)}`
    )
    if (requestSeq !== shareCodeValidationSeq) return false

    const available = !!response?.available
    shareCodeAvailable.value = available
    shareCodeError.value = available ? '' : 'Este link de compartilhamento já está em uso.'
    return available
  } catch (err: any) {
    if (requestSeq !== shareCodeValidationSeq) return false
    shareCodeAvailable.value = null
    shareCodeError.value = err.message || 'Não foi possível validar o link agora.'
    return false
  } finally {
    if (requestSeq === shareCodeValidationSeq) {
      shareCodeChecking.value = false
    }
  }
}

watch(() => form.value.sharingLinkCode, (newValue) => {
  if (!isCorretor.value) return
  const normalizedCode = normalizeSharingLinkCode(newValue)
  if (newValue !== normalizedCode) {
    form.value.sharingLinkCode = normalizedCode
    return
  }

  if (!normalizedCode) {
    resetShareCodeValidation()
    return
  }

  if (shareCodeDebounceTimeout) {
    clearTimeout(shareCodeDebounceTimeout)
  }

  shareCodeDebounceTimeout = setTimeout(() => {
    validateSharingLinkAvailability(normalizedCode)
  }, 450)
})

watch(isCorretor, (value) => {
  if (!value) {
    if (shareCodeDebounceTimeout) {
      clearTimeout(shareCodeDebounceTimeout)
    }
    form.value.sharingLinkCode = ''
    resetShareCodeValidation()
  }
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

  if (isCorretor.value) {
    form.value.sharingLinkCode = normalizeSharingLinkCode(form.value.sharingLinkCode)
    if (!form.value.sharingLinkCode) {
      errorMsg.value = 'Informe seu link de compartilhamento.'
      return
    }

    const available = await validateSharingLinkAvailability(form.value.sharingLinkCode)
    if (!available) {
      errorMsg.value = shareCodeError.value || 'Este link de compartilhamento já está em uso.'
      return
    }
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
    if (isCorretor.value) {
      payload.sharingLinkCode = form.value.sharingLinkCode
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

onBeforeUnmount(() => {
  if (shareCodeDebounceTimeout) {
    clearTimeout(shareCodeDebounceTimeout)
  }
})
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
            Voce foi convidado pela loteadora <strong>{{ codeData.tenantName }}</strong>
            para concluir seu cadastro como <strong>{{ roleName }}</strong>.
          </p>

          <p v-if="codeData.description" class="invite-note">{{ codeData.description }}</p>
        </div>

        <form class="form" @submit.prevent="register">
          <p class="section-title">Dados pessoais</p>

          <div v-if="isImobiliaria" class="form-group">
            <label class="form-label">Nome da Imobiliária <span class="required">*</span></label>
            <input v-model="form.agencyName" type="text" class="form-input" placeholder="Nome da sua imobiliária" required autocomplete="organization" />
          </div>

          <div class="form-group">
            <label class="form-label">Seu Nome Completo <span class="required">*</span></label>
            <input v-model="form.name" type="text" class="form-input" placeholder="Nome completo" required autocomplete="name" />
          </div>

          <div class="form-group">
            <label class="form-label">E-mail <span class="required">*</span></label>
            <input v-model="form.email" type="email" class="form-input" placeholder="seu@email.com" required autocomplete="email" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Telefone</label>
              <input v-model="form.phone" type="tel" class="form-input" placeholder="(11) 99999-9999" inputmode="tel" autocomplete="tel" />
            </div>
            <div class="form-group">
              <label class="form-label">CRECI</label>
              <input v-model="form.creci" type="text" class="form-input" placeholder="Opcional" autocomplete="off" />
            </div>
          </div>

          <div v-if="isCorretor" class="form-group">
            <label class="form-label">Seu Link de Compartilhamento <span class="required">*</span></label>
            <input
              v-model="form.sharingLinkCode"
              type="text"
              class="form-input"
              :class="{ 'input-error': shareCodeAvailable === false, 'input-success': shareCodeAvailable === true }"
              placeholder="ex: joao-silva"
              autocomplete="off"
              required
            />
            <small class="form-hint">Use letras, números e hífen. Esse link precisa ser único na sua loteadora.</small>
            <small v-if="shareCodeChecking" class="form-hint">Validando disponibilidade...</small>
            <small v-else-if="shareCodeAvailable === true" class="hint-success">Link disponível.</small>
            <small v-else-if="shareCodeAvailable === false" class="hint-error">{{ shareCodeError || 'Este link de compartilhamento já está em uso.' }}</small>
          </div>

          <p class="section-title">Seguranca da conta</p>

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

          <button type="submit" class="btn btn-primary btn-full" :disabled="loading || shareCodeChecking">
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
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  background: var(--gray-50);
  padding: var(--space-8) var(--space-4);
}

.register-card {
  background: #fff;
  border-radius: var(--radius-xl);
  border: 1px solid var(--gray-200);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 520px;
  padding: var(--space-8) var(--space-7);
}

@media (max-width: 480px) {
  .register-card {
    padding: var(--space-6) var(--space-5);
    border-radius: var(--radius-lg);
  }

  .register-page {
    padding: var(--space-6) var(--space-3);
  }
}

.brand {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-6);
}

.logo {
  height: 46px;
}

.card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: var(--space-6);
}

.card-header h1 {
  font-size: 1.75rem;
  line-height: 1.25;
  font-weight: 800;
  color: var(--gray-900);
  margin: 0 0 var(--space-2);
}

.card-header p {
  font-size: 0.9375rem;
  color: var(--gray-600);
  margin: 0;
  line-height: 1.55;
}

.card-header strong {
  color: var(--gray-900);
}

.invite-note {
  margin-top: var(--space-3) !important;
  font-size: 0.8125rem !important;
  color: var(--gray-600) !important;
  background: var(--gray-100);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
}

.state-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8) 0;
  text-align: center;
  color: var(--gray-500);
}

.state-center h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--gray-900);
  margin: 0;
}

.state-center p {
  margin: 0;
  font-size: 0.875rem;
}

.state-center.error {
  color: #dc2626;
}

.state-center.error h2 {
  color: #b91c1c;
}

.state-center.success {
  color: var(--primary-hover);
}

.state-center.success h2 {
  color: var(--primary-hover);
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--gray-200);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.section-title {
  margin: var(--space-2) 0 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--gray-500);
  font-weight: 700;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--gray-700);
}

.required {
  color: #ef4444;
}

.form-input {
  width: 100%;
  min-height: 48px;
  padding: 11px 14px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--gray-300);
  background: #ffffff;
  color: var(--gray-900);
  font-size: 0.9375rem;
  transition: all 150ms ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
}

.form-input::placeholder {
  color: var(--gray-400);
}

.input-error {
  border-color: #ef4444 !important;
}

.input-success {
  border-color: #10b981 !important;
}

.form-hint {
  margin-top: 2px;
  font-size: 0.75rem;
  color: var(--gray-500);
}

.hint-success {
  margin-top: 2px;
  font-size: 0.75rem;
  color: #059669;
  font-weight: 600;
}

.hint-error {
  margin-top: 2px;
  font-size: 0.75rem;
  color: #b91c1c;
  font-weight: 600;
}

:deep(.app-pw-wrapper .form-input) {
  min-height: 48px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--gray-300);
  background: #ffffff;
  color: var(--gray-900);
}

:deep(.app-pw-wrapper .form-input:focus) {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
}

:deep(.app-pw-toggle) {
  color: var(--gray-500);
}

:deep(.app-pw-toggle:hover) {
  color: var(--gray-800);
}

.alert-error {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid rgba(239, 68, 68, 0.2);
  font-size: 0.875rem;
}

.btn {
  min-height: 52px;
  font-size: 1rem;
  font-weight: 700;
}

.btn-primary {
  background: var(--primary-hover);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.28);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-full {
  width: 100%;
}

.footer-note {
  font-size: 0.75rem;
  color: var(--gray-500);
  text-align: center;
  margin: var(--space-2) 0 0;
  line-height: 1.5;
}

.footer-note a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}

.footer-note a:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .card-header h1 {
    font-size: 1.45rem;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
