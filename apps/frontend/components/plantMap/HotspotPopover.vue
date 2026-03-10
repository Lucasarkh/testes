<template>
  <!-- Absolute positioned popover anchored to the hotspot pin -->
  <Teleport :to="teleportTarget">
    <Transition name="hs-pop">
      <div
        v-if="hotspot"
        class="hs-popover"
        :style="popoverStyle"
        role="dialog"
        :aria-label="`Info: ${hotspot.title}`"
        @click.stop
      >
        <!-- Arrow -->
        <div class="hs-popover__arrow" :style="arrowStyle"></div>

        <!-- Styled Close button -->
        <button class="hs-popover__close" aria-label="Fechar" @click="$emit('close')">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div class="hs-popover__body">
          <!-- Category & Status -->
          <div class="hs-popover__top">
            <span class="hs-popover__badge" :style="{ background: badgeColor + '15', color: badgeColor }">
              {{ typeLabel }}
            </span>
            
            <div
              v-if="hotspot.type === 'LOTE' && hotspot.loteStatus"
              class="hs-popover__status"
              :style="{ background: statusColor, color: '#fff' }"
            >
              {{ statusLabel }}
            </div>
          </div>

          <!-- Title -->
          <h3 class="hs-popover__title">{{ hotspot.title }}</h3>

          <!-- Tags / Seals -->
          <div v-if="hotspot.tags?.length" class="hs-popover__tags">
            <span v-for="tag in hotspot.tags.slice(0, 5)" :key="tag" class="hs-popover__tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px; opacity:0.8"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              {{ tag }}
            </span>
            <span v-if="hotspot.tags.length > 5" class="hs-popover__tag" style="background: transparent; color: #86868b; border: 1px dashed #d2d2d7;">
              +{{ hotspot.tags.length - 5 }}
            </span>
          </div>

          <!-- Meta Data Grid (like Area, Preis, etc.) -->
          <div v-if="metaEntries.length" class="hs-popover__meta">
            <div
              v-for="item in metaEntries"
              :key="item.key"
              class="hs-popover__meta-item"
            >
              <span class="hs-popover__meta-key">{{ item.key }}</span>
              <span class="hs-popover__meta-val">{{ item.value }}</span>
            </div>
          </div>

          <!-- Description -->
          <p v-if="hotspot.description" class="hs-popover__desc">
            {{ hotspot.description }}
          </p>

          <!-- Action -->
          <button
            v-if="ctaLink"
            class="hs-popover__cta"
            @click="handleCta"
          >
            Ver Detalhes 
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" style="margin-left: 4px"><path d="M5 12h14m-7-7l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTenantStore } from '~/stores/tenant'
import type { PlantHotspot } from '~/composables/plantMap/types'
import {
  HOTSPOT_TYPE_COLORS,
  HOTSPOT_TYPE_ICONS,
  HOTSPOT_TYPE_LABELS,
  LOT_STATUS_COLORS,
  LOT_STATUS_LABELS,
} from '~/composables/plantMap/types'

const props = withDefaults(defineProps<{
  hotspot: PlantHotspot | null
  /** Anchor position in viewport coordinates (px) */
  anchorX: number
  anchorY: number
  /** Teleport destination (defaults to body) */
  teleportTarget?: string | HTMLElement
}>(), {
  teleportTarget: 'body',
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const router = useRouter()
const route = useRoute()
const tenantStore = useTenantStore()

const badgeColor = computed(() =>
  props.hotspot ? HOTSPOT_TYPE_COLORS[props.hotspot.type] : '#6b7280',
)
const typeIcon = computed(() =>
  props.hotspot ? HOTSPOT_TYPE_ICONS[props.hotspot.type] : '',
)
const typeLabel = computed(() =>
  props.hotspot ? HOTSPOT_TYPE_LABELS[props.hotspot.type] : '',
)
const statusColor = computed(() =>
  props.hotspot?.loteStatus ? LOT_STATUS_COLORS[props.hotspot.loteStatus] : '#6b7280',
)
const statusLabel = computed(() =>
  props.hotspot?.loteStatus ? LOT_STATUS_LABELS[props.hotspot.loteStatus] : '',
)

type MetaEntry = { key: string; value: string }

const toDisplayLabel = (key: string): string => {
  const map: Record<string, string> = {
    block: 'Quadra',
    lotNumber: 'Lote',
    area: 'Area',
    price: 'Preco',
    status: 'Status',
  }

  if (map[key]) return map[key]
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (ch) => ch.toUpperCase())
}

const metaEntries = computed<MetaEntry[]>(() => {
  const meta = props.hotspot?.metaJson
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return []

  const entries: MetaEntry[] = []
  const normalizedTitle = (props.hotspot?.title ?? '').trim().toLowerCase()

  for (const [key, val] of Object.entries(meta as Record<string, unknown>)) {
    if (key === 'lotInfo' && val && typeof val === 'object' && !Array.isArray(val)) {
      const lotInfo = val as Record<string, unknown>
      const block = typeof lotInfo.block === 'string' ? lotInfo.block.trim() : ''
      const lotNumber = typeof lotInfo.lotNumber === 'string' ? lotInfo.lotNumber.trim() : ''

      if (block) entries.push({ key: 'Quadra', value: block })
      if (lotNumber && lotNumber.toLowerCase() !== normalizedTitle) {
        entries.push({ key: 'Lote', value: lotNumber })
      }
      continue
    }

    if (val === null || val === undefined) continue
    if (typeof val === 'object') continue

    const text = String(val).trim()
    if (!text) continue
    entries.push({ key: toDisplayLabel(key), value: text })
  }

  return entries
})

const ctaLink = computed(() => {
  if (!props.hotspot) return null
  const { linkType, linkId, linkUrl } = props.hotspot
  const slug = (route.params.slug || tenantStore.config?.project?.slug) as string
  const realtorCode = (route.query.c || '') as string
  const pathPrefix = slug ? `/${slug}` : ''

  let base = null
  if (linkType === 'LOTE_PAGE' && linkId) {
    const code = (props.hotspot as any).code || props.hotspot.label || (props.hotspot as any).name || linkId || props.hotspot.id
    base = pathPrefix ? `${pathPrefix}/${encodeURIComponent(code)}` : `/${encodeURIComponent(code)}`
  }
  else if (linkType === 'PROJECT_PAGE' && linkId) {
    base = `/${linkId}`
  }
  else if (linkType === 'CUSTOM_URL' && linkUrl) return linkUrl

  if (base && realtorCode) {
    return `${base}?c=${realtorCode}`
  }
  return base
})

const handleCta = () => {
  if (!ctaLink.value) return
  if (ctaLink.value.startsWith('http')) {
    window.open(ctaLink.value, '_blank', 'noopener')
  } else {
    router.push(ctaLink.value)
  }
}

// ── POSITIONING LOGIC ──────────────────────────────────────
const POPOVER_W = 260
const POPOVER_OFFSET = 12

const popoverStyle = computed(() => {
  if (!import.meta.client || !props.hotspot) return { display: 'none' }
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = props.anchorX - POPOVER_W / 2
  let top = props.anchorY - 140 

  // Horizontal clamping
  if (left < 8) left = 8
  if (left + POPOVER_W > vw - 8) left = vw - POPOVER_W - 8

  // Decide if showing above or below
  const spaceAbove = props.anchorY - 20
  if (spaceAbove < 240) {
    // Show below if not enough space above
    top = props.anchorY + POPOVER_OFFSET + 20
  } else {
    // Show above
    top = props.anchorY - POPOVER_OFFSET - 200 // Higher offset to start, will be content dependent
  }

  // Final clamp for vertical
  if (top < 10) top = 10
  if (top + 300 > vh - 10) top = vh - 310

  return {
    position: 'fixed' as const,
    left: `${left}px`,
    top: `${top}px`,
    width: `${POPOVER_W}px`,
    zIndex: 9999,
  }
})

const arrowStyle = computed(() => {
  if (!props.hotspot) return {}
  const popLeft = parseFloat(popoverStyle.value.left || '0')
  const arrowX = props.anchorX - popLeft
  const popTop = parseFloat(popoverStyle.value.top || '0')
  const isBelow = popTop > props.anchorY

  return {
    left: `${arrowX}px`,
    [isBelow ? 'top' : 'bottom']: '-6px',
    transform: isBelow ? 'rotate(45deg) translateY(-50%)' : 'rotate(45deg) translateY(50%)',
    display: (arrowX < 15 || arrowX > POPOVER_W - 15) ? 'none' : 'block'
  }
})
</script>

<style scoped>
.hs-popover {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 20px;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.12), 
    0 0 0 1px rgba(0, 0, 0, 0.05);
  user-select: none;
  pointer-events: auto;
}

.hs-popover__arrow {
  position: absolute;
  width: 14px;
  height: 14px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px) saturate(180%);
  z-index: -1;
  border-right: 1px solid rgba(0,0,0,0.08);
  border-bottom: 1px solid rgba(0,0,0,0.08);
}

.hs-popover__close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 50%;
  color: #1d1d1f;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.165, 0.84, 0.44, 1);
  z-index: 10;
}
.hs-popover__close:hover {
  background: rgba(0, 0, 0, 0.1);
  transform: scale(1.1);
}

.hs-popover__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.hs-popover__tag {
  background: #f5f5f7;
  color: #1d1d1f;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 100px;
  display: inline-flex;
  align-items: center;
  border: 1px solid #d2d2d7;
}

.hs-popover__body {
  padding: 20px 16px 16px;
}

.hs-popover__top {
  display: flex;
  align-items: center;
  justify-content: flex-start; /* Changed from space-between */
  margin-bottom: 12px;
  gap: 8px;
  padding-right: 36px; /* Space for close button */
}

.hs-popover__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 8px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.hs-popover__status {
  font-size: 10px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 6px;
  text-transform: uppercase;
  white-space: nowrap;
}

.hs-popover__title {
  font-size: 18px;
  font-weight: 800;
  color: #111827;
  margin: 0 0 12px;
  line-height: 1.2;
}

.hs-popover__meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px;
  background: #f9fafb;
  border-radius: 10px;
}

.hs-popover__meta-item {
  display: flex;
  flex-direction: column;
}

.hs-popover__meta-key {
  font-size: 9px;
  color: #6b7280;
  text-transform: uppercase;
  font-weight: 600;
}

.hs-popover__meta-val {
  font-size: 13px;
  font-weight: 700;
  color: #1f2937;
}

.hs-popover__desc {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.5;
  margin: 0 0 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hs-popover__cta {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px 16px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.hs-popover__cta:hover {
  background: #1d4ed8;
}

/* Animations */
.hs-pop-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.hs-pop-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.hs-pop-enter-from,
.hs-pop-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(10px);
}
</style>

