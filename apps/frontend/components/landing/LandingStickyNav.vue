<script setup lang="ts">
defineProps<{
  hasPlantMap: boolean
  hasPanoramas: boolean
  hasAvailableLots: boolean
  stickyInterestLabel: string
  unitsUrl: string
}>()

const tracking = useTracking()
</script>

<template>
  <nav class="v4-sticky-nav">
    <a v-if="hasPlantMap" href="#planta" class="v4-nav-item">Planta</a>
    <a v-if="hasPanoramas" href="#panorama" class="v4-nav-item">Panorama</a>
    <a v-if="hasAvailableLots" href="#lotes" class="v4-nav-item">Unidades</a>
    <a href="#contato" class="v4-nav-item v4-nav-cta">{{ stickyInterestLabel }}</a>
  </nav>
</template>

<style scoped>
/* Sticky mobile CTA */
.v4-sticky-nav {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(29, 29, 31, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  padding: 6px;
  border-radius: 100px;
  display: none;
  align-items: center;
  gap: 4px;
  width: auto;
  min-width: 320px;
  max-width: 92vw;
  z-index: 1000;
  box-shadow: 0 12px 30px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.08);
}

@media (max-width: 768px) {
  .v4-sticky-nav {
    display: flex;
    bottom: 20px;
    min-width: 280px;
    padding: 4px;
    gap: 2px;
  }
}

.v4-nav-item {
  color: white; text-decoration: none; font-size: 13px; font-weight: 500; padding: 10px 18px; border-radius: 100px; transition: all 0.2s;
}

@media (max-width: 768px) {
  .v4-nav-item { font-size: 11px; padding: 8px 10px; }
}

.v4-nav-cta { background: var(--v4-primary); flex: 1; text-align: center; font-weight: 600; }

@media (max-width: 768px) {
  .v4-nav-cta { padding: 8px 12px; font-size: 12px; white-space: nowrap; }
}
</style>
