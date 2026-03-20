<template>
  <section
    class="v4-section"
    id="agendamento"
    :style="{ ...sectionStyle, background: '#1d1d1f', color: 'white' }"
  >
    <div class="v4-container">
      <div class="v4-schedule-row">
        <div class="v4-schedule-info">
          <h2 class="v4-section-title" style="color: white;">Ficou interessado?<br>Venha conhecer de perto.</h2>
          <p class="v4-section-subtitle" style="color: #a1a1a6; max-width: 480px;">Nada supera a sensação de estar no local onde será construído o seu futuro. Agende uma visita guiada com nossos especialistas.</p>

          <div class="v4-perks">
            <div class="v4-perk-item">
              <div class="v4-perk-content">
                <strong style="color: white;">Atendimento VIP</strong>
                <p style="color: #86868b;">Horário exclusivo reservado para você tirar todas as dúvidas sem pressa.</p>
              </div>
            </div>
            <div class="v4-perk-item" style="margin-top: 24px;">
              <div class="v4-perk-content">
                <strong style="color: white;">Consultoria Especializada</strong>
                <p style="color: #86868b;">Nossos consultores conhecem cada detalhe técnico do empreendimento.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="v4-schedule-cta" style="flex: 0 0 auto; text-align: center;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 50px; border-radius: 40px; backdrop-filter: blur(20px);">
            <div style="font-size: 40px; margin-bottom: 24px;"><i class="bi bi-calendar-event-fill" aria-hidden="true"></i></div>
            <h3>Agendar agora</h3>
            <p style="color: #86868b; margin-bottom: 32px; font-size: 15px;">Escolha o dia e horário de sua preferência.</p>
            <button @click="showSchedulingModal = true" class="v4-btn-primary" style="padding: 16px 40px; font-size: 17px; background: white; color: black;">
              Ver disponibilidade
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Modal de Agendamento (Overlay) -->
  <div v-if="showSchedulingModal" class="v4-modal-overlay">
    <div class="v4-modal-content" style="max-width: 600px; position: relative;">
      <button @click="showSchedulingModal = false" class="v4-modal-close">&times;</button>
      <LandingPublicSchedulingForm :project-slug="project.slug" @success="showSchedulingModal = false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTracking } from '~/composables/useTracking'

const props = defineProps<{
  project: any
  schedulingConfig: any
  sectionStyle: Record<string, string>
}>()

const tracking = useTracking()

const showSchedulingModal = ref(false)
</script>

<style scoped>
/* Agendamento Section Styles */
.v4-schedule-row {
  display: flex;
  align-items: center;
  margin-top: 40px;
  justify-content: space-between;
  gap: 80px;
  padding: 60px 0;
}

@media (max-width: 992px) {
  .v4-schedule-row {
    flex-direction: column;
    text-align: center;
    gap: 32px;
    padding: 0;
  }
}

.v4-schedule-info {
  flex: 1;
}

.v4-schedule-card {
  flex: 1;
  width: 100%;
  max-width: 500px;
}

.v4-perks {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 48px;
  border-left: 2px solid #333;
  padding-left: 32px;
}

@media (max-width: 992px) {
  .v4-perks {
    border-left: none;
    padding-left: 0;
  }
}

.v4-perk-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.v4-perk-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.v4-perk-icon--red { background: #fee2e2; color: #dc2626; }
.v4-perk-icon--blue { background: #dbeafe; color: #2563eb; }

.v4-perk-content strong {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
}

.v4-perk-content p {
  font-size: 14px;
  color: #86868b;
  margin: 0;
}

.v4-btn-primary {
  background: var(--v4-primary);
  color: white;
  padding: 12px 28px;
  border-radius: 100px;
  font-weight: 500;
  font-size: 17px;
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: background 0.3s;
}

.v4-btn-primary:hover { background: var(--v4-primary-hover); transform: translateY(-1px); }

/* Modal */
.v4-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  overflow-y: auto;
}

@media (min-width: 769px) {
  .v4-modal-overlay {
    align-items: center;
    padding: 24px;
  }
}

.v4-modal-content {
  background: white;
  border-radius: 32px 32px 0 0;
  width: 100%;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.3);
  max-height: 92dvh;
  overflow-y: auto;
}

@media (min-width: 769px) {
  .v4-modal-content {
    border-radius: 32px;
    max-width: 600px;
    max-height: 90dvh;
    box-shadow: 0 30px 60px rgba(0,0,0,0.4);
  }
}

.v4-modal-content .v4-modal-close {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0,0,0,0.05);
  border: none;
  font-size: 24px;
  cursor: pointer;
  z-index: 1;
}
</style>
