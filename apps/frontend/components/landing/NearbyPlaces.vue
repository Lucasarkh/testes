<template>
  <section v-if="visible" class="v4-section v4-section-alt" id="proximidades">
    <div class="v4-container">
      <div class="v4-section-header center">
        <h2 class="v4-section-title">Proximidades do Empreendimento</h2>
        <p class="v4-section-subtitle">
          Distâncias estimadas a partir do endereço do empreendimento.
        </p>
      </div>

      <div class="nearby-grid">
        <div v-for="group in groupedItems" :key="group.category" class="nearby-category">
          <div class="nearby-category-header">
            <span class="nearby-category-icon">{{ categoryIcon(group.category) }}</span>
            <h3 class="nearby-category-title">{{ group.categoryLabel }}</h3>
          </div>

          <div class="nearby-items">
            <div v-for="item in group.items" :key="item.name" class="nearby-item">
              <div class="nearby-item-info">
                <span class="nearby-item-name">{{ item.name }}</span>
                <span class="nearby-item-meta">
                  <span class="nearby-meta-distance">{{ item.distanceLabel }}</span>
                  <span v-if="item.drivingLabel" class="nearby-meta-chip"><span class="nearby-meta-emoji">🚗</span> {{ item.drivingLabel }}</span>
                  <span v-if="item.walkingLabel" class="nearby-meta-chip"><span class="nearby-meta-emoji">🚶</span> {{ item.walkingLabel }}</span>
                </span>
              </div>
              <a
                :href="item.routeUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="nearby-route-btn"
                title="Ver rota no Google Maps"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                <span class="nearby-route-label">Ver rota</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps<{
  projectSlug: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

interface NearbyItem {
  category: string
  categoryLabel: string
  name: string
  distanceLabel: string
  drivingLabel: string | null
  walkingLabel: string | null
  shortAddress: string | null
  routeUrl: string
}

interface NearbyResponse {
  enabled: boolean
  center: { lat: number; lng: number } | null
  radiusMeters: number
  items: NearbyItem[]
}

const { fetchPublic } = usePublicApi()
const data = ref<NearbyResponse | null>(null)
const visible = computed(() => !!(data.value?.enabled && data.value?.items?.length))

watch(visible, (val) => emit('update:visible', val), { immediate: true })

const groupedItems = computed(() => {
  if (!data.value?.items?.length) return []

  const groups: Record<string, { category: string; categoryLabel: string; items: NearbyItem[] }> = {}

  for (const item of data.value.items) {
    if (!groups[item.category]) {
      groups[item.category] = {
        category: item.category,
        categoryLabel: item.categoryLabel,
        items: [],
      }
    }
    groups[item.category].items.push(item)
  }

  return Object.values(groups)
})

const ICONS: Record<string, string> = {
  school: '🎓',
  supermarket: '🛒',
  pharmacy: '💊',
  hospital: '🏥',
  park: '🌳',
  restaurant: '🍽️',
  gym: '🏋️',
  shopping_mall: '🛍️',
}

const categoryIcon = (category: string) => ICONS[category] || '📍'

async function loadNearby() {
  if (!props.projectSlug) return
  try {
    data.value = await fetchPublic(`/p/${props.projectSlug}/nearby`)
  } catch {
    // Section won't show
  }
}

onMounted(loadNearby)
watch(() => props.projectSlug, loadNearby)
</script>

<style scoped>
/* ========================================
   Base Design-System tokens (mirrored from
   ProjectLandingView scoped styles so they
   apply inside this child component)
   ======================================== */

.v4-container {
  max-width: 1040px;
  margin: 0 auto;
  padding: 0 40px;
}

.v4-section-header {
  margin-bottom: 56px;
  max-width: 800px;
}

.v4-section-header.center {
  margin-inline: auto;
  text-align: center;
}

.v4-section-title {
  font-size: 40px;
  font-weight: 600;
  letter-spacing: -0.003em;
  line-height: 1.1;
  margin-bottom: 12px;
  color: var(--v4-text, #1d1d1f);
}

.v4-section-subtitle {
  font-size: 21px;
  line-height: 1.38105;
  color: var(--v4-text-muted, #86868b);
  font-weight: 400;
}

/* ========================================
   Grid — 2 cols on desktop, 1 col mobile
   ======================================== */
.nearby-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

/* ========================================
   Category card
   ======================================== */
.nearby-category {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  padding: 28px 28px 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.nearby-category:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

/* ========================================
   Category header
   ======================================== */
.nearby-category-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.nearby-category-icon {
  font-size: 1.25rem;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--v4-bg-alt, #f5f5f7);
  border-radius: 10px;
  flex-shrink: 0;
}

.nearby-category-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--v4-text, #1d1d1f);
  margin: 0;
  letter-spacing: -0.01em;
}

/* ========================================
   Items list
   ======================================== */
.nearby-items {
  display: flex;
  flex-direction: column;
}

.nearby-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
}

.nearby-item:not(:last-child) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.nearby-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.nearby-item-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--v4-text, #1d1d1f);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ========================================
   Meta chips
   ======================================== */
.nearby-item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--v4-text-muted, #86868b);
  line-height: 1;
}

.nearby-meta-distance {
  font-weight: 500;
  color: var(--v4-text-muted, #86868b);
}

.nearby-meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
}

.nearby-meta-emoji {
  font-size: 12px;
}

/* ========================================
   Route button
   ======================================== */
.nearby-route-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--v4-primary, #0071e3);
  background: rgba(0, 113, 227, 0.06);
  border-radius: 8px;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s;
  flex-shrink: 0;
}

.nearby-route-btn:hover {
  background: rgba(0, 113, 227, 0.12);
}

.nearby-route-btn svg {
  width: 13px;
  height: 13px;
}

/* ========================================
   Responsive — tablet (≤ 768px)
   ======================================== */
@media (max-width: 768px) {
  .v4-container {
    padding: 0 20px;
  }

  .v4-section-header {
    margin-bottom: 32px;
  }

  .v4-section-title {
    font-size: 28px;
  }

  .v4-section-subtitle {
    font-size: 17px;
  }

  .nearby-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .nearby-category {
    padding: 22px;
  }
}

/* ========================================
   Responsive — small mobile (≤ 480px)
   ======================================== */
@media (max-width: 480px) {
  .nearby-category {
    padding: 18px;
    border-radius: 14px;
  }

  .nearby-route-label {
    display: none;
  }

  .nearby-route-btn {
    padding: 7px;
    border-radius: 50%;
    min-width: 30px;
    min-height: 30px;
    justify-content: center;
  }

  .nearby-item-name {
    font-size: 14px;
  }

  .nearby-meta-chip {
    font-size: 11px;
    padding: 2px 6px;
  }
}
</style>
