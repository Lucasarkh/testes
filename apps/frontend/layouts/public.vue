<template>
  <div class="public-layout">
    <Transition name="enterprise-route-transition">
      <div v-if="showRouteTransition" class="route-transition-overlay" aria-live="polite" aria-label="Carregando próxima página">
        <div class="route-transition-shell">
          <span class="route-transition-aura" aria-hidden="true"></span>
          <div :class="hasTransitionLogo ? 'route-transition-logo-card' : 'route-transition-name-card'">
            <img
              v-if="hasTransitionLogo"
              :src="transitionLogoUrl"
              :alt="transitionLogoAlt"
              class="route-transition-logo"
              @error="handleTransitionLogoError"
            />
            <div v-else class="route-transition-name-wrap">
              <span class="route-transition-name-kicker">Abrindo empreendimento</span>
              <strong class="route-transition-name">{{ transitionProjectName }}</strong>
              <span class="route-transition-name-bar" aria-hidden="true"></span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <slot />
    <ClientOnly>
      <AiChatWidget :project="chatStore.currentProject" />
    </ClientOnly>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useTenantStore } from '~/stores/tenant'
import { useAiChatStore } from '~/stores/aiChat'
import AiChatWidget from '~/components/ai/ChatWidget.vue'
const tenantStore = useTenantStore()
const chatStore = useAiChatStore()
const router = useRouter()
const showRouteTransition = ref(false)
const transitionLogoFailed = ref(false)

let removeBeforeHook
let removeAfterHook
let hideOverlayTimeout

const rawTransitionLogoUrl = computed(() => {
  return (
    chatStore.currentProject?.ogLogoUrl
    || chatStore.currentProject?.logoUrl
    || chatStore.currentProject?.logo?.url
    || ''
  )
})

const transitionLogoUrl = computed(() => {
  return rawTransitionLogoUrl.value
})

const transitionLogoAlt = computed(() => {
  const projectName = chatStore.currentProject?.name
  return projectName ? `Logo ${projectName}` : 'Logo do empreendimento'
})

const transitionProjectName = computed(() => {
  const name = chatStore.currentProject?.name || tenantStore.config?.project?.name || 'Seu empreendimento'
  return String(name).trim()
})

const hasTransitionLogo = computed(() => {
  return Boolean(rawTransitionLogoUrl.value) && !transitionLogoFailed.value
})

const shouldAnimateNavigation = (to, from) => {
  const isInitialNavigation = !from.matched?.length
  return !isInitialNavigation && to.fullPath !== from.fullPath
}

const clearOverlayTimer = () => {
  if (hideOverlayTimeout) {
    clearTimeout(hideOverlayTimeout)
    hideOverlayTimeout = null
  }
}

const handleTransitionLogoError = () => {
  transitionLogoFailed.value = true
}

onMounted(() => {
  if (tenantStore.config?.project) {
    chatStore.setProject(tenantStore.config.project)
  }

  removeBeforeHook = router.beforeEach((to, from, next) => {
    if (shouldAnimateNavigation(to, from)) {
      clearOverlayTimer()
      transitionLogoFailed.value = false
      showRouteTransition.value = true
    }
    next()
  })

  removeAfterHook = router.afterEach((to, from) => {
    if (!shouldAnimateNavigation(to, from)) return
    clearOverlayTimer()
    hideOverlayTimeout = setTimeout(() => {
      showRouteTransition.value = false
    }, 1000)
  })
})

watch(() => tenantStore.config?.project, (newProject) => {
  if (newProject) {
    chatStore.setProject(newProject)
  }
})

watch(rawTransitionLogoUrl, () => {
  transitionLogoFailed.value = false
})

onUnmounted(() => {
  clearOverlayTimer()
  if (removeBeforeHook) removeBeforeHook()
  if (removeAfterHook) removeAfterHook()
})
</script>

<style scoped>
.public-layout {
  min-height: 100vh;
  background: var(--gray-50);
}

.route-transition-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background: #ffffff;
  pointer-events: none;
}

.route-transition-shell {
  position: relative;
  width: min(54vw, 220px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
}

.route-transition-aura {
  position: absolute;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(15, 23, 42, 0.12) 0%, rgba(15, 23, 42, 0.03) 55%, rgba(15, 23, 42, 0) 100%);
  animation: routeAuraPulse 1.2s ease-in-out infinite;
}

.route-transition-logo-card {
  position: relative;
  width: min(48vw, 176px);
  aspect-ratio: 4 / 3;
  padding: 16px 18px;
  border-radius: 22px;
  background: #ffffff;
  border: 1px solid #e9eef5;
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.14), 0 2px 8px rgba(15, 23, 42, 0.08);
  display: grid;
  place-items: center;
  animation: routeLogoFloat 1s ease-in-out infinite;
}

.route-transition-name-card {
  position: relative;
  width: min(78vw, 320px);
  min-height: 140px;
  padding: 24px 22px;
  border-radius: 28px;
  background: linear-gradient(145deg, #ffffff 0%, #f7fafc 100%);
  border: 1px solid #e9eef5;
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.14), 0 2px 8px rgba(15, 23, 42, 0.08);
  display: grid;
  place-items: center;
  animation: routeLogoFloat 1s ease-in-out infinite;
}

.route-transition-name-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.route-transition-name-kicker {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
  animation: routeNameFade 1.1s ease-in-out infinite;
}

.route-transition-name {
  font-size: clamp(1.15rem, 2.8vw, 1.75rem);
  line-height: 1.1;
  font-weight: 800;
  color: #0f172a;
  text-wrap: balance;
}

.route-transition-name-bar {
  width: 72px;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, #dbeafe 0%, #2563eb 50%, #dbeafe 100%);
  background-size: 180% 100%;
  animation: routeNameShimmer 1.2s ease-in-out infinite;
}

.route-transition-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

.enterprise-route-transition-enter-active {
  transition: none;
}

.enterprise-route-transition-leave-active {
  transition: opacity 220ms ease;
}

.enterprise-route-transition-enter-from,
.enterprise-route-transition-enter-to {
  opacity: 1;
}

.enterprise-route-transition-leave-to {
  opacity: 0;
}

@keyframes routeLogoFloat {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-4px) scale(1.035);
  }
}

@keyframes routeAuraPulse {
  0%,
  100% {
    transform: scale(0.86);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.02);
    opacity: 1;
  }
}

@keyframes routeNameShimmer {
  0%,
  100% {
    background-position: 0% 50%;
    transform: scaleX(0.92);
  }
  50% {
    background-position: 100% 50%;
    transform: scaleX(1.06);
  }
}

@keyframes routeNameFade {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}
</style>
