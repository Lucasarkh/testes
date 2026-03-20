<template>
  <section
    class="v4-section v4-section-alt"
    id="categorias-destaque"
    :style="sectionStyle"
  >
    <div class="v4-container">
      <div class="v4-section-header v4-lots-carousel-header">
        <h2 class="v4-section-title"></h2>
        <p class="v4-section-subtitle"></p>
        <div class="v4-lots-carousel-header-content">
          <h2 class="v4-section-title">{{ config.title }}</h2>
          <p class="v4-section-subtitle">{{ config.subtitle }}</p>
        </div>
      </div>
    </div>

    <ClientOnly>
      <div class="v4-lots-carousel-bleed">
        <Swiper
          class="v4-lots-swiper"
          :modules="modules"
          :autoplay="autoplay"
          :breakpoints="breakpoints"
          :grab-cursor="true"
          :loop="shouldLoop"
          :slides-per-view="1.05"
          :space-between="14"
          :speed="300"
          :watch-overflow="true"
        >
          <SwiperSlide v-for="category in categories" :key="category.id">
            <NuxtLink :to="categoryPageUrl(category)" class="v4-lot-card v4-lot-card--compact v4-category-lot-card">
              <div class="v4-category-lot-card__media" :class="{ 'has-image': !!category.imageUrl }">
                <img v-if="category.imageUrl" :src="category.imageUrl" :alt="`Imagem da categoria ${category.name}`" />
                <div v-else class="v4-category-lot-card__placeholder">
                  <i class="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i>
                </div>
              </div>
              <div class="v4-lot-card-header v4-lot-card-header--compact v4-category-lot-card__header">
                <div class="v4-lot-id v4-lot-id--compact v4-category-lot-card__id">
                  <span class="v4-lot-code v4-lot-code--compact">{{ category.name }}</span>
                </div>
                <div class="v4-lot-status v4-category-lot-card__status">{{ category.availableLots }} lotes</div>
              </div>

              <div v-if="category.description" class="v4-lot-mini-meta v4-category-lot-card__meta">
                <span>{{ category.description }}</span>
              </div>

              <div class="v4-category-lot-card__chips" v-if="category.teaserLots.length">
                <span v-for="code in category.teaserLots" :key="`${category.id}-${code}`">{{ code }}</span>
              </div>

              <div class="v4-lot-card-footer v4-lot-card-footer--compact v4-category-lot-card__footer">Abrir categoria <span class="v4-icon">→</span></div>
            </NuxtLink>
          </SwiperSlide>
        </Swiper>
      </div>
      <template #fallback>
        <div class="v4-lots-carousel-bleed">
          <div class="v4-lots-carousel-fallback v4-lots-carousel-fallback--categories">
            <NuxtLink
              v-for="category in categories.slice(0, 4)"
              :key="category.id"
              :to="categoryPageUrl(category)"
              class="v4-lot-card v4-lot-card--compact v4-lot-card--fallback v4-category-lot-card"
            >
              <div class="v4-category-lot-card__media" :class="{ 'has-image': !!category.imageUrl }">
                <img v-if="category.imageUrl" :src="category.imageUrl" :alt="`Imagem da categoria ${category.name}`" />
                <div v-else class="v4-category-lot-card__placeholder">
                  <i class="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i>
                </div>
              </div>
              <div class="v4-lot-card-header v4-lot-card-header--compact v4-category-lot-card__header">
                <div class="v4-lot-id v4-lot-id--compact v4-category-lot-card__id">
                  <span class="v4-lot-code v4-lot-code--compact">{{ category.name }}</span>
                </div>
                <div class="v4-lot-status v4-category-lot-card__status">{{ category.availableLots }} lotes</div>
              </div>

              <div v-if="category.description" class="v4-lot-mini-meta v4-category-lot-card__meta">
                <span>{{ category.description }}</span>
              </div>

              <div class="v4-lot-card-footer v4-lot-card-footer--compact v4-category-lot-card__footer">Abrir categoria <span class="v4-icon">→</span></div>
            </NuxtLink>
          </div>
        </div>
      </template>
    </ClientOnly>

    <div class="v4-container">
      <div class="v4-lots-carousel-footer v4-lots-carousel-footer--categories">
        <div class="v4-lots-carousel-cta">
          <NuxtLink :to="categoriesUrl" class="v4-btn-primary v4-lots-carousel-cta-btn">
            Ver todas as categorias
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/css'

const props = defineProps<{
  categories: any[]
  config: any
  shouldLoop: boolean
  autoplay: any
  breakpoints: any
  modules: any[]
  categoriesUrl: string
  sectionStyle: Record<string, string>
  project: any
  pathPrefix: string
  corretorCode: string
  isPreview: boolean
  projectUrl: string
}>()

const categoryPageUrl = (category: any) => {
  if (props.isPreview) return props.projectUrl
  const base = `${props.pathPrefix}/categorias/${encodeURIComponent(category.slug || category.id)}`
  return props.corretorCode ? `${base}${base.includes('?') ? '&' : '?'}c=${props.corretorCode}` : base
}
</script>

<style scoped>
.v4-lots-carousel-header {
  margin-bottom: 40px;
  justify-content: center;
  text-align: center;
}

.v4-lots-carousel-header .v4-section-title {
  width: 100%;
  text-align: center;
}

@media (max-width: 768px) {
  .v4-lots-carousel-header {
    margin-bottom: 24px;
  }
}

.v4-lots-carousel-bleed {
  width: 100%;
  margin: 24px 0;
  padding: 4px 0 6px;
  position: relative;
}

.v4-lots-carousel-bleed::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 32px;
  background: linear-gradient(to right, transparent, var(--v4-section-alt-bg, #f7f8fb));
  pointer-events: none;
  z-index: 2;
}

.v4-lots-swiper {
  padding: 0 24px 4px;
}

.v4-lots-swiper :deep(.swiper-slide) {
  height: auto;
}

.v4-lots-carousel-fallback {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 0 24px 4px;
  scrollbar-width: none;
}

.v4-lots-carousel-fallback::-webkit-scrollbar {
  display: none;
}

.v4-lots-carousel-fallback--categories {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.v4-lots-carousel-footer--categories {
  justify-content: flex-end;
}

.v4-lot-card {
  background: white;
  border-radius: var(--v4-radius-lg);
  padding: 32px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #cacaca;
  display: flex;
  flex-direction: column;
  position: relative;
}

.v4-lot-card--compact {
  min-height: 148px;
  padding: 16px 16px 14px;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid #eef1f5;
}

.v4-lot-card--fallback {
  min-width: min(48vw, 200px);
  flex: 0 0 min(48vw, 200px);
}

.v4-lot-card:not(.v4-featured-lot-card):hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: color-mix(in srgb, var(--v4-primary) 50%, transparent);
}

.v4-lot-card-header--compact {
  margin-bottom: 2px;
  gap: 8px;
  align-items: flex-start;
  width: 100%;
  display: flex;
  justify-content: space-between;
}

.v4-lot-id--compact {
  display: flex;
  flex: 1 1 auto;
  gap: 4px;
  min-width: 0;
}

.v4-lot-code--compact {
  display: block;
  max-width: 100%;
  font-size: 22px;
  line-height: 1.15;
  letter-spacing: -0.035em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  overflow-wrap: normal;
}

.v4-lot-status {
  flex-shrink: 0;
  font-size: 8px;
  font-weight: 600;
  color: #3a9d6a;
  background: rgba(34, 153, 90, 0.06);
  border: 1px solid rgba(34, 153, 90, 0.10);
  padding: 4px 8px;
  border-radius: 100px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.v4-lot-mini-meta {
  font-size: 10px;
  font-weight: 600;
  color: var(--v4-text-muted);
  min-height: 0;
  line-height: 1.4;
  margin-top: 2px;
}

.v4-lot-card-footer--compact {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid #eef1f5;
  font-size: 11.5px;
  justify-content: space-between;
  display: flex;
  align-items: center;
  color: var(--v4-primary);
  font-weight: 600;
}

.v4-lots-carousel-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 48px;
  text-align: center;
}

.v4-lots-carousel-cta {
  display: flex;
  justify-content: center;
  width: 100%;
}

.v4-lots-carousel-cta-btn {
  min-width: 280px;
  text-decoration: none;
  text-align: center;
}

.v4-category-lot-card {
  gap: 10px;
}

.v4-category-lot-card__media {
  display: block;
  width: calc(100% + 32px);
  height: 150px;
  margin: -16px -16px 2px;
  background: linear-gradient(135deg, rgba(24, 54, 88, 0.88) 0%, rgba(13, 21, 34, 0.94) 100%);
  overflow: hidden;
  border-radius: 16px 16px 0px 0px;
}

.v4-category-lot-card__media.has-image {
  background: #cbd5e1;
}

.v4-category-lot-card__media img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.v4-category-lot-card__placeholder {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.74);
  font-size: 1.45rem;
}

.v4-category-lot-card__header {
  margin-bottom: 0;
}

.v4-category-lot-card__id {
  align-items: flex-start;
}

.v4-category-lot-card__status {
  background: #f3f4f6;
  color: var(--v4-text-muted);
}

.v4-category-lot-card__meta {
  min-height: 40px;
  color: var(--v4-text-muted);
}

.v4-category-lot-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.v4-category-lot-card__chips span {
  padding: 5px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #374151;
  font-size: 0.7rem;
  font-weight: 700;
}

.v4-category-lot-card__footer {
  color: #0071e3;
}

@media (max-width: 768px) {
  .v4-lots-carousel-fallback--categories {
    grid-template-columns: 1fr;
  }

  .v4-category-lot-card__media {
    width: calc(100% + 26px);
    height: 82px;
    margin: -14px -13px 2px;
  }

  .v4-lot-card-header--compact {
    flex-direction: row;
    align-items: flex-start;
  }

  .v4-lots-swiper {
    padding: 0 12px 4px;
  }

  .v4-lots-carousel-fallback {
    padding: 0 12px 4px;
  }

  .v4-lot-card--compact {
    min-height: 136px;
    padding: 14px 13px 12px;
  }

  .v4-lot-code--compact {
    font-size: 20px;
    line-height: 1.15;
  }

  .v4-lots-carousel-footer {
    margin-top: 32px;
  }

  .v4-lots-carousel-cta-btn {
    width: 100%;
    min-width: 0;
  }

  .v4-lot-status {
    font-size: 8px;
    padding: 3px 7px;
    position: static;
    align-self: flex-start;
  }

  .v4-lot-card {
    padding: 16px;
    border-radius: 16px;
    gap: 8px;
  }
}
</style>
