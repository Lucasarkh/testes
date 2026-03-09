<template>
  <section
    class="pb-text-section"
    :style="sectionStyle"
  >
    <div class="v4-container" :class="containerClass">
      <div
        v-if="config.title"
        class="pb-text-section__header"
        :class="headerAlignClass"
      >
        <h2
          class="pb-text-section__title"
          :class="titleSizeClass"
          :style="titleColorStyle"
        >{{ config.title }}</h2>
      </div>

      <div
        v-if="config.content"
        class="pb-text-section__content"
        :class="contentAlignClass"
        :style="textColorStyle"
        v-html="config.content"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { getSectionStyle, PADDING_MAP } from '~/utils/page-builder'
import type { TextSectionConfig } from '~/utils/page-builder'

const props = defineProps<{
  config: TextSectionConfig
}>()

const sectionStyle = computed(() => getSectionStyle(props.config))

const containerClass = computed(() => {
  const width = props.config.containerWidth
  if (!width || width === 'normal') return ''
  return `v4-container--${width}`
})

const headerAlignClass = computed(() => {
  const align = props.config.titleAlign
  if (!align || align === 'left') return ''
  return `text-${align}`
})

const titleSizeClass = computed(() => {
  const size = props.config.titleSize
  return size ? `pb-text-section__title--${size}` : ''
})

const titleColorStyle = computed(() => {
  return props.config.textColor ? { color: props.config.textColor } : {}
})

const contentAlignClass = computed(() => {
  const align = props.config.contentAlign
  if (!align || align === 'left') return ''
  return `align-${align}`
})

const textColorStyle = computed(() => {
  return props.config.textColor ? { color: props.config.textColor } : {}
})
</script>
