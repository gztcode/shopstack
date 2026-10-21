<script setup lang="ts">
import { reactive, ref } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import { submitFeedback } from '@/api/user'
import { useAppStore } from '@/stores/app'
import { formatDateTime } from '@/utils/format'

/**
 * 意见反馈
 * 数据来源 POST /api/v1/users/feedback。
 */
const TYPES = [
  { value: 1, label: '功能建议', icon: '💡' },
  { value: 2, label: '体验问题', icon: '🐛' },
  { value: 3, label: '投诉', icon: '📣' },
  { value: 4, label: '其它', icon: '💬' },
]

const app = useAppStore()

const form = reactive({
  type: 1,
  content: '',
  contact: '',
})

const submitting = ref(false)
const submitted = ref(false)
const lastReply = ref('')

async function submit(): Promise<void> {
  if (form.content.trim().length < 5) {
    app.warning('请至少输入 5 个字描述你的问题')
    return
  }
  submitting.value = true
  try {
    const result = await submitFeedback({
      type: form.type,
      content: form.content.trim(),
      contact: form.contact.trim(),
    })
    submitted.value = true
    lastReply.value = result.reply ?? ''
    app.success('反馈已提交，感谢你的建议')
    form.content = ''
    form.contact = ''
  } catch {
    // 错误提示已由接口层处理
  } finally {
    submitting.value = false
  }
}

</script>

<template>
  <div class="feedback ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">意见反馈</h1>
        <p class="ss-page-sub">你的每条建议我们都会认真阅读</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/help-center">帮助中心</RouterLink>
    </div>

    <section class="feedback__form ss-card">
      <h2 class="feedback__title">反馈类型</h2>
      <div class="feedback__types">
        <button
          v-for="item in TYPES"
          :key="item.value"
          type="button"
          class="feedback__type"
          :class="{ 'feedback__type--active': form.type === item.value }"
          @click="form.type = item.value"
        >
          <span class="feedback__type-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </div>

      <label class="ss-field">
        <span class="ss-label">问题描述 *</span>
        <textarea
          v-model="form.content"
          class="ss-textarea"
          rows="6"
          placeholder="请描述遇到的问题或期望的功能，例如：优惠券列表希望支持按类型筛选"
        />
        <span class="feedback__counter">{{ form.content.length }} / 500</span>
      </label>

      <label class="ss-field">
        <span class="ss-label">联系方式</span>
        <input
          v-model="form.contact"
          class="ss-input"
          type="text"
          placeholder="选填，便于我们回复你"
        />
      </label>

      <footer class="feedback__foot">
        <button type="button" class="ss-btn ss-btn-primary" :disabled="submitting" @click="submit">
          {{ submitting ? '提交中…' : '提交反馈' }}
        </button>
      </footer>
    </section>

    <section v-if="submitted" class="feedback__result ss-card">
      <span class="feedback__result-icon">🎉</span>
      <div class="ss-col">
        <strong>反馈已收到</strong>
        <span class="ss-muted-block">
          {{ lastReply || '我们已收到你的反馈，客服会在 1-3 个工作日内处理并通过消息中心回复。' }}
        </span>
        <span class="ss-muted-block">提交时间：{{ formatDateTime(new Date().toISOString()) }}</span>
      </div>
    </section>

    <section class="ss-section">
      <div class="ss-section-title">
        <h2>常见问题</h2>
      </div>
      <EmptyState
        icon="❓"
        title="更多解答在帮助中心"
        description="帮助中心整理了下单支付、物流配送与售后的常见问题"
        action-text="前往帮助中心"
        @action="$router.push('/help-center')"
      />
    </section>
  </div>
</template>

<style scoped>
.feedback__form {
  padding: var(--ss-space-5);
  max-width: 720px;
}

.feedback__title {
  font-size: var(--ss-font-size-lg);
  margin-bottom: var(--ss-space-3);
}

.feedback__types {
  display: flex;
  gap: var(--ss-space-2);
  margin-bottom: var(--ss-space-4);
  flex-wrap: wrap;
}

.feedback__type {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  border: 1px solid var(--ss-color-border-default);
  border-radius: var(--ss-radius-pill);
  background: var(--ss-color-bg-card);
  padding: var(--ss-space-2) var(--ss-space-4);
  cursor: pointer;
  font-size: var(--ss-font-size-sm);
}

.feedback__type--active {
  border-color: var(--ss-color-brand-600);
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
}

.feedback__type-icon {
  font-size: 16px;
}

.feedback__counter {
  align-self: flex-end;
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-xs);
}

.feedback__foot {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--ss-space-4);
}

.feedback__result {
  display: flex;
  align-items: flex-start;
  gap: var(--ss-space-3);
  padding: var(--ss-space-4);
  margin-top: var(--ss-space-4);
  max-width: 720px;
  background: var(--ss-color-success-50);
  border-color: var(--ss-color-success-100);
}

.feedback__result-icon {
  font-size: 28px;
}
</style>
