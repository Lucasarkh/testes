<template>
  <section class="v4-section v4-section-alt" id="planta" :style="sectionStyle">
    <div class="v4-container">
      <div class="v4-section-header center">
        <h2 class="v4-section-title">Planta Interativa</h2>
        <p class="v4-section-subtitle">Explore a implantação do loteamento. Clique nos pontos para mais informações.</p>
      </div>
      <ClientOnly>
        <div class="v4-plant-map-shell" :class="{ 'is-interaction-disabled': !plantMapInteractionEnabled }" style="height: 540px; border-radius: 16px; overflow: hidden; box-shadow: var(--v4-shadow-elevated); position: relative;">
          <PlantMapViewer
            v-if="plantMap"
            :plant-map="plantMap"
            :show-controls="true"
            :show-legend="true"
            :interactive="plantMapInteractionEnabled"
          />
          <div v-else style="height:100%; background:#1a1a2e; display:flex; align-items:center; justify-content:center; color:#64748b;">
            <div class="loading-spinner"></div>
          </div>
          <div v-if="showTouchCta && plantMap" class="v4-interaction-gate">
            <button type="button" class="v4-interaction-gate__btn" @click.stop.prevent="enableInteraction">
              Ver mapa interativo
            </button>
            <p class="v4-interaction-gate__hint">Ative para arrastar e dar zoom. Desative para voltar a rolar a pagina.</p>
          </div>
        </div>
        <template #fallback>
          <div style="height: 540px; border-radius:16px; background:#1a1a2e; display:flex; align-items:center; justify-content:center; color:#64748b;">
            <div class="loading-spinner"></div>
          </div>
        </template>
      </ClientOnly>
      <button
        v-if="showDisableButton"
        class="v4-interaction-toggle"
        @click="disableInteraction"
      >
        Desativar interacao do mapa
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTracking } from '~/composables/useTracking'
import PlantMapViewer from '~/components/plantMap/PlantMapViewer.vue'

const props = defineProps<{
  project: any
  plantMap: any
  sectionStyle: Record<string, string>
  isTouchMobile: boolean
}>()

const tracking = useTracking()

const plantMapInteractionEnabled = ref(!props.isTouchMobile)

const showTouchCta = computed(() => props.isTouchMobile && !plantMapInteractionEnabled.value)
const showDisableButton = computed(() => props.isTouchMobile && plantMapInteractionEnabled.value)

watch(() => props.isTouchMobile, (isTouchMobile) => {
  plantMapInteractionEnabled.value = !isTouchMobile
})

function enableInteraction() {
  plantMapInteractionEnabled.value = true
  tracking.trackClick('Botão: Ativar Mapa Interativo')
}

function disableInteraction() {
  plantMapInteractionEnabled.value = false
}
</script>

<style scoped>
.v4-plant-map-actions {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.v4-plant-map-btn {
  min-width: 280px;
  text-decoration: none;
  text-align: center;
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

@media (max-width: 768px) {
  .v4-plant-map-btn {
    width: 100%;
    min-width: 0;
  }
}
</style>
