<script setup lang="ts">
const { fetchApi } = useApi()
const { get: getPublic } = usePublicApi()
const { success: toastSuccess, error: toastError } = useToast()
const authStore = useAuthStore()

if (!authStore.isCorretor && !authStore.isImobiliaria) {
  await navigateTo('/painel')
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
        <button class="btn btn-ghost" @click="step = 1">← Voltar</button>
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
        <button class="btn btn-ghost" @click="step = 2">← Voltar</button>
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
.reservar-page { max-width: 840px; }

/* Header */
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; color: var(--color-surface-50); margin: 0 0 4px; }
.page-header p { font-size: 0.875rem; color: var(--color-surface-300); margin: 0; }

/* Step bar */
.step-bar {
  display: flex; align-items: center;
  margin-bottom: 28px; gap: 0;
}
.step-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 0.8125rem; font-weight: 600; color: var(--color-surface-500);
  white-space: nowrap;
}
.step-item.active { color: var(--color-surface-100); }
.step-item.done { color: var(--color-primary-400); }
.step-num {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700;
  background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,255,255,0.12);
  flex-shrink: 0;
}
.step-item.active .step-num { background: var(--color-primary-600); border-color: var(--color-primary-500); color: white; }
.step-item.done .step-num { background: rgba(16,185,129,0.15); border-color: var(--color-primary-500); color: var(--color-primary-400); }
.step-connector { flex: 1; height: 1.5px; background: rgba(255,255,255,0.08); min-width: 16px; }

/* Panel wrapper */
.step-panel {
  background: var(--glass-bg, rgba(255,255,255,0.04));
  border: 1px solid var(--glass-border, rgba(255,255,255,0.08));
  border-radius: var(--radius-xl);
  padding: 24px;
}

/* Loading / empty */
.loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 0; color: var(--color-surface-400); }
.spinner { width: 32px; height: 32px; border: 3px solid rgba(16,185,129,0.15); border-top-color: var(--color-primary-500); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 48px 32px; color: var(--color-surface-400); display: flex; flex-direction: column; align-items: center; gap: 10px; }
.empty-state h3 { font-size: 1.125rem; font-weight: 600; color: var(--color-surface-200); margin: 0; }
.empty-state p { margin: 0; font-size: 0.875rem; }

/* Section label */
.section-label { font-size: 0.75rem; font-weight: 700; color: var(--color-surface-400); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; }

/* Project cards */
.project-grid { display: flex; flex-direction: column; gap: 8px; }
@media (min-width: 640px) { .project-grid { flex-direction: row; flex-wrap: wrap; } }
.project-card {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: var(--radius-md);
  border: 1.5px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  cursor: pointer; font-size: 0.9375rem; font-weight: 600; color: var(--color-surface-200);
  transition: all 150ms ease; text-align: left;
  width: 100%;
}
@media (min-width: 640px) { .project-card { width: auto; min-width: 180px; } }
.project-card:hover { border-color: rgba(16,185,129,0.25); color: var(--color-surface-50); }
.project-card.selected { border-color: var(--color-primary-500); background: rgba(16,185,129,0.08); color: var(--color-primary-300); }
.project-icon { color: var(--color-surface-400); flex-shrink: 0; }
.check-icon { margin-left: auto; color: var(--color-primary-400); }

/* Rules box */
.rules-box {
  display: flex; align-items: flex-start; gap: 8px;
  background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.15);
  border-radius: var(--radius-md); padding: 10px 14px;
  font-size: 0.8125rem; color: var(--color-surface-300); margin-bottom: 16px;
}

/* Lot search */
.lot-search {
  width: 100%; padding: 9px 14px; border-radius: var(--radius-md);
  border: 1.5px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04); color: var(--color-surface-50);
  font-size: 0.875rem; margin-bottom: 12px; box-sizing: border-box;
}
.lot-search:focus { outline: none; border-color: var(--color-primary-500); }
.lot-search::placeholder { color: var(--color-surface-500); }

/* Lots grid */
.lots-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
@media (min-width: 480px) { .lots-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 768px) { .lots-grid { grid-template-columns: repeat(4, 1fr); } }

.lot-card {
  position: relative;
  background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.08);
  border-radius: var(--radius-md); padding: 12px;
  cursor: pointer; text-align: left; transition: all 150ms ease;
}
.lot-card:hover { border-color: rgba(16,185,129,0.2); }
.lot-card.selected { border-color: var(--color-primary-500); background: rgba(16,185,129,0.08); }
.lot-code { font-size: 1rem; font-weight: 700; color: var(--color-surface-50); margin-bottom: 2px; }
.lot-block { font-size: 0.75rem; color: var(--color-surface-400); margin-bottom: 4px; }
.lot-area { font-size: 0.8125rem; color: var(--color-surface-300); }
.lot-price { font-size: 0.8125rem; font-weight: 600; color: var(--color-primary-300); margin-top: 2px; }
.lot-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 6px; }
.lot-tag { font-size: 0.65rem; background: rgba(16,185,129,0.1); color: var(--color-primary-400); padding: 1px 6px; border-radius: 99px; }
.lot-check { position: absolute; top: 6px; right: 6px; width: 18px; height: 18px; border-radius: 50%; background: var(--color-primary-500); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; }

/* Form */
.form-grid {
  display: grid; grid-template-columns: 1fr; gap: 14px; margin-bottom: 24px;
}
@media (min-width: 600px) { .form-grid { grid-template-columns: 1fr 1fr; } }
.span-2 { grid-column: 1; }
@media (min-width: 600px) { .span-2 { grid-column: span 2; } }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-label { font-size: 0.875rem; font-weight: 600; color: var(--color-surface-200); }
.req { color: #f87171; }
.form-input {
  width: 100%; padding: 10px 14px; border-radius: var(--radius-md);
  border: 1.5px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04); color: var(--color-surface-50);
  font-size: 0.9375rem; box-sizing: border-box;
}
.form-input:focus { outline: none; border-color: var(--color-primary-500); box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
.form-input::placeholder { color: var(--color-surface-500); }

/* Selected lot banner */
.selected-lot-banner {
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
  background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2);
  border-radius: var(--radius-md); padding: 10px 14px;
  font-size: 0.875rem; color: var(--color-surface-300);
  margin-bottom: 20px;
}
.selected-lot-banner svg { color: var(--color-primary-400); flex-shrink: 0; }

/* Confirm grid */
.confirm-title { font-size: 1.25rem; font-weight: 700; color: var(--color-surface-50); margin: 0 0 20px; }
.confirm-grid { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
@media (min-width: 640px) {
  .confirm-grid { display: grid; grid-template-columns: 1fr 1fr; }
  .confirm-section.highlight { grid-column: span 2; }
}
.confirm-section {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
  border-radius: var(--radius-md); padding: 16px;
}
.confirm-section.highlight { background: rgba(16,185,129,0.05); border-color: rgba(16,185,129,0.15); }
.confirm-section-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-surface-400); margin-bottom: 12px; }
.confirm-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 0.875rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
.confirm-row:last-of-type { border-bottom: none; }
.confirm-row span { color: var(--color-surface-400); }
.confirm-row strong { color: var(--color-surface-100); }
.confirm-note { font-size: 0.8125rem; color: var(--color-surface-400); margin: 12px 0 0; line-height: 1.5; }

/* Step actions */
.step-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 24px; flex-wrap: wrap; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 20px; border-radius: var(--radius-md);
  font-weight: 600; font-size: 0.9375rem;
  cursor: pointer; transition: all 150ms ease; border: none;
}
.btn-primary { background: var(--color-primary-600); color: white; }
.btn-primary:hover:not(:disabled) { background: var(--color-primary-500); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { background: transparent; color: var(--color-surface-300); border: 1px solid rgba(255,255,255,0.1); }
.btn-ghost:hover { background: rgba(255,255,255,0.05); color: var(--color-surface-100); }
.btn-reserve { padding: 12px 28px; font-size: 1rem; }

/* Done panel */
.done-panel {
  background: var(--glass-bg, rgba(255,255,255,0.04));
  border: 1px solid rgba(16,185,129,0.2);
  border-radius: var(--radius-xl);
  padding: 48px 32px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
}
.done-icon { color: var(--color-primary-400); }
.done-panel h2 { font-size: 1.5rem; font-weight: 800; color: var(--color-surface-50); margin: 0; }
.done-panel p { font-size: 0.9375rem; color: var(--color-surface-300); margin: 0; line-height: 1.6; }
.done-expiry { font-size: 0.875rem; color: var(--color-surface-400); }
.done-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
</style>
