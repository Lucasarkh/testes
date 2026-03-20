<script setup lang="ts">
defineProps<{
  project: any
  categories: any[]
  sectionStyle: Record<string, string>
}>()
</script>

<template>
  <section class="v4-section" id="infraestrutura" :style="sectionStyle">
    <div class="v4-container">
      <div class="v4-infra-split">
        <div class="v4-infra-left">
          <h2 class="v4-infra-hero-text" v-html="project.highlightsTitle || 'Sua família<br>merece o melhor.'"></h2>
          <p class="v4-infra-sub-text">{{ project.highlightsSubtitle || 'Qualidade de vida, segurança e infraestrutura completa em um só lugar.' }}</p>
          <div class="v4-infra-divider"></div>
        </div>
        <div class="v4-infra-right">
          <div v-for="cat in categories" :key="cat.title" class="v4-infra-group">
            <h3 class="v4-infra-group-title">{{ cat.title }}</h3>
            <ul class="v4-infra-items-list">
              <li v-for="it in cat.items" :key="it" class="v4-infra-list-item">
                <span class="v4-infra-bullet">&bull;</span>
                {{ it }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Infrastructure Split Layout (Sophisticated) */
.v4-infra-split {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}
@media (min-width: 992px) {
  .v4-infra-split { grid-template-columns: 1fr 1.5fr; gap: 100px; }
}

.v4-infra-hero-text {
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 700;
  line-height: 1.1;
  color: var(--v4-text);
  margin-bottom: 24px;
  letter-spacing: -0.02em;
}

@media (max-width: 768px) {
  .v4-infra-hero-text {
    font-size: 28px;
    margin-bottom: 16px;
    text-align: center;
  }
}

.v4-infra-sub-text {
  font-size: 19px;
  color: var(--v4-text-muted);
  line-height: 1.4;
  margin-bottom: 40px;
}

@media (max-width: 768px) {
  .v4-infra-sub-text {
    font-size: 16px;
    text-align: center;
    margin-bottom: 24px;
  }
}

.v4-infra-divider {
  width: 60px;
  height: 4px;
  background: var(--v4-primary);
  border-radius: 2px;
}

@media (max-width: 768px) {
  .v4-infra-divider {
    margin: 0 auto 32px;
  }
}

.v4-infra-right {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 40px;
}

@media (max-width: 768px) {
  .v4-infra-right {
    gap: 32px;
    grid-template-columns: 1fr;
  }
}

.v4-infra-group-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--v4-text);
  margin-bottom: 20px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.8;
}

@media (max-width: 768px) {
  .v4-infra-group-title {
    margin-bottom: 12px;
    font-size: 13px;
  }
}

.v4-infra-items-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.v4-infra-list-item {
  font-size: 16px;
  color: var(--v4-text-muted);
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
  line-height: 1.4;
}

.v4-infra-bullet {
  color: var(--v4-primary);
  font-weight: bold;
}
</style>
