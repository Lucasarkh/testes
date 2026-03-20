<template>
  <section class="v4-section v4-section-alt" id="carrossel-lotes" :style="sectionStyle">
    <div class="v4-container">
      <div class="v4-section-header v4-lots-carousel-header">
        <h2 class="v4-section-title"></h2>
        <p class="v4-section-subtitle"></p>
        <div class="v4-lots-carousel-header-content">
          <h2 class="v4-section-title">Explore as Melhores Oportunidades</h2>
          <p class="v4-section-subtitle">Encontre o lote ideal com as características que você busca.</p>
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
          :slides-per-view="1.85"
          :space-between="16"
          :speed="520"
          :watch-overflow="true"
          @swiper="onSwiperInit"
          @slideChange="onSlideChange"
        >
          <SwiperSlide v-for="lot in displayedLots" :key="availableLotSlideKey(lot)">
            <NuxtLink
              :to="lotPageUrl(lot)"
              class="v4-lot-card"
              @click="tracking.trackLotClick(lot.code || lot.name || lot.id, lot.id)"
            >
              <div class="v4-lot-card-header">
                <div class="v4-lot-id">
                  <span v-if="!resolveLandingLotSecondaryLabel(lot)" class="v4-lot-label">Unidade disponível</span>
                  <span class="v4-lot-code">{{ resolveLandingLotDisplayName(lot) }}</span>
                </div>
                <div class="v4-lot-status">Disponível</div>
              </div>

              <div class="v4-lot-card-body">
                <div class="v4-lot-info-row">
                  <span class="v4-info-item"><i class="bi bi-bounding-box" aria-hidden="true"></i> {{ formatLandingLotArea(lot) }}</span>
                  <span v-if="lot.lotDetails?.pricePerM2" class="v4-info-item"><i class="bi bi-cash-stack" aria-hidden="true"></i> {{ formatCurrencyToBrasilia(lot.lotDetails.pricePerM2) }} / m²</span>
                  <span v-else-if="lot.lotDetails?.frontage" class="v4-info-item">↔ {{ lot.lotDetails.frontage }}m frente</span>
                </div>
                <div class="v4-lot-price">
                  <span class="v4-price-label">Valor do investimento</span>
                  <span class="v4-price-value">{{ formatLandingLotPrice(lot) }}</span>
                </div>
              </div>

              <div class="v4-lot-card-footer">
                <span>Ver detalhes do lote</span>
                <span class="v4-icon">→</span>
              </div>
            </NuxtLink>
          </SwiperSlide>
        </Swiper>
      </div>
      <template #fallback>
        <div class="v4-lots-carousel-bleed">
          <div class="v4-lots-carousel-fallback">
            <NuxtLink
              v-for="lot in displayedLots.slice(0, 6)"
              :key="availableLotSlideKey(lot)"
              :to="lotPageUrl(lot)"
              class="v4-lot-card"
              @click="tracking.trackLotClick(lot.code || lot.name || lot.id, lot.id)"
            >
              <div class="v4-lot-card-header">
                <div class="v4-lot-id">
                  <span v-if="!resolveLandingLotSecondaryLabel(lot)" class="v4-lot-label">Unidade disponível</span>
                  <span class="v4-lot-code">{{ resolveLandingLotDisplayName(lot) }}</span>
                </div>
                <div class="v4-lot-status">Disponível</div>
              </div>

              <div class="v4-lot-card-body">
                <div class="v4-lot-info-row">
                  <span class="v4-info-item"><i class="bi bi-bounding-box" aria-hidden="true"></i> {{ formatLandingLotArea(lot) }}</span>
                  <span v-if="lot.lotDetails?.pricePerM2" class="v4-info-item"><i class="bi bi-cash-stack" aria-hidden="true"></i> {{ formatCurrencyToBrasilia(lot.lotDetails.pricePerM2) }} / m²</span>
                  <span v-else-if="lot.lotDetails?.frontage" class="v4-info-item">↔ {{ lot.lotDetails.frontage }}m frente</span>
                </div>
                <div class="v4-lot-price">
                  <span class="v4-price-label">Valor do investimento</span>
                  <span class="v4-price-value">{{ formatLandingLotPrice(lot) }}</span>
                </div>
              </div>

              <div class="v4-lot-card-footer">
                <span>Ver detalhes do lote</span>
                <span class="v4-icon">→</span>
              </div>
            </NuxtLink>
          </div>
        </div>
      </template>
    </ClientOnly>

    <div class="v4-container">
      <div class="v4-lots-carousel-footer">
        <span v-if="loading && hasMore" class="v4-lots-carousel-status">
          Carregando mais unidades...
        </span>
        <span v-else-if="error && !displayedLots.length" class="v4-lots-carousel-status v4-lots-carousel-status--error">
          {{ error }}
        </span>

        <div v-if="(project?.lotSummary?.available ?? 0) > 6" class="v4-lots-carousel-cta">
          <NuxtLink :to="unitsUrl" class="v4-btn-primary v4-lots-carousel-cta-btn" @click="tracking.trackClick('Botão: Ver todas unidades')">
            Ver todos os {{ project?.lotSummary?.available ?? 0 }} lotes disponíveis
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Swiper, SwiperSlide } from 'swiper/vue'
import type { Swiper as SwiperInstance } from 'swiper'
import 'swiper/css'
import { useTracking } from '~/composables/useTracking'
import { buildLotPageUrl } from '~/utils/landingUrls'
import { formatCurrencyToBrasilia } from '~/utils/money'
import {
  availableLotSlideKey,
  resolveLandingLotDisplayName,
  resolveLandingLotSecondaryLabel,
  formatLandingLotArea,
  formatLandingLotPrice,
} from '~/utils/landingLot'

const props = defineProps<{
  project: any
  displayedLots: any[]
  loading: boolean
  error: string
  hasMore: boolean
  shouldLoop: boolean
  modules: any[]
  autoplay: any
  breakpoints: any
  unitsUrl: string
  sectionStyle: Record<string, string>
  pathPrefix: string
  corretorCode: string
}>()

const emit = defineEmits<{
  'swiper-init': [instance: SwiperInstance]
  'slide-change': [instance: SwiperInstance]
}>()

const tracking = useTracking()

const lotPageUrl = (lot: any) => buildLotPageUrl(lot, props.pathPrefix, props.corretorCode)

const onSwiperInit = (instance: SwiperInstance) => {
  emit('swiper-init', instance)
}

const onSlideChange = (instance: SwiperInstance) => {
  emit('slide-change', instance)
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

.v4-lot-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: color-mix(in srgb, var(--v4-primary) 50%, transparent);
}

.v4-lot-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-direction: column-reverse;
  gap: 8px;
}

@media (max-width: 768px) {
  .v4-lot-card-header {
    margin-bottom: 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

.v4-lot-id {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.v4-lot-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--v4-text-muted);
  letter-spacing: 0.08em;
  line-height: 1.2;
}

@media (max-width: 768px) {
  .v4-lot-label { font-size: 9px; }
}

.v4-lot-code {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: var(--v4-text);
}

@media (max-width: 768px) {
  .v4-lot-code { font-size: 18px; line-height: 1.2; }
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

@media (max-width: 768px) {
  .v4-lot-status {
    font-size: 8px;
    padding: 3px 7px;
    position: static;
    align-self: flex-start;
  }
}

.v4-lot-info-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  color: var(--v4-text-muted);
  font-size: 15px;
  align-items: center;
}

@media (max-width: 768px) {
  .v4-lot-info-row {
    gap: 8px;
    font-size: 12px;
    margin-bottom: 8px;
    flex-direction: column;
    align-items: flex-start;
  }
}

.v4-lot-price {
  display: flex;
  flex-direction: column;
  margin-top: auto;
  border-top: 1px solid #f5f5f7;
  padding-top: 20px;
}

@media (max-width: 768px) {
  .v4-lot-price { padding-top: 12px; margin-top: 4px; }
}

.v4-price-label { font-size: 12px; color: var(--v4-text-muted); }

@media (max-width: 768px) {
  .v4-price-label { font-size: 9px; margin-bottom: 2px; display: block; }
}

.v4-price-value { font-size: 20px; font-weight: 600; color: var(--v4-text); }

@media (max-width: 768px) {
  .v4-price-value { font-size: 15px; }
}

.v4-lot-card-footer {
  margin-top: 20px;
  font-size: 15px;
  color: var(--v4-primary);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@media (max-width: 768px) {
  .v4-lot-card-footer { display: none; }
  .v4-lot-card {
    padding: 16px;
    border-radius: 16px;
    gap: 8px;
  }
}

.v4-lots-carousel-status {
  font-size: 13px;
  font-weight: 600;
  color: var(--v4-text-muted);
  width: 100%;
  text-align: center;
}

.v4-lots-carousel-status--error {
  color: #c43d2f;
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

@media (max-width: 768px) {
  .v4-lots-carousel-header {
    margin-bottom: 24px;
  }

  .v4-lot-card-header {
    flex-direction: row;
    align-items: flex-start;
  }

  .v4-lots-swiper {
    padding: 0 12px 4px;
  }

  .v4-lots-carousel-fallback {
    padding: 0 12px 4px;
  }

  .v4-lot-mini-meta {
    font-size: 9px;
    min-height: 0;
  }

  .v4-lot-mini-stats {
    gap: 6px;
  }

  .v4-lot-mini-stat {
    padding: 6px 8px;
  }

  .v4-lot-mini-stat strong {
    font-size: 11px;
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
