<template>
  <div class="calendar-page p-10">
    <div class="page-header d-flex justify-content-between align-items-center mb-10">
      <div>
        <h1 class="lotio-title gradient-text">Agenda</h1>
        <p class="text-secondary font-medium mt-1">Gerencie visitas e monitoramento de leads com precisão.</p>
      </div>
      <div class="d-flex gap-3">
        <button class="btn btn-glass" :disabled="!canWriteScheduling || !filters.projectId" :title="!canWriteScheduling ? writePermissionHint : undefined" @click="showConfig = true">
          <i class="pi pi-sliders-h"></i>
          <span>Regras</span>
        </button>
        <button class="btn btn-lotio-primary shadow-lotio" :disabled="!canWriteScheduling" :title="!canWriteScheduling ? writePermissionHint : undefined" @click="openCreateModal(null)">
          <i class="pi pi-plus"></i>
          <span>Novo Agendamento</span>
        </button>
      </div>
    </div>

    <!-- Enhanced Filter Bar -->
    <div class="lotio-filter-bar shadow-lotio-lg mb-12">
      <div class="filter-item">
        <label>Empreendimento</label>
        <div class="lotio-select-wrapper">
          <select v-model="filters.projectId" class="lotio-select-modern" @change="loadSchedulings">
            <option value="">Todos os projetos ativos</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <i class="pi pi-chevron-down"></i>
        </div>
      </div>
      <div class="filter-separator"></div>
      <div class="filter-item">
        <label>Filtrar Status</label>
        <div class="lotio-select-wrapper">
          <select v-model="filters.status" class="lotio-select-modern" @change="loadSchedulings">
            <option value="">Qualquer status</option>
            <option value="PENDING">Pendentes</option>
            <option value="CONFIRMED">Confirmados</option>
            <option value="CANCELLED">Cancelados</option>
            <option value="COMPLETED">Concluídos</option>
          </select>
          <i class="pi pi-chevron-down"></i>
        </div>
      </div>
      <div class="ms-auto d-flex align-items-center gap-6">
        <div class="calendar-nav-group">
          <button class="nav-btn-round" @click="prevMonth"><i class="pi pi-chevron-left"></i></button>
          <span class="current-month-display">{{ currentMonthName }}</span>
          <button class="nav-btn-round" @click="nextMonth"><i class="pi pi-chevron-right"></i></button>
        </div>
        <button class="btn btn-pill-today" @click="goToToday">Hoje</button>
      </div>
    </div>

    <div v-if="loading && schedulings.length === 0" class="lotio-loading-wrapper">
       <div class="lotio-spinner-bounce">
         <div class="bounce1"></div>
         <div class="bounce2"></div>
         <div class="bounce3"></div>
       </div>
    </div>

    <!-- Calendar Card with Depth -->
    <div v-else class="lotio-calendar-container shadow-lotio-xl mb-12">
      <div class="calendar-header-grid">
        <div v-for="day in weekDays" :key="day" class="weekday-label">{{ day }}</div>
      </div>
      
      <div class="calendar-main-grid">
        <div 
          v-for="(date, idx) in calendarDays" 
          :key="idx" 
          class="calendar-cell"
          :class="{ 
            'is-other-month': !isSameMonth(date, currentViewDate),
            'is-today': isToday(date),
            'is-selected': selectedDay && isSameDay(date, selectedDay),
            'has-activity': getDayEvents(date).length > 0
          }"
          @click="selectDate(date)"
        >
          <div class="cell-header">
            <span class="cell-number">{{ date.getDate() }}</span>
          </div>
          <div class="cell-content">
            <div 
              v-for="event in getDayEvents(date).slice(0, 3)" 
              :key="event.id" 
              class="event-mini-tag"
              :class="event.status.toLowerCase()"
            >
              <span class="status-dot"></span>
              <span class="event-time">{{ formatTime(event.scheduledAt) }}</span>
              <span class="event-name">{{ event.lead?.name || 'Manual' }}</span>
            </div>
            <div v-if="getDayEvents(date).length > 3" class="event-more-count">
              + {{ getDayEvents(date).length - 3 }} atividades
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modern Sidebar Panel -->
    <Transition name="panel-slide">
       <div v-if="selectedDay" class="glass-sidebar shadow-lotio-xl">
          <div class="sidebar-top">
             <div class="d-flex justify-content-between align-items-center">
                <div class="date-badge-large">
                  <div class="month-name">{{ getMonthShort(selectedDay) }}</div>
                  <div class="day-number">{{ selectedDay.getDate() }}</div>
                </div>
                <div class="flex-1 ms-4">
                  <h3 class="sidebar-day-name">{{ getDayLong(selectedDay) }}</h3>
                  <p class="sidebar-subtitle">{{ getDayEvents(selectedDay).length }} compromissos agendados</p>
                </div>
                <button class="btn-close-circle" @click="selectedDay = null">
                  <i class="pi pi-times"></i>
                </button>
             </div>
          </div>

          <div class="sidebar-body">
             <div v-if="getDayEvents(selectedDay).length === 0" class="empty-schedule">
                <div class="empty-artwork"><i class="bi bi-calendar-event-fill" aria-hidden="true"></i></div>
                <h4>Agenda Livre</h4>
                <p>Nenhum compromisso marcado para este dia.</p>
                <button class="btn btn-lotio-primary mt-4 w-full" :disabled="!canWriteScheduling" :title="!canWriteScheduling ? writePermissionHint : undefined" @click="openCreateModal(selectedDay)">
                  <i class="pi pi-plus me-2"></i> Criar Agendamento
                </button>
             </div>
             
             <div v-else class="agenda-timeline">
                <div v-for="event in getDayEvents(selectedDay)" :key="event.id" class="agenda-item-card">
                   <div class="agenda-time">{{ formatTime(event.scheduledAt) }}</div>
                   <div class="agenda-content">
                      <div class="d-flex justify-content-between align-items-start">
                         <h4 class="agenda-title">{{ event.lead?.name || 'Agendamento Manual' }}</h4>
                         <span class="agenda-status-label" :class="event.status.toLowerCase()">
                           {{ translateStatus(event.status) }}
                         </span>
                      </div>
                      <div class="agenda-meta">
                         <i class="pi pi-building"></i> {{ event.project?.name }}
                      </div>
                      
                      <div v-if="event.lead" class="agenda-contact-box">
                         <a v-if="event.lead.phone" :href="'tel:' + event.lead.phone" class="contact-link">
                           <i class="pi pi-whatsapp"></i> {{ event.lead.phone }}
                         </a>
                         <span v-if="event.lead.email" class="contact-link">
                           <i class="pi pi-envelope"></i> {{ event.lead.email }}
                         </span>
                      </div>

                      <div v-if="event.user" class="agenda-broker">
                         Corretor: {{ event.user.name }}
                      </div>
                      
                      <div class="agenda-actions">
                         <button v-if="event.status === 'PENDING'" class="btn-action-confirmed" :disabled="!canWriteScheduling" :title="!canWriteScheduling ? writePermissionHint : undefined" @click="updateStatus(event.id, 'CONFIRMED')">
                           Confirmar
                         </button>
                         <button v-if="['PENDING', 'CONFIRMED'].includes(event.status)" class="btn-action-danger" :disabled="!canWriteScheduling" :title="!canWriteScheduling ? writePermissionHint : undefined" @click="updateStatus(event.id, 'CANCELLED')">
                           Cancelar
                         </button>
                         <button class="btn-action-icon" :disabled="!canWriteScheduling" :title="!canWriteScheduling ? writePermissionHint : undefined" @click="deleteScheduling(event.id)">
                            <i class="pi pi-trash"></i>
                         </button>
                      </div>
                   </div>
                </div>
                <button class="btn btn-lotio-soft w-full mt-6 py-3" :disabled="!canWriteScheduling" :title="!canWriteScheduling ? writePermissionHint : undefined" @click="openCreateModal(selectedDay)">
                  <i class="pi pi-plus me-2"></i> Novo compromisso
                </button>
             </div>
          </div>
       </div>
    </Transition>

    <PainelSchedulingConfigModal 
      v-if="showConfig && filters.projectId" 
      :projectId="filters.projectId" 
      @close="showConfig = false" 
    />
    <PainelSchedulingModal 
      v-if="showCreate" 
      :initialDate="targetDate || undefined"
      @close="showCreate = false" 
      @success="loadSchedulings" 
    />
  </div>
</template>

<script setup lang="ts">
import { formatTimeToBrasilia, formatDateToBrasilia, getISODateInBrasilia } from '~/utils/date'

const api = useApi();
const toast = useToast();
const authStore = useAuthStore();
const canWriteScheduling = computed(() => {
  if (authStore.isLoteadora || authStore.isSysAdmin) {
    return authStore.canWriteFeature('scheduling');
  }
  return true;
});
const writePermissionHint = 'Disponível apenas para usuários com permissão de edição';
const canLoadProjectsCatalog = computed(() => {
  return !authStore.isLoteadora || !authStore.hasPanelRestrictions || authStore.canReadFeature('projects');
});

const loading = ref(true);
type ProjectOption = {
  id: string;
  name: string;
};

type SchedulingItem = {
  id: string;
  scheduledAt: string;
  status: string;
  lead?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  project?: {
    name?: string | null;
  } | null;
  user?: {
    name?: string | null;
  } | null;
};

const projects = ref<ProjectOption[]>([]);
const schedulings = ref<any[]>([]);
const showConfig = ref(false);
const showCreate = ref(false);
const selectedDay = ref<Date | null>(null);
const targetDate = ref<string | null>(null);

const currentViewDate = ref(new Date());
const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const filters = ref({
  projectId: '',
  status: ''
});

onMounted(async () => {
    try {
        if (canLoadProjectsCatalog.value) {
          const res = await api.get('/projects');
          projects.value = Array.isArray(res) ? res : (res.data || []);
        } else {
          projects.value = [];
        }
        
        // Load all initially or let filters decide
        await loadSchedulings();
    } catch (e) {
        toast.error('Erro ao inicializar página');
    } finally {
        loading.value = false;
    }
});

const loadSchedulings = async () => {
   loading.value = true;
   try {
       const url = filters.value.projectId ? `/scheduling?projectId=${filters.value.projectId}` : '/scheduling';
       const res = await api.get(url);
       let data = Array.isArray(res) ? res : (res.data || []);
       
       if (filters.value.status) {
         schedulings.value = data.filter((s: SchedulingItem) => s.status === filters.value.status);
       } else {
          schedulings.value = data;
       }
   } catch (e) {
       toast.error('Erro ao buscar agendamentos');
   } finally {
       loading.value = false;
   }
}

// Calendar Logic
const currentMonthName = computed(() => {
   return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentViewDate.value);
});

const getMonthShort = (date: Date) => new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '');
const getDayLong = (date: Date) => new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);

const calendarDays = computed(() => {
   const year = currentViewDate.value.getFullYear();
   const month = currentViewDate.value.getMonth();
   const firstDayOfMonth = new Date(year, month, 1);
   const days = [];
   
   const startOffset = firstDayOfMonth.getDay();
   const date = new Date(year, month, 1 - startOffset);

   for (let i = 0; i < 42; i++) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
   }
   return days;
});

const isSameMonth = (d1: Date, d2: Date) => d1.getMonth() === d2.getMonth();
const isSameDay = (d1: Date, d2: Date) => {
   return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
}
const isToday = (d: Date) => isSameDay(d, new Date());

const getDayEvents = (date: Date) => {
   return schedulings.value.filter(s => {
      // Comparison in YYYY-MM-DD format (forced to Brasilia time for both)
      const sDay = getISODateInBrasilia(s.scheduledAt);
      const calendarDay = getISODateInBrasilia(date);
      return sDay === calendarDay;
   });
}

const nextMonth = () => { currentViewDate.value = new Date(currentViewDate.value.getFullYear(), currentViewDate.value.getMonth() + 1, 1); }
const prevMonth = () => { currentViewDate.value = new Date(currentViewDate.value.getFullYear(), currentViewDate.value.getMonth() - 1, 1); }
const goToToday = () => { currentViewDate.value = new Date(); selectedDay.value = new Date(); }

const selectDate = (date: Date) => { selectedDay.value = date; }

const openCreateModal = (date: Date | null) => {
   const d = date || new Date();
   const year = d.getFullYear();
   const month = (d.getMonth() + 1).toString().padStart(2, '0');
   const day = d.getDate().toString().padStart(2, '0');
   targetDate.value = `${year}-${month}-${day}T08:00`;
   showCreate.value = true;
}

const formatTime = (dateStr: string) => {
   return formatTimeToBrasilia(dateStr);
}

const translateStatus = (status: string) => {
  const map: Record<string, string> = { PENDING: 'Pendente', CONFIRMED: 'Confirmado', CANCELLED: 'Cancelado', COMPLETED: 'Concluído' };
  return map[status] || status;
}

const updateStatus = async (id: string, status: string) => {
    try {
       await api.patch(`/scheduling/${id}/status`, { status });
       toast.success('Status atualizado');
       await loadSchedulings();
    } catch (e) {
       toast.error('Erro ao atualizar status');
    }
}

const deleteScheduling = async (id: string) => {
   if (!confirm('Deseja realmente remover este agendamento?')) return;
    try {
       await api.delete(`/scheduling/${id}`);
       toast.success('Agendamento removido');
       await loadSchedulings();
    } catch (e) {
       toast.error('Erro ao remover agendamento');
    }
}
</script>

<style scoped>
.gradient-text {
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.font-medium { font-weight: 500; }

/* Filter Bar Optimization */
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
   box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
   margin-bottom: 8px;
}

.lotio-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 200px;
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

/* Fix for Select Options contrast */
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

.filter-separator { width: 1px; height: 35px; background: var(--glass-border); }

.calendar-nav-group {
   display: flex;
   align-items: center;
   background: var(--glass-bg-heavy);
   padding: 4px;
   border-radius: 12px;
   gap: 8px;
}

.nav-btn-round {
   width: 32px;
   height: 32px;
   border-radius: 9px;
   border: none;
   background: var(--glass-bg);
   color: var(--color-surface-200);
   display: flex;
   align-items: center;
   justify-content: center;
   cursor: pointer;
   box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
   transition: transform 0.1s, background 0.15s;
}
.nav-btn-round:hover { background: var(--glass-bg-hover); }
.nav-btn-round:active { transform: scale(0.95); }

.current-month-display {
   font-weight: 700;
   font-size: 0.95rem;
   color: var(--color-surface-50);
   min-width: 150px;
   text-align: center;
   text-transform: capitalize;
}

.btn-pill-today {
   background: var(--color-primary-600);
   color: white;
   border: none;
   border-radius: 20px;
   padding: 8px 18px;
   font-weight: 700;
   font-size: 0.85rem;
   cursor: pointer;
   transition: background 0.15s;
}
.btn-pill-today:hover { background: var(--color-primary-500); }

/* Calendar Container */
.lotio-calendar-container {
   background: var(--glass-bg);
   backdrop-filter: blur(16px);
   -webkit-backdrop-filter: blur(16px);
   border-radius: 32px;
   overflow: hidden;
   border: 1px solid var(--glass-border);
}

.calendar-header-grid {
   display: grid;
   grid-template-columns: repeat(7, 1fr);
   background: var(--glass-bg-heavy);
   border-bottom: 1px solid var(--glass-border);
}

.weekday-label {
   padding: 14px;
   text-align: center;
   font-size: 0.7rem;
   font-weight: 800;
   color: var(--color-surface-400);
   text-transform: uppercase;
   letter-spacing: 0.05em;
}

.calendar-main-grid {
   display: grid;
   grid-template-columns: repeat(7, 1fr);
}

.calendar-cell {
   min-height: 140px;
   padding: 16px;
   border-right: 1px solid var(--glass-border-subtle);
   border-bottom: 1px solid var(--glass-border-subtle);
   cursor: pointer;
   transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
   background: var(--glass-bg);
}

.calendar-cell:hover:not(.is-other-month) { 
   background: var(--glass-bg-heavy);
   z-index: 2;
   box-shadow: inset 0 0 0 2px var(--color-primary-500);
}

.calendar-cell.is-selected { background: var(--glass-bg-heavy); box-shadow: inset 0 0 0 2px var(--color-primary-500); }

.cell-number { font-weight: 700; font-size: 1rem; color: var(--color-surface-50); }

.is-other-month { opacity: 0.15; cursor: default; }

.is-today .cell-number {
   background: var(--color-primary-500);
   color: white;
   width: 28px;
   height: 28px;
   display: flex;
   align-items: center;
   justify-content: center;
   border-radius: 8px;
}

.cell-content { margin-top: 12px; display: flex; flex-direction: column; gap: 4px; }

.event-mini-tag {
   font-size: 0.7rem;
   padding: 5px 10px;
   border-radius: 8px;
   font-weight: 700;
   display: flex;
   align-items: center;
   gap: 6px;
   max-width: 100%;
}

.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.event-mini-tag.pending { background: rgba(255, 149, 0, 0.15); color: #FFB340; }
.event-mini-tag.confirmed { background: rgba(52, 199, 89, 0.15); color: #34d399; }
.event-mini-tag.cancelled { background: rgba(255, 59, 48, 0.15); color: #f87171; text-decoration: line-through; opacity: 0.7; }

.event-more-count {
   font-size: 0.65rem;
   font-weight: 800;
   color: var(--color-primary-400);
   margin-top: 4px;
   padding-left: 10px;
}

/* Sidebar Panel */
.glass-sidebar {
   position: fixed;
   top: 0;
   right: 0;
   bottom: 0;
   width: 400px;
   background: var(--glass-bg-heavy);
   backdrop-filter: blur(24px);
   -webkit-backdrop-filter: blur(24px);
   z-index: 1000;
   box-shadow: -10px 0 40px rgba(0, 0, 0, 0.4);
   padding: 40px 30px;
   border-left: 1px solid var(--glass-border);
   display: flex;
   flex-direction: column;
}

.date-badge-large {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.month-name { font-weight: 700; color: var(--color-primary-400); font-size: 0.9rem; text-transform: uppercase; }
.date-badge-large .day-number { font-size: 2.5rem; font-weight: 800; color: var(--color-surface-50); line-height: 1; }

.sidebar-day-name { font-weight: 800; font-size: 1.6rem; text-transform: capitalize; color: var(--color-surface-50); margin-top: 4px; }
.sidebar-subtitle { font-size: 0.9rem; color: var(--color-surface-400); font-weight: 500; }

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  margin-top: 30px;
  padding-right: 15px;
  padding-bottom: 20px;
}

.sidebar-body::-webkit-scrollbar {
  width: 4px;
}

.sidebar-body::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.sidebar-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

.agenda-timeline {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.agenda-item-card {
  display: flex;
  flex-direction: column;
}

.agenda-time { 
  font-weight: 700; 
  font-size: 0.85rem; 
  color: var(--color-primary-400); 
  margin-bottom: 10px;
}

.agenda-content {
  background: var(--glass-bg);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid var(--glass-border-subtle);
}

.agenda-title { font-size: 1.1rem; font-weight: 700; color: var(--color-surface-50); margin-bottom: 2px; }

.agenda-status-label { 
  font-size: 0.7rem; 
  font-weight: 700; 
  padding: 4px 10px; 
  border-radius: 6px; 
  text-transform: uppercase;
}
.agenda-status-label.confirmed { color: #34d399; background: rgba(52, 211, 153, 0.15); }
.agenda-status-label.pending { color: #FFB340; background: rgba(255, 149, 0, 0.15); }
.agenda-status-label.cancelled { color: #f87171; background: rgba(255, 59, 48, 0.15); }

.agenda-meta { 
  font-weight: 500; 
  color: var(--color-surface-400); 
  font-size: 0.85rem; 
  margin-bottom: 15px;
}

.agenda-contact-box { 
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid var(--glass-border-subtle);
  padding-top: 15px;
}

.contact-link { 
  color: var(--color-surface-50); 
  font-size: 0.85rem; 
  font-weight: 600; 
  display: flex;
  align-items: center;
  text-decoration: none;
}
.contact-link i { color: var(--color-surface-400); width: 24px; font-size: 0.9rem; }

.agenda-broker {
  font-weight: 500;
  color: var(--color-surface-400);
  font-size: 0.8rem;
  margin-top: 10px;
}

/* Actions */
.agenda-actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}

.btn-action-confirmed {
  flex: 1;
  background: var(--color-primary-500);
  color: white;
  border: none;
  padding: 10px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-action-confirmed:hover { background: var(--color-primary-600); }

.btn-action-danger { 
  background: rgba(255, 59, 48, 0.12); 
  color: #f87171; 
  border: none;
  padding: 10px 15px; 
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-action-danger:hover { background: rgba(255, 59, 48, 0.2); }

.btn-action-icon { 
  width: 38px; 
  height: 38px; 
  border-radius: 8px; 
  background: transparent; 
  border: 1px solid var(--glass-border-subtle);
  color: var(--color-surface-400);
  cursor: pointer;
  transition: background 0.15s;
}
.btn-action-icon:hover { background: var(--glass-bg-hover); }

/* Custom Utilities */
.shadow-lotio { box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2); }
.shadow-lotio-lg { box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3); }
.shadow-lotio-xl { box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4); }

.btn-glass {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  padding: 10px 20px;
  font-weight: 700;
  color: var(--color-surface-100);
  cursor: pointer;
  transition: background 0.15s;
}
.btn-glass:hover { background: var(--glass-bg-hover); }

.btn-close-circle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--glass-bg-heavy);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-surface-400);
  cursor: pointer;
  transition: background 0.15s;
}
.btn-close-circle:hover { background: var(--glass-bg-hover); color: var(--color-surface-200); }

.empty-schedule { text-align: center; padding: 40px 20px; }
.empty-artwork { font-size: 3rem; margin-bottom: 16px; }
.empty-schedule h4 { color: var(--color-surface-100); font-weight: 700; margin-bottom: 8px; }
.empty-schedule p { color: var(--color-surface-400); font-size: 0.9rem; }

.sidebar-top { padding-bottom: 24px; border-bottom: 1px solid var(--glass-border-subtle); }

/* Animations */
.panel-slide-enter-active, .panel-slide-leave-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.panel-slide-enter-from, .panel-slide-leave-to { transform: translateX(100px); opacity: 0; }

.lotio-loading-wrapper { display: flex; justify-content: center; padding: 60px 0; }

.lotio-spinner-bounce {
  width: 70px;
  text-align: center;
}
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

@media (max-width: 767px) {
  .calendar-page { padding: 16px !important; }
  .lotio-filter-bar { flex-direction: column; gap: 8px; }
  .lotio-filter-bar > * { width: 100%; }
  .lotio-calendar-container { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .calendar-header-grid, .calendar-main-grid { min-width: 560px; }
  .calendar-cell { min-height: 72px; }
  .glass-sidebar {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: 70vh;
    border-left: none;
    border-top: 1px solid var(--glass-border);
    border-radius: 16px 16px 0 0;
    padding: 20px 16px;
    box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.5);
  }
  .agenda-timeline { overflow-y: auto; flex: 1; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
}
</style>


