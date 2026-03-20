<script setup lang="ts">
defineProps<{
  items: any[]
  project: any
  sectionStyle: Record<string, string>
}>()
</script>

<template>
  <section class="v4-section" id="obras" :style="sectionStyle">
    <div class="v4-container">
      <div class="v4-section-header center">
        <h2 class="v4-section-title">Acompanhamento de Obras</h2>
        <p class="v4-section-subtitle">Acompanhe a evolução do projeto em tempo real.</p>
      </div>

      <div class="v4-construction-grid">
        <div v-for="(item, i) in items" :key="i" class="v4-construction-item">
          <div class="v4-construction-header">
            <span class="v4-construction-label">{{ item.label }}</span>
            <span class="v4-construction-percentage">{{ item.percentage }}%</span>
          </div>
          <div class="v4-progress-bar">
            <div class="v4-progress-fill" :style="{ width: item.percentage + '%' }"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Construction Progress */
.v4-construction-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  max-width: 1000px;
  margin: 40px auto 0;
}
@media (min-width: 768px) {
  .v4-construction-grid { grid-template-columns: 1fr 1fr; gap: 40px; }
}

.v4-construction-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.v4-construction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.v4-construction-label { font-size: 17px; font-weight: 600; color: var(--v4-text); }
.v4-construction-percentage { font-size: 15px; font-weight: 700; color: var(--v4-primary); }

.v4-progress-bar {
  width: 100%;
  height: 12px;
  background: var(--v4-bg-alt);
  border-radius: 6px;
  overflow: hidden;
}
.v4-progress-fill {
  height: 100%;
  background: var(--v4-primary);
  border-radius: 6px;
  transition: width 1s cubic-bezier(0.165, 0.84, 0.44, 1);
}
</style>
