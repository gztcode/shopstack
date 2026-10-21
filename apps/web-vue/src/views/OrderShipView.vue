<script setup lang="ts">
import OrderStatusPanel from '@/components/OrderStatusPanel.vue'
</script>

<template>
  <OrderStatusPanel
    :status="2"
    title="待发货订单"
    subtitle="商家正在备货，发货后会推送物流通知"
  />
</template>
