<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const auth = useAuthStore()
const cart = useCartStore()
const userStore = useUserStore()

const mode = ref<'login' | 'register'>('login')
const errorText = ref('')
const wechatLoading = ref(false)

const loginForm = reactive({
  username: 'demo',
  password: 'demo123456',
})

const registerForm = reactive({
  username: '',
  password: '',
  confirm: '',
  phone: '',
  nickname: '',
})

const isLogin = computed(() => mode.value === 'login')

function validate(): boolean {
  errorText.value = ''
  if (isLogin.value) {
    if (!loginForm.username.trim()) {
      errorText.value = '请输入用户名'
      return false
    }
    if (!loginForm.password.trim()) {
      errorText.value = '请输入密码'
      return false
    }
    return true
  }
  if (!registerForm.username.trim()) {
    errorText.value = '请输入用户名'
    return false
  }
  if (registerForm.password.length < 6) {
    errorText.value = '密码长度至少 6 位'
    return false
  }
  if (registerForm.password !== registerForm.confirm) {
    errorText.value = '两次输入的密码不一致'
    return false
  }
  if (registerForm.phone && !/^1[3-9]\d{9}$/.test(registerForm.phone.trim())) {
    errorText.value = '请输入正确的手机号'
    return false
  }
  return true
}

async function afterLogin(): Promise<void> {
  await Promise.all([cart.loadCart(), userStore.refreshAll()])
  const redirect = route.query.redirect
  router.push(typeof redirect === 'string' && redirect ? redirect : '/')
}

async function submit(): Promise<void> {
  if (!validate()) return
  try {
    if (isLogin.value) {
      await auth.login(loginForm.username.trim(), loginForm.password)
      app.success('登录成功')
    } else {
      await auth.register({
        username: registerForm.username.trim(),
        password: registerForm.password,
        phone: registerForm.phone.trim(),
        nickname: registerForm.nickname.trim() || registerForm.username.trim(),
      })
      app.success('注册成功，已自动登录')
    }
    await afterLogin()
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '登录失败，请稍后重试'
  }
}

async function wechatLogin(): Promise<void> {
  wechatLoading.value = true
  errorText.value = ''
  try {
    // 演示环境没有真实微信授权，这里用固定 code 走通流程
    await auth.loginWithWeChat({
      code: `demo_code_${Date.now()}`,
      nickname: '微信用户',
      avatar: 'https://placehold.co/120x120/12B76A/FFFFFF?text=WeChat',
    })
    app.success('微信登录成功')
    await afterLogin()
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '微信登录失败，请稍后重试'
  } finally {
    wechatLoading.value = false
  }
}
</script>

<template>
  <div class="login ss-container ss-page">
    <div class="login__panel ss-card">
      <div class="login__intro">
        <h1 class="login__brand">ShopStack 商城</h1>
        <p class="login__desc">
          登录后即可同步购物车、订单与收藏，
          <br />享受更顺畅的购物体验。
        </p>
        <ul class="login__points">
          <li>✅ 全场满 99 元包邮</li>
          <li>✅ 正品保障，7 天无理由退换</li>
          <li>✅ 积分抵现，优惠券天天领</li>
        </ul>
      </div>

      <div class="login__form">
        <div class="login__tabs">
          <button
            type="button"
            class="login__tab"
            :class="{ 'login__tab--active': isLogin }"
            @click="mode = 'login'; errorText = ''"
          >
            账号登录
          </button>
          <button
            type="button"
            class="login__tab"
            :class="{ 'login__tab--active': !isLogin }"
            @click="mode = 'register'; errorText = ''"
          >
            注册账号
          </button>
        </div>

        <form class="ss-col" @submit.prevent="submit">
          <template v-if="isLogin">
            <label class="ss-field">
              <span class="ss-label">用户名</span>
              <input v-model="loginForm.username" class="ss-input" placeholder="请输入用户名" />
            </label>
            <label class="ss-field">
              <span class="ss-label">密码</span>
              <input
                v-model="loginForm.password"
                class="ss-input"
                type="password"
                placeholder="请输入密码"
              />
            </label>
          </template>

          <template v-else>
            <label class="ss-field">
              <span class="ss-label">用户名</span>
              <input v-model="registerForm.username" class="ss-input" placeholder="请输入用户名" />
            </label>
            <label class="ss-field">
              <span class="ss-label">昵称（选填）</span>
              <input v-model="registerForm.nickname" class="ss-input" placeholder="请输入昵称" />
            </label>
            <label class="ss-field">
              <span class="ss-label">手机号（选填）</span>
              <input v-model="registerForm.phone" class="ss-input" placeholder="请输入手机号" />
            </label>
            <label class="ss-field">
              <span class="ss-label">密码</span>
              <input
                v-model="registerForm.password"
                class="ss-input"
                type="password"
                placeholder="至少 6 位"
              />
            </label>
            <label class="ss-field">
              <span class="ss-label">确认密码</span>
              <input
                v-model="registerForm.confirm"
                class="ss-input"
                type="password"
                placeholder="再次输入密码"
              />
            </label>
          </template>

          <p v-if="errorText" class="ss-error-text">{{ errorText }}</p>

          <button type="submit" class="ss-btn ss-btn-primary ss-btn-lg ss-btn-block" :disabled="auth.loading">
            {{ auth.loading ? '处理中…' : isLogin ? '登录' : '注册并登录' }}
          </button>

          <div class="login__divider"><span>其他登录方式</span></div>
          <button
            type="button"
            class="ss-btn ss-btn-outline ss-btn-block"
            :disabled="wechatLoading"
            @click="wechatLogin"
          >
            {{ wechatLoading ? '授权中…' : '💚 微信登录' }}
          </button>
        </form>

        <p class="login__tip ss-muted-block">
          演示账号：demo / demo123456（后端未启动时自动使用内置演示数据）
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login__panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 420px);
  overflow: hidden;
}

.login__intro {
  padding: var(--ss-space-9) var(--ss-space-8);
  background: var(--ss-gradient-hero);
  color: var(--ss-color-text-inverse);
}

.login__brand {
  font-size: var(--ss-font-size-4xl);
  letter-spacing: var(--ss-font-letter-spacing-tight);
}

.login__desc {
  margin: var(--ss-space-4) 0 var(--ss-space-6);
  opacity: 0.85;
  line-height: var(--ss-font-line-height-relaxed);
}

.login__points {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-3);
  opacity: 0.92;
}

.login__form {
  padding: var(--ss-space-7) var(--ss-space-6);
}

.login__tabs {
  display: flex;
  gap: var(--ss-space-1);
  padding: var(--ss-space-1);
  background: var(--ss-color-bg-muted);
  border-radius: var(--ss-radius-md);
  margin-bottom: var(--ss-space-5);
}

.login__tab {
  flex: 1;
  height: 36px;
  border: 0;
  border-radius: var(--ss-radius-sm);
  background: transparent;
  color: var(--ss-color-text-secondary);
  cursor: pointer;
}

.login__tab--active {
  background: var(--ss-color-bg-card);
  color: var(--ss-color-brand-600);
  font-weight: var(--ss-font-weight-semibold);
  box-shadow: var(--ss-shadow-xs);
}

.login__divider {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  color: var(--ss-color-text-quaternary);
  font-size: var(--ss-font-size-xs);
  margin: var(--ss-space-2) 0;
}

.login__divider::before,
.login__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--ss-color-border-subtle);
}

.login__tip {
  margin-top: var(--ss-space-4);
  line-height: var(--ss-font-line-height-relaxed);
}

@media (max-width: 1023px) {
  .login__panel {
    grid-template-columns: 1fr;
  }

  .login__intro {
    padding: var(--ss-space-6);
  }
}
</style>
