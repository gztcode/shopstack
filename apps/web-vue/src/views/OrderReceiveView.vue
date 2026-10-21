<script setup lang="ts">
import OrderStatusPanel from '@/components/OrderStatusPanel.vue'
</script>

<template>
  <OrderStatusPanel
    :status="3"
    title="待收货订单"
    subtitle="包裹已在路上，签收后记得确认收货"
  />
</template>
