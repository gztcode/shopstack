<script setup lang="ts">
import OrderStatusPanel from '@/components/OrderStatusPanel.vue'
</script>

<template>
  <OrderStatusPanel
    :status="4"
    title="已完成订单"
    subtitle="感谢你的购买，欢迎评价晒单"
  />
</template>
