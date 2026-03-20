<template>
  <section id="inicio" class="v4-hero" :class="{ 'has-banner': hasHeroBanner }">
    <div v-if="hasHeroBanner" class="v4-hero-bg" :style="heroBackgroundStyle"></div>
    <div class="v4-hero-overlay"></div>

    <div class="v4-container">
      <div class="v4-hero-content">
        <div class="v4-hero-text">
          <span class="v4-hero-tag">{{ heroTagLabel }}</span>
          <h1 class="v4-hero-title text-balance">{{ project.name }}</h1>
          <p v-if="project.description" class="v4-hero-desc text-balance">{{ project.description }}</p>
          <div class="v4-hero-actions">
            <a href="#planta" class="v4-btn-primary v4-hero-btn" @click="tracking.trackClick('Botão: Ver Planta Interativa')">Ver Planta Interativa</a>
            <NuxtLink to="/sou-cliente" class="v4-btn-white v4-hero-btn" @click="tracking.trackClick('Botão: Sou Cliente')">Sou cliente</NuxtLink>
            <a v-if="schedulingEnabled" href="#agendamento" class="v4-btn-white v4-hero-btn" @click="tracking.trackClick('Botão: Agendar Visita')">Agendar Visita</a>
            <a href="#contato" class="v4-btn-white v4-hero-btn" @click="tracking.trackClick(heroContactTrackingLabel)">{{ heroContactLabel }}</a>
          </div>
        </div>

        <div class="v4-hero-stats">
          <div class="v4-stat-card">
            <span class="v4-stat-label">Lotes Disponíveis</span>
            <span class="v4-stat-value">{{ availableLots }}</span>
          </div>
          <div v-if="minArea" class="v4-stat-card">
            <span class="v4-stat-label">Área a partir de</span>
            <span class="v4-stat-value">{{ minArea }}<small>m²</small></span>
          </div>
          <div v-if="priceRange" class="v4-stat-card v4-stat-card--price">
            <span class="v4-stat-label">Preços a partir de</span>
            <span class="v4-stat-value">{{ priceRange }}</span>
            <div v-if="project.maxInstallments || project.paymentConditionsSummary" class="v4-stat-meta">
              <span v-if="project.maxInstallments" class="v4-stat-installments">em até {{ project.maxInstallments }}x</span>
              <p v-if="project.paymentConditionsSummary" class="v4-stat-summary">{{ project.paymentConditionsSummary }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTracking } from '~/composables/useTracking'

const props = defineProps<{
  project: any
  hasHeroBanner: boolean
  heroBackgroundStyle: Record<string, string>
  heroTagLabel: string
  availableLots: number
  minArea: number | null
  priceRange: string | null
  schedulingEnabled: boolean
  heroContactLabel: string
  heroContactTrackingLabel: string
}>()

const tracking = useTracking()
</script>

<style scoped>
/* Navigation & Hero */
.v4-hero {
  position: relative;
  background: #000;
  color: white;
  overflow: hidden;
  min-height: 85vh;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 0 0 0;
}

.v4-hero-bg {
  position: absolute;
  inset: 0;
  background-image: var(--v4-hero-bg-desktop);
  background-size: cover;
  background-position: center;
  z-index: 1;
  opacity: 1;
  transition: all 0.5s ease;
}

@media (max-width: 1024px) {
  .v4-hero-bg {
    background-image: var(--v4-hero-bg-tablet, var(--v4-hero-bg-desktop));
  }
}

@media (max-width: 768px) {
  .v4-hero-bg {
    background-image: var(--v4-hero-bg-mobile, var(--v4-hero-bg-tablet, var(--v4-hero-bg-desktop)));
  }
}

.v4-hero.has-banner .v4-hero-bg {
  filter: brightness(0.9);
  transform: none;
}

.v4-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.15) 100%);
  z-index: 2;
}

.v4-hero.has-banner .v4-hero-overlay {
  background: linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.1) 70%, transparent 100%);
}

.v4-hero-content {
  position: relative;
  z-index: 3;
  width: 100%;
  padding: 48px 0 56px;
  display: flex;
  align-items: flex-end;
  gap: 48px;
}

.v4-hero-text {
  flex: 1;
  min-width: 0;
}

.v4-hero-tag {
  display: inline-block;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 16px;
  background: var(--v4-primary);
  padding: 6px 16px;
  border-radius: 100px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
}

.v4-hero-title {
  font-size: clamp(32px, 6vw, 64px);
  font-weight: 700;
  text-wrap: pretty;
  line-height: 1;
  margin-bottom: 20px;
  color: #ffffff;
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
  text-transform: uppercase;
}

.v4-hero-desc {
  font-size: clamp(15px, 2vw, 18px);
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 28px;
  max-width: 560px;
  line-height: 1.5;
}

/* Hero Stats — vertical stack on the right */
.v4-hero-stats {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-left: 40px;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  margin-bottom: 8px;
}

.v4-stat-card {
  text-align: left;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.v4-stat-label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
  font-weight: 700;
}

.v4-stat-value {
  font-size: 40px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
  letter-spacing: -0.02em;
}

.v4-stat-value small {
  font-size: 0.55em;
  font-weight: 500;
  opacity: 0.8;
  vertical-align: middle;
}

.v4-stat-meta {
  margin-top: 12px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
  max-width: 200px;
}

.v4-stat-installments {
  font-weight: 700;
  color: #32d74b;
  display: block;
  font-size: 16px;
  margin-bottom: 4px;
}

.v4-stat-summary {
  margin-top: 2px;
  opacity: 0.8;
  color: #fff;
}

.v4-hero-actions {
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

/* Buttons */
.v4-btn-primary {
  background: var(--v4-primary);
  color: white;
  padding: 12px 28px;
  border-radius: 100px;
  font-weight: 500;
  font-size: 17px;
  text-decoration: none;
  transition: background 0.3s;
}

.v4-btn-white {
  background: white;
  color: #1d1d1f;
  padding: 12px 28px;
  border-radius: 100px;
  font-weight: 500;
  font-size: 17px;
  text-decoration: none;
  transition: all 0.3s;
  box-shadow: 0 4px 14px rgba(0,0,0,0.15);
}

.v4-btn-primary:hover { background: var(--v4-primary-hover); transform: translateY(-1px); }
.v4-btn-white:hover { background: #f5f5f7; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.2); }

/* Responsive tweaks and improvements */
@media (max-width: 768px) {
  .v4-hero {
    min-height: 580px;
    align-items: flex-end;
  }

  .v4-hero-content {
    flex-direction: column;
    align-items: stretch;
    gap: 20px;
    padding: 22px 0 32px;
  }

  .v4-hero-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .v4-hero-tag { margin-bottom: 12px; }
  .v4-hero-title { font-size: 34px; margin-bottom: 10px; }
  .v4-hero-desc { font-size: 15px; margin-bottom: 16px; max-width: 34ch; }

  .v4-hero-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    border-left: none;
    border-top: 1px solid rgba(255,255,255,0.15);
    padding-left: 0;
    padding-top: 14px;
    gap: 14px 12px;
    width: 100%;
    margin-bottom: 0;
  }

  .v4-stat-card {
    min-width: 0;
    align-items: center;
    text-align: center;
    width: 100%;
  }

  .v4-stat-card--price { grid-column: 1 / -1; }
  .v4-stat-label { font-size: 9px; }
  .v4-stat-value { font-size: 34px; }
  .v4-stat-meta { display: none; }

  .v4-hero-actions {
    flex-direction: column;
    width: 100%;
    gap: 10px;
    max-width: 340px;
  }

  .v4-hero-btn,
  .v4-btn-primary,
  .v4-btn-white {
    width: 100%;
    text-align: center;
    font-size: 16px;
    padding: 13px 16px;
  }
}
</style>
