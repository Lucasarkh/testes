<template>
  <div class="distribution-page p-10">
    <div class="page-header d-flex justify-content-between align-items-center mb-10">
      <div>
        <h1 class="lotio-title gradient-text">Distribuicao de Leads</h1>
        <p class="text-secondary font-medium mt-1">Configure a distribuicao automatica de leads sem corretor vinculado.</p>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="lotio-filter-bar shadow-lotio-lg mb-6">
      <div class="filter-item">
        <label>Empreendimento</label>
        <div class="lotio-select-wrapper">
          <select v-model="selectedProjectId" class="lotio-select-modern" @change="onProjectChange">
            <option value="">Selecione um projeto</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <i class="pi pi-chevron-down"></i>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="lotio-loading-wrapper py-20">
      <div class="lotio-spinner-bounce">
        <div class="bounce1"></div>
        <div class="bounce2"></div>
        <div class="bounce3"></div>
      </div>
    </div>

    <!-- No project selected -->
    <div v-else-if="!selectedProjectId" class="empty-state-card shadow-lotio-lg">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
      </div>
      <h3>Selecione um empreendimento</h3>
      <p>Escolha um projeto acima para configurar a distribuicao automatica de leads.</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Config Section -->
      <div class="config-card shadow-lotio-lg mb-6">
        <div class="config-header">
          <div class="config-info">
            <h3>Auto-Distribuição</h3>
            <p>Quando ativado, leads que chegam sem link de corretor serão distribuídos automaticamente entre os corretores vinculados ao projeto em sistema de rodízio.</p>
          </div>
          <div class="config-toggle-area">
            <button class="toggle-btn" :class="{ active: config?.enabled }" @click="toggleEnabled">
              <span class="toggle-slider"></span>
            </button>
            <span class="toggle-label" :class="config?.enabled ? 'active' : ''">
              {{ config?.enabled ? 'ATIVO' : 'INATIVO' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Queue Section -->
      <div class="queue-card shadow-lotio-lg mb-6">
        <div class="queue-header d-flex justify-content-between align-items-center flex-wrap gap-4">
          <div>
            <h3>Fila de Distribuição</h3>
            <p class="text-muted">{{ queueState?.totalBrokers || 0 }} corretores elegíveis</p>
          </div>
          <div class="d-flex align-items-center gap-3">
            <div class="search-input-group" v-if="queueState?.totalBrokers > 0 || queueSearch">
              <i class="pi pi-search"></i>
              <input
                v-model="queueSearch"
                type="text"
                placeholder="Buscar corretor..."
                class="search-input"
                @input="debouncedQueueSearch"
              />
            </div>
            <button
              v-if="queueState && queueState.totalBrokers > 0"
              class="btn btn-glass"
              @click="resetQueue"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              <span>Resetar Fila</span>
            </button>
          </div>
        </div>

        <div v-if="loadingQueue" class="lotio-loading-wrapper py-10">
          <div class="lotio-spinner-bounce small">
            <div class="bounce1"></div>
            <div class="bounce2"></div>
            <div class="bounce3"></div>
          </div>
        </div>

        <div v-else-if="!queueState || queueState.totalBrokers === 0" class="empty-queue">
          <p>Nenhum corretor elegível para este projeto. Vincule corretores ao projeto para ativar a distribuição.</p>
        </div>

        <div v-else-if="queueState.brokers.length === 0" class="empty-queue">
          <p>Nenhum corretor encontrado para "{{ queueSearch }}".</p>
        </div>

        <div v-else class="queue-list-container">
          <div class="queue-list">
            <div
              v-for="broker in queueState.brokers"
              :key="broker.id"
              class="queue-item"
              :class="{ 'is-next': broker.isNext }"
            >
              <div class="queue-position">{{ broker.position + 1 }}</div>
              <div class="queue-avatar">
                <img v-if="broker.photoUrl" :src="broker.photoUrl" :alt="broker.name" />
                <span v-else>{{ getInitials(broker.name) }}</span>
              </div>
              <div class="queue-details">
                <div class="queue-name">{{ broker.name }}</div>
                <div class="queue-code">{{ broker.code }}</div>
              </div>
              <div v-if="broker.isNext" class="next-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
                Próximo
              </div>
            </div>
          </div>

          <!-- Queue Pagination -->
          <div v-if="queueState.meta.totalPages > 1" class="queue-pagination mt-4">
            <button
              class="page-btn"
              :disabled="queuePage <= 1"
              @click="queuePage--; loadQueue()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="page-info">{{ queuePage }} / {{ queueState.meta.totalPages }}</span>
            <button
              class="page-btn"
              :disabled="queuePage >= queueState.meta.totalPages"
              @click="queuePage++; loadQueue()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Distribution Log -->
      <div class="log-card shadow-lotio-lg">
        <div class="log-header">
          <h3>Histórico de Distribuição</h3>
          <p class="text-muted">{{ logData?.meta?.totalItems || 0 }} registros</p>
        </div>

        <div v-if="loadingLog" class="lotio-loading-wrapper py-10">
          <div class="lotio-spinner-bounce small">
            <div class="bounce1"></div>
            <div class="bounce2"></div>
            <div class="bounce3"></div>
          </div>
        </div>

        <div v-else-if="!logData || logData.data.length === 0" class="empty-log">
          <p>Nenhuma distribuição automática registrada para este projeto.</p>
        </div>

        <div v-else class="log-table-wrapper">
          <table class="log-table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Lead</th>
                <th>Corretor</th>
                <th>Posição</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in logData.data" :key="entry.id">
                <td class="log-date">{{ formatDate(entry.createdAt) }}</td>
                <td>
                  <div class="log-lead">
                    <span class="lead-name">{{ entry.lead?.name || '—' }}</span>
                    <span v-if="entry.lead?.phone" class="lead-phone">{{ entry.lead.phone }}</span>
                  </div>
                </td>
                <td>
                  <div class="log-broker">
                    <span class="broker-name">{{ entry.realtorLink?.name || '—' }}</span>
                    <span v-if="entry.realtorLink?.code" class="broker-code">{{ entry.realtorLink.code }}</span>
                  </div>
                </td>
                <td class="log-position">{{ entry.queuePosition + 1 }}/{{ entry.queueSize }}</td>
              </tr>
            </tbody>
          </table>

          <!-- Pagination -->
          <div v-if="logData.meta.totalPages > 1" class="log-pagination mt-4">
            <button
              class="page-btn"
              :disabled="logPage <= 1"
              @click="logPage--; loadLog()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="page-info">{{ logPage }} / {{ logData.meta.totalPages }}</span>
            <button
              class="page-btn"
              :disabled="logPage >= logData.meta.totalPages"
              @click="logPage++; loadLog()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'

const api = useApi()
const toast = useToast()
const authStore = useAuthStore()
const canLoadProjectsCatalog = computed(() => {
  return !authStore.isLoteadora || !authStore.hasPanelRestrictions || authStore.canReadFeature('projects')
})

const loading = ref(true)
const projects = ref<any[]>([])
const selectedProjectId = ref('')
const config = ref<any>(null)
const queueState = ref<any>(null)
const logData = ref<any>(null)
const logPage = ref(1)
const queuePage = ref(1)
const queueSearch = ref('')
const loadingQueue = ref(false)
const loadingLog = ref(false)

onMounted(async () => {
  try {
    if (canLoadProjectsCatalog.value) {
      const res = await api.get('/projects')
      projects.value = Array.isArray(res) ? res : (res.data || [])
    } else {
      projects.value = []
    }
  } catch {
    toast.error('Erro ao carregar projetos')
  } finally {
    loading.value = false
  }
})

const onProjectChange = async () => {
  if (!selectedProjectId.value) {
    config.value = null
    queueState.value = null
    logData.value = null
    return
  }
  loading.value = true
  logPage.value = 1
  queuePage.value = 1
  queueSearch.value = ''
  try {
    await Promise.all([loadConfig(), loadQueue(), loadLog()])
  } finally {
    loading.value = false
  }
}

const loadConfig = async () => {
  config.value = await api.get(`/lead-distribution/config/${selectedProjectId.value}`)
}

const loadQueue = async () => {
  loadingQueue.value = true
  try {
    queueState.value = await api.get(`/lead-distribution/queue/${selectedProjectId.value}?page=${queuePage.value}&limit=15&search=${queueSearch.value}`)
  } finally {
    loadingQueue.value = false
  }
}

const loadLog = async () => {
  loadingLog.value = true
  try {
    logData.value = await api.get(`/lead-distribution/log/${selectedProjectId.value}?page=${logPage.value}&limit=15`)
  } finally {
    loadingLog.value = false
  }
}

const debouncedQueueSearch = useDebounceFn(() => {
  queuePage.value = 1
  loadQueue()
}, 500)

const toggleEnabled = async () => {
  if (!selectedProjectId.value) return
  try {
    const newEnabled = !config.value?.enabled
    config.value = await api.patch(`/lead-distribution/config/${selectedProjectId.value}`, { enabled: newEnabled })
    toast.success(newEnabled ? 'Auto-distribuicao ativada' : 'Auto-distribuicao desativada')
    await loadQueue()
  } catch {
    toast.error('Erro ao atualizar configuracao')
  }
}

const resetQueue = async () => {
  if (!confirm('Deseja resetar a fila? O proximo lead sera atribuido ao primeiro corretor.')) return
  try {
    await api.fetchApi(`/lead-distribution/queue/${selectedProjectId.value}/reset`, { method: 'POST' })
    toast.success('Fila resetada')
    await loadQueue()
  } catch {
    toast.error('Erro ao resetar fila')
  }
}

const getInitials = (name: string) => {
  if (!name) return '?'
  const parts = name.split(' ').filter(Boolean)
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0][0].toUpperCase()
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
/* Loading */
.lotio-loading-wrapper { display: flex; justify-content: center; align-items: center; }
.lotio-spinner-bounce { display: flex; gap: 4px; }
.lotio-spinner-bounce > div {
  width: 10px; height: 10px; background-color: var(--color-primary-500);
  border-radius: 100%; display: inline-block;
  animation: sk-bouncedelay 1.4s infinite ease-in-out both;
}
.lotio-spinner-bounce.small > div { width: 6px; height: 6px; }
.lotio-spinner-bounce .bounce1 { animation-delay: -0.32s; }
.lotio-spinner-bounce .bounce2 { animation-delay: -0.16s; }
@keyframes sk-bouncedelay {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1.0); }
}

.gradient-text {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.font-medium { font-weight: 500; }
.text-muted { color: var(--color-surface-400); font-size: 0.85rem; }

/* Filter Bar */
.lotio-filter-bar {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 10px 24px;
  display: flex;
  align-items: center;
  gap: 20px;
}
.lotio-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 260px;
}
.lotio-select-modern {
  width: 100%;
  border: none;
  background: transparent;
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-surface-50);
  outline: none;
  padding: 4px 28px 4px 6px;
  cursor: pointer;
  appearance: none;
}
.lotio-select-modern option {
  background: #141f1a !important;
  color: #f0fdf4 !important;
}
.lotio-select-wrapper i {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  font-size: 0.7rem;
  color: var(--color-surface-500);
}
.filter-item label {
  font-size: 0.65rem;
  text-transform: uppercase;
  font-weight: 800;
  color: var(--color-surface-400);
  margin-bottom: 2px;
  letter-spacing: 0.03em;
}

/* Empty State */
.empty-state-card {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 60px 40px;
  text-align: center;
}
.empty-icon { color: var(--color-surface-500); margin-bottom: 16px; }
.empty-state-card h3 { color: var(--color-surface-100); font-weight: 700; margin-bottom: 8px; }
.empty-state-card p { color: var(--color-surface-400); font-size: 0.9rem; max-width: 400px; margin: 0 auto; }

/* Config Card */
.config-card {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 28px 32px;
}
.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}
.config-info h3 { color: var(--color-surface-50); font-weight: 700; font-size: 1.1rem; margin-bottom: 6px; }
.config-info p { color: var(--color-surface-400); font-size: 0.85rem; line-height: 1.5; max-width: 560px; }
.config-toggle-area { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

/* Toggle */
.toggle-btn {
  width: 52px;
  height: 28px;
  border-radius: 14px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  position: relative;
  cursor: pointer;
  transition: background 0.25s;
}
.toggle-btn.active { background: var(--color-primary-500); }
.toggle-slider {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.25s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}
.toggle-btn.active .toggle-slider { transform: translateX(24px); }
.toggle-label {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  color: var(--color-surface-500);
}
.toggle-label.active { color: var(--color-primary-400); }

/* Queue Card */
.queue-card {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 28px 32px;
}
.queue-header h3 { color: var(--color-surface-50); font-weight: 700; font-size: 1.1rem; margin-bottom: 4px; }
.empty-queue { padding: 24px 0; }
.empty-queue p { color: var(--color-surface-400); font-size: 0.85rem; }

/* Search Input */
.search-input-group {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 0 12px;
  height: 38px;
  min-width: 200px;
  transition: all 0.2s;
}
.search-input-group:focus-within {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--color-primary-500);
}
.search-input-group i {
  font-size: 0.9rem;
  color: var(--color-surface-400);
  margin-right: 8px;
}
.search-input {
  background: transparent;
  border: none;
  color: var(--color-surface-50);
  font-size: 0.85rem;
  width: 100%;
  outline: none;
}
.search-input::placeholder {
  color: var(--color-surface-500);
}

.queue-list { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }

/* Pagination Shared */
.queue-pagination, .log-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--glass-border);
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  transition: all 0.2s;
}
.queue-item.is-next {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(52, 211, 153, 0.25);
}
.queue-position {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.8rem;
  color: var(--color-surface-400);
  flex-shrink: 0;
}
.queue-item.is-next .queue-position {
  background: var(--color-primary-500);
  color: #fff;
}
.queue-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-primary-400);
  flex-shrink: 0;
  overflow: hidden;
  border: 1.5px solid var(--color-primary-600);
}
.queue-avatar img { width: 100%; height: 100%; object-fit: cover; }
.queue-details { flex: 1; min-width: 0; }
.queue-name { font-weight: 600; color: var(--color-surface-50); font-size: 0.9rem; }
.queue-code { font-size: 0.75rem; color: var(--color-surface-400); }
.next-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-primary-400);
  background: rgba(16, 185, 129, 0.12);
  padding: 4px 10px;
  border-radius: 6px;
}

/* Log Card */
.log-card {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 28px 32px;
}
.log-header h3 { color: var(--color-surface-50); font-weight: 700; font-size: 1.1rem; margin-bottom: 4px; }
.empty-log { padding: 24px 0; }
.empty-log p { color: var(--color-surface-400); font-size: 0.85rem; }

.log-table-wrapper { margin-top: 20px; overflow-x: auto; }
.log-table {
  width: 100%;
  border-collapse: collapse;
}
.log-table th {
  text-align: left;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-surface-400);
  padding: 10px 14px;
  border-bottom: 1px solid var(--glass-border);
}
.log-table td {
  padding: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  vertical-align: middle;
}
.log-date { font-size: 0.85rem; color: var(--color-surface-300); white-space: nowrap; }

.log-lead { display: flex; flex-direction: column; }
.lead-name { font-weight: 600; color: var(--color-surface-50); font-size: 0.9rem; }
.lead-phone { font-size: 0.75rem; color: var(--color-surface-400); }

.log-broker { display: flex; flex-direction: column; }
.broker-name { font-weight: 600; color: var(--color-surface-50); font-size: 0.9rem; }
.broker-code { font-size: 0.75rem; color: var(--color-primary-400); }

.log-position {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--color-surface-300);
  text-align: center;
}

.page-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  color: var(--color-surface-300);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}
.page-btn:hover:not(:disabled) { background: var(--glass-bg-hover); color: var(--color-surface-50); }
.page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.page-info { font-size: 0.85rem; font-weight: 600; color: var(--color-surface-300); }

/* Button */
.btn-glass {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 8px 16px;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--color-surface-100);
  cursor: pointer;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn-glass:hover { background: var(--glass-bg-hover); }

/* Utilities */
.shadow-lotio-lg { box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3); }

/* Loading */
.lotio-loading-wrapper { display: flex; justify-content: center; padding: 60px 0; }
.lotio-spinner-bounce { width: 70px; text-align: center; }
.lotio-spinner-bounce > div {
  width: 12px; height: 12px; background-color: var(--color-primary-500);
  border-radius: 100%; display: inline-block;
  animation: sk-bouncedelay 1.4s infinite ease-in-out both; margin: 0 3px;
}
.lotio-spinner-bounce .bounce1 { animation-delay: -0.32s; }
.lotio-spinner-bounce .bounce2 { animation-delay: -0.16s; }
@keyframes sk-bouncedelay {
  0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); }
}

/* Responsive */
@media (max-width: 767px) {
  .distribution-page { padding: 16px !important; }
  .config-header { flex-direction: column; align-items: flex-start; }
  .queue-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .lotio-filter-bar { flex-direction: column; }
  .lotio-select-wrapper { min-width: 100%; }
}
</style>
