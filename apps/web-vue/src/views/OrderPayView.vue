<script setup lang="ts">
import OrderStatusPanel from '@/components/OrderStatusPanel.vue'
</script>

<template>
  <OrderStatusPanel
    :status="1"
    title="待付款订单"
    subtitle="请在有效期内完成支付，超时订单将自动取消"
  />
</template>
