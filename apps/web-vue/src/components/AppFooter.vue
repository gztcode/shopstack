<script setup lang="ts">
/** 底部页脚 */
const year = new Date().getFullYear()

const groups = [
  {
    title: '购物指南',
    links: ['商品详情', '配送说明', '退换货政策', '优惠券使用'],
  },
  {
    title: '支付方式',
    links: ['微信支付', '支付宝', '余额支付', '发票说明'],
  },
  {
    title: '客户服务',
    links: ['售后政策', '价格保护', '意见反馈', '联系我们'],
  },
]
</script>

<template>
  <footer class="app-footer">
    <div class="ss-container">
      <div class="app-footer__grid">
        <div class="app-footer__brand">
          <div class="ss-row">
            <span class="app-footer__mark">S</span>
            <strong class="app-footer__name">ShopStack 商城</strong>
          </div>
          <p class="app-footer__desc">
            一体化电商中台演示项目，覆盖商品、购物车、订单、支付、营销与物流全链路。
          </p>
        </div>

        <div v-for="group in groups" :key="group.title" class="app-footer__group">
          <h4>{{ group.title }}</h4>
          <span v-for="link in group.links" :key="link" class="app-footer__link">
            {{ link }}
          </span>
        </div>
      </div>

      <div class="app-footer__bottom">
        <span>© {{ year }} ShopStack Demo · 演示数据，仅供学习</span>
        <span class="ss-grow" />
        <span>服务条款 · 隐私政策</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  margin-top: var(--ss-space-9);
  padding: var(--ss-space-8) 0 var(--ss-space-6);
  background: var(--ss-color-bg-card);
  border-top: 1px solid var(--ss-color-border-subtle);
}

.app-footer__grid {
  display: grid;
  grid-template-columns: 1.6fr repeat(3, 1fr);
  gap: var(--ss-space-6);
}

.app-footer__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--ss-radius-sm);
  background: var(--ss-gradient-brand);
  color: var(--ss-color-text-inverse);
  font-weight: var(--ss-font-weight-bold);
}

.app-footer__name {
  font-size: var(--ss-font-size-lg);
}

.app-footer__desc {
  margin: var(--ss-space-3) 0 0;
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-sm);
  max-width: 380px;
}

.app-footer__group {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
}

.app-footer__group h4 {
  font-size: var(--ss-font-size-md);
}

.app-footer__link {
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-sm);
}

.app-footer__bottom {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  margin-top: var(--ss-space-6);
  padding-top: var(--ss-space-4);
  border-top: 1px solid var(--ss-color-border-subtle);
  color: var(--ss-color-text-quaternary);
  font-size: var(--ss-font-size-sm);
  flex-wrap: wrap;
}

@media (max-width: 1023px) {
  .app-footer__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 767px) {
  .app-footer__grid {
    grid-template-columns: 1fr;
  }
}
</style>
