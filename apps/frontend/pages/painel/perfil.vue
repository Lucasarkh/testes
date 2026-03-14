<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Meu Perfil</h1>
        <p>Gerencie suas informações e senha</p>
      </div>
    </div>

    <div class="profile-grid">
      <div class="card">
        <h2 style="margin-bottom: 16px;">Dados Pessoais</h2>
        
        <form v-if="authStore.user?.role === 'CORRETOR'" @submit.prevent="handleUpdateRealtor">
          <div class="form-group">
            <label class="form-label">Nome</label>
            <input v-model="realtorForm.name" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">WhatsApp (com DDD)</label>
            <input v-model="realtorForm.phone" class="form-input" placeholder="(00) 00000-0000" />
          </div>
          <div class="form-group">
            <label class="form-label">Código de Compartilhamento (?c=...)</label>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span style="color: var(--color-surface-400); font-size: 0.9em;">.../?c=</span>
              <input v-model="realtorForm.code" class="form-input" required pattern="^[a-zA-Z0-9-_]+$" title="Apenas letras, números, hífen e underline" />
            </div>
            <p class="form-help">Este código identifica você nos links de compartilhamento.</p>
          </div>
          <div class="form-group">
            <label class="form-label">E-mail de Contato</label>
            <input v-model="realtorForm.email" class="form-input" type="email" />
          </div>
          <div class="form-group">
            <label class="form-label">CRECI</label>
            <input v-model="realtorForm.creci" class="form-input" />
          </div>

          <div v-if="realtorError" class="alert alert-error">{{ realtorError }}</div>

          <button type="submit" class="btn btn-primary" :disabled="realtorLoading">
            {{ realtorLoading ? 'Salvando...' : 'Salvar Alterações' }}
          </button>
        </form>

        <div v-else>
          <div class="form-group">
            <label class="form-label">Nome</label>
            <input :value="authStore.user?.name" class="form-input" disabled />
          </div>
          <div class="form-group">
            <label class="form-label">E-mail</label>
            <input :value="authStore.user?.email" class="form-input" disabled />
          </div>
        </div>
      </div>

      <div class="card">
        <h2 style="margin-bottom: 16px;">Alterar Senha</h2>
        <form @submit.prevent="handleChangePassword">
          <div class="form-group">
            <label class="form-label">Senha Atual</label>
            <AppPasswordInput v-model="passForm.currentPassword" required />
          </div>
          <div class="form-group">
            <label class="form-label">Nova Senha</label>
            <AppPasswordInput v-model="passForm.newPassword" :placeholder="PASSWORD_POLICY_HINT" required />
            <div v-if="passwordPolicyError" class="form-error">
              {{ passwordPolicyError }}
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar Nova Senha</label>
            <AppPasswordInput v-model="passForm.confirmPassword" required />
            <div v-if="passForm.confirmPassword && passForm.confirmPassword !== passForm.newPassword" class="form-error">
              As senhas não coincidem
            </div>
          </div>
          
          <div v-if="error" class="alert alert-error">{{ error }}</div>
          
          <button type="submit" class="btn btn-primary" :disabled="loading || !!passwordPolicyError || (passForm.newPassword !== passForm.confirmPassword)">
            {{ loading ? 'Alterando...' : 'Atualizar Senha' }}
          </button>
        </form>

        <hr style="margin: 24px 0; border: none; border-top: 1px solid var(--gray-200);" />

        <h2 style="margin-bottom: 16px;">Autenticação em Duas Etapas (2FA)</h2>
        <p style="font-size: 0.875rem; color: var(--gray-500); margin-bottom: 16px;">
          Adicione uma camada extra de segurança à sua conta. Ao ativar, um código será enviado para seu e-mail a cada login.
        </p>
        <div style="display: flex; align-items: center; gap: 12px;">
          <label class="toggle-switch">
            <input type="checkbox" :checked="twoFactorEnabled" @change="handleToggle2FA" :disabled="twoFactorLoading" />
            <span class="toggle-slider"></span>
          </label>
          <span style="font-size: 0.875rem; font-weight: 500;">
            {{ twoFactorEnabled ? 'Ativado' : 'Desativado' }}
          </span>
          <span v-if="twoFactorLoading" style="font-size: 0.8125rem; color: var(--gray-400);">Salvando...</span>
        </div>
      </div>
    </div>

    <!-- Loteadora public profile section -->
    <div v-if="authStore.isLoteadora" class="card empresa-card">
      <h2 style="margin-bottom: 4px;">Dados Públicos da Empresa</h2>
      <p style="font-size: 0.875rem; color: var(--color-surface-400); margin-bottom: 20px;">
        Essas informações aparecem no rodapé das páginas de loteamento.
      </p>

      <form @submit.prevent="handleUpdateEmpresa">
        <div class="empresa-grid">
          <div class="form-group">
            <label class="form-label">CRECI</label>
            <input v-model="empresaForm.creci" class="form-input" placeholder="Ex.: CRECI-GO 12345 J" />
          </div>

          <div class="form-group">
            <label class="form-label">Telefone / WhatsApp</label>
            <input
              :value="empresaForm.phone"
              @input="empresaForm.phone = maskPhone($event.target.value)"
              class="form-input"
              placeholder="(00) 00000-0000"
            />
          </div>

          <div class="form-group">
            <label class="form-label">E-mail público</label>
            <input v-model="empresaForm.publicEmail" class="form-input" type="email" placeholder="contato@empresa.com.br" />
          </div>

          <div class="form-group">
            <label class="form-label">Site</label>
            <input v-model="empresaForm.website" class="form-input" placeholder="https://empresa.com.br" />
          </div>
        </div>

        <div v-if="empresaError" class="alert alert-error" style="margin-top: 12px;">{{ empresaError }}</div>

        <button type="submit" class="btn btn-primary" :disabled="empresaLoading" style="margin-top: 16px;">
          {{ empresaLoading ? 'Salvando...' : 'Salvar Dados da Empresa' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import {
  getPasswordPolicyError,
  PASSWORD_POLICY_HINT
} from '~/utils/passwordPolicy'

const authStore = useAuthStore()
const { fetchApi } = useApi()
const toast = useToast()
const { maskPhone, unmask } = useMasks()

const loading = ref(false)
const error = ref('')
const passForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const passwordPolicyError = computed(() => getPasswordPolicyError(passForm.value.newPassword))

// Realtor-specific state
const realtorLoading = ref(false)
const realtorError = ref('')
const realtorForm = ref({
  name: '',
  phone: '',
  email: '',
  creci: '',
  code: ''
})

// 2FA state
const twoFactorEnabled = ref(false)
const twoFactorLoading = ref(false)

// Empresa (loteadora) profile state
const empresaLoading = ref(false)
const empresaError = ref('')
const empresaForm = ref({
  creci: '',
  phone: '',
  publicEmail: '',
  website: '',
})

onMounted(async () => {
  if (authStore.user?.role === 'CORRETOR') {
    fetchRealtorData()
  }
  if (authStore.isLoteadora) {
    fetchEmpresaData()
  }
  fetch2FAStatus()
})

// Watcher for phone masking
watch(() => realtorForm.value.phone, (newVal) => {
  if (newVal) {
    const masked = maskPhone(newVal)
    if (masked !== newVal) {
      realtorForm.value.phone = masked
    }
  }
})

async function fetchRealtorData() {
  try {
    const data = await fetchApi('/realtor-links/me')
    realtorForm.value = {
      name: data.name || '',
      phone: maskPhone(data.phone || ''),
      email: data.email || '',
      creci: data.creci || '',
      code: data.code || ''
    }
  } catch (err) {
    console.error('Falha ao carregar dados do corretor', err)
  }
}

async function handleUpdateRealtor() {
  realtorLoading.value = true
  realtorError.value = ''
  try {
    const body = {
      ...realtorForm.value,
      phone: unmask(realtorForm.value.phone)
    }
    
    await fetchApi('/realtor-links/me', {
      method: 'PATCH',
      body
    })
    
    // Update name in auth store if changed
    if (authStore.user) {
      authStore.user.name = body.name
    }
    
    toast.success('Perfil atualizado com sucesso!')
  } catch (err) {
    realtorError.value = err.data?.message || 'Erro ao atualizar perfil.'
  } finally {
    realtorLoading.value = false
  }
}

async function handleChangePassword() {
  if (passwordPolicyError.value) {
    error.value = passwordPolicyError.value
    return
  }
  if (passForm.value.newPassword !== passForm.value.confirmPassword) {
    error.value = 'As senhas não coincidem'
    return
  }

  loading.value = true
  error.value = ''
  try {
    await fetchApi('/auth/change-password', {
      method: 'POST',
      body: {
        currentPassword: passForm.value.currentPassword,
        newPassword: passForm.value.newPassword
      }
    })
    toast.success('Senha alterada com sucesso!')
    passForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err) {
    error.value = err.data?.message || 'Erro ao alterar senha. Verifique sua senha atual.'
  } finally {
    loading.value = false
  }
}

async function fetch2FAStatus() {
  try {
    const data = await fetchApi('/auth/me')
    twoFactorEnabled.value = !!data.twoFactorEnabled
  } catch (err) {
    console.error('Falha ao buscar status 2FA', err)
  }
}

async function handleToggle2FA() {
  const newValue = !twoFactorEnabled.value
  twoFactorLoading.value = true
  try {
    await fetchApi('/auth/toggle-2fa', {
      method: 'POST',
      body: { enabled: newValue }
    })
    twoFactorEnabled.value = newValue
    toast.success(newValue ? '2FA ativado com sucesso!' : '2FA desativado.')
  } catch (err) {
    toast.error('Erro ao alterar configuração de 2FA.')
  } finally {
    twoFactorLoading.value = false
  }
}

async function fetchEmpresaData() {
  try {
    const data = await fetchApi('/tenants/me')
    empresaForm.value = {
      creci: data.creci || '',
      phone: data.phone ? maskPhone(data.phone) : '',
      publicEmail: data.publicEmail || '',
      website: data.website || '',
    }
  } catch (err) {
    console.error('Falha ao carregar dados da empresa', err)
  }
}

async function handleUpdateEmpresa() {
  empresaLoading.value = true
  empresaError.value = ''
  try {
    const body = {
      creci: empresaForm.value.creci?.trim() || null,
      phone: empresaForm.value.phone ? unmask(empresaForm.value.phone) : null,
      publicEmail: empresaForm.value.publicEmail?.trim() || null,
      website: empresaForm.value.website?.trim() || null,
    }
    await fetchApi('/tenants/me/profile', { method: 'PATCH', body })
    toast.success('Dados da empresa atualizados com sucesso!')
  } catch (err) {
    empresaError.value = err?.data?.message || err?.message || 'Erro ao salvar dados da empresa.'
  } finally {
    empresaLoading.value = false
  }
}
</script>

<style scoped>
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--gray-300, #cbd5e1);
  transition: 0.3s;
  border-radius: 26px;
}
.toggle-slider::before {
  content: "";
  position: absolute;
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}
.toggle-switch input:checked + .toggle-slider {
  background-color: var(--primary, #2563eb);
}
.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(22px);
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}
@media (max-width: 767px) {
  .profile-grid { grid-template-columns: 1fr; gap: 1rem; }
}

.empresa-card { margin-top: 1.5rem; }

.empresa-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
}
@media (max-width: 640px) {
  .empresa-grid { grid-template-columns: 1fr; }
}

</style>