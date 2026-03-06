<template>
  <div>
    <div class="page-header">
      <div>
        <h1>Métricas da Equipe</h1>
        <p>Acompanhe o desempenho de seus corretores em tempo real.</p>
      </div>
      <button class="btn btn-primary" @click="openInviteModal">
        <i class="pi pi-user-plus me-2"></i>Convidar Corretor
      </button>
    </div>

    <!-- Stats Overview -->
    <div class="grid grid-cols-3">
      <div class="stat-card stat-card--highlight">
        <div class="stat-icon-wrap stat-icon--blue"><i class="pi pi-users"></i></div>
        <div class="stat-value">{{ summary.totalRealtors }}</div>
        <div class="stat-label">Corretores na equipe</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap stat-icon--green"><i class="pi pi-target"></i></div>
        <div class="stat-value">{{ summary.totalLeads }}</div>
        <div class="stat-label">Leads totais</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap stat-icon--purple"><i class="pi pi-eye"></i></div>
        <div class="stat-value">{{ summary.totalSessions }}</div>
        <div class="stat-label">Acessos totais</div>
      </div>
    </div>

    <!-- Metrics Table -->
    <div style="margin-top: 32px;">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>Carregando métricas...</span>
      </div>

      <div v-else-if="team.length === 0" class="empty-state-container d-flex align-items-center justify-content-center py-5">
        <div class="card text-center p-5 rounded-5 max-w-500" style="backdrop-filter: blur(var(--glass-blur));">
          <div class="icon-blob mx-auto mb-4">📊</div>
          <h3 class="fw-bold mb-3">Nenhum corretor na equipe</h3>
          <p class="mb-4 px-4">Convide corretores para começar a acompanhar métricas.</p>
          <button class="btn btn-primary btn-lg rounded-pill px-5" @click="openInviteModal">Convidar Corretor</button>
        </div>
      </div>

      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Corretor</th>
              <th class="text-center-col">Leads</th>
              <th class="text-center-col">Acessos</th>
              <th class="text-center-col">Conversão</th>
              <th class="text-center-col">Link</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in team" :key="r.id">
              <td>
                <div class="realtor-info">
                  <div class="realtor-avatar-circle">{{ r.name?.charAt(0) || '?' }}</div>
                  <div>
                    <div class="realtor-name-text">{{ r.name }}</div>
                    <div class="realtor-role-label">Corretor Ativo</div>
                  </div>
                </div>
              </td>
              <td class="text-center-col">
                <span class="badge badge-success">{{ r.leads || 0 }} leads</span>
              </td>
              <td class="text-center-col">
                <span class="metric-number">{{ r.accesses || 0 }}</span>
              </td>
              <td class="text-center-col">
                <span class="metric-conversion-val">
                  {{ r.accesses ? ((r.leads / r.accesses) * 100).toFixed(1) + '%' : '0%' }}
                </span>
              </td>
              <td class="text-center-col">
                <button v-if="r.code" class="btn btn-ghost btn-sm" @click="copyRealtorLink(r)" title="Copiar link de divulgação">
                  <i class="pi pi-copy"></i>
                </button>
                <span v-else class="text-muted-cell">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Invite Modal -->
    <Teleport to="body">
      <div v-if="showInviteModal" class="modal-overlay" @click.self="showInviteModal = false">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h2>Convidar Novo Corretor</h2>
            <button class="modal-close" @click="showInviteModal = false">&times;</button>
          </div>

          <div class="modal-body">
            <p style="color: var(--color-surface-200); font-size: 0.875rem; margin-bottom: 20px;">
              O corretor receberá um link para criar sua conta e será automaticamente vinculado à sua equipe.
            </p>
            <form @submit.prevent="sendInvite">
              <div class="form-group">
                <label class="form-label">Email do Corretor <span style="color: var(--color-danger);">*</span></label>
                <input
                  v-model="inviteForm.email"
                  type="email"
                  class="form-input"
                  placeholder="corretor@imobiliaria.com"
                  required
                >
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-ghost" @click="showInviteModal = false">Cancelar</button>
                <button type="submit" class="btn btn-primary" :disabled="inviteSending">
                  {{ inviteSending ? 'Enviando...' : 'Enviar Convite' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const { get, post } = useApi()
const route = useRoute()
const toast = useToast()

const team = ref<any[]>([])
const loading = ref(true)
const showInviteModal = ref(false)
const inviteSending = ref(false)
const inviteForm = ref({ email: '', role: 'CORRETOR' })

const summary = computed(() => ({
  totalRealtors: team.value.length,
  totalLeads: team.value.reduce((acc, r) => acc + (r.leads || 0), 0),
  totalSessions: team.value.reduce((acc, r) => acc + (r.accesses || 0), 0),
}))

async function fetchMetrics() {
  loading.value = true
  try {
    const agencyId = route.query.agencyId as string
    const url = agencyId ? `/agencies/metrics?agencyId=${agencyId}` : '/agencies/metrics'
    const data = await get(url)
    team.value = data?.team || []
  } catch (err) {
    console.error(err)
    toast.error('Erro ao carregar métricas')
    team.value = []
  } finally {
    loading.value = false
  }
}

function openInviteModal() {
  inviteForm.value = { email: '', role: 'CORRETOR' }
  showInviteModal.value = true
}

async function sendInvite() {
  if (!inviteForm.value.email) {
    toast.error('Email é obrigatório')
    return
  }

  inviteSending.value = true
  try {
    const res = await post('/agencies/invite', inviteForm.value)
    toast.success('Convite enviado com sucesso!')

    const magicLink = `${window.location.origin}/aceitar-convite?token=${res.token}`
    await navigator.clipboard.writeText(magicLink)
    toast.info('Link de convite copiado para a área de transferência')

    showInviteModal.value = false
    fetchMetrics()
  } catch (err: any) {
    toast.error(err.message || 'Erro ao enviar convite')
  } finally {
    inviteSending.value = false
  }
}

function copyRealtorLink(r: any) {
  const url = `${window.location.origin}/?c=${r.code}`
  navigator.clipboard.writeText(url)
  toast.success('Link de divulgação copiado!')
}

onMounted(fetchMetrics)

definePageMeta({ layout: 'default' })
</script>

<style scoped>
/* Stat highlight variant */
.stat-card--highlight {
  background: linear-gradient(135deg, var(--color-primary-500) 0%, #0062CC 100%);
  border-color: transparent !important;
  color: white;
}
.stat-card--highlight .stat-value { color: white; }
.stat-card--highlight .stat-label { color: white; }
.stat-card--highlight .stat-icon-wrap { background: rgba(255, 255, 255, 0.2) !important; color: white !important; }

.stat-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  margin-bottom: 12px;
}

.stat-icon--blue { background: rgba(59, 130, 246, 0.12); color: var(--color-primary-500); }
.stat-icon--green { background: rgba(16, 185, 129, 0.12); color: #16a34a; }
.stat-icon--purple { background: rgba(147, 51, 234, 0.12); color: #9333ea; }

/* Table */
.text-center-col { text-align: center; }

.realtor-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.realtor-avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-primary-500);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.realtor-name-text {
  font-weight: 700;
  color: var(--color-surface-50);
  font-size: 0.875rem;
}

.realtor-role-label {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-surface-500);
  letter-spacing: 0.04em;
}

.metric-number {
  font-weight: 600;
  color: var(--color-surface-200);
  font-size: 0.875rem;
}

.metric-conversion-val {
  font-size: 0.875rem;
  color: var(--color-surface-500);
  font-style: italic;
}

.text-muted-cell {
  color: var(--color-surface-500);
}

.me-2 { margin-right: 0.5rem; }
</style>
