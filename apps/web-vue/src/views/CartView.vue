<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import QuantityStepper from '@/components/QuantityStepper.vue'
import { listProducts } from '@/api/product'
import { useAppStore } from '@/stores/app'
import { useCartStore } from '@/stores/cart'
import type { CartItem, Product } from '@/types'
import { formatYuan } from '@/utils/format'
import { handleImageError } from '@/utils/image'

const router = useRouter()
const cart = useCartStore()
const app = useAppStore()

const products = ref<Product[]>([])
const removing = ref<number | null>(null)

/** 按商品分类分组 */
const groups = computed(() => {
  const map = new Map<string, CartItem[]>()
  cart.cart.items.forEach((item) => {
    const product = products.value.find((entry) => entry.id === item.product_id)
    const key = product?.category_name ?? '其它商品'
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  })
  return Array.from(map.entries()).map(([name, items]) => ({ name, items }))
})

const invalidCount = computed(() => cart.cart.items.filter((item) => !item.available).length)

async function loadProducts(): Promise<void> {
  try {
    const result = await listProducts({ page: 1, page_size: 100 })
    products.value = result.products
  } catch {
    // 忽略，分类名回退为「其它商品」
  }
}

async function changeQuantity(item: CartItem, quantity: number): Promise<void> {
  if (quantity > item.stock) {
    app.warning(`库存不足，当前仅剩 ${item.stock} 件`)
    return
  }
  await cart.updateItem(item.id, { quantity })
}

async function toggleItem(item: CartItem): Promise<void> {
  await cart.updateItem(item.id, { selected: !item.selected })
}

async function toggleAll(): Promise<void> {
  await cart.toggleAll(!cart.allSelected)
}

async function removeItem(item: CartItem): Promise<void> {
  removing.value = item.id
  try {
    await cart.removeItem(item.id)
    app.success('已移除商品')
  } catch {
    // 错误提示已由接口层处理
  } finally {
    removing.value = null
  }
}

function checkout(): void {
  if (!cart.selectedItems.length) {
    app.warning('请先选择要结算的商品')
    return
  }
  router.push({ name: 'checkout' })
}

onMounted(async () => {
  await Promise.all([cart.loadCart(), loadProducts()])
})
</script>

<template>
  <div class="cart ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">购物车</h1>
        <p class="ss-page-sub">
          共 {{ cart.cart.items.length }} 种商品 ·
          {{ invalidCount ? `${invalidCount} 件商品已失效` : '全部商品可购买' }}
        </p>
      </div>
      <button
        v-if="cart.cart.items.length"
        type="button"
        class="ss-btn ss-btn-ghost ss-btn-sm"
        @click="cart.clear()"
      >
        清空购物车
      </button>
    </div>

    <EmptyState
      v-if="!cart.cart.items.length"
      icon="🛒"
      title="购物车还是空的"
      description="挑几件心仪好物吧，满 99 元全国包邮"
      action-text="去逛逛"
      @action="router.push('/category')"
    />

    <template v-else>
      <section v-for="group in groups" :key="group.name" class="cart__group ss-card">
        <header class="cart__group-head">
          <span class="ss-tag ss-tag-accent">{{ group.name }}</span>
          <span class="ss-muted-block">{{ group.items.length }} 件</span>
        </header>

        <div
          v-for="item in group.items"
          :key="item.id"
          class="cart__item"
          :class="{ 'cart__item--invalid': !item.available }"
        >
          <button
            type="button"
            class="cart__check"
            :class="{ 'cart__check--on': item.selected && item.available }"
            :disabled="!item.available"
            :aria-label="item.selected ? '取消选择' : '选择商品'"
            @click="toggleItem(item)"
          >
            ✓
          </button>

          <RouterLink :to="`/product/${item.product_id}`" class="cart__image">
            <img :src="item.image" :alt="item.product_title" @error="handleImageError" />
          </RouterLink>

          <div class="cart__info">
            <RouterLink :to="`/product/${item.product_id}`" class="cart__title ss-ellipsis">
              {{ item.product_title }}
            </RouterLink>
            <span class="cart__spec ss-muted-block">{{ item.spec_text || '默认规格' }}</span>
            <span class="ss-text-danger ss-muted-block">
              单价 {{ formatYuan(item.price_cents) }}
            </span>
            <span v-if="!item.available" class="ss-tag ss-tag-danger">
              库存不足 / 已下架
            </span>
          </div>

          <div class="cart__quantity">
            <QuantityStepper
              :model-value="item.quantity"
              :min="1"
              :max="Math.max(1, item.stock)"
              :disabled="!item.available"
              @update:model-value="changeQuantity(item, $event)"
            />
            <span class="ss-muted-block">库存 {{ item.stock }}</span>
          </div>

          <div class="cart__amount ss-num">{{ formatYuan(item.price_cents * item.quantity) }}</div>

          <button
            type="button"
            class="ss-btn ss-btn-ghost ss-btn-sm"
            :disabled="removing === item.id"
            @click="removeItem(item)"
          >
            删除
          </button>
        </div>
      </section>

      <div class="cart__bar">
        <button
          type="button"
          class="cart__check"
          :class="{ 'cart__check--on': cart.allSelected }"
          aria-label="全选"
          @click="toggleAll"
        >
          ✓
        </button>
        <span class="cart__bar-text">已选 {{ cart.selectedItems.length }} 件</span>
        <span class="ss-grow" />
        <div class="cart__bar-total">
          <span class="ss-muted-block">合计</span>
          <strong class="ss-num">{{ formatYuan(cart.selectedAmount) }}</strong>
        </div>
        <button type="button" class="ss-btn ss-btn-primary ss-btn-lg" @click="checkout">
          去结算（{{ cart.selectedItems.length }}）
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cart__group {
  margin-bottom: var(--ss-space-4);
  overflow: hidden;
}

.cart__group-head {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  padding: var(--ss-space-3) var(--ss-space-4);
  background: var(--ss-color-bg-subtle);
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.cart__item {
  display: grid;
  grid-template-columns: 24px 88px minmax(0, 1fr) auto 110px 60px;
  align-items: center;
  gap: var(--ss-space-4);
  padding: var(--ss-space-4);
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.cart__item:last-child {
  border-bottom: 0;
}

.cart__item--invalid {
  opacity: 0.6;
  background: var(--ss-color-neutral-25);
}

.cart__check {
  width: 20px;
  height: 20px;
  border: 1px solid var(--ss-color-border-strong);
  border-radius: var(--ss-radius-xs);
  background: var(--ss-color-bg-card);
  color: transparent;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}

.cart__check--on {
  background: var(--ss-color-brand-600);
  border-color: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
}

.cart__check:disabled {
  cursor: not-allowed;
  background: var(--ss-color-neutral-200);
}

.cart__image img {
  width: 88px;
  height: 88px;
  object-fit: cover;
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
}

.cart__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.cart__title {
  font-weight: var(--ss-font-weight-medium);
}

.cart__title:hover {
  color: var(--ss-color-brand-600);
}

.cart__quantity {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.cart__amount {
  text-align: right;
  font-weight: var(--ss-font-weight-semibold);
}

.cart__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--ss-z-index-sticky);
  display: flex;
  align-items: center;
  gap: var(--ss-space-4);
  padding: var(--ss-space-3) var(--ss-space-5);
  background: var(--ss-color-bg-card);
  border-top: 1px solid var(--ss-color-border-subtle);
  box-shadow: var(--ss-shadow-lg);
}

.cart__bar-text {
  color: var(--ss-color-text-secondary);
}

.cart__bar-total {
  display: flex;
  align-items: baseline;
  gap: var(--ss-space-2);
}

.cart__bar-total strong {
  font-size: var(--ss-font-size-2xl);
  color: var(--ss-color-danger-600);
}

@media (max-width: 1023px) {
  .cart__item {
    grid-template-columns: 24px 72px minmax(0, 1fr) auto;
    grid-template-areas:
      'check image info info'
      'check image amount amount';
    row-gap: var(--ss-space-2);
  }

  .cart__check {
    grid-area: check;
  }

  .cart__image {
    grid-area: image;
  }

  .cart__image img {
    width: 72px;
    height: 72px;
  }

  .cart__info {
    grid-area: info;
  }

  .cart__quantity {
    grid-area: info;
    justify-self: end;
  }

  .cart__amount {
    grid-area: amount;
  }

  .cart__item > .ss-btn {
    grid-area: amount;
    justify-self: end;
  }
}

@media (max-width: 767px) {
  .cart__bar {
    bottom: 56px;
    padding: var(--ss-space-2) var(--ss-space-3);
    gap: var(--ss-space-2);
  }

  .cart__bar .ss-btn-lg {
    height: 38px;
    padding: 0 var(--ss-space-4);
    font-size: var(--ss-font-size-md);
  }
}
</style>
