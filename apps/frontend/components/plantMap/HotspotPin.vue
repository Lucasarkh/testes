<template>
  <g
    class="plant-hotspot-pin"
    :transform="`translate(${cx}, ${cy})`"
    role="button"
    :aria-label="hotspot.title"
    tabindex="0"
    @click.stop="$emit('click', $event, hotspot)"
    @keydown.enter.stop="$emit('click', $event, hotspot)"
    @keydown.space.stop="$emit('click', $event, hotspot)"
    @mouseenter.stop="$emit('hover-start', hotspot)"
    @mouseleave.stop="$emit('hover-end', hotspot)"
    @focus="$emit('hover-start', hotspot)"
    @blur="$emit('hover-end', hotspot)"
  >
    <!-- Base Anchor Dot -->
    <circle
      r="3"
      fill="white"
      class="base-dot-outer"
      opacity="0.6"
    />
    <circle
      r="1.5"
      :fill="pinColor"
      class="base-dot-inner"
    />

    <!-- Stem (Pole) -->
    <line
      x1="0"
      y1="0"
      x2="0"
      :y2="-poleHeight"
      :stroke="pinColor"
      stroke-width="2"
      stroke-linecap="round"
    />

    <!-- Sign Head (Plaquinha) -->
    <g :transform="`translate(0, ${-poleHeight})`">
      <rect
        :x="-headWidth / 2"
        :y="-headHeight"
        :width="headWidth"
        :height="headHeight"
        rx="4"
        :fill="pinColor"
        stroke="white"
        stroke-width="1.5"
        class="head-rect"
      />
      <!-- Icon or Label -->
      <text
        text-anchor="middle"
        dominant-baseline="central"
        :y="-headHeight / 2"
        :font-size="headHeight * 0.6"
        fill="white"
        font-weight="700"
        style="pointer-events: none; user-select: none;"
      >{{ headText }}</text>
    </g>

    <!-- Active ring (when selected) -->
    <circle
      v-if="selected"
      :r="7"
      fill="none"
      :stroke="pinColor"
      stroke-width="1.5"
      stroke-dasharray="3 2"
      opacity="1"
    >
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 0 0"
        to="360 0 0"
        dur="3s"
        repeatCount="indefinite"
      />
    </circle>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PlantHotspot, PlantHotspotType, LotStatus } from '~/composables/plantMap/types'
import {
  HOTSPOT_TYPE_COLORS,
  HOTSPOT_TYPE_ICONS,
  LOT_STATUS_COLORS,
} from '~/composables/plantMap/types'

const props = withDefaults(defineProps<{
  hotspot: PlantHotspot
  /** Container width in px — used to compute absolute cx from normalized x */
  containerWidth: number
  /** Container height in px */
  containerHeight: number
  selected?: boolean
  showLabel?: boolean
  pinRadius?: number
}>(), {
  selected: false,
  showLabel: true,
  pinRadius: 14,
})

defineEmits<{
  (e: 'click', event: MouseEvent | KeyboardEvent, hotspot: PlantHotspot): void
  (e: 'hover-start', hotspot: PlantHotspot): void
  (e: 'hover-end', hotspot: PlantHotspot): void
}>()

const cx = computed(() => props.hotspot.x * props.containerWidth)
const cy = computed(() => props.hotspot.y * props.containerHeight)

const pinColor = computed(() => {
  if (props.hotspot.type === 'LOTE' && props.hotspot.loteStatus) {
    return LOT_STATUS_COLORS[props.hotspot.loteStatus] || '#94a3b8'
  }
  return HOTSPOT_TYPE_COLORS[props.hotspot.type] || '#3b82f6'
})

const headText = computed(() => {
  if (props.hotspot.labelEnabled && props.hotspot.label) return props.hotspot.label
  return (HOTSPOT_TYPE_ICONS[props.hotspot.type] || 'Ponto') + ' ' + props.hotspot.title
})

const poleHeight = computed(() => props.pinRadius * 1.8)
const headHeight = computed(() => props.pinRadius * 1.4)
const headWidth = computed(() => Math.max(headHeight.value, headText.value.length * (headHeight.value * 0.45) + 12))

</script>

<style scoped>
.plant-hotspot-pin {
  cursor: pointer;
  outline: none;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
  transition: filter 0.2s ease;
}

.plant-hotspot-pin:hover {
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4)) brightness(1.1);
}

.head-rect {
  transition: fill 0.2s ease;
}

.base-dot-outer {
  animation: pulse 2s infinite ease-in-out;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(2); opacity: 0.1; }
  100% { transform: scale(1); opacity: 0.6; }
}
</style>
