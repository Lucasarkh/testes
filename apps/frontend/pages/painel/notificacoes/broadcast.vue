<template>
  <div class="broadcast-page">
    <div class="page-header">
      <NuxtLink to="/painel/notificacoes" class="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Voltar
      </NuxtLink>
      <div>
        <h1>Enviar Notificação</h1>
        <p>Envie alertas, comunicados e avisos para os usuários da plataforma.</p>
      </div>
    </div>

    <div class="broadcast-card">
      <div class="section-title">Audiência</div>

      <div class="field-group">
        <label>Destinatários</label>
        <div class="audience-options">
          <button
            v-for="opt in audienceOptions"
            :key="opt.value"
            class="audience-btn"
            :class="{ active: audienceType === opt.value }"
            @click="audienceType = opt.value; form.tenantId = undefined; form.role = undefined"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div v-if="audienceType === 'role'" class="field-group">
        <label>Perfil</label>
        <select v-model="form.role" class="select-input">
          <option value="">Selecionar perfil...</option>
          <option value="LOTEADORA">Loteadoras</option>
          <option value="IMOBILIARIA">Imobiliárias</option>
          <option value="CORRETOR">Corretores</option>
        </select>
      </div>

      <div v-if="audienceType === 'tenant'" class="field-group">
        <label>ID do Tenant (loteadora)</label>
        <input
          v-model="form.tenantId"
          class="text-input"
          placeholder="ID da loteadora..."
        />
        <span class="field-hint">O ID da loteadora pode ser consultado em /painel/tenants</span>
      </div>

      <hr class="divider" />

      <div class="section-title">Mensagem</div>

      <div class="field-group">
        <label>Título <span class="required">*</span></label>
        <input v-model="form.title" class="text-input" placeholder="Ex.: Manutenção programada — 10/03" maxlength="120" />
        <span class="char-count">{{ form.title.length }}/120</span>
      </div>

      <div class="field-group">
        <label>Mensagem <span class="required">*</span></label>
        <textarea
          v-model="form.message"
          class="textarea-input"
          rows="4"
          placeholder="Descreva o comunicado em detalhes..."
          maxlength="600"
        ></textarea>
        <span class="char-count">{{ form.message.length }}/600</span>
      </div>

      <div class="field-group">
        <label>Link de ação (opcional)</label>
        <input v-model="form.actionUrl" class="text-input" placeholder="Ex.: /painel/suporte" />
        <span class="field-hint">Caminho interno para redirecionar o usuário ao clicar na notificação.</span>
      </div>

      <hr class="divider" />

      <div class="section-title">Canal de envio</div>

      <div class="channel-options">
        <div class="channel-card active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <div>
            <div class="channel-name">Painel</div>
            <div class="channel-desc">Sempre enviado</div>
          </div>
          <svg class="channel-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div class="channel-card" :class="{ active: form.sendEmail }" @click="form.sendEmail = !form.sendEmail" style="cursor:pointer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <div>
            <div class="channel-name">E-mail</div>
            <div class="channel-desc">{{ form.sendEmail ? 'Será enviado também por email' : 'Clique para ativar' }}</div>
          </div>
          <svg v-if="form.sendEmail" class="channel-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      </div>

      <!-- Preview -->
      <hr class="divider" />
      <div class="section-title">Pré-visualização</div>
      <div class="preview-card">
        <div class="preview-icon icon-system">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div class="preview-content">
          <div class="preview-title">{{ form.title || 'Título da notificação' }}</div>
          <div class="preview-message">{{ form.message || 'Mensagem da notificação aparece aqui...' }}</div>
          <div class="preview-time">Agora mesmo</div>
        </div>
        <div class="preview-dot"></div>
      </div>

      <div v-if="submitError" class="submit-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {{ submitError }}
      </div>

      <div class="form-actions">
        <NuxtLink to="/painel/notificacoes" class="btn btn-ghost">Cancelar</NuxtLink>
        <button class="btn btn-primary" :disabled="sending || !isValid" @click="handleSubmit">
          <svg v-if="sending" class="spin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
          </svg>
          {{ sending ? 'Enviando...' : 'Enviar notificação' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const { broadcast } = useNotifications()
const { success: toastSuccess, error: toastError } = useToast()

// Guard: only SYSADMIN
if (!authStore.isSysAdmin) {
  router.replace('/painel')
}

const sending = ref(false)
const submitError = ref('')
const audienceType = ref('all')

const audienceOptions = [
  { value: 'all', label: 'Todos os usuários' },
  { value: 'role', label: 'Por perfil' },
  { value: 'tenant', label: 'Por loteadora' },
]

const form = ref({
  title: '',
  message: '',
  sendEmail: false,
  actionUrl: '',
  tenantId: undefined,
  role: undefined,
})

const isValid = computed(() => {
  const f = form.value
  if (!f.title.trim() || !f.message.trim()) return false
  if (audienceType.value === 'role' && !f.role) return false
  if (audienceType.value === 'tenant' && !f.tenantId?.trim()) return false
  return true
})

async function handleSubmit() {
  if (!isValid.value || sending.value) return
  sending.value = true
  submitError.value = ''
  try {
    const payload = {
      title: form.value.title.trim(),
      message: form.value.message.trim(),
      sendEmail: form.value.sendEmail,
      actionUrl: form.value.actionUrl?.trim() || undefined,
    }
    if (audienceType.value === 'role') payload.role = form.value.role
    if (audienceType.value === 'tenant') payload.tenantId = form.value.tenantId?.trim()

    const result = await broadcast(payload)
    toastSuccess(`Notificação enviada para ${result?.sent ?? 0} usuário(s)!`)
    router.push('/painel/notificacoes')
  } catch (e) {
    const msg = e?.message || 'Erro ao enviar notificação. Tente novamente.'
    submitError.value = msg
    toastError(msg)
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.broadcast-page { display: flex; flex-direction: column; gap: 24px; max-width: 720px; }

.page-header { display: flex; flex-direction: column; gap: 4px; }
.back-link {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--color-surface-400); font-size: 0.875rem; text-decoration: none;
  transition: color 150ms; margin-bottom: 8px;
}
.back-link:hover { color: var(--color-surface-200); }
.page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-surface-50); margin: 0 0 4px; }
.page-header p  { font-size: 0.875rem; color: var(--color-surface-400); margin: 0; }

.broadcast-card {
  background: var(--glass-bg);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: var(--radius-lg);
  padding: 28px;
  display: flex; flex-direction: column; gap: 20px;
}

.section-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-surface-400); }

.divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 0; }

.field-group { display: flex; flex-direction: column; gap: 6px; }
label { font-size: 0.875rem; font-weight: 600; color: var(--color-surface-200); }
.required { color: #f87171; }
.field-hint { font-size: 0.75rem; color: var(--color-surface-500); }
.char-count { font-size: 0.75rem; color: var(--color-surface-500); text-align: right; }

.text-input, .select-input, .textarea-input {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-md);
  color: var(--color-surface-100);
  font-size: 0.875rem;
  padding: 10px 14px;
  font-family: inherit;
  transition: border-color 150ms;
  width: 100%;
  box-sizing: border-box;
}
.text-input:focus, .select-input:focus, .textarea-input:focus {
  outline: none;
  border-color: var(--color-primary-600);
}
.textarea-input { resize: vertical; }
.select-input { appearance: auto; cursor: pointer; }

.audience-options { display: flex; gap: 8px; flex-wrap: wrap; }
.audience-btn {
  padding: 8px 14px; border-radius: var(--radius-md);
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: var(--color-surface-400); font-size: 0.875rem; cursor: pointer; transition: all 150ms;
  font-family: inherit;
}
.audience-btn:hover { background: rgba(255,255,255,0.08); color: var(--color-surface-200); }
.audience-btn.active { background: rgba(16,185,129,0.1); color: var(--color-primary-400); border-color: rgba(16,185,129,0.2); }

.channel-options { display: flex; gap: 10px; flex-wrap: wrap; }
.channel-card {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-radius: var(--radius-md);
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.02);
  flex: 1; min-width: 180px;
  transition: all 150ms;
}
.channel-card.active { border-color: rgba(16,185,129,0.25); background: rgba(16,185,129,0.06); }
.channel-card .channel-name { font-size: 0.875rem; font-weight: 600; color: var(--color-surface-100); }
.channel-card .channel-desc { font-size: 0.75rem; color: var(--color-surface-500); }
.channel-card > svg:first-child { color: var(--color-surface-400); flex-shrink: 0; }
.channel-card > div { flex: 1; }
.channel-check { color: var(--color-primary-400); flex-shrink: 0; }

/* Preview */
.preview-card {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px;
  background: rgba(16,185,129,0.04);
  border: 1px solid rgba(16,185,129,0.1);
  border-radius: var(--radius-md);
  position: relative;
}
.preview-icon {
  width: 36px; height: 36px; border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.icon-system { background: rgba(139,92,246,0.12); color: #a78bfa; }
.preview-content { flex: 1; }
.preview-title { font-size: 0.875rem; font-weight: 600; color: var(--color-surface-100); margin-bottom: 2px; }
.preview-message { font-size: 0.8125rem; color: var(--color-surface-400); line-height: 1.4; }
.preview-time { font-size: 0.6875rem; color: var(--color-surface-500); margin-top: 4px; }
.preview-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--color-primary-500); flex-shrink: 0; margin-top: 6px; }

.form-actions {
  display: flex; justify-content: flex-end; gap: 12px;
  padding-top: 4px;
}
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 20px; border-radius: var(--radius-md);
  font-size: 0.875rem; font-weight: 600;
  cursor: pointer; border: none; transition: all 150ms ease;
  text-decoration: none; font-family: inherit;
}
.btn-primary { background: var(--color-primary-600); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--color-primary-500); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost {
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  color: var(--color-surface-400);
}
.btn-ghost:hover { background: rgba(255,255,255,0.08); color: var(--color-surface-200); }

.submit-error {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: var(--radius-md);
  color: #f87171;
  font-size: 0.875rem;
}

.spin-icon { animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
