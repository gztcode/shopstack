<script setup lang="ts">
import { useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
</script>

<template>
  <div class="ss-container ss-page">
    <EmptyState
      icon="🧭"
      title="页面不存在"
      description="你访问的页面可能已被移除或地址有误"
      action-text="返回首页"
      @action="router.push('/')"
    />
  </div>
</template>
