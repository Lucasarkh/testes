<template>
  <div class="north-compass" :title="title">
    <div class="north-compass__dial">
      <div class="north-compass__arrow" :style="arrowStyle">
        <span class="north-compass__tip"></span>
      </div>
      <span class="north-compass__label">N</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  angleDeg: number
}>()

const normalizedAngle = computed(() => {
  const angle = Number(props.angleDeg)
  if (!Number.isFinite(angle)) return 270
  return ((angle % 360) + 360) % 360
})

const arrowStyle = computed(() => ({
  transform: `rotate(${normalizedAngle.value + 90}deg)`,
}))

const title = computed(() => `Norte da planta: ${Math.round(normalizedAngle.value)}°`)
</script>

<style scoped>
.north-compass {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 8;
  pointer-events: none;
}

.north-compass__dial {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  background: rgba(31, 22, 14, 0.52);
  backdrop-filter: blur(6px);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.22);
}

.north-compass__arrow {
  position: absolute;
  inset: 6px;
  transform-origin: 50% 50%;
}

.north-compass__arrow::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 7px;
  width: 2px;
  height: 38px;
  background: linear-gradient(180deg, #fbbf24 0%, rgba(251, 191, 36, 0.22) 100%);
  transform: translateX(-50%);
}

.north-compass__tip {
  position: absolute;
  left: 50%;
  top: 2px;
  width: 0;
  height: 0;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-bottom: 13px solid #f59e0b;
  transform: translateX(-50%);
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.35));
}

.north-compass__label {
  position: absolute;
  inset: auto 0 6px;
  text-align: center;
  color: #fff7ed;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}
</style>