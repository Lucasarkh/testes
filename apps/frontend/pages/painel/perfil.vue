<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Meu Perfil</h1>
        <p>Gerencie suas informações e senha</p>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-8">
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
          <div class="form-group">
            <label class="form-label">Perfil / Role</label>
            <input :value="authStore.user?.role" class="form-input" disabled />
          </div>
        </div>
      </div>

      <div class="card">
        <h2 style="margin-bottom: 16px;">Alterar Senha</h2>
        <form @submit.prevent="handleChangePassword">
          <div class="form-group">
            <label class="form-label">Senha Atual</label>
            <input v-model="passForm.currentPassword" type="password" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">Nova Senha</label>
            <input v-model="passForm.newPassword" type="password" class="form-input" required minlength="6" />
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar Nova Senha</label>
            <input v-model="passForm.confirmPassword" type="password" class="form-input" required minlength="6" />
            <div v-if="passForm.confirmPassword && passForm.confirmPassword !== passForm.newPassword" class="form-error">
              As senhas não coincidem
            </div>
          </div>
          
          <div v-if="error" class="alert alert-error">{{ error }}</div>
          
          <button type="submit" class="btn btn-primary" :disabled="loading || (passForm.newPassword !== passForm.confirmPassword)">
            {{ loading ? 'Alterando...' : 'Atualizar Senha' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'

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

onMounted(async () => {
  if (authStore.user?.role === 'CORRETOR') {
    fetchRealtorData()
  }
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
</script>
