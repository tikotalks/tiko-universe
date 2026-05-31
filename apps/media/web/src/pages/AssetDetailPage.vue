<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
const assetId = route.params.id as string

// Placeholder — will be built out in Task 1.4
</script>

<template>
  <div class="asset-detail">
    <h1>Asset Detail</h1>
    <p>Viewing asset: {{ assetId }}</p>
  </div>
</template>
