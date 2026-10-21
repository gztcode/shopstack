<script setup lang="ts">
import ChannelProductPanel from '@/components/ChannelProductPanel.vue'
</script>

<template>
  <ChannelProductPanel
    :channel-type="6"
    title="清仓频道"
    subtitle="断码清仓，售完即止"
    sort="price_asc"
  />
</template>
