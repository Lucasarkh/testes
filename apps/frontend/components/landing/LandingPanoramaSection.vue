<template>
  <section class="v4-section" id="panorama" :style="sectionStyle">
    <div class="v4-container">
      <div class="v4-section-header center">
        <h2 class="v4-section-title">Vista 360°</h2>
        <p class="v4-section-subtitle">Explore o empreendimento e seus arredores com vista panorâmica.</p>
      </div>
      <ClientOnly>
        <div
          v-for="pano in panoramas"
          :key="pano.id"
          class="v4-panorama-card"
          :class="{ 'is-interaction-disabled': !panoramaInteractionEnabled }"
        >
          <PanoramaViewer :panorama="pano" />
          <div v-if="showTouchCta" class="v4-interaction-gate">
            <button type="button" class="v4-interaction-gate__btn" @click.stop.prevent="enableInteraction">
              Ver 360 interativo
            </button>
            <p class="v4-interaction-gate__hint">Ative para girar a vista 360. Desative para continuar rolando a pagina.</p>
          </div>
        </div>
        <template #fallback>
          <div class="v4-panorama-card v4-panorama-card--fallback">
            <div class="loading-spinner"></div>
          </div>
        </template>
      </ClientOnly>
      <button
        v-if="showDisableButton"
        class="v4-interaction-toggle"
        @click="disableInteraction"
      >
        Desativar interacao do 360
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTracking } from '~/composables/useTracking'
import PanoramaViewer from '~/components/panorama/PanoramaViewer.vue'

const props = defineProps<{
  panoramas: any[]
  sectionStyle: Record<string, string>
  isTouchMobile: boolean
}>()

const tracking = useTracking()

const panoramaInteractionEnabled = ref(!props.isTouchMobile)

const showTouchCta = computed(() => props.isTouchMobile && !panoramaInteractionEnabled.value)
const showDisableButton = computed(() => props.isTouchMobile && panoramaInteractionEnabled.value)

watch(() => props.isTouchMobile, (isTouchMobile) => {
  panoramaInteractionEnabled.value = !isTouchMobile
})

function enableInteraction() {
  panoramaInteractionEnabled.value = true
  tracking.trackClick('Botão: Ativar 360 Interativo')
}

function disableInteraction() {
  panoramaInteractionEnabled.value = false
}
</script>

<style scoped>
.v4-panorama-card {
  position: relative;
  height: clamp(260px, 56.25vw, 540px);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--v4-shadow-elevated);
  margin-bottom: 24px;
}

.v4-panorama-card.is-interaction-disabled :deep(.panorama-viewer) {
  pointer-events: none;
}

.v4-panorama-card--fallback {
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

@media (max-width: 768px) {
  .v4-panorama-card {
    height: clamp(220px, 56vw, 320px);
    margin-bottom: 16px;
  }
}

.v4-interaction-gate {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.45);
  text-align: center;
}

.v4-interaction-gate__btn {
  border: none;
  background: #ffffff;
  color: #111827;
  font-weight: 700;
  font-size: 14px;
  padding: 10px 16px;
  border-radius: 999px;
  cursor: pointer;
}

.v4-interaction-gate__hint {
  margin: 0;
  color: #e5e7eb;
  font-size: 12px;
  line-height: 1.35;
  max-width: 280px;
}

.v4-interaction-toggle {
  margin-top: 12px;
  border: 1px solid var(--v4-border);
  background: #fff;
  color: var(--v4-text-muted);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

@keyframes spinner { to { transform: rotate(360deg); } }
.loading-spinner { width: 32px; height: 32px; border: 3px solid rgba(0, 113, 227, 0.1); border-top-color: var(--v4-primary); border-radius: 50%; animation: spinner 1s linear infinite; }
</style>
