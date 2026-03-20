<script setup lang="ts">
defineProps<{
  locationTitle: string
  locationSubtitle: string
  formattedLocationText: string
  hasLocationHeader: boolean
  sectionStyle: Record<string, string>
}>()
</script>

<template>
  <section class="v4-section" id="info" :style="sectionStyle">
    <div class="v4-container">
      <div v-if="hasLocationHeader" class="v4-section-header center v4-description-header">
        <h2 v-if="locationTitle" class="v4-section-title">{{ locationTitle }}</h2>
        <p v-if="locationSubtitle" class="v4-section-subtitle">{{ locationSubtitle }}</p>
      </div>

      <div v-if="formattedLocationText" class="v4-rich-content" v-html="formattedLocationText" style="margin-bottom: 80px;"></div>
    </div>
  </section>
</template>

<style scoped>
.v4-description-header {
  margin-bottom: 24px;
}

.v4-rich-content {
  font-size: 19px;
  line-height: 1.6;
  color: var(--v4-text);
  max-width: 800px;
  margin: 0 auto 32px;
}

.v4-rich-content :deep(p), .v4-rich-content :deep(div) {
  margin-bottom: 20px;
}

.v4-rich-content :deep(ul) {
  padding-left: 24px;
  margin-bottom: 20px;
  list-style-type: disc;
}

.v4-rich-content :deep(li) {
  margin-bottom: 8px;
}

.v4-rich-content :deep(strong), .v4-rich-content :deep(b) {
  font-weight: 700;
  color: #000;
}

@media (max-width: 768px) {
  .v4-rich-content { font-size: 17px; padding: 0 20px; }
}
</style>
