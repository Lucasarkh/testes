<template>
  <div class="public-layout">
    <slot />
    <ClientOnly>
      <AiChatWidget v-if="shouldRenderAiChat" :project="chatStore.currentProject" />
    </ClientOnly>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, watch } from 'vue'
import { useTenantStore } from '~/stores/tenant'
import { useAiChatStore } from '~/stores/aiChat'

const AiChatWidget = defineAsyncComponent(() => import('~/components/ai/ChatWidget.vue'))
const tenantStore = useTenantStore()
const chatStore = useAiChatStore()
const shouldRenderAiChat = computed(() => !!chatStore.currentProject?.aiEnabled)

watch(
  () => tenantStore.config?.project,
  (newProject) => {
    if (newProject) {
      chatStore.setProject(newProject)
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.public-layout {
  min-height: 100vh;
  background: var(--gray-50);
}
</style>
