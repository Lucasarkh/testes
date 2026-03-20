<template>
  <div v-if="visible" class="v4-floating-cta">
    <button class="v4-cta-btn-animated" @click="$emit('click')">
      <div class="v4-cta-inner">
        <span class="v4-cta-icon-spark"><i class="bi bi-search" aria-hidden="true"></i></span>
        <span class="v4-cta-label">Busque o lote ideal com base nas suas preferências</span>
        <span class="v4-cta-arrow-icon">→</span>
      </div>
      <div class="v4-cta-glow"></div>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<style scoped>
/* Floating Search CTA */
.v4-floating-cta {
  position: fixed;
  bottom: 40px;
  right: 24px;
  z-index: 1000;
  max-width: calc(100vw - 48px);
}

@media (max-width: 768px) {
  .v4-floating-cta {
    bottom: 100px;
    right: 16px;
    max-width: 60px;
  }
}

.v4-cta-btn-animated {
  display: block;
  text-decoration: none;
  background: white;
  padding: 2px; /* For animated border */
  border-radius: 100px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  transition: transform 0.3s;
  border: none;
  cursor: pointer;
}

@media (max-width: 768px) {
  .v4-cta-btn-animated {
    border-radius: 50%;
    width: 60px;
    height: 60px;
    padding: 2px;
  }
}

.v4-cta-btn-animated:hover {
  transform: translateY(-4px) scale(1.02);
}

/* Animated Border Effect */
.v4-cta-btn-animated::before {
  content: "";
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(
    transparent,
    var(--v4-primary),
    #00c3ff,
    var(--v4-primary),
    transparent 30%
  );
  animation: rotate-border 4s linear infinite;
  z-index: 1;
}

@keyframes rotate-border {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.v4-cta-inner {
  position: relative;
  z-index: 2;
  background: white;
  border-radius: 100px;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .v4-cta-inner {
    padding: 12px;
    border-radius: 50%;
    aspect-ratio: 1;
    justify-content: center;
    width: 56px;
    height: 56px;
  }
}

.v4-cta-icon-spark { font-size: 18px; }

@media (max-width: 768px) {
  .v4-cta-icon-spark { font-size: 24px; margin: 0; }
}

.v4-cta-label { font-size: 14px; font-weight: 600; color: var(--v4-text); letter-spacing: -0.01em; }

@media (max-width: 768px) {
  .v4-cta-label { display: none; }
}

.v4-cta-arrow-icon { color: var(--v4-primary); font-weight: 700; transition: transform 0.2s; }

@media (max-width: 768px) {
  .v4-cta-arrow-icon { display: none; }
}

.v4-cta-btn-animated:hover .v4-cta-arrow-icon {
  transform: translateX(4px);
}

.v4-cta-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(0, 113, 227, 0.1), transparent);
  z-index: 0;
  pointer-events: none;
}
</style>
