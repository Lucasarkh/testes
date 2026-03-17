<script setup lang="ts">
const { fetchApi } = useApi()
const { get: getPublic } = usePublicApi()
const { success: toastSuccess, error: toastError } = useToast()
const authStore = useAuthStore()

if (!authStore.isCorretor && !authStore.isImobiliaria) {
  await navigateTo(authStore.getDashboardRoute())
}

// ─── Types ───────────────────────────────────────────────
interface ProjectRef { id: string; name: string; slug: string }
interface LotOption {
  mapElementId: string
  code: string
  block: string | null
  areaM2: number | null
  price: number | null
  tags: string[]
  status: string
}
interface ReservationRules {
  feeType: 'FIXED' | 'PERCENTAGE'
  feeValue: number
  expiryHours: number
  currency: string
}
interface CorreторOption { id: string; code: string; name: string }

// ─── State ────────────────────────────────────────────────
const step = ref<1 | 2 | 3 | 'done'>(1)

// Step 1 data
const projects = ref<ProjectRef[]>([])
const loadingProjects = ref(true)
const selectedProject = ref<ProjectRef | null>(null)
const lots = ref<LotOption[]>([])
const loadingLots = ref(false)
const selectedLot = ref<LotOption | null>(null)
const reservationRules = ref<ReservationRules | null>(null)
const lotSearch = ref('')

// Step 2 data
const form = ref({ name: '', email: '', phone: '', cpf: '' })
const corretores = ref<CorreторOption[]>([])
const selectedCorretor = ref<CorreторOption | null>(null)

// Step 3 / submit
const submitting = ref(false)
const createdLead = ref<any>(null)

// ─── Computed ─────────────────────────────────────────────
const filteredLots = computed(() => {
  const q = lotSearch.value.toLowerCase()
  return lots.value.filter(l => {
    if (!q) return true
    return (
      (l.code || '').toLowerCase().includes(q) ||
      (l.block || '').toLowerCase().includes(q)
    )
  })
})

const feeDisplay = computed(() => {
  if (!reservationRules.value) return '—'
  const { feeType, feeValue } = reservationRules.value
  if (feeType === 'PERCENTAGE') return `${feeValue}% do valor do lote`
  return `R$ ${Number(feeValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
})

const feeAmount = computed(() => {
  if (!reservationRules.value || !selectedLot.value) return null
  const { feeType, feeValue } = reservationRules.value
  if (feeType === 'FIXED') return feeValue
  if (selectedLot.value.price && feeType === 'PERCENTAGE') {
    return selectedLot.value.price * (feeValue / 100)
  }
  return null
})

const expiryDisplay = computed(() => {
  if (!reservationRules.value) return '—'
  const h = reservationRules.value.expiryHours
  return h >= 24 ? `${h / 24} dia(s)` : `${h} hora(s)`
})

// ─── Data loading ──────────────────────────────────────────
async function loadProjects() {
  loadingProjects.value = true
  try {
    if (authStore.isCorretor) {
      const link = await fetchApi('/realtor-links/me')
      projects.value = link?.projects || []
    } else {
      // IMOBILIARIA — get all links → unique projects
      const links = await fetchApi('/realtor-links')
      const projectMap = new Map<string, ProjectRef>()
      for (const link of links || []) {
        for (const p of link.projects || []) {
          if (!projectMap.has(p.id)) projectMap.set(p.id, p)
        }
      }
      projects.value = Array.from(projectMap.values())

      // Also load corretor list
      corretores.value = (links || []).map((l: any) => ({
        id: l.id,
        code: l.code,
        name: l.name || l.user?.name || l.code
      }))
    }
  } catch {
    toastError('Erro ao carregar seus projetos.')
  } finally {
    loadingProjects.value = false
  }
}

async function selectProject(project: ProjectRef) {
  selectedProject.value = project
  selectedLot.value = null
  lots.value = []
  loadingLots.value = true
  try {
    const data = await getPublic(`/p/${project.slug}`)
    // Parse available lots from mapElements
    const available: LotOption[] = []
    for (const el of data.mapElements || []) {
      const ld = el.lotDetails || el.hotspot?.lotDetails
      if (!ld || ld.status !== 'AVAILABLE') continue
      available.push({
        mapElementId: el.id,
        code: el.code || el.name || el.id,
        block: ld.block || null,
        areaM2: ld.areaM2 || null,
        price: ld.price ? Number(ld.price) : null,
        tags: ld.tags || [],
        status: ld.status
      })
    }
    lots.value = available

    reservationRules.value = {
      feeType: data.reservationFeeType || 'FIXED',
      feeValue: Number(data.reservationFeeValue) || 500,
      expiryHours: data.reservationExpiryHours || 24,
      currency: 'BRL'
    }
  } catch {
    toastError('Erro ao carregar lotes do projeto.')
  } finally {
    loadingLots.value = false
  }
}

// ─── Navigation ────────────────────────────────────────────
function goStep2() {
  if (!selectedProject.value || !selectedLot.value) return
  step.value = 2
}

function goStep3() {
  if (!form.value.name || !form.value.email || !form.value.phone) {
    toastError('Preencha nome, e-mail e WhatsApp.')
    return
  }
  step.value = 3
}

async function submitReservation() {
  if (!selectedProject.value || !selectedLot.value) return
  submitting.value = true
  try {
    const payload: any = {
      projectId: selectedProject.value.id,
      mapElementId: selectedLot.value.mapElementId,
      status: 'RESERVATION',
      name: form.value.name,
      email: form.value.email,
      phone: form.value.phone,
      ...(form.value.cpf ? { cpf: form.value.cpf } : {}),
    }
    if (authStore.isImobiliaria && selectedCorretor.value) {
      payload.realtorCode = selectedCorretor.value.code
    }
    const lead = await fetchApi('/leads', { method: 'POST', body: payload })
    createdLead.value = lead
    step.value = 'done'
    toastSuccess('Lote reservado com sucesso!')
  } catch (err: any) {
    toastError(err?.message || 'Erro ao realizar a reserva. O lote pode já ter sido reservado.')
  } finally {
    submitting.value = false
  }
}

function formatPrice(v: number | null) {
  if (!v) return 'Sob consulta'
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
}

onMounted(loadProjects)
</script>

<template>
  <div class="reservar-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>Reservar Lote</h1>
        <p>Reserve um lote para um cliente seguindo as regras definidas pela loteadora.</p>
      </div>
    </div>

    <!-- Step indicator -->
    <div class="step-bar" v-if="step !== 'done'">
      <div class="step-item" :class="{ active: step >= 1, done: step > 1 }">
        <div class="step-num">{{ step > 1 ? '✓' : '1' }}</div>
        <span>Selecionar Lote</span>
      </div>
      <div class="step-connector"></div>
      <div class="step-item" :class="{ active: step >= 2, done: step > 2 }">
        <div class="step-num">{{ step > 2 ? '✓' : '2' }}</div>
        <span>Dados do Cliente</span>
      </div>
      <div class="step-connector"></div>
      <div class="step-item" :class="{ active: step >= 3 }">
        <div class="step-num">3</div>
        <span>Confirmar</span>
      </div>
    </div>

    <!-- ── STEP 1: Select Lot ─────────────────────────────── -->
    <div v-if="step === 1" class="step-panel">
      <div v-if="loadingProjects" class="loading-state">
        <div class="spinner"></div>
        <p>Carregando seus projetos...</p>
      </div>

      <div v-else-if="projects.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="44" height="44"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
        <h3>Nenhum projeto vinculado</h3>
        <p>Você ainda não está vinculado a nenhum loteamento. Entre em contato com seu gestor.</p>
      </div>

      <template v-else>
        <!-- Project picker -->
        <div class="section-label">Escolha o loteamento</div>
        <div class="project-grid">
          <button
            v-for="p in projects"
            :key="p.id"
            class="project-card"
            :class="{ selected: selectedProject?.id === p.id }"
            @click="selectProject(p)"
          >
            <div class="project-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <span>{{ p.name }}</span>
            <svg v-if="selectedProject?.id === p.id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16" class="check-icon"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>

        <!-- Lots for selected project -->
        <template v-if="selectedProject">
          <div class="section-label" style="margin-top: 24px">
            Lotes disponíveis em <strong>{{ selectedProject.name }}</strong>
          </div>

          <!-- Reservation rules info -->
          <div v-if="reservationRules" class="rules-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="flex-shrink:0; color:var(--color-primary-400)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Taxa de reserva: <strong>{{ feeDisplay }}</strong> · Validade: <strong>{{ expiryDisplay }}</strong> após confirmar a reserva. Esta reserva esta sujeita a analise de credito da loteadora.</span>
          </div>

          <div v-if="loadingLots" class="loading-state">
            <div class="spinner"></div>
          </div>

          <div v-else-if="lots.length === 0" class="empty-state" style="padding: 32px 0">
            <p>Nenhum lote disponível neste projeto no momento.</p>
          </div>

          <template v-else>
            <input v-model="lotSearch" class="lot-search" placeholder="Buscar por código ou quadra..." />

            <div class="lots-grid">
              <button
                v-for="lot in filteredLots"
                :key="lot.mapElementId"
                class="lot-card"
                :class="{ selected: selectedLot?.mapElementId === lot.mapElementId }"
                @click="selectedLot = lot"
              >
                <div class="lot-code">{{ lot.code }}</div>
                <div v-if="lot.block" class="lot-block">Quadra {{ lot.block }}</div>
                <div class="lot-area" v-if="lot.areaM2">{{ lot.areaM2 }}m²</div>
                <div class="lot-price">{{ formatPrice(lot.price) }}</div>
                <div v-if="lot.tags?.length" class="lot-tags">
                  <span v-for="tag in lot.tags.slice(0, 2)" :key="tag" class="lot-tag">{{ tag }}</span>
                </div>
                <div v-if="selectedLot?.mapElementId === lot.mapElementId" class="lot-check">✓</div>
              </button>
            </div>
          </template>
        </template>

        <div class="step-actions">
          <button class="btn btn-primary" :disabled="!selectedLot" @click="goStep2">
            Continuar →
          </button>
        </div>
      </template>
    </div>

    <!-- ── STEP 2: Client Data ────────────────────────────── -->
    <div v-if="step === 2" class="step-panel">
      <div class="selected-lot-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
        Lote <strong>{{ selectedLot?.code }}</strong>
        <span v-if="selectedLot?.block"> · Quadra {{ selectedLot.block }}</span>
        <span v-if="selectedLot?.areaM2"> · {{ selectedLot.areaM2 }}m²</span>
        em <strong>{{ selectedProject?.name }}</strong>
      </div>

      <div class="form-grid">
        <div class="form-group span-2">
          <label class="form-label">Nome completo do cliente <span class="req">*</span></label>
          <input v-model="form.name" class="form-input" type="text" placeholder="Nome completo" />
        </div>
        <div class="form-group">
          <label class="form-label">E-mail <span class="req">*</span></label>
          <input v-model="form.email" class="form-input" type="email" placeholder="email@exemplo.com" />
        </div>
        <div class="form-group">
          <label class="form-label">WhatsApp <span class="req">*</span></label>
          <input v-model="form.phone" class="form-input" type="tel" placeholder="(11) 99999-9999" />
        </div>
        <div class="form-group">
          <label class="form-label">CPF</label>
          <input v-model="form.cpf" class="form-input" type="text" placeholder="000.000.000-00" />
        </div>

        <!-- IMOBILIARIA: assign corretor -->
        <div v-if="authStore.isImobiliaria" class="form-group">
          <label class="form-label">Corretor responsável</label>
          <select v-model="selectedCorretor" class="form-input">
            <option :value="null">— Nenhum (minha equipe em geral) —</option>
            <option v-for="c in corretores" :key="c.id" :value="c">{{ c.name }} ({{ c.code }})</option>
          </select>
        </div>
      </div>

      <div class="step-actions">
        <button class="btn btn-ghost" @click="step = 1"><i class="bi bi-arrow-left-short back-nav-icon" aria-hidden="true"></i><span class="back-nav-label">Voltar</span></button>
        <button class="btn btn-primary" @click="goStep3">Revisar Reserva →</button>
      </div>
    </div>

    <!-- ── STEP 3: Confirm ────────────────────────────────── -->
    <div v-if="step === 3" class="step-panel">
      <h2 class="confirm-title">Confirmar Reserva</h2>

      <div class="confirm-grid">
        <div class="confirm-section">
          <div class="confirm-section-title">Lote</div>
          <div class="confirm-row"><span>Loteamento</span><strong>{{ selectedProject?.name }}</strong></div>
          <div class="confirm-row"><span>Código</span><strong>{{ selectedLot?.code }}</strong></div>
          <div v-if="selectedLot?.block" class="confirm-row"><span>Quadra</span><strong>{{ selectedLot.block }}</strong></div>
          <div v-if="selectedLot?.areaM2" class="confirm-row"><span>Área</span><strong>{{ selectedLot.areaM2 }}m²</strong></div>
          <div class="confirm-row"><span>Valor do lote</span><strong>{{ formatPrice(selectedLot?.price ?? null) }}</strong></div>
        </div>

        <div class="confirm-section">
          <div class="confirm-section-title">Cliente</div>
          <div class="confirm-row"><span>Nome</span><strong>{{ form.name }}</strong></div>
          <div class="confirm-row"><span>E-mail</span><strong>{{ form.email }}</strong></div>
          <div class="confirm-row"><span>WhatsApp</span><strong>{{ form.phone }}</strong></div>
          <div v-if="form.cpf" class="confirm-row"><span>CPF</span><strong>{{ form.cpf }}</strong></div>
          <div v-if="selectedCorretor" class="confirm-row"><span>Corretor</span><strong>{{ selectedCorretor.name }}</strong></div>
        </div>

        <div class="confirm-section highlight">
          <div class="confirm-section-title">Condições de Reserva</div>
          <div class="confirm-row"><span>Taxa de reserva</span><strong>{{ feeDisplay }}</strong></div>
          <div v-if="feeAmount" class="confirm-row"><span>Valor estimado</span><strong>{{ formatPrice(feeAmount) }}</strong></div>
          <div class="confirm-row"><span>Validade</span><strong>{{ expiryDisplay }}</strong></div>
          <p class="confirm-note">O lote será bloqueado imediatamente para outros compradores. A reserva expirará automaticamente após o prazo se não for confirmada. A efetivacao da venda esta sujeita a analise de credito da loteadora, que e a responsavel exclusiva por essa etapa.</p>
        </div>
      </div>

      <div class="step-actions">
        <button class="btn btn-ghost" @click="step = 2"><i class="bi bi-arrow-left-short back-nav-icon" aria-hidden="true"></i><span class="back-nav-label">Voltar</span></button>
        <button class="btn btn-primary btn-reserve" :disabled="submitting" @click="submitReservation">
          <svg v-if="!submitting" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          {{ submitting ? 'Reservando...' : 'Confirmar Reserva' }}
        </button>
      </div>
    </div>

    <!-- ── DONE: Success ──────────────────────────────────── -->
    <div v-if="step === 'done'" class="done-panel">
      <div class="done-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="40" height="40"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
      <h2>Reserva realizada!</h2>
      <p>O lote <strong>{{ selectedLot?.code }}</strong> de <strong>{{ selectedProject?.name }}</strong> foi reservado para <strong>{{ form.name }}</strong>.</p>
      <p class="done-expiry">A reserva expira em <strong>{{ expiryDisplay }}</strong>.</p>
      <div class="done-actions">
        <NuxtLink :to="`/painel/leads`" class="btn btn-primary">Ver nos Meus Leads</NuxtLink>
        <button class="btn btn-ghost" @click="() => { step = 1; selectedProject = null; selectedLot = null; form = { name: '', email: '', phone: '', cpf: '' } }">
          Nova Reserva
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reservar-page {
  --reserve-primary: #0071e3;
  --reserve-primary-hover: #0077ed;
  --reserve-primary-soft: rgba(0, 113, 227, 0.08);
  --reserve-surface: #ffffff;
  --reserve-surface-alt: #f5f5f7;
  --reserve-text: #1d1d1f;
  --reserve-muted: #86868b;
  --reserve-border: #d2d2d7;
  --reserve-shadow: 0 22px 48px rgba(15, 23, 42, 0.08);
  max-width: 980px;
  font-family: var(--font-sans);
  color: var(--reserve-text);
}

/* Header */
.page-header { margin-bottom: 28px; }
.page-header h1 {
  margin: 0 0 8px;
  color: var(--reserve-text);
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.page-header p {
  margin: 0;
  max-width: 58ch;
  color: var(--reserve-muted);
  font-size: 0.9375rem;
  line-height: 1.6;
}

/* Step bar */
.step-bar {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 28px;
  padding: 18px 22px;
  border: 1px solid var(--reserve-border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
}
.step-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--reserve-muted);
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.step-item.active { color: var(--reserve-text); }
.step-item.done { color: var(--reserve-primary); }
.step-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  font-weight: 700;
  background: var(--reserve-surface-alt);
  border: 1.5px solid var(--reserve-border);
  color: var(--reserve-muted);
  flex-shrink: 0;
}
.step-item.active .step-num {
  background: var(--reserve-primary);
  border-color: var(--reserve-primary);
  color: white;
}
.step-item.done .step-num {
  background: rgba(0, 113, 227, 0.12);
  border-color: rgba(0, 113, 227, 0.28);
  color: var(--reserve-primary);
}
.step-connector {
  flex: 1;
  height: 2px;
  min-width: 16px;
  background: var(--reserve-border);
}

/* Panel wrapper */
.step-panel {
  background: var(--reserve-surface);
  border: 1px solid var(--reserve-border);
  border-radius: 24px;
  padding: 32px;
  box-shadow: var(--reserve-shadow);
}

/* Loading / empty */
.loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 0; color: var(--reserve-muted); }
.spinner { width: 32px; height: 32px; border: 3px solid rgba(0, 113, 227, 0.15); border-top-color: var(--reserve-primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 56px 32px; color: var(--reserve-muted); display: flex; flex-direction: column; align-items: center; gap: 12px; }
.empty-state h3 { font-size: 1.375rem; font-weight: 600; color: var(--reserve-text); margin: 0; letter-spacing: -0.02em; }
.empty-state p { margin: 0; font-size: 0.9375rem; line-height: 1.6; }

/* Section label */
.section-label { font-size: 0.75rem; font-weight: 700; color: var(--reserve-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; }

/* Project cards */
.project-grid { display: flex; flex-direction: column; gap: 12px; }
@media (min-width: 640px) { .project-grid { flex-direction: row; flex-wrap: wrap; } }
.project-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 16px;
  border: 1px solid var(--reserve-border);
  background: var(--reserve-surface-alt);
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--reserve-text);
  transition: all 150ms ease;
  text-align: left;
  width: 100%;
}
@media (min-width: 640px) { .project-card { width: auto; min-width: 180px; } }
.project-card:hover { border-color: rgba(0, 113, 227, 0.28); transform: translateY(-1px); box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08); }
.project-card.selected { border-color: var(--reserve-primary); background: rgba(0, 113, 227, 0.08); color: var(--reserve-primary); }
.project-icon { color: var(--reserve-muted); flex-shrink: 0; }
.check-icon { margin-left: auto; color: var(--reserve-primary); }

/* Rules box */
.rules-box {
  display: flex; align-items: flex-start; gap: 10px;
  background: rgba(0, 113, 227, 0.06); border: 1px solid rgba(0, 113, 227, 0.16);
  border-radius: 16px; padding: 14px 16px;
  font-size: 0.875rem; color: var(--reserve-muted); margin-bottom: 18px; line-height: 1.6;
}

.rules-box strong { color: var(--reserve-text); }

/* Lot search */
.lot-search {
  width: 100%; padding: 14px 16px; border-radius: 12px;
  border: 1px solid var(--reserve-border);
  background: #fafafa; color: var(--reserve-text);
  font-size: 1.0625rem; margin-bottom: 16px; box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}
.lot-search:focus { outline: none; border-color: var(--reserve-primary); box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.1); background: white; }
.lot-search::placeholder { color: var(--reserve-muted); }

/* Lots grid */
.lots-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
@media (min-width: 480px) { .lots-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 768px) { .lots-grid { grid-template-columns: repeat(4, 1fr); } }

.lot-card {
  position: relative;
  background: var(--reserve-surface-alt); border: 1px solid var(--reserve-border);
  border-radius: 16px; padding: 16px;
  cursor: pointer; text-align: left; transition: all 150ms ease;
}
.lot-card:hover { border-color: rgba(0, 113, 227, 0.28); transform: translateY(-1px); box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08); }
.lot-card.selected { border-color: var(--reserve-primary); background: rgba(0, 113, 227, 0.08); }
.lot-code { font-size: 1.125rem; font-weight: 700; color: var(--reserve-text); margin-bottom: 4px; letter-spacing: -0.02em; }
.lot-block { font-size: 0.75rem; color: var(--reserve-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
.lot-area { font-size: 0.9375rem; color: var(--reserve-muted); }
.lot-price { font-size: 1rem; font-weight: 700; color: var(--reserve-primary); margin-top: 8px; }
.lot-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.lot-tag { font-size: 0.6875rem; background: rgba(0, 113, 227, 0.1); color: var(--reserve-primary); padding: 4px 8px; border-radius: 999px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
.lot-check { position: absolute; top: 10px; right: 10px; width: 22px; height: 22px; border-radius: 50%; background: var(--reserve-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; }

/* Form */
.form-grid {
  display: grid; grid-template-columns: 1fr; gap: 18px; margin-bottom: 28px;
}
@media (min-width: 600px) { .form-grid { grid-template-columns: 1fr 1fr; } }
.span-2 { grid-column: 1; }
@media (min-width: 600px) { .span-2 { grid-column: span 2; } }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-size: 0.75rem; font-weight: 700; color: var(--reserve-muted); text-transform: uppercase; letter-spacing: 0.08em; }
.req { color: #f87171; }
.form-input {
  width: 100%; padding: 14px 16px; border-radius: 12px;
  border: 1px solid var(--reserve-border);
  background: #fafafa; color: var(--reserve-text);
  font-family: inherit;
  font-size: 1.0625rem; box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}
.form-input:focus { outline: none; border-color: var(--reserve-primary); box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.1); background: white; }
.form-input::placeholder { color: var(--reserve-muted); }

/* Selected lot banner */
.selected-lot-banner {
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
  background: rgba(0, 113, 227, 0.06); border: 1px solid rgba(0, 113, 227, 0.16);
  border-radius: 16px; padding: 14px 16px;
  font-size: 0.9375rem; color: var(--reserve-muted);
  margin-bottom: 20px;
  line-height: 1.6;
}
.selected-lot-banner svg { color: var(--reserve-primary); flex-shrink: 0; }

.selected-lot-banner strong { color: var(--reserve-text); }

/* Confirm grid */
.confirm-title { font-size: 1.5rem; font-weight: 600; color: var(--reserve-text); margin: 0 0 24px; letter-spacing: -0.02em; }
.confirm-grid { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
@media (min-width: 640px) {
  .confirm-grid { display: grid; grid-template-columns: 1fr 1fr; }
  .confirm-section.highlight { grid-column: span 2; }
}
.confirm-section {
  background: var(--reserve-surface-alt); border: 1px solid var(--reserve-border);
  border-radius: 18px; padding: 20px;
}
.confirm-section.highlight { background: rgba(0, 113, 227, 0.06); border-color: rgba(0, 113, 227, 0.16); }
.confirm-section-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--reserve-muted); margin-bottom: 14px; }
.confirm-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; font-size: 0.9375rem; border-bottom: 1px solid rgba(134, 134, 139, 0.18); }
.confirm-row:last-of-type { border-bottom: none; }
.confirm-row span { color: var(--reserve-muted); }
.confirm-row strong { color: var(--reserve-text); }
.confirm-note { font-size: 0.875rem; color: var(--reserve-muted); margin: 14px 0 0; line-height: 1.7; }

/* Step actions */
.step-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 28px; flex-wrap: wrap; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 52px;
  padding: 0 24px; border-radius: 12px;
  font-weight: 600; font-size: 1.0625rem;
  cursor: pointer; transition: all 150ms ease; border: none;
  font-family: inherit;
}
.btn-primary { background: var(--reserve-primary); color: white; box-shadow: 0 12px 28px rgba(0, 113, 227, 0.22); }
.btn-primary:hover:not(:disabled) { background: var(--reserve-primary-hover); transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { background: white; color: var(--reserve-text); border: 1px solid var(--reserve-border); }
.btn-ghost:hover { background: var(--reserve-surface-alt); color: var(--reserve-text); }
.btn-reserve { padding: 0 32px; }

/* Done panel */
.done-panel {
  background: var(--reserve-surface);
  border: 1px solid rgba(0, 113, 227, 0.18);
  border-radius: 24px;
  padding: 56px 36px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  box-shadow: var(--reserve-shadow);
}
.done-icon { color: var(--reserve-primary); }
.done-panel h2 { font-size: 1.75rem; font-weight: 600; color: var(--reserve-text); margin: 0; letter-spacing: -0.03em; }
.done-panel p { font-size: 1rem; color: var(--reserve-muted); margin: 0; line-height: 1.7; max-width: 44ch; }
.done-panel strong { color: var(--reserve-text); }
.done-expiry { font-size: 0.9375rem; color: var(--reserve-muted); }
.done-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }

@media (max-width: 768px) {
  .step-bar {
    padding: 16px;
    overflow-x: auto;
  }

  .step-panel,
  .done-panel {
    padding: 24px;
  }

  .lot-search,
  .form-input,
  .btn {
    font-size: 1rem;
  }

  .confirm-row {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 560px) {
  .step-actions .btn,
  .done-actions .btn {
    width: 100%;
  }

  .lots-grid {
    grid-template-columns: 1fr;
  }
}
</style>
