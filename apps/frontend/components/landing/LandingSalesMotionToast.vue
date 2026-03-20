<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<template>
  <Transition name="v4-sales-motion-fade">
    <div v-if="message" class="v4-sales-motion-toast" aria-live="polite" aria-atomic="true">
      <span class="v4-sales-motion-dot"></span>
      <span>{{ message }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.v4-sales-motion-toast {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 22px;
  z-index: 200;
  max-width: 360px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(10, 15, 13, 0.86);
  color: #eafff3;
  font-size: 0.84rem;
  font-weight: 600;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.36);
  backdrop-filter: blur(10px);
}

.v4-sales-motion-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex-shrink: 0;
  background: #22c55e;
  box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.15);
}

.v4-sales-motion-fade-enter-active,
.v4-sales-motion-fade-leave-active {
  transition: all 0.22s ease;
}

.v4-sales-motion-fade-enter-from,
.v4-sales-motion-fade-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

@media (max-width: 768px) {
  .v4-sales-motion-toast {
    left: 50%;
    transform: translateX(-50%);
    width: min(90vw, 360px);
    top: calc(env(safe-area-inset-top, 0px) + 10px);
    bottom: auto;
    max-width: none;
    padding: 9px 12px;
    border-radius: 10px;
    font-size: 0.74rem;
    background: rgba(10, 15, 13, 0.74);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
  }
}
</style>
