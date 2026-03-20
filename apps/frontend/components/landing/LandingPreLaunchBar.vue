<template>
  <div v-if="visible" class="v4-prelaunch-bar">
    <button
      type="button"
      class="v4-prelaunch-dismiss"
      aria-label="Fechar aviso de pré-lançamento"
      @click="handleDismiss"
    >
      <i class="bi bi-x-lg" aria-hidden="true"></i>
    </button>
    <div class="v4-container">
      <div class="v4-prelaunch-inner">
        <div class="v4-prelaunch-copy">
          <span class="v4-prelaunch-kicker">Pré-lançamento</span>
          <strong class="v4-prelaunch-title">Acesso antecipado exclusivo e fila de preferência liberados</strong>
          <p class="v4-prelaunch-text">
            Entre na fila agora para receber atendimento prioritário, condições antecipadas e aviso antes da abertura oficial.
            <span v-if="corretor">Seu atendimento com corretor exclusivo continua normalmente logo abaixo.</span>
          </p>
        </div>
        <div class="v4-prelaunch-actions">
          <a href="#contato" class="v4-prelaunch-btn" @click="tracking.trackClick(trackingLabel)">
            {{ ctaLabel }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTracking } from '~/composables/useTracking'

const props = defineProps<{
  visible: boolean
  corretor: any
  ctaLabel: string
  trackingLabel: string
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const tracking = useTracking()

function handleDismiss() {
  emit('dismiss')
}
</script>

<style scoped>
.v4-prelaunch-bar {
  position: sticky;
  top: 0;
  z-index: 110;
  padding: 10px 0;
  background:
    linear-gradient(90deg, rgba(6, 78, 59, 0.94), rgba(3, 105, 161, 0.94)),
    rgba(7, 12, 20, 0.92);
  color: #ecfeff;
  border-bottom: 1px solid rgba(255,255,255,0.14);
  box-shadow: 0 10px 34px rgba(2, 6, 23, 0.18);
  backdrop-filter: saturate(180%) blur(18px);
}

.v4-prelaunch-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.v4-prelaunch-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.v4-prelaunch-kicker {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(236, 254, 255, 0.82);
}

.v4-prelaunch-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  color: #fff;
}

.v4-prelaunch-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(236, 254, 255, 0.86);
}

.v4-prelaunch-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.v4-prelaunch-dismiss {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  right: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.v4-prelaunch-dismiss:hover {
  background: rgba(255, 255, 255, 0.16);
}

.v4-prelaunch-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 20px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.18);
  transition: all 0.22s ease;
}

.v4-prelaunch-btn:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 24px rgba(2, 6, 23, 0.16);
}

/* Mobile overrides */
@media (max-width: 768px) {
  .v4-prelaunch-bar {
    position: static;
    padding: 12px 0 10px;
  }

  .v4-prelaunch-inner {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .v4-prelaunch-title {
    font-size: 15px;
  }

  .v4-prelaunch-text {
    font-size: 12px;
  }

  .v4-prelaunch-btn {
    width: 100%;
    min-height: 48px;
  }

  .v4-prelaunch-actions {
    flex-direction: column-reverse;
    align-items: stretch;
    width: 100%;
  }

  .v4-prelaunch-dismiss {
    top: 8px;
    transform: initial;
    right: 12px;
    width: 36px;
    height: 36px;
  }

  .v4-prelaunch-copy {
    padding-right: 44px;
  }
}
</style>
