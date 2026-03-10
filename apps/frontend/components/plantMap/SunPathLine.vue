<template>
  <!-- SVG overlay element — rendered inside the same SVG as hotspots -->
  <g v-if="isVisible" class="sun-path-line">
    <!-- The line spans diagonally across the full image -->
    <line
      :x1="x1"
      :y1="y1"
      :x2="x2"
      :y2="y2"
      stroke="#f59e0b"
      stroke-width="2.5"
      stroke-dasharray="8 5"
      stroke-linecap="round"
      opacity="0.9"
    />

    <!-- Labels -->
    <template v-if="showLabels">
      <!-- Sunset point (Opposite to angle) -->
      <g :transform="`translate(${x1}, ${y1})`">
        <text
          text-anchor="middle"
          dominant-baseline="central"
          font-size="12"
          font-weight="700"
          fill="#fbbf24"
          style="user-select: none; paint-order: stroke; stroke: rgba(0,0,0,0.8); stroke-width: 4px;"
        >Sol se põe</text>
      </g>
      <!-- Sunrise point (At angle) -->
      <g :transform="`translate(${x2}, ${y2})`">
        <text
          text-anchor="middle"
          dominant-baseline="central"
          font-size="12"
          font-weight="700"
          fill="#fbbf24"
          style="user-select: none; paint-order: stroke; stroke: rgba(0,0,0,0.8); stroke-width: 4px;"
        >Sol nasce</text>
      </g>
    </template>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  enabled: boolean
  angleDeg: number
  showLabels: boolean
  /** SVG viewport dimensions */
  width: number
  height: number
  /** Current zoom scale */
  scale?: number
}>()

// Hide/fade line based on zoom level to avoid cluttering the view
// Show only when zoomed out (scale <= 1.8)
const isVisible = computed(() => {
  if (!props.enabled) return false
  // Hide when zoomed in to focus on lots
  if (props.scale && props.scale > 1.8) return false
  return true
})

// Convert angle to a line from edge-to-edge on the SVG canvas
const lineCoords = computed(() => {
  const angleDeg = props.angleDeg % 360
  const rad = (angleDeg * Math.PI) / 180

  const cx = props.width / 2
  const cy = props.height / 2

  // Calculate distance to the edge of the rectangle at this angle
  const absCos = Math.abs(Math.cos(rad))
  const absSin = Math.abs(Math.sin(rad))
  
  // Distance to edge from center (viewport clipping)
  const distToEdge = Math.min(
    (props.width / 2) / (absCos || 1e-6),
    (props.height / 2) / (absSin || 1e-6)
  )

  // Use a margin to keep labels inside (approx 40px)
  const diag = Math.max(0, distToEdge - 40)

  return {
    x1: cx - Math.cos(rad) * diag,
    y1: cy - Math.sin(rad) * diag,
    x2: cx + Math.cos(rad) * diag,
    y2: cy + Math.sin(rad) * diag,
  }
})

const x1 = computed(() => lineCoords.value.x1)
const y1 = computed(() => lineCoords.value.y1)
const x2 = computed(() => lineCoords.value.x2)
const y2 = computed(() => lineCoords.value.y2)
</script>
