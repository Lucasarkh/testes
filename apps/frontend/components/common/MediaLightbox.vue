<template>
  <Teleport to="body">
    <Transition name="media-lightbox-fade">
      <div
        v-if="isOpen && normalizedItems.length"
        class="media-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Galeria de midia"
        @click.self="close"
      >
        <ClientOnly>
          <div class="media-lightbox__shell">
            <button
              type="button"
              class="media-lightbox__close"
              aria-label="Fechar galeria"
              @click="close"
            >
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>

            <div class="media-lightbox__topbar">
              <div class="media-lightbox__counter">
                {{ currentIndex + 1 }} / {{ normalizedItems.length }}
              </div>
              <div v-if="activeItem?.caption" class="media-lightbox__caption">
                {{ activeItem.caption }}
              </div>
            </div>

            <Swiper
              class="media-lightbox__main"
              :modules="modules"
              :initial-slide="safeInitialIndex"
              :navigation="normalizedItems.length > 1"
              :pagination="{ clickable: true }"
              :keyboard="{ enabled: true }"
              :space-between="20"
              :thumbs="thumbsConfig"
              :a11y="{ enabled: true }"
              @swiper="handleMainSwiper"
              @slideChange="handleSlideChange"
            >
              <SwiperSlide v-for="(item, index) in normalizedItems" :key="slideKey(item, index)">
                <div class="media-lightbox__slide">
                  <img
                    v-if="item.kind === 'PHOTO'"
                    class="media-lightbox__image"
                    :src="item.url"
                    :alt="item.caption || 'Midia do projeto'"
                    loading="eager"
                    decoding="async"
                  />
                  <video
                    v-else
                    class="media-lightbox__video"
                    :src="item.url"
                    controls
                    playsinline
                    preload="metadata"
                  />
                </div>
              </SwiperSlide>
            </Swiper>

            <Swiper
              v-if="normalizedItems.length > 1"
              class="media-lightbox__thumbs"
              :modules="modules"
              :slides-per-view="'auto'"
              :space-between="12"
              :watch-slides-progress="true"
              @swiper="handleThumbsSwiper"
            >
              <SwiperSlide
                v-for="(item, index) in normalizedItems"
                :key="`${slideKey(item, index)}-thumb`"
                class="media-lightbox__thumb-slide"
              >
                <button
                  type="button"
                  class="media-lightbox__thumb"
                  :class="{ 'is-active': index === currentIndex }"
                  :aria-label="`Abrir midia ${index + 1}`"
                  @click="goToSlide(index)"
                >
                  <img
                    v-if="item.kind === 'PHOTO'"
                    :src="item.url"
                    :alt="item.caption || 'Miniatura da midia'"
                    loading="lazy"
                    decoding="async"
                  />
                  <div v-else class="media-lightbox__thumb-video">
                    <video :src="item.url" muted preload="metadata"></video>
                    <span class="media-lightbox__thumb-badge">
                      <i class="bi bi-play-fill" aria-hidden="true"></i>
                    </span>
                  </div>
                </button>
              </SwiperSlide>
            </Swiper>
          </div>
        </ClientOnly>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { A11y, Keyboard, Navigation, Pagination, Thumbs } from 'swiper/modules'
import type { Swiper as SwiperInstance } from 'swiper'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

type MediaItem = {
  id?: string | number
  url: string
  caption?: string | null
  type?: string | null
}

type NormalizedMediaItem = {
  id?: string | number
  url: string
  caption?: string | null
  kind: 'PHOTO' | 'VIDEO'
}

const props = withDefaults(defineProps<{
  modelValue: boolean
  items: MediaItem[]
  initialIndex?: number
}>(), {
  initialIndex: 0
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const modules = [A11y, Keyboard, Navigation, Pagination, Thumbs]
const mainSwiper = ref<SwiperInstance | null>(null)
const thumbsSwiper = ref<SwiperInstance | null>(null)
const currentIndex = ref(0)

const normalizedItems = computed<NormalizedMediaItem[]>(() => (
  (props.items || [])
    .filter(item => item?.url)
    .map(item => ({
      id: item.id,
      url: item.url,
      caption: item.caption,
      kind: item.type === 'VIDEO' ? 'VIDEO' : 'PHOTO'
    }))
))

const safeInitialIndex = computed(() => clampIndex(props.initialIndex, normalizedItems.value.length))
const isOpen = computed(() => props.modelValue)
const activeItem = computed(() => normalizedItems.value[currentIndex.value] ?? null)
const thumbsConfig = computed(() => ({
  swiper: thumbsSwiper.value && !thumbsSwiper.value.destroyed ? thumbsSwiper.value : null
}))

watch(
  () => [props.modelValue, props.initialIndex, normalizedItems.value.length],
  async ([open]) => {
    if (!open) {
      restoreBodyScroll()
      return
    }

    lockBodyScroll()
    currentIndex.value = safeInitialIndex.value
    await nextTick()
    mainSwiper.value?.slideTo(safeInitialIndex.value, 0)
    thumbsSwiper.value?.slideTo(safeInitialIndex.value, 0)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  restoreBodyScroll()
})

function close() {
  emit('update:modelValue', false)
}

function handleMainSwiper(instance: SwiperInstance) {
  mainSwiper.value = instance
  currentIndex.value = instance.activeIndex ?? safeInitialIndex.value
}

function handleThumbsSwiper(instance: SwiperInstance) {
  thumbsSwiper.value = instance
}

function handleSlideChange(instance: SwiperInstance) {
  currentIndex.value = instance.activeIndex
}

function goToSlide(index: number) {
  currentIndex.value = index
  mainSwiper.value?.slideTo(index)
}

function slideKey(item: NormalizedMediaItem, index: number) {
  return item.id ?? `${item.url}-${index}`
}

function clampIndex(index: number, length: number) {
  if (!length) return 0
  return Math.min(Math.max(index || 0, 0), length - 1)
}

function lockBodyScroll() {
  if (!process.client) return
  document.body.style.overflow = 'hidden'
}

function restoreBodyScroll() {
  if (!process.client) return
  document.body.style.overflow = ''
}
</script>

<style scoped>
.media-lightbox {
  position: fixed;
  inset: 0;
  z-index: 2600;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.16), transparent 38%),
    rgba(7, 10, 16, 0.94);
  backdrop-filter: blur(18px);
}

.media-lightbox__shell {
  width: min(1280px, 100%);
  max-height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 18px;
}

.media-lightbox__close {
  position: absolute;
  top: 28px;
  right: 28px;
  z-index: 2;
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.media-lightbox__close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.04);
}

.media-lightbox__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-right: 72px;
  color: #fff;
}

.media-lightbox__counter {
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.78);
}

.media-lightbox__caption {
  max-width: min(720px, 100%);
  font-size: 1rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.92);
  text-align: right;
}

.media-lightbox__main {
  width: 100%;
  min-height: 0;
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(22, 27, 38, 0.92), rgba(9, 12, 19, 0.86));
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.35);
}

.media-lightbox__slide {
  min-height: min(72vh, 860px);
  display: grid;
  place-items: center;
  padding: 24px;
}

.media-lightbox__image,
.media-lightbox__video {
  width: 100%;
  max-height: min(68vh, 820px);
  object-fit: contain;
  border-radius: 20px;
}

.media-lightbox__thumbs {
  width: 100%;
  padding-bottom: 2px;
}

.media-lightbox__thumb-slide {
  width: 108px;
}

.media-lightbox__thumb {
  position: relative;
  width: 108px;
  height: 76px;
  overflow: hidden;
  border: 0;
  border-radius: 18px;
  padding: 0;
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  opacity: 0.58;
  transform: scale(0.96);
  transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.media-lightbox__thumb.is-active {
  opacity: 1;
  transform: scale(1);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.86);
}

.media-lightbox__thumb img,
.media-lightbox__thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-lightbox__thumb-video {
  position: relative;
  width: 100%;
  height: 100%;
}

.media-lightbox__thumb-badge {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.62);
  color: #fff;
}

:deep(.media-lightbox__main .swiper-button-prev),
:deep(.media-lightbox__main .swiper-button-next) {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

:deep(.media-lightbox__main .swiper-button-prev::after),
:deep(.media-lightbox__main .swiper-button-next::after) {
  font-size: 16px;
  font-weight: 900;
}

:deep(.media-lightbox__main .swiper-pagination-bullet) {
  width: 10px;
  height: 10px;
  background: rgba(255, 255, 255, 0.45);
  opacity: 1;
}

:deep(.media-lightbox__main .swiper-pagination-bullet-active) {
  background: #fff;
}

.media-lightbox-fade-enter-active,
.media-lightbox-fade-leave-active {
  transition: opacity 0.24s ease;
}

.media-lightbox-fade-enter-from,
.media-lightbox-fade-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .media-lightbox {
    padding: 12px;
  }

  .media-lightbox__shell {
    gap: 14px;
  }

  .media-lightbox__topbar {
    align-items: flex-start;
    flex-direction: column;
    padding-right: 56px;
  }

  .media-lightbox__caption {
    text-align: left;
  }

  .media-lightbox__close {
    top: 16px;
    right: 16px;
    width: 42px;
    height: 42px;
  }

  .media-lightbox__slide {
    min-height: min(62vh, 620px);
    padding: 16px;
  }

  .media-lightbox__image,
  .media-lightbox__video {
    max-height: min(58vh, 560px);
    border-radius: 16px;
  }

  .media-lightbox__thumb-slide,
  .media-lightbox__thumb {
    width: 88px;
  }

  .media-lightbox__thumb {
    height: 64px;
    border-radius: 14px;
  }

  :deep(.media-lightbox__main .swiper-button-prev),
  :deep(.media-lightbox__main .swiper-button-next) {
    display: none;
  }
}
</style>