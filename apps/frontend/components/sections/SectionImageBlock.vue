<template>
  <section class="pb-image-block-section" :style="sectionStyle">
    <div class="v4-container" :class="containerClass">
      <!-- Image with optional link -->
      <a
        v-if="config.linkUrl && config.imageUrl"
        :href="config.linkUrl"
        :target="config.linkTarget || '_blank'"
        rel="noopener noreferrer"
        style="display: block;"
      >
        <div class="pb-image-block-section__img-wrapper" :class="imgWrapperClasses">
          <img
            :src="config.imageUrl"
            :alt="config.imageAlt || config.caption || 'Imagem'"
            loading="lazy"
            decoding="async"
          />
        </div>
      </a>

      <div
        v-else-if="config.imageUrl"
        class="pb-image-block-section__img-wrapper"
        :class="imgWrapperClasses"
      >
        <img
          :src="config.imageUrl"
          :alt="config.imageAlt || config.caption || 'Imagem'"
          loading="lazy"
          decoding="async"
        />
      </div>

      <!-- Placeholder when no image set -->
      <div
        v-else
        class="pb-image-block-section__img-wrapper"
        :class="imgWrapperClasses"
        style="background: #f0f0f0; min-height: 240px; display: flex; align-items: center; justify-content: center;"
      >
        <span style="color: #aaa; font-size: 14px;"><i class="bi bi-card-image" aria-hidden="true"></i> Imagem não definida</span>
      </div>

      <!-- Caption -->
      <p
        v-if="config.caption"
        class="pb-image-block-section__caption"
        :class="captionAlignClass"
        :style="textColorStyle"
      >{{ config.caption }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { getSectionStyle } from '~/utils/page-builder'
import type { ImageBlockSectionConfig } from '~/utils/page-builder'

const props = defineProps<{
  config: ImageBlockSectionConfig
}>()

const sectionStyle = computed(() => getSectionStyle(props.config))

const containerClass = computed(() => {
  const width = props.config.width || 'normal'
  if (width === 'full') return 'v4-container--full'
  if (width === 'wide') return 'v4-container--wide'
  if (width === 'narrow') return 'v4-container--narrow'
  return ''
})

const imgWrapperClasses = computed(() => {
  const classes: string[] = []
  if (props.config.rounded !== false) classes.push('pb-image-block-section__img-wrapper--rounded')
  if (props.config.shadow !== false) classes.push('pb-image-block-section__img-wrapper--shadow')
  return classes
})

const captionAlignClass = computed(() => {
  const align = props.config.captionAlign
  if (!align || align === 'left') return ''
  return `align-${align}`
})

const textColorStyle = computed(() => {
  return props.config.textColor ? { color: props.config.textColor } : {}
})
</script>
