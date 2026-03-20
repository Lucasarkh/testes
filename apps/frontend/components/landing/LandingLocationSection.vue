<script setup lang="ts">
defineProps<{
  address: string | null
  googleMapsEmbedUrl: string
  project: any
  sectionStyle: Record<string, string>
}>()
</script>

<template>
  <section class="v4-section" id="localizacao" :style="sectionStyle">
    <div class="v4-container">
      <div class="v4-section-header center">
        <h2 class="v4-section-title">Nossa Localização</h2>
        <p v-if="address" class="v4-section-subtitle" style="max-width: 600px; margin: 0 auto;">{{ address }}</p>
      </div>

      <div v-if="googleMapsEmbedUrl" class="v4-map-wrapper" style="margin-top: 40px; border-radius: 16px; overflow: hidden; box-shadow: var(--v4-shadow-elevated);">
        <iframe
          :src="googleMapsEmbedUrl"
          width="100%"
          height="450"
          style="border:0; display: block;"
          :allowfullscreen="true"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Map Container */
.v4-map-container {
  background: white;
  border-radius: var(--v4-radius-lg);
  overflow: hidden;
  box-shadow: var(--v4-shadow-soft);
  border: 1px solid var(--v4-border);
}

.v4-map-legend {
  padding: 24px;
  border-bottom: 1px solid var(--v4-border);
  display: flex;
  justify-content: center;
  gap: 32px;
}

.v4-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--v4-text-muted);
}

.v4-legend-item .dot { width: 8px; height: 8px; border-radius: 50%; }
.v4-legend-item .dot.available { background: #32d74b; }
.v4-legend-item .dot.reserved { background: #ff9f0a; }
.v4-legend-item .dot.sold { background: #ff453a; }

.v4-map-viewport {
  background: #fafafa;
  min-height: 500px;
}
</style>
