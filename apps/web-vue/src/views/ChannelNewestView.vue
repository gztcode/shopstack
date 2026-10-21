<script setup lang="ts">
import ChannelProductPanel from '@/components/ChannelProductPanel.vue'
</script>

<template>
  <ChannelProductPanel
    :channel-type="2"
    title="新品频道"
    subtitle="刚刚上架，第一时间尝鲜"
    sort="newest"
  />
</template>
