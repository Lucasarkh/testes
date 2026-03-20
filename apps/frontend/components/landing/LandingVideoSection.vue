<script setup lang="ts">
defineProps<{
  youtubeEmbedUrl: string
  youtubeVideoUrl: string
  project: any
  sectionStyle: Record<string, string>
}>()
</script>

<template>
  <section class="v4-section v4-section-alt" id="video-apresentacao" :style="sectionStyle">
    <div class="v4-container">
      <div class="v4-section-header center">
        <h2 class="v4-section-title">Apresentação</h2>
        <p class="v4-section-subtitle">Assista ao vídeo e conheça cada detalhe do empreendimento.</p>
      </div>
      <div class="v4-video-wrapper">
        <iframe
          v-if="youtubeEmbedUrl"
          :src="youtubeEmbedUrl"
          width="100%" height="100%" frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
        <a v-else :href="youtubeVideoUrl" target="_blank" class="v4-video-placeholder">
          <span>Assistir Vídeo no YouTube</span>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Video Presentation */
.v4-video-wrapper {
  max-width: 800px;
  margin: 0 auto;
  aspect-ratio: 16/9;
  border-radius: 24px;
  overflow: hidden;
  background: black;
  box-shadow: var(--v4-shadow-elevated);
}
.v4-video-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #111;
  color: white;
  text-decoration: none;
  font-weight: 600;
  gap: 12px;
}
.v4-video-placeholder:hover { background: #222; }
</style>
