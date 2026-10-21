<script setup lang="ts">
import OrderStatusPanel from '@/components/OrderStatusPanel.vue'
</script>

<template>
  <OrderStatusPanel
    :status="0"
    title="全部订单"
    subtitle="所有状态的订单都在这里"
  />
</template>
