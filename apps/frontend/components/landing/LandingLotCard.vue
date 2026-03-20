<script setup lang="ts">
import {
  resolveLandingLotDisplayName,
  resolveLandingLotSecondaryLabel,
  formatLandingLotMeta,
  formatLandingLotArea,
  formatLandingLotPrice,
  featuredLotsStatusLabel,
  featuredLotsStatusClass,
} from '~/utils/landingLot'
import { formatCurrencyToBrasilia } from '~/utils/money'

const props = defineProps<{
  lot: any
  to: string
  variant: 'compact' | 'full' | 'featured'
  showCrown?: boolean
}>()

const tracking = useTracking()
</script>

<template>
  <!-- Compact variant (carousel) -->
  <NuxtLink
    v-if="variant === 'compact'"
    :to="to"
    class="v4-lot-card v4-lot-card--compact"
    @click="tracking.trackLotClick(lot.code || lot.name || lot.id, lot.id)"
  >
    <div class="v4-lot-card-header v4-lot-card-header--compact">
      <div class="v4-lot-id v4-lot-id--compact">
        <span class="v4-lot-code v4-lot-code--compact">{{ resolveLandingLotDisplayName(lot) }}</span>
      </div>
      <div class="v4-lot-status">Disponível</div>
    </div>

    <div v-if="formatLandingLotMeta(lot)" class="v4-lot-mini-meta">
      <span>{{ formatLandingLotMeta(lot) }}</span>
    </div>

    <div class="v4-lot-mini-stats">
      <div class="v4-lot-mini-stat">
        <span class="v4-lot-mini-stat-label">Tamanho total</span>
        <strong>{{ formatLandingLotArea(lot) }}</strong>
      </div>
      <div class="v4-lot-mini-stat">
        <span class="v4-lot-mini-stat-label">Valor total</span>
        <strong>{{ formatLandingLotPrice(lot) }}</strong>
      </div>
    </div>

    <div class="v4-lot-card-footer v4-lot-card-footer--compact">Detalhes <span class="v4-icon">&rarr;</span></div>
  </NuxtLink>

  <!-- Featured variant (featured carousel) -->
  <NuxtLink
    v-else-if="variant === 'featured'"
    :to="to"
    class="v4-lot-card v4-lot-card--compact v4-featured-lot-card"
    @click="tracking.trackLotClick(lot.code || lot.name || lot.id, lot.id)"
  >
    <div class="v4-lot-card-header v4-lot-card-header--compact">
      <div class="v4-lot-id v4-lot-id--compact">
        <span class="v4-lot-code v4-lot-code--compact">
          <span v-if="showCrown" class="v4-featured-lot-crown" aria-hidden="true">
            <img src="/img/crown.svg" alt="Lote em destaque" width="24" height="24" />
          </span>
          <span class="v4-featured-lot-code-text">{{ resolveLandingLotDisplayName(lot) }}</span>
        </span>
      </div>
      <div class="v4-lot-status" :class="featuredLotsStatusClass(lot)">{{ featuredLotsStatusLabel(lot) }}</div>
    </div>

    <div v-if="formatLandingLotMeta(lot)" class="v4-lot-mini-meta v4-featured-lot-card__meta">
      <span>{{ formatLandingLotMeta(lot) }}</span>
    </div>

    <div class="v4-lot-mini-stats v4-featured-lot-card__stats">
      <div class="v4-lot-mini-stat">
        <span class="v4-lot-mini-stat-label">Tamanho total</span>
        <strong>{{ formatLandingLotArea(lot) }}</strong>
      </div>
      <div class="v4-lot-mini-stat">
        <span class="v4-lot-mini-stat-label">Valor total</span>
        <strong>{{ formatLandingLotPrice(lot) }}</strong>
      </div>
    </div>

    <div class="v4-lot-card-footer v4-lot-card-footer--compact v4-featured-lot-card__footer">Detalhes <span class="v4-icon">&rarr;</span></div>
  </NuxtLink>

  <!-- Full variant (grid) -->
  <NuxtLink
    v-else
    :to="to"
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
        <span v-else-if="lot.lotDetails?.frontage" class="v4-info-item">&harr; {{ lot.lotDetails.frontage }}m frente</span>
      </div>
      <div class="v4-lot-price">
        <span class="v4-price-label">Valor do investimento</span>
        <span class="v4-price-value">{{ formatLandingLotPrice(lot) }}</span>
      </div>
    </div>

    <div class="v4-lot-card-footer">
      <span>Ver detalhes do lote</span>
      <span class="v4-icon">&rarr;</span>
    </div>
  </NuxtLink>
</template>

<style scoped>
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

.v4-lot-card:not(.v4-featured-lot-card):hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: color-mix(in srgb, var(--v4-primary) 50%, transparent);
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

.v4-featured-lot-card {
  position: relative;
  overflow: visible;
  padding: 16px 16px 14px;
  color: inherit;
  background: white;
  border: 1px solid #eef1f5;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.v4-featured-lot-card .v4-lot-label {
  color: var(--v4-text-muted);
}

.v4-featured-lot-card .v4-lot-code--compact {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--v4-text);
  font-weight: 700;
}

.v4-featured-lot-code-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.v4-lot-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-direction: column-reverse;
  gap: 8px;
}

.v4-lot-card-header--compact {
  margin-bottom: 2px;
  gap: 8px;
  align-items: flex-start;
  width: 100%;
}

.v4-lot-id {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.v4-lot-id--compact {
  display: flex;
  flex: 1 1 auto;
  gap: 4px;
  min-width: 0;
}

.v4-lot-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--v4-text-muted);
  letter-spacing: 0.08em;
  line-height: 1.2;
}

.v4-lot-code {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: var(--v4-text);
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

.v4-lot-status--available {
  color: #3a9d6a;
  background: rgba(34, 153, 90, 0.06);
  border-color: rgba(34, 153, 90, 0.10);
}

.v4-lot-status--reserved {
  color: #b7791f;
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.14);
}

.v4-lot-status--sold {
  color: #b91c1c;
  background: rgba(220, 38, 38, 0.08);
  border-color: rgba(220, 38, 38, 0.14);
}

.v4-lot-status--featured {
  color: #175cd3;
  background: rgba(23, 92, 211, 0.08);
  border-color: rgba(23, 92, 211, 0.14);
}

.v4-lot-mini-meta {
  font-size: 10px;
  font-weight: 600;
  color: var(--v4-text-muted);
  min-height: 0;
  line-height: 1.4;
  margin-top: 2px;
}

.v4-lot-mini-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.v4-lot-mini-stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 7px 10px;
  border-radius: 10px;
  background: #f7f8fb;
}

.v4-lot-mini-stat-label {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--v4-text-muted);
  line-height: 1.3;
}

.v4-lot-mini-stat strong {
  font-size: 12px;
  line-height: 1.3;
  color: var(--v4-text);
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

.v4-lot-card-footer--compact {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid #eef1f5;
  font-size: 11.5px;
  justify-content: space-between;
}

.v4-lot-info-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  color: var(--v4-text-muted);
  font-size: 15px;
  align-items: center;
}

.v4-lot-price {
  display: flex;
  flex-direction: column;
  margin-top: auto;
  border-top: 1px solid #f5f5f7;
  padding-top: 20px;
}

.v4-price-label { font-size: 12px; color: var(--v4-text-muted); }

.v4-price-value { font-size: 20px; font-weight: 600; color: var(--v4-text); }

@media (max-width: 768px) {
  .v4-lot-card-header {
    margin-bottom: 12px;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .v4-lot-card-header--compact {
    flex-direction: row;
    align-items: flex-start;
  }

  .v4-lot-card {
    padding: 16px;
    border-radius: 16px;
    gap: 8px;
  }

  .v4-lot-card--compact {
    min-height: 136px;
    padding: 14px 13px 12px;
  }

  .v4-featured-lot-card {
    padding: 14px 13px 12px;
  }

  .v4-lot-code--compact {
    font-size: 20px;
    line-height: 1.15;
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

  .v4-lot-label { font-size: 9px; }

  .v4-lot-code { font-size: 18px; line-height: 1.2; }

  .v4-lot-status {
    font-size: 8px;
    padding: 3px 7px;
    position: static;
    align-self: flex-start;
  }

  .v4-lot-info-row {
    gap: 8px;
    font-size: 12px;
    margin-bottom: 8px;
    flex-direction: column;
    align-items: flex-start;
  }

  .v4-lot-price { padding-top: 12px; margin-top: 4px; }

  .v4-price-label { font-size: 9px; margin-bottom: 2px; display: block; }

  .v4-price-value { font-size: 15px; }

  .v4-lot-card-footer { display: none; }
}
</style>
