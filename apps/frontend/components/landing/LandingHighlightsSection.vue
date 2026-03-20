<script setup lang="ts">
defineProps<{
  project: any
  highlights: any[]
  sectionStyle: Record<string, string>
}>()
</script>

<template>
  <section class="v4-section" id="destaques" :style="sectionStyle">
    <div v-if="highlights.length" class="v4-container">
      <div class="v4-destaques-grid-v2">
        <div class="v4-section-header center" style="margin-bottom: 56px;">
          <h2 class="v4-section-title">{{ project.traditionalHighlightsTitle || 'Destaques' }}</h2>
          <p class="v4-section-subtitle">{{ project.traditionalHighlightsSubtitle || 'Diferenciais pensados para o seu bem-estar.' }}</p>
        </div>

        <div class="v4-destaques-items">
          <div v-for="h in highlights" :key="h.label" class="v4-destaque-card-minimal">
            <div class="v4-destaque-marker-dot"></div>
            <div class="v4-destaque-info">
              <h4 class="v4-destaque-title">{{ h.label }}</h4>
              <p v-if="h.value" class="v4-destaque-detail">{{ h.value }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Traditional Highlights Grid v2 (Destaques) */
.v4-destaques-grid-v2 {
  max-width: 1000px;
  margin: 0 auto;
}

.v4-destaques-items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 40px 60px;
}

.v4-destaque-card-minimal {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.v4-destaque-marker-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--v4-primary);
  margin-top: 10px;
  flex-shrink: 0;
}

.v4-destaque-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.v4-destaque-title {
  font-size: 20px;
  font-weight: 500;
  color: var(--v4-text);
  margin: 0;
  letter-spacing: -0.01em;
}

.v4-destaque-detail {
  font-size: 16px;
  color: var(--v4-text-muted);
  line-height: 1.4;
  margin: 0;
}

@media (max-width: 768px) {
  .v4-destaques-items {
    grid-template-columns: 1fr;
    gap: 30px;
  }
}
</style>
