<template>
  <span ref="wrapperRef" class="app-tooltip-wrapper" @mouseenter="openTooltip" @mouseleave="closeTooltip">
    <slot />
    <span class="app-tooltip-icon" v-if="!noIcon">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
    </span>
  </span>

  <Teleport to="body">
    <Transition name="tooltip-fade">
      <span
        v-if="show"
        ref="bubbleRef"
        class="app-tooltip-bubble"
        :class="[`pos-${resolvedPosition}`]"
        :style="bubbleStyle"
      >
        {{ text }}
      </span>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  noIcon?: boolean
}>(), {
  position: 'top',
  noIcon: false
})

const show = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)
const bubbleRef = ref<HTMLElement | null>(null)
const resolvedPosition = ref<'top' | 'bottom' | 'left' | 'right'>(props.position)
const bubbleStyle = ref<Record<string, string>>({ top: '0px', left: '0px' })

const GAP = 8
const VIEWPORT_PADDING = 8

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

function updateTooltipPosition() {
  if (!show.value || !wrapperRef.value || !bubbleRef.value) return

  const triggerRect = wrapperRef.value.getBoundingClientRect()
  const bubbleRect = bubbleRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let position: 'top' | 'bottom' | 'left' | 'right' = props.position

  if (position === 'bottom' && triggerRect.bottom + GAP + bubbleRect.height > viewportHeight - VIEWPORT_PADDING) {
    position = 'top'
  } else if (position === 'top' && triggerRect.top - GAP - bubbleRect.height < VIEWPORT_PADDING) {
    position = 'bottom'
  } else if (position === 'left' && triggerRect.left - GAP - bubbleRect.width < VIEWPORT_PADDING) {
    position = 'right'
  } else if (position === 'right' && triggerRect.right + GAP + bubbleRect.width > viewportWidth - VIEWPORT_PADDING) {
    position = 'left'
  }

  let top = 0
  let left = 0

  if (position === 'top') {
    top = triggerRect.top - bubbleRect.height - GAP
    left = triggerRect.left + (triggerRect.width - bubbleRect.width) / 2
  } else if (position === 'bottom') {
    top = triggerRect.bottom + GAP
    left = triggerRect.left + (triggerRect.width - bubbleRect.width) / 2
  } else if (position === 'left') {
    top = triggerRect.top + (triggerRect.height - bubbleRect.height) / 2
    left = triggerRect.left - bubbleRect.width - GAP
  } else {
    top = triggerRect.top + (triggerRect.height - bubbleRect.height) / 2
    left = triggerRect.right + GAP
  }

  left = clamp(left, VIEWPORT_PADDING, viewportWidth - bubbleRect.width - VIEWPORT_PADDING)
  top = clamp(top, VIEWPORT_PADDING, viewportHeight - bubbleRect.height - VIEWPORT_PADDING)

  resolvedPosition.value = position
  bubbleStyle.value = {
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`
  }
}

function openTooltip() {
  show.value = true
  nextTick(updateTooltipPosition)
}

function closeTooltip() {
  show.value = false
}

function handleViewportChange() {
  if (!show.value) return
  updateTooltipPosition()
}

onMounted(() => {
  window.addEventListener('scroll', handleViewportChange, true)
  window.addEventListener('resize', handleViewportChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleViewportChange, true)
  window.removeEventListener('resize', handleViewportChange)
})
</script>

<style scoped>
.app-tooltip-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.app-tooltip-icon {
  display: inline-flex;
  align-items: center;
  color: var(--color-surface-500);
  cursor: help;
  flex-shrink: 0;
  transition: color 0.2s;
}

.app-tooltip-wrapper:hover .app-tooltip-icon {
  color: var(--color-surface-300);
}

.app-tooltip-bubble {
  position: fixed;
  z-index: 4000;
  background: var(--color-surface-800, #141f1a);
  color: var(--color-surface-100, #cddad2);
  border: 1px solid var(--glass-border-subtle, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  white-space: normal;
  width: max-content;
  max-width: 280px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  pointer-events: none;
}

/* Positions */
.pos-top {
  transform-origin: center bottom;
}

.pos-bottom {
  transform-origin: center top;
}

.pos-left {
  transform-origin: right center;
}

.pos-right {
  transform-origin: left center;
}

/* Transition */
.tooltip-fade-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tooltip-fade-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}

.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}

.pos-top.tooltip-fade-enter-from,
.pos-top.tooltip-fade-leave-to {
  transform: translateY(4px);
}
.pos-bottom.tooltip-fade-enter-from,
.pos-bottom.tooltip-fade-leave-to {
  transform: translateY(-4px);
}
.pos-left.tooltip-fade-enter-from,
.pos-left.tooltip-fade-leave-to {
  transform: translateX(4px);
}
.pos-right.tooltip-fade-enter-from,
.pos-right.tooltip-fade-leave-to {
  transform: translateX(-4px);
}
</style>
