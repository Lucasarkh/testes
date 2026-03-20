<template>
  <section class="v4-section v4-section-alt" id="galeria" :style="sectionStyle">
    <div class="v4-container">
      <div class="v4-section-header">
        <h2 class="v4-section-title">Galeria de Fotos</h2>
        <p class="v4-section-subtitle">Conheça os detalhes e a infraestrutura do empreendimento.</p>
      </div>

      <div class="v4-gallery-grid">
        <div
          v-for="(m, i) in medias.slice(0, 8)"
          :key="m.id"
          class="v4-gallery-item"
          @click="handleOpenLightbox(Number(i))"
        >
          <img
            v-if="m.type === 'PHOTO'"
            :src="m.url"
            :alt="m.caption || 'Foto'"
            :loading="Number(i) < 4 ? 'eager' : 'lazy'"
            :fetchpriority="Number(i) < 2 ? 'high' : 'auto'"
            decoding="async"
          />
          <video v-else :src="m.url" preload="metadata" />
          <div class="v4-gallery-overlay">
            <span v-if="m.caption" class="v4-gallery-caption">{{ m.caption }}</span>
            <span class="v4-gallery-expand">&nearr;</span>
          </div>
        </div>
      </div>

      <div v-if="medias.length > 9" style="margin-top: 56px; display: flex; justify-content: center;">
        <NuxtLink :to="galleryUrl" class="v4-btn-primary" style="min-width: 280px; text-decoration: none; text-align: center;" @click="tracking.trackClick('Botão: Abrir Galeria Completa')">
          Ver todos os {{ medias.length }} arquivos de mídia
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTracking } from '~/composables/useTracking'

const props = defineProps<{
  medias: any[]
  galleryUrl: string
  project: any
  sectionStyle: Record<string, string>
}>()

const emit = defineEmits<{
  'open-lightbox': [index: number]
}>()

const tracking = useTracking()

function handleOpenLightbox(index: number) {
  emit('open-lightbox', index)
}
</script>

<style scoped>
/* Gallery */
.v4-gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-auto-rows: 180px;
  gap: 12px;
}

.v4-gallery-item {
  position: relative;
  border-radius: var(--v4-radius-md);
  overflow: hidden;
  cursor: pointer;
  background: var(--v4-bg-alt);
  border: 1px solid var(--v4-border);
}

@media (max-width: 768px) {
  .v4-gallery-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 160px;
  }
}

.v4-gallery-item img, .v4-gallery-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.v4-gallery-item:hover img, .v4-gallery-item:hover video {
  transform: scale(1.05);
}

.v4-gallery-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(0,0,0,0.4) 0%, transparent 60%);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px;
  opacity: 0;
  transition: opacity 0.3s;
}

.v4-gallery-item:hover .v4-gallery-overlay {
  opacity: 1;
}

.v4-gallery-caption {
  color: white;
  font-size: 15px;
  font-weight: 500;
}

.v4-gallery-expand {
  color: white;
  font-size: 20px;
}

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

.v4-btn-primary:hover { background: var(--v4-primary-hover); transform: translateY(-1px); }
</style>
