<template>
  <LotDetailsView :id="route.params.id as string" :lot-code="route.params.code as string" />
</template>

<script setup lang="ts">
import LotDetailsView from '~/components/LotDetailsView.vue'

const route = useRoute()

definePageMeta({
  layout: 'public'
})
</script>
