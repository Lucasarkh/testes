<template>
  <section class="pb-text-image-section" :style="sectionStyle">
    <div class="v4-container">
      <div
        class="pb-text-image-section__inner"
        :class="layoutClass"
      >
        <!-- Text content -->
        <div class="pb-text-image-section__content">
          <h2
            v-if="config.title"
            class="pb-text-image-section__title"
            :class="titleAlignClass"
            :style="titleColorStyle"
          >{{ config.title }}</h2>

          <div
            v-if="config.content"
            class="pb-text-image-section__body"
            :style="textColorStyle"
            v-html="config.content"
          />
        </div>

        <!-- Image -->
        <div
          v-if="config.imageUrl"
          class="pb-text-image-section__img-wrapper"
          :class="imgWrapperClasses"
        >
          <a
            v-if="false"
            role="none"
          ><!-- image-only wrapper --></a>
          <img
            :src="config.imageUrl"
            :alt="config.imageAlt || config.title || 'Imagem'"
            loading="lazy"
            decoding="async"
          />
        </div>

        <!-- Placeholder if no image set -->
        <div
          v-else
          class="pb-text-image-section__img-wrapper"
          style="background: #f0f0f0; min-height: 300px; display: flex; align-items: center; justify-content: center; border-radius: 16px;"
        >
          <span style="color: #aaa; font-size: 14px;">Imagem não definida</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { getSectionStyle } from '~/utils/page-builder'
import type { TextImageSectionConfig } from '~/utils/page-builder'

const props = defineProps<{
  config: TextImageSectionConfig
}>()

const sectionStyle = computed(() => getSectionStyle(props.config))

const layoutClass = computed(() => {
  const pos = props.config.imagePosition || 'right'
  return `image-${pos}`
})

const titleAlignClass = computed(() => {
  const align = props.config.titleAlign
  if (!align || align === 'left') return ''
  return `text-${align}`
})

const titleColorStyle = computed(() => {
  return props.config.textColor ? { color: props.config.textColor } : {}
})

const textColorStyle = computed(() => {
  return props.config.textColor ? { color: props.config.textColor } : {}
})

const imgWrapperClasses = computed(() => {
  const classes: string[] = []
  if (props.config.imageRounded !== false) classes.push('pb-text-image-section__img-wrapper--rounded')
  if (props.config.imageShadow !== false) classes.push('pb-text-image-section__img-wrapper--shadow')
  return classes
})
</script>
