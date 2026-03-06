<template>
  <div class="modal-overlay">
    <div class="modal-content modal-md">
      <div class="modal-header">
        <h2>Configurações de Agendamento</h2>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Sincronizando configurações...</p>
        </div>
        
        <div v-else class="config-container">
          <!-- Seção: Ativação -->
          <section class="config-card toggle-card">
            <div class="card-info">
              <h3 class="card-title">Agendamentos Públicos</h3>
              <p class="card-description">Habilite a reserva de horários diretamente pelos clientes no seu portal.</p>
            </div>
            <label class="modern-toggle">
              <input v-model="config.enabled" type="checkbox">
              <span class="toggle-track"></span>
            </label>
          </section>

          <!-- Seção: Horários -->
          <section class="config-section">
            <header class="section-header">
              <h4 class="section-title">Janela de Atendimento</h4>
            </header>
            
            <div class="grid-fields duo">
              <div class="field-group">
                <label class="field-label">Início</label>
                <div class="field-wrapper">
                  <input v-model="config.startTime" type="time" class="base-input">
                </div>
              </div>
              <div class="field-group">
                <label class="field-label">Término</label>
                <div class="field-wrapper">
                  <input v-model="config.endTime" type="time" class="base-input">
                </div>
              </div>
            </div>
          </section>

          <!-- Seção: Regras -->
          <section class="config-section">
            <header class="section-header">
              <h4 class="section-title">Regras de Reserva</h4>
            </header>

            <div class="grid-fields duo">
              <div class="field-group">
                <label class="field-label">Intervalo entre Visitas</label>
                <div class="field-wrapper">
                  <select v-model="config.scheduleInterval" class="base-select">
                    <option :value="15">15 minutos</option>
                    <option :value="30">30 minutos</option>
                    <option :value="45">45 minutos</option>
                    <option :value="60">1 hora</option>
                    <option :value="90">1 hora e 30 min</option>
                    <option :value="120">2 horas</option>
                  </select>
                </div>
              </div>
              <div class="field-group">
                <label class="field-label">Atendimentos Simultâneos</label>
                <div class="field-wrapper">
                  <input v-model.number="config.maxSimultaneous" type="number" class="base-input" min="1">
                </div>
              </div>
            </div>
          </section>

          <!-- Seção: Intervalos e Pausas -->
          <section class="config-section">
            <header class="section-header">
              <h4 class="section-title">Intervalos e Pausas</h4>
            </header>

            <div class="grid-fields duo">
              <div class="field-group">
                <label class="field-label">Almoço (Início)</label>
                <div class="field-wrapper">
                  <input v-model="config.lunchStart" type="time" class="base-input">
                </div>
              </div>
              <div class="field-group">
                <label class="field-label">Almoço (Fim)</label>
                <div class="field-wrapper">
                  <input v-model="config.lunchEnd" type="time" class="base-input">
                </div>
              </div>
            </div>

            <!-- Custom Breaks -->
            <div class="custom-breaks-list" style="margin-top: 16px;">
              <header class="flex justify-between items-center mb-3">
                <span style="font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.55);">☕ Outras Pausas</span>
                <button class="btn-text-sm" @click="addBreak">+ Adicionar</button>
              </header>

              <div v-for="(b, idx) in (config.breaks || [])" :key="idx" 
                   class="break-item-row">
                <input v-model="b.name" placeholder="Motivo" class="base-input sm-input" style="flex: 2">
                <input v-model="b.start" type="time" class="base-input sm-input" style="flex: 1">
                <span style="font-size: 10px; color: rgba(255,255,255,0.5);">até</span>
                <input v-model="b.end" type="time" class="base-input sm-input" style="flex: 1">
                <button class="btn-delete-sm" @click="removeBreak(idx)">&times;</button>
              </div>
            </div>
          </section>

          <!-- Seção: Calendário -->
          <section class="config-section">
            <header class="section-header">
              <h4 class="section-title">Dias de Operação</h4>
            </header>

            <div class="days-selector">
              <label v-for="day in dayOptions" :key="day.value" class="day-input">
                <input v-model="config.availableDays" type="checkbox" :value="day.value" class="hidden-check">
                <div class="day-box">{{ day.label }}</div>
              </label>
            </div>
            <footer class="section-hint">
              Os horários serão gerados automaticamente para os dias selecionados.
            </footer>
          </section>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">Cancelar</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          <span v-if="saving" class="spinner-sm"></span>
          Salvar Configurações
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  projectId: string;
}>();

const emit = defineEmits(['close', 'updated']);
const api = useApi();
const toast = useToast();

const loading = ref(true);
const saving = ref(false);
const config = ref({
  enabled: false,
  startTime: '08:00',
  endTime: '18:00',
  scheduleInterval: 60,
  maxSimultaneous: 1,
  availableDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  lunchStart: '',
  lunchEnd: '',
  breaks: [] as any[]
});

const dayOptions = [
  { label: 'Dom', value: 'SUN' },
  { label: 'Seg', value: 'MON' },
  { label: 'Ter', value: 'TUE' },
  { label: 'Qua', value: 'WED' },
  { label: 'Qui', value: 'THU' },
  { label: 'Sex', value: 'FRI' },
  { label: 'Sáb', value: 'SAT' },
];

onMounted(async () => {
  try {
    const data = await api.get(`/scheduling/config/${props.projectId}`);
    if (data) config.value = {
      ...config.value,
      ...data,
      breaks: Array.isArray(data.breaks) ? data.breaks : []
    };
  } catch (e) {
    toast.error('Erro ao carregar configurações');
  } finally {
    loading.value = false;
  }
});

const addBreak = () => {
  if (!config.value.breaks) config.value.breaks = [];
  config.value.breaks.push({ name: '', start: '', end: '' });
}

const removeBreak = (idx: number) => {
  config.value.breaks.splice(idx, 1);
}

const save = async () => {
  saving.value = true;
  try {
    // Destructuring to remove read-only/metadata fields that backend might reject
    const { id, projectId, createdAt, updatedAt, ...updateData } = config.value as any;
    
    await api.patch(`/scheduling/config/${props.projectId}`, updateData);
    toast.success('Configurações salvas com sucesso');
    emit('updated');
    emit('close');
  } catch (e) {
    toast.error('Erro ao salvar configurações');
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
/* RESET & FOUNDATION */
.modal-content {
  background: var(--glass-bg);
  border-radius: 12px; /* Smooth but professional */
  width: 100%;
  max-width: 520px;
  box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.15), 0 18px 36px -18px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 24px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  font-size: 1.15rem;
  font-weight: 600; /* Regular semi-bold for senior UI */
  color: var(--color-surface-50);
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  transition: color 0.2s;
}

.close-btn:hover { color: var(--color-surface-100); }

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 32px; /* Uniform section spacing */
}

/* SECTIONING */
.config-container {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 0.825rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

/* CARDS */
.toggle-card {
  background: var(--glass-bg-heavy);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 24px;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-surface-50);
  margin: 0 0 4px 0;
}

.card-description {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
  line-height: 1.5;
}

/* GRID & FIELDS */
.grid-fields {
  display: grid;
  gap: 20px;
}

.grid-fields.duo { grid-template-columns: 1fr 1fr; }

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-surface-100);
}

/* INPUTS & SELECTS */
.base-input, .base-select {
  width: 100%;
  height: 44px;
  padding: 0 16px;
  background: var(--glass-bg);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font-size: 0.95rem;
  color: var(--color-surface-100);
  transition: all 0.2s ease;
  outline: none;
}

.base-input:focus, .base-select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
}

/* TOGGLE TRACK */
.modern-toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  flex-shrink: 0;
}

.modern-toggle input { opacity: 0; width: 0; height: 0; }

.toggle-track {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(255, 255, 255, 0.15);
  transition: .3s;
  border-radius: 30px;
}

.toggle-track:before {
  position: absolute;
  content: "";
  height: 20px; width: 20px;
  left: 3px; bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.4);
}

input:checked + .toggle-track { background-color: #2563eb; }
input:checked + .toggle-track:before { transform: translateX(22px); }

/* DAY PICKER */
.days-selector {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.day-input { flex: 1; cursor: pointer; }

.hidden-check {
  display: none;
}

.day-box {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.55);
  transition: all 0.2s;
}

.day-input:hover .day-box { border-color: rgba(255, 255, 255, 0.5); }

.hidden-check:checked + .day-box {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
  font-weight: 600;
}

.section-hint {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 4px;
}

.break-item-row {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  background: var(--glass-bg-heavy) !important;
  padding: 8px !important;
  border-radius: 8px !important;
  margin-bottom: 8px !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.sm-input {
  height: 32px !important;
  font-size: 0.8rem !important;
  padding: 0 8px !important;
}

.btn-text-sm {
  background: none !important;
  border: none !important;
  color: #2563eb !important;
  font-size: 0.75rem !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  padding: 0 !important;
}

.btn-delete-sm {
  background: none !important;
  border: none !important;
  color: #ef4444 !important;
  font-size: 1.2rem !important;
  cursor: pointer !important;
  padding: 0 4px !important;
  line-height: 1 !important;
}

/* FOOTER */
.modal-footer {
  padding: 20px 32px;
  background: var(--glass-bg);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  height: 42px;
  padding: 0 24px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-secondary {
  background: var(--glass-bg);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: var(--color-surface-100);
}

.btn-secondary:hover { background: var(--glass-bg-heavy); }

.btn-primary {
  background: #1a1a1a; /* Professional dark primary */
  color: white;
}

.btn-primary:hover { background: #000; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* LOADING */
.loading-state {
  padding: 40px;
  text-align: center;
  color: rgba(255, 255, 255, 0.55);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--glass-border-subtle);
  border-top: 3px solid #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>
