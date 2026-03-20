<script setup lang="ts">
defineProps<{
  text: string
}>()
</script>

<template>
  <section class="v4-legal-notice">
    <div class="v4-container">
      <div class="v4-legal-inner">
        <div class="v4-legal-icon"><i class="bi bi-clipboard-check" aria-hidden="true"></i></div>
        <p class="v4-legal-text">{{ text }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Legal Notice */
.v4-legal-notice {
  order: 4900;
  padding: 40px 0;
  background: var(--v4-bg-alt);
  border-top: 1px solid var(--v4-border);
}
.v4-legal-inner {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 28px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--v4-border);
  border-radius: 12px;
}
.v4-legal-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}
.v4-legal-text {
  font-size: 12px;
  line-height: 1.7;
  color: var(--v4-text-muted);
  margin: 0;
  white-space: pre-line;
}
</style>
