<script setup lang="ts">
import OrderStatusPanel from '@/components/OrderStatusPanel.vue'
</script>

<template>
  <OrderStatusPanel
    :status="6"
    title="售后中订单"
    subtitle="退款申请处理中，可在售后列表查看进度"
  />
</template>
