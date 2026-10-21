<script setup lang="ts">
import ChannelProductPanel from '@/components/ChannelProductPanel.vue'
</script>

<template>
  <ChannelProductPanel
    :channel-type="3"
    title="热销频道"
    subtitle="万人疯抢的爆款清单"
    sort="sales"
  />
</template>
