<template>
  <div class="project-side-menu" :class="{ 'is-visible': isVisible }">
    <div ref="menuItemsRef" class="menu-items">
      <a 
        v-for="item in filteredItems" 
        :key="item.id" 
        :href="`#${item.id}`"
        :ref="(el) => setItemRef(item.id, el)"
        class="menu-item"
        :class="{ 'is-active': activeSection === item.id }"
        @click.prevent="scrollTo(item.id)"
      >
        <span class="dot"></span>
        <span class="label">{{ item.label }}</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

type ProjectSideMenuItem = {
  id: string
  label: string
}

const props = defineProps<{
  items?: ProjectSideMenuItem[];
  hasPlant?: boolean;
  hasPanorama?: boolean;
  hasInfo?: boolean;
  hasLots?: boolean;
  hasGallery?: boolean;
  hasLocation?: boolean;
  hasNearby?: boolean;
  hasScheduling?: boolean;
}>()

const legacyItems: ProjectSideMenuItem[] = [
  { id: 'inicio', label: 'INÍCIO' },
  { id: 'info', label: 'INFO' },
  { id: 'planta', label: 'PLANTA' },
  { id: 'panorama', label: '360°' },
  { id: 'lotes', label: 'UNIDADES' },
  { id: 'galeria', label: 'GALERIA' },
  { id: 'localizacao', label: 'LOCAL' },
  { id: 'proximidades', label: 'PROX.' },
  { id: 'agendamento', label: 'AGENDAR' },
  { id: 'contato', label: 'CONTATO' },
]

const orderedItems = computed(() => {
  if (Array.isArray(props.items) && props.items.length > 0) {
    return props.items
  }

  return legacyItems
})

const filteredItems = computed(() => {
  if (Array.isArray(props.items) && props.items.length > 0) {
    return orderedItems.value
  }

  return orderedItems.value.filter(item => {
    if (item.id === 'inicio' || item.id === 'contato') return true
    if (item.id === 'planta') return props.hasPlant
    if (item.id === 'panorama') return props.hasPanorama
    if (item.id === 'info') return props.hasInfo
    if (item.id === 'lotes') return props.hasLots
    if (item.id === 'galeria') return props.hasGallery
    if (item.id === 'localizacao') return props.hasLocation
    if (item.id === 'proximidades') return props.hasNearby
    if (item.id === 'agendamento') return props.hasScheduling
    return false
  })
})

const isVisible = ref(false)
const activeSection = ref('inicio')
const menuItemsRef = ref<HTMLElement | null>(null)
const itemRefs = new Map<string, HTMLElement>()

const setItemRef = (id: string, target: Element | { $el?: Element } | null) => {
  const resolvedElement = target instanceof HTMLElement
    ? target
    : target && '$el' in target && target.$el instanceof HTMLElement
      ? target.$el
      : null

  if (resolvedElement) {
    itemRefs.set(id, resolvedElement)
    return
  }

  itemRefs.delete(id)
}

const ensureActiveItemVisible = () => {
  const container = menuItemsRef.value
  const activeItem = itemRefs.get(activeSection.value)

  if (!container || !activeItem) return

  const itemTop = activeItem.offsetTop
  const itemBottom = itemTop + activeItem.offsetHeight
  const visibleTop = container.scrollTop
  const visibleBottom = visibleTop + container.clientHeight
  const padding = 20

  if (itemTop < visibleTop + padding) {
    container.scrollTo({ top: Math.max(itemTop - padding, 0), behavior: 'smooth' })
    return
  }

  if (itemBottom > visibleBottom - padding) {
    container.scrollTo({ top: itemBottom - container.clientHeight + padding, behavior: 'smooth' })
  }
}

const scrollTo = (id: string) => {
  const el = document.getElementById(id)
  if (el) {
    const offset = 80 // header offset
    const bodyRect = document.body.getBoundingClientRect().top
    const elementRect = el.getBoundingClientRect().top
    const elementPosition = elementRect - bodyRect
    const offsetPosition = elementPosition - offset

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
  }
}

const handleScroll = () => {
  const scrollY = window.scrollY
  const heroSection = document.querySelector('.v4-hero')
  
  if (heroSection) {
    const heroHeight = heroSection.getBoundingClientRect().height
    isVisible.value = scrollY > heroHeight - 100
  }

  // Determine active section
  const sections = filteredItems.value.map(i => i.id)
  for (const sectionId of [...sections].reverse()) {
    const el = document.getElementById(sectionId)
    if (el) {
      const rect = el.getBoundingClientRect()
      if (rect.top <= 150) {
        activeSection.value = sectionId
        break
      }
    }
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  handleScroll()
})

watch(activeSection, async () => {
  await nextTick()
  ensureActiveItemVisible()
})

watch(filteredItems, async () => {
  await nextTick()
  ensureActiveItemVisible()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  itemRefs.clear()
})
</script>

<style scoped>
.project-side-menu {
  position: fixed;
  left: 24px;
  top: 50%;
  transform: translateY(-50%) translateX(-100px);
  z-index: 101;
  background: var(--glass-bg);
  padding: 24px 12px;
  max-height: calc(100vh - 48px);
  overflow: hidden;
  border-radius: 40px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  opacity: 0;
  pointer-events: none;
}

.project-side-menu.is-visible {
  transform: translateY(-50%) translateX(0);
  opacity: 1;
  pointer-events: all;
}

.menu-items {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  max-height: calc(100vh - 96px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 2px;
  scrollbar-width: none;
}

.menu-items::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.menu-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  transition: all 0.2s;
}

.dot {
  width: 8px;
  height: 8px;
  background: #cbd5e1;
  border-radius: 50%;
  transition: all 0.2s;
}

.label {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.05em;
  transition: all 0.2s;
}

.menu-item:hover .label {
  color: var(--color-primary-500);
}

.menu-item.is-active .dot {
  background: var(--color-primary-500);
  transform: scale(1.2);
}

.menu-item.is-active .label {
  color: var(--color-primary-500);
}

@media (max-width: 768px) {
  .project-side-menu {
    display: none;
  }
}
</style>
