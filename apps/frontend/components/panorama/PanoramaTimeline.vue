<template>
  <div class="panorama-timeline">
    <button
      v-for="snap in snapshots"
      :key="snap.id"
      class="timeline-btn"
      :class="{ 'timeline-btn--active': snap.id === activeSnapshotId }"
      @click="$emit('select', snap)"
    >
      {{ snap.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { PanoramaSnapshot } from '~/composables/panorama/types'

defineProps<{
  snapshots: PanoramaSnapshot[]
  activeSnapshotId?: string
}>()

defineEmits<{
  select: [snap: PanoramaSnapshot]
}>()
</script>

<style scoped>
.panorama-timeline {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  overflow-x: auto;
  max-width: min(92vw, 560px);
  padding: 4px 2px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.panorama-timeline::-webkit-scrollbar {
  display: none;
}

.timeline-btn {
  flex: 0 0 auto;
  min-height: 38px;
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 10px;
  background: rgba(7, 19, 40, 0.86);
  color: #f8fafc;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  backdrop-filter: blur(6px);
  white-space: nowrap;
}

.timeline-btn:hover {
  background: rgba(21, 43, 78, 0.95);
  border-color: rgba(255, 255, 255, 0.5);
}

.timeline-btn--active {
  background: #2563eb;
  border-color: #93c5fd;
  box-shadow: 0 0 0 2px rgba(147, 197, 253, 0.4);
  font-weight: 700;
}

@media (max-width: 768px) {
  .panorama-timeline {
    width: 100%;
    max-width: calc(100vw - 32px);
    justify-content: flex-start;
  }

  .timeline-btn {
    min-height: 40px;
    padding: 9px 12px;
    font-size: 0.76rem;
  }
}
</style>
