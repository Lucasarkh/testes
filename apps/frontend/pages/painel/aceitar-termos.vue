<template>
  <div class="terms-lock">
    <div class="terms-card">
      <div class="terms-card-header">
        <img src="/img/logo-white.svg" alt="Lotio" class="terms-logo" />
        <h2>Termos de Uso e Política de Privacidade</h2>
        <p class="terms-subtitle">
          Para continuar utilizando a plataforma, é necessário aceitar os nossos termos.
        </p>
      </div>

      <div class="terms-card-body">
        <div class="terms-documents">
          <div class="terms-doc-card">
            <div class="terms-doc-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div class="terms-doc-info">
              <h3>Termos de Uso</h3>
              <p>Condições gerais de uso da plataforma, responsabilidades, integrações e SLA.</p>
              <a href="/termos-de-uso" target="_blank" class="terms-doc-link">
                Ler Termos de Uso
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>

          <div class="terms-doc-card">
            <div class="terms-doc-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <div class="terms-doc-info">
              <h3>Política de Privacidade</h3>
              <p>Como coletamos, utilizamos e protegemos seus dados pessoais conforme a LGPD.</p>
              <a href="/politica-de-privacidade" target="_blank" class="terms-doc-link">
                Ler Política de Privacidade
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div class="terms-checkbox-group">
          <label class="terms-checkbox">
            <input v-model="accepted" type="checkbox" />
            <span class="terms-checkbox-mark"></span>
            <span class="terms-checkbox-text">
              Li e aceito os
              <a href="/termos-de-uso" target="_blank">Termos de Uso</a>
              e a
              <a href="/politica-de-privacidade" target="_blank">Política de Privacidade</a>
              da plataforma Lotio.
            </span>
          </label>
        </div>

        <div v-if="error" class="terms-error">{{ error }}</div>
      </div>

      <div class="terms-card-footer">
        <button
          class="btn-accept"
          :disabled="!accepted || loading"
          @click="handleAccept"
        >
          {{ loading ? 'Registrando aceite...' : 'Aceitar e Continuar' }}
        </button>
        <button class="btn-decline" @click="handleDecline">
          Não aceito — Sair da plataforma
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const accepted = ref(false)
const loading = ref(false)
const error = ref('')
const config = useRuntimeConfig()
const apiBase = (config.public.apiBase || '').replace(/\/+$/, '')
const authStore = useAuthStore()
const router = useRouter()
const { success: toastSuccess } = useToast()

const handleAccept = async () => {
  if (!accepted.value || loading.value) return

  loading.value = true
  error.value = ''

  try {
    const res = await fetch(`${apiBase}/api/auth/accept-terms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.accessToken}`,
      },
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Erro ao registrar aceite dos termos')
    }

    authStore.setTermsAccepted()
    toastSuccess('Termos aceitos com sucesso!')
    router.push(authStore.getDashboardRoute())
  } catch (e) {
    error.value = e.message || 'Erro ao registrar aceite. Tente novamente.'
  } finally {
    loading.value = false
  }
}

const handleDecline = async () => {
  const { fetchApi } = useApi()
  try { await fetchApi('/auth/logout', { method: 'POST' }) } catch {}
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.terms-lock {
  min-height: 100vh;
  background:
    linear-gradient(rgba(10, 15, 13, 0.92), rgba(10, 15, 13, 0.92)),
    url('/img/banner-hero.jpg') center / cover fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.terms-card {
  background: rgba(20, 28, 24, 0.95);
  border: 1px solid rgba(52, 211, 153, 0.15);
  border-radius: 20px;
  width: 100%;
  max-width: 560px;
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  overflow: hidden;
}

.terms-card-header {
  text-align: center;
  padding: 2rem 2rem 1.5rem;
  border-bottom: 1px solid rgba(52, 211, 153, 0.1);
}

.terms-logo {
  height: 36px;
  margin-bottom: 1rem;
}

.terms-card-header h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-surface-50, #f8fafc);
  margin: 0 0 0.5rem;
}

.terms-subtitle {
  font-size: 0.875rem;
  color: var(--color-surface-300, #94a3b8);
  margin: 0;
  line-height: 1.5;
}

.terms-card-body {
  padding: 1.5rem 2rem;
}

.terms-documents {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.terms-doc-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  border: 1px solid rgba(52, 211, 153, 0.1);
}

.terms-doc-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 185, 129, 0.15);
  color: var(--color-primary-400, #34d399);
  border-radius: 10px;
}

.terms-doc-info h3 {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-surface-100, #f1f5f9);
  margin: 0 0 0.25rem;
}

.terms-doc-info p {
  font-size: 0.8125rem;
  color: var(--color-surface-400, #64748b);
  margin: 0 0 0.5rem;
  line-height: 1.4;
}

.terms-doc-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary-400, #34d399);
  text-decoration: none;
  transition: opacity 0.2s;
}

.terms-doc-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}

.terms-checkbox-group {
  margin-bottom: 1rem;
}

.terms-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  position: relative;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 2px solid rgba(52, 211, 153, 0.1);
  transition: border-color 0.2s;
}

.terms-checkbox:has(input:checked) {
  border-color: var(--color-primary-500, #10b981);
  background: rgba(16, 185, 129, 0.06);
}

.terms-checkbox input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.terms-checkbox-mark {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(52, 211, 153, 0.3);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin-top: 1px;
}

.terms-checkbox input:checked + .terms-checkbox-mark {
  background: var(--color-primary-500, #10b981);
  border-color: var(--color-primary-500, #10b981);
}

.terms-checkbox input:checked + .terms-checkbox-mark::after {
  content: '';
  display: block;
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-top: -1px;
}

.terms-checkbox-text {
  font-size: 0.875rem;
  color: var(--color-surface-300, #cbd5e1);
  line-height: 1.5;
}

.terms-checkbox-text a {
  color: var(--color-primary-400, #34d399);
  font-weight: 600;
  text-decoration: none;
}

.terms-checkbox-text a:hover {
  text-decoration: underline;
}

.terms-error {
  background: rgba(220, 38, 38, 0.1);
  color: #f87171;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.terms-card-footer {
  padding: 1.5rem 2rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
  border-top: 1px solid rgba(52, 211, 153, 0.08);
}

.btn-accept {
  width: 100%;
  padding: 0.875rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  background: var(--color-primary-500, #10b981);
  color: white;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-accept:hover:not(:disabled) {
  background: var(--color-primary-600, #059669);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
}

.btn-accept:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-decline {
  background: none;
  border: none;
  color: var(--color-surface-500, #64748b);
  font-size: 0.8125rem;
  cursor: pointer;
  padding: 0.5rem;
  transition: color 0.2s;
  font-family: inherit;
}

.btn-decline:hover {
  color: var(--color-surface-300, #94a3b8);
}

@media (max-width: 480px) {
  .terms-card-header,
  .terms-card-body,
  .terms-card-footer {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }
}
</style>
