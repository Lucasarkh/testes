<script setup lang="ts">

const { fetchApi } = useApi()
const { success: toastSuccess, error: toastError } = useToast()
const authStore = useAuthStore()

if (!authStore.isCorretor) {
  await navigateTo('/painel')
}

interface RealtorLink {
  id: string
  code: string
  name: string
  email: string | null
  phone: string | null
  creci: string | null
  enabled: boolean
  notes?: string | null
  isPending?: boolean
  projects: { id: string; name: string; slug: string }[]
  _count: { leads: number }
}

const link = ref<RealtorLink | null>(null)
const loading = ref(true)
const requestingAccess = ref(false)
const copiedKey = ref<string | null>(null)

const baseUrl = computed(() => {
  if (import.meta.client) return window.location.origin
  return ''
})

function projectLink(slug: string) {
  return `${baseUrl.value}/${slug}?c=${link.value?.code}`
}

const isPendingLink = computed(() => {
  if (!link.value) return false
  if (link.value.isPending) return true
  return typeof link.value.notes === 'string' && link.value.notes.includes('[PENDING_APPROVAL_REQUEST]')
})

async function fetchLink() {
  loading.value = true
  try {
    const data = await fetchApi('/realtor-links/me')
    link.value = data as RealtorLink
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.status === 404) {
      link.value = null
    } else {
      toastError('Erro ao carregar seus links.')
    }
  } finally {
    loading.value = false
  }
}

async function copyLink(key: string, text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    setTimeout(() => { copiedKey.value = null }, 2000)
    toastSuccess('Link copiado!')
  } catch {
    toastError('Não foi possível copiar o link.')
  }
}

async function requestAccess() {
  requestingAccess.value = true
  try {
    const res = await fetchApi('/realtor-links/me/request-access', { method: 'POST' })
    const requestedLink = res?.realtorLink as RealtorLink | undefined
    if (requestedLink) {
      link.value = requestedLink
    }
    toastSuccess(res?.message || 'Solicitação enviada para a loteadora.')
  } catch (err: any) {
    toastError(err?.message || 'Não foi possível enviar sua solicitação no momento.')
  } finally {
    requestingAccess.value = false
  }
}

onMounted(fetchLink)
</script>

<template>
  <div class="links-page">
    <div class="page-header">
      <div>
        <h1>Meus Links</h1>
        <p>Compartilhe seus links personalizados com clientes interessados nos loteamentos.</p>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="!link" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
      </svg>
      <h3>Nenhum vínculo encontrado</h3>
      <p>Você ainda não foi vinculado a nenhuma loteadora. Entre em contato com seu gestor.</p>
      <button class="btn btn-primary" :disabled="requestingAccess" @click="requestAccess">
        {{ requestingAccess ? 'Enviando solicitação...' : 'Solicitar link para loteadora' }}
      </button>
    </div>

    <template v-else>
      <!-- Corretor info card -->
      <div class="info-card">
        <div class="info-card-row">
          <div class="info-item">
            <span class="info-label">Seu código de corretor</span>
            <div class="code-display">
              <span class="code-value">{{ link.code }}</span>
              <button
                class="copy-btn"
                :class="{ copied: copiedKey === 'code' }"
                @click="copyLink('code', link.code)"
              >
                <svg v-if="copiedKey !== 'code'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                {{ copiedKey === 'code' ? 'Copiado!' : 'Copiar' }}
              </button>
            </div>
          </div>
          <div class="info-item">
            <span class="info-label">Leads recebidos</span>
            <span class="info-value">{{ link._count.leads }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Status</span>
            <span class="status-badge" :class="isPendingLink ? 'pending' : (link.enabled ? 'active' : 'inactive')">
              {{ isPendingLink ? 'Pendente' : (link.enabled ? 'Ativo' : 'Inativo') }}
            </span>
          </div>
        </div>
        <div v-if="isPendingLink" class="warning-notice" style="background: rgba(251, 191, 36, 0.08); border-color: rgba(251, 191, 36, 0.2); color: #fbbf24;">
          Sua solicitação está pendente de aprovação pela loteadora.
        </div>
        <div v-if="!link.enabled" class="warning-notice">
          Seu vínculo está inativo. Entre em contato com seu gestor para reativar.
        </div>
        <div v-if="!link.enabled && !isPendingLink" style="margin-top: 12px;">
          <button class="btn btn-primary" :disabled="requestingAccess" @click="requestAccess">
            {{ requestingAccess ? 'Enviando solicitação...' : 'Solicitar reativação para loteadora' }}
          </button>
        </div>
      </div>

      <!-- How it works -->
      <div class="how-it-works">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="flex-shrink:0; color:var(--color-primary-400)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>Quando um cliente acessar um loteamento pelo seu link e preencher o formulário de interesse, o lead será atribuído automaticamente a você.</span>
      </div>

      <!-- No projects -->
      <div v-if="isPendingLink" class="empty-state" style="padding: 40px 0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <h3>Solicitação em análise</h3>
        <p>Assim que sua solicitação for aprovada, seus links aparecerão aqui.</p>
      </div>

      <div v-else-if="link.projects.length === 0" class="empty-state" style="padding: 40px 0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18"/>
        </svg>
        <h3>Nenhum loteamento vinculado</h3>
        <p>Você ainda não possui loteamentos ativos no seu perfil.</p>
      </div>

      <!-- Project links -->
      <div v-else class="projects-grid">
        <div v-for="project in link.projects" :key="project.id" class="project-card">
          <div class="project-header">
            <div class="project-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <h3 class="project-name">{{ project.name }}</h3>
          </div>

          <div class="link-row">
            <span class="link-url">{{ projectLink(project.slug) }}</span>
            <button
              class="copy-btn"
              :class="{ copied: copiedKey === project.id }"
              @click="copyLink(project.id, projectLink(project.slug))"
            >
              <svg v-if="copiedKey !== project.id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
              {{ copiedKey === project.id ? 'Copiado!' : 'Copiar Link' }}
            </button>
          </div>

          <a
            :href="projectLink(project.slug)"
            target="_blank"
            rel="noopener noreferrer"
            class="view-link"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Abrir página do loteamento
          </a>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  margin-bottom: 24px;
}
.page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-surface-50); margin: 0 0 4px; }
.page-header p { font-size: 0.875rem; color: var(--color-surface-300); margin: 0; }

.loading-state { display: flex; justify-content: center; padding: 64px; }
.spinner {
  width: 36px; height: 36px;
  border: 3px solid rgba(16,185,129,0.15);
  border-top-color: var(--color-primary-500);
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state {
  text-align: center; padding: 64px 32px;
  color: var(--color-surface-400);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.empty-state h3 { font-size: 1.125rem; font-weight: 600; color: var(--color-surface-200); margin: 0; }
.empty-state p { margin: 0; font-size: 0.875rem; }

.info-card {
  background: var(--glass-bg, rgba(255,255,255,0.04));
  border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  margin-bottom: 16px;
}
.info-card-row {
  display: flex; align-items: center; gap: 32px; flex-wrap: wrap;
}
.info-item { display: flex; flex-direction: column; gap: 4px; }
.info-label { font-size: 0.75rem; font-weight: 600; color: var(--color-surface-400); text-transform: uppercase; letter-spacing: 0.05em; }
.info-value { font-size: 1.125rem; font-weight: 700; color: var(--color-surface-100); }

.code-display { display: flex; align-items: center; gap: 8px; }
.code-value { font-family: monospace; font-size: 1rem; font-weight: 700; color: var(--color-primary-300); }

.status-badge {
  display: inline-block; font-size: 0.75rem; font-weight: 600; padding: 3px 10px;
  border-radius: 99px;
}
.status-badge.active { background: rgba(16,185,129,0.12); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.2); }
.status-badge.inactive { background: rgba(239,68,68,0.1); color: #fca5a5; border: 1px solid rgba(239,68,68,0.15); }
.status-badge.pending { background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }

.warning-notice {
  margin-top: 12px; padding: 8px 14px;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15);
  border-radius: var(--radius-sm); font-size: 0.875rem; color: #fca5a5;
}

.how-it-works {
  display: flex; align-items: flex-start; gap: 10px;
  background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: var(--radius-md); padding: 12px 16px;
  font-size: 0.875rem; color: var(--color-surface-300);
  margin-bottom: 24px;
}

.projects-grid { display: flex; flex-direction: column; gap: 12px; }

.project-card {
  background: var(--glass-bg, rgba(255,255,255,0.04));
  border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  transition: border-color 150ms ease;
}
.project-card:hover { border-color: rgba(16,185,129,0.2); }

.project-header {
  display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
}
.project-icon {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: var(--radius-sm);
  background: rgba(16,185,129,0.08); color: var(--color-primary-400);
  flex-shrink: 0;
}
.project-name { font-size: 1rem; font-weight: 700; color: var(--color-surface-50); margin: 0; }

.link-row {
  display: flex; align-items: center; gap: 8px;
  background: rgba(0,0,0,0.2); border-radius: var(--radius-sm);
  padding: 8px 12px; margin-bottom: 10px;
}
.link-url {
  flex: 1; font-size: 0.8125rem; font-family: monospace;
  color: var(--color-primary-300); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.copy-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: var(--radius-sm);
  border: 1px solid rgba(16,185,129,0.2); background: rgba(16,185,129,0.06);
  color: var(--color-primary-400); font-size: 0.75rem; font-weight: 600;
  cursor: pointer; transition: all 150ms ease; white-space: nowrap;
}
.copy-btn:hover { background: rgba(16,185,129,0.12); }
.copy-btn.copied { background: rgba(16,185,129,0.15); color: var(--color-primary-300); }

.view-link {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 0.8125rem; color: var(--color-surface-400);
  text-decoration: none; transition: color 150ms ease;
}
.view-link:hover { color: var(--color-primary-400); }

@media (max-width: 639px) {
  .links-page { padding: 16px; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 10px; }
  .info-card-row { flex-direction: column; gap: 16px; }
  .link-row { flex-direction: column; gap: 8px; }
  .copy-btn { width: 100%; justify-content: center; }
}
</style>
