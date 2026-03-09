<template>
  <!-- editMode: contenteditable element managed via ref/innerText to avoid Vue reactivity conflicts -->
  <component
    :is="tag || 'span'"
    v-if="editMode"
    ref="elRef"
    :class="cls"
    :style="style"
    contenteditable="true"
    spellcheck="false"
    data-editable-text="true"
    @keydown.enter.prevent="($event.target as HTMLElement).blur()"
    @blur="onBlur"
  />
  <!-- normal mode: reactive text via {{ }} -->
  <component
    :is="tag || 'span'"
    v-else
    :class="cls"
    :style="style"
  >{{ text }}</component>
</template>

<script setup lang="ts">
const props = defineProps<{
  /** Current text value */
  text: string
  /** When true, renders as contenteditable */
  editMode?: boolean
  /** HTML tag to render (default: span) */
  tag?: string
  /** CSS class(es) to apply */
  cls?: string | string[] | Record<string, unknown>
  /** Inline styles */
  style?: string | Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'save', val: string): void
}>()

const elRef = ref<HTMLElement | null>(null)

// Set initial content after mount (avoid Vue's v-bind overriding what user types)
onMounted(() => {
  if (elRef.value) {
    elRef.value.innerText = props.text
  }
})

// Update DOM only when not actively editing
watch(() => props.text, (v) => {
  if (elRef.value && document.activeElement !== elRef.value) {
    elRef.value.innerText = v
  }
})

function onBlur(e: Event) {
  const val = (e.target as HTMLElement).innerText?.trim() || ''
  emit('save', val)
}
</script>
