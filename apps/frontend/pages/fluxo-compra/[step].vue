<template>
  <PurchaseFlowExperience />
</template>

<script setup lang="ts">
import PurchaseFlowExperience from '~/components/purchase/PurchaseFlowExperience.vue'
import { buildRobotsContent } from '~/utils/seo'

useSeoMeta({
  robots: buildRobotsContent(true),
})

definePageMeta({
  layout: 'public',
})
</script>