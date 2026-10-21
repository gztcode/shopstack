<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getAccountSecurity, submitRealName } from '@/api/user'
import { useAppStore } from '@/stores/app'
import type { AccountSecurityInfo } from '@/types'

/**
 * 实名认证
 * 数据来源 GET /api/v1/users/security（查询认证状态）、POST /api/v1/users/realname（提交）。
 */
const router = useRouter()
const app = useAppStore()

const info = ref<AccountSecurityInfo | null>(null)
const submitting = ref(false)
const loading = ref(false)

const form = reactive({
  real_name: '',
  id_card: '',
})

/** 身份证号脱敏显示 */
function maskIdCard(value: string): string {
  if (value.length < 8) return value
  return `${value.slice(0, 4)}**********${value.slice(-4)}`
}

/** 身份证号格式校验（18 位，末位可为 X） */
function isValidIdCard(value: string): boolean {
  return /^\d{17}[\dXx]$/.test(value.trim())
}

/** 姓名格式校验（2-20 位中文或字母） */
function isValidName(value: string): boolean {
  return /^[一-龥A-Za-z·]{2,20}$/.test(value.trim())
}

async function load(): Promise<void> {
  loading.value = true
  try {
    info.value = await getAccountSecurity()
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

async function submit(): Promise<void> {
  if (!isValidName(form.real_name)) {
    app.warning('请填写真实姓名（2-20 位）')
    return
  }
  if (!isValidIdCard(form.id_card)) {
    app.warning('请填写正确的 18 位身份证号码')
    return
  }
  submitting.value = true
  try {
    await submitRealName({ real_name: form.real_name.trim(), id_card: form.id_card.trim() })
    app.success('实名认证信息已提交')
    await load()
    router.push('/user/security')
  } catch {
    // 错误提示已由接口层处理
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="realname ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">实名认证</h1>
        <p class="ss-page-sub">完成实名认证后可正常下单与提现</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/user/security">账号安全</RouterLink>
    </div>

    <section v-if="info?.realname_verified" class="realname__done ss-card">
      <span class="realname__done-icon">✅</span>
      <div class="ss-col">
        <strong>已完成实名认证</strong>
        <span class="ss-muted-block">实名信息仅用于合规校验，平台会加密保存</span>
      </div>
    </section>

    <section v-else class="realname__form ss-card">
      <h2 class="realname__title">填写实名信息</h2>
      <p class="ss-muted-block realname__tips">
        请填写与证件一致的真实信息，提交后进入审核流程，审核结果会在消息中心通知你。
      </p>

      <label class="ss-field">
        <span class="ss-label">真实姓名 *</span>
        <input
          v-model="form.real_name"
          class="ss-input"
          type="text"
          placeholder="请输入证件上的姓名"
          maxlength="20"
        />
      </label>

      <label class="ss-field">
        <span class="ss-label">身份证号码 *</span>
        <input
          v-model="form.id_card"
          class="ss-input"
          type="text"
          placeholder="请输入 18 位身份证号码"
          maxlength="18"
        />
      </label>

      <div class="realname__preview">
        <span class="ss-muted-block">提交后将核验</span>
        <span>
          {{ form.real_name || '—' }} / {{ form.id_card ? maskIdCard(form.id_card) : '—' }}
        </span>
      </div>

      <footer class="realname__foot">
        <button type="button" class="ss-btn ss-btn-primary" :disabled="submitting" @click="submit">
          {{ submitting ? '提交中…' : '提交认证' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.realname__done {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-5);
}

.realname__done-icon {
  font-size: 36px;
}

.realname__form {
  padding: var(--ss-space-5);
  max-width: 560px;
}

.realname__title {
  font-size: var(--ss-font-size-lg);
  margin-bottom: var(--ss-space-2);
}

.realname__tips {
  margin: 0 0 var(--ss-space-4);
  font-size: var(--ss-font-size-sm);
}

.realname__preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
  font-size: var(--ss-font-size-sm);
}

.realname__foot {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--ss-space-5);
}
</style>
