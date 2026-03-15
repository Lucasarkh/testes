<template>
  <div class="scheduling-container">
    <div v-if="!config?.enabled" class="scheduling-disabled">
       <div class="disabled-icon-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
       </div>
       <p class="disabled-text">Agendamentos online não estão disponíveis para este projeto no momento.</p>
       <a href="#contato" class="v4-btn-submit-modern" style="display: inline-block; text-decoration: none;">Fale com um consultor</a>
    </div>

    <div v-else-if="success" class="scheduling-success animate-in">
       <div class="success-icon-wrapper">
          <div class="success-circle"></div>
          <svg class="success-checkmark" viewBox="0 0 52 52">
             <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
             <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
          </svg>
       </div>
       <h3>Agendamento Solicitado!</h3>
       <p class="success-details">
         Sua visita para <strong>{{ formatDate(form.scheduledAt) }}</strong> às <strong>{{ formatTime(form.scheduledAt) }}</strong> foi recebida com sucesso.
       </p>
       <p class="success-next-steps">Um consultor exclusivo entrará em contato em breve via WhatsApp para confirmar os detalhes.</p>
       
       <button class="v4-btn-secondary mt-8" @click="success = false; resetForm()">
          Fazer outro agendamento
       </button>
    </div>

    <form v-else class="scheduling-form" @submit.prevent="submit">
       <div class="form-section">
          <h4 class="form-section-title">Escolha uma data e horário</h4>
          <div class="form-grid">
             <div class="form-group">
                <label class="form-label">Data da Visita</label>
                <input v-model="selectedDate" type="date" class="v4-input" :min="minDate" required @change="onDateChange">
             </div>
             <div class="form-group">
                <label class="form-label">Horário Disponível</label>
                <select v-model="selectedTime" class="v4-select" required :disabled="!availableSlots.length">
                   <option value="">Selecione...</option>
                   <option v-for="slot in availableSlots" :key="slot" :value="slot">{{ slot }}</option>
                </select>
                <p v-if="selectedDate && !availableSlots.length" class="text-error mt-1">Nenhum horário disponível.</p>
             </div>
          </div>
       </div>

       <div class="form-section mt-8">
          <h4 class="form-section-title">Seus dados de contato</h4>
          <div class="form-group mb-4">
             <input v-model="form.leadName" type="text" placeholder="Nome Completo" class="v4-input" required>
          </div>
          <div class="form-grid">
             <div class="form-group">
                <input v-model="form.leadEmail" type="email" placeholder="E-mail" class="v4-input" required>
             </div>
             <div class="form-group">
                <input :value="form.leadPhone" @input="onLeadPhoneInput" type="text" placeholder="WhatsApp" class="v4-input" required>
             </div>
          </div>
       </div>

       <div class="form-actions">
          <button type="submit" class="v4-btn-submit" :disabled="loading">
             <span v-if="loading" class="spinner-sm"></span>
             {{ loading ? 'Enviando...' : 'Solicitar Agendamento' }}
          </button>
          <p class="form-privacy">Ao agendar, nossos consultores entrarão em contato.</p>
       </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { formatTimeToBrasilia, getTodayInBrasilia } from '~/utils/date'

const props = defineProps<{
  projectSlug: string;
}>();

const api = usePublicApi();
const toast = useToast();
const route = useRoute();

const loading = ref(false);
const success = ref(false);
const config = ref<any>(null);
const availableSlots = ref<string[]>([]);
const selectedDate = ref('');
const selectedTime = ref('');

const form = ref({
  leadName: '',
  leadEmail: '',
  leadPhone: '',
  scheduledAt: '',
});

const applyPhoneMask = (value: string) => value.replace(/\D/g, '').slice(0, 11)
  .replace(/(\d{2})(\d)/, '($1) $2')
  .replace(/(\d{5})(\d)/, '$1-$2')

const getInputValue = (event: Event) => (event.target as HTMLInputElement | null)?.value ?? ''

const onLeadPhoneInput = (event: Event) => {
  form.value.leadPhone = applyPhoneMask(getInputValue(event))
}

const minDate = getTodayInBrasilia();

onMounted(async () => {
  try {
     config.value = await api.get(`/p/${props.projectSlug}/scheduling/config`);
  } catch (e) {
     console.error('Scheduling config not found');
  }
});

const onDateChange = async () => {
    if (!selectedDate.value || !config.value) return;
    
    // Day of week check (force local time for consistency with input)
    const [year, month, day] = selectedDate.value.split('-').map(Number);
  if (!year || !month || !day) {
    availableSlots.value = [];
    return;
  }
    const date = new Date(year, month - 1, day);
    const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()];
    
    if (!config.value.availableDays?.includes(dayOfWeek)) {
        availableSlots.value = [];
        return;
    }

    // Generate slots based on startTime, endTime and interval
    const slots = [];
    const [startH, startM] = config.value.startTime.split(':').map(Number);
    const [endH, endM] = config.value.endTime.split(':').map(Number);
    const interval = config.value.scheduleInterval || 60;

    let current = new Date(year, month - 1, day, startH, startM, 0, 0);
    const endLimit = new Date(year, month - 1, day, endH, endM, 0, 0);

    while (current < endLimit) {
        const h = current.getHours();
        const m = current.getMinutes();
        const timeStr = h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
        
        // Skip lunch break
        const isLunch = config.value.lunchStart && config.value.lunchEnd && 
                        timeStr >= config.value.lunchStart && timeStr < config.value.lunchEnd;
        
        // Skip custom breaks
        const isBreak = config.value.breaks?.some((b: any) => timeStr >= b.start && timeStr < b.end);

        if (!isLunch && !isBreak) {
            slots.push(timeStr);
        }
        
        current = new Date(current.getTime() + interval * 60000);
    }
    
    loading.value = true;
    try {
        // Fetch busy slots from public API
        const busySlots = await api.get(`/p/${props.projectSlug}/scheduling/get-busy-slots/${selectedDate.value}`);
        availableSlots.value = slots.filter(time => !busySlots.includes(time));
    } catch (e) {
        console.error('Failed to fetch busy slots');
        availableSlots.value = slots; 
    } finally {
        loading.value = false;
    }
    
    selectedTime.value = '';
}

const submit = async () => {
    if (!selectedDate.value || !selectedTime.value || !config.value?.projectId) return;
    
    loading.value = true;
    try {
        // Send as ISO string but with a explicit -03:00 to avoid remanejamento/wrong UTC conversion
        // If they pick 10:00, we send 2026-02-27T10:00:00-03:00
        const scheduledAt = `${selectedDate.value}T${selectedTime.value}:00-03:00`;
        
        form.value.scheduledAt = scheduledAt;
        
        // Pass the projectId required by the DTO and realtorCode from URL if available
        const payload = {
          ...form.value,
          projectId: config.value.projectId,
          realtorCode: (route.query.c as string) || undefined
        }
        
        await api.post(`/p/${props.projectSlug}/scheduling`, payload);
        success.value = true;
    } catch (e: any) {
        toast.error(e.message || 'Erro ao realizar agendamento');
    } finally {
        loading.value = false;
    }
}

const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(dateStr));
}

const formatTime = (dateStr: string) => {
  const [, timePart] = dateStr.split('T');
  return timePart ? timePart.substring(0, 5) : '';
}

const resetForm = () => {
    form.value = { leadName: '', leadEmail: '', leadPhone: '', scheduledAt: '' };
    selectedDate.value = '';
    selectedTime.value = '';
}
</script>

<style scoped>
.scheduling-container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  border: 1px solid #d2d2d7;
  box-shadow: 0 20px 40px rgba(0,0,0,0.04);
}

.form-section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 576px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #86868b;
  margin-bottom: 8px;
}

.v4-input, .v4-select {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #d2d2d7;
  background: #fafafa;
  font-size: 17px;
  color: #1d1d1f;
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.v4-input:focus, .v4-select:focus {
  border-color: #0071e3;
  background: white;
}

.v4-btn-submit {
  width: 100%;
  background: #0071e3;
  color: white;
  font-weight: 600;
  padding: 16px;
  border-radius: 12px;
  border: none;
  font-size: 17px;
  cursor: pointer;
  transition: background 0.2s;
}

.v4-btn-submit:hover {
  background: #0077ed;
}

.v4-btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.v4-btn-secondary {
  background: #f5f5f7;
  color: #1d1d1f;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 100px;
  border: none;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 24px;
}

.v4-btn-secondary:hover {
  background: #e8e8ed;
  transform: translateY(-1px);
}

.form-privacy {
  text-align: center;
  font-size: 13px;
  color: #86868b;
  margin-top: 20px;
}

.text-error {
  color: #df1125;
  font-size: 12px;
}

/* Success State Animations */
.scheduling-success {
  text-align: center;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.scheduling-success h3 {
  font-size: 24px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 24px 0 12px;
}

.success-details {
  font-size: 17px;
  color: #1d1d1f;
  line-height: 1.5;
  margin-bottom: 8px;
}

.success-next-steps {
  font-size: 14px;
  color: #86868b;
}

.success-icon-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto;
}

.success-checkmark {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: block;
  stroke-width: 2;
  stroke: #28a745;
  stroke-miterlimit: 10;
  box-shadow: inset 0px 0px 0px #28a745;
  animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
}

.checkmark-circle {
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  stroke-width: 2;
  stroke-miterlimit: 10;
  stroke: #28a745;
  fill: none;
  animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}

.checkmark-check {
  transform-origin: 50% 50%;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
}

@keyframes stroke {
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes scale {
  0%, 100% {
    transform: none;
  }
  50% {
    transform: scale3d(1.1, 1.1, 1);
  }
}

@keyframes fill {
  100% {
    box-shadow: inset 0px 0px 0px 40px #28a74510;
  }
}

.animate-in {
  animation: fadeInDown 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mt-8 { margin-top: 32px; }

/* Disabled State */
.scheduling-disabled {
  text-align: center;
  padding: 40px 0;
}

.disabled-icon-wrapper {
  width: 60px;
  height: 60px;
  background: #f5f5f7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  color: #86868b;
}

.disabled-icon-wrapper svg {
  width: 32px;
  height: 32px;
}

.disabled-text {
  font-size: 17px;
  color: #1d1d1f;
  margin-bottom: 32px;
  line-height: 1.5;
}

.v4-btn-submit-modern {
  background: #0071e3;
  color: white;
  font-weight: 600;
  padding: 16px 32px;
  border-radius: 12px;
  border: none;
  font-size: 17px;
  cursor: pointer;
  transition: all 0.2s;
}

.v4-btn-submit-modern:hover {
  background: #0077ed;
  transform: translateY(-1px);
}
</style>
