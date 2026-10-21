<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AddressFormModal from '@/components/AddressFormModal.vue'
import AddressPicker from '@/components/AddressPicker.vue'
import { getProduct } from '@/api/product'
import { listUserCoupons, previewCheckout } from '@/api/marketing'
import { createOrder } from '@/api/order'
import { useAppStore } from '@/stores/app'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import type { Address, PreviewCheckoutResponse, StockItem, UserCoupon } from '@/types'
import { formatYuan } from '@/utils/format'
import { handleImageError } from '@/utils/image'

interface CheckoutItem {
  product_id: number
  sku_id: number
  product_title: string
  spec_text: string
  image: string
  price_cents: number
  quantity: number
}

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const cart = useCartStore()
const userStore = useUserStore()

const items = ref<CheckoutItem[]>([])
const coupons = ref<UserCoupon[]>([])
const preview = ref<PreviewCheckoutResponse | null>(null)
const addressId = ref(0)
const couponId = ref(0)
const remark = ref('')
const paymentMethod = ref('wechat')
const submitting = ref(false)
const addressModal = ref(false)
const editingAddress = ref<Address | null>(null)

const directProductId = computed(() => Number(route.query.productId ?? 0))
const directSkuId = computed(() => Number(route.query.skuId ?? 0))
const directQuantity = computed(() => Math.max(1, Number(route.query.quantity ?? 1)))

const totalAmount = computed(() =>
  items.value.reduce((sum, item) => sum + item.price_cents * item.quantity, 0),
)
const freight = computed(() => preview.value?.freight_cents ?? 0)
const payable = computed(() => preview.value?.payable_cents ?? totalAmount.value)

const selectedCoupon = computed(() => coupons.value.find((item) => item.coupon_id === couponId.value))

/** 可用券：金额达到门槛的可用 */
const usableCoupons = computed(() =>
  coupons.value.filter((item) => item.status === 'USER_COUPON_STATUS_UNUSED'),
)

async function loadItems(): Promise<void> {
  if (directProductId.value && directSkuId.value) {
    const detail = await getProduct(directProductId.value)
    const sku = detail.skus.find((item) => item.id === directSkuId.value) ?? detail.skus[0]
    items.value = [
      {
        product_id: detail.product.id,
        sku_id: sku?.id ?? directSkuId.value,
        product_title: detail.product.title,
        spec_text: sku?.spec_text ?? '',
        image: detail.product.cover,
        price_cents: sku?.price_cents ?? detail.product.min_price_cents,
        quantity: directQuantity.value,
      },
    ]
    return
  }
  items.value = cart.selectedItems.map((item) => ({
    product_id: item.product_id,
    sku_id: item.sku_id,
    product_title: item.product_title,
    spec_text: item.spec_text,
    image: item.image,
    price_cents: item.price_cents,
    quantity: item.quantity,
  }))
}

async function loadCoupons(): Promise<void> {
  const result = await listUserCoupons({ status: 1, page: 1, page_size: 50 })
  coupons.value = result.coupons
}

async function refreshPreview(): Promise<void> {
  if (!items.value.length) return
  const payload: StockItem[] = items.value.map((item) => ({
    sku_id: item.sku_id,
    product_id: item.product_id,
    quantity: item.quantity,
    price_cents: item.price_cents,
  }))
  preview.value = await previewCheckout({
    items: payload,
    address_id: addressId.value || undefined,
    coupon_id: couponId.value || undefined,
  })
}

function selectCoupon(id: number): void {
  couponId.value = couponId.value === id ? 0 : id
  refreshPreview()
}

async function saveAddress(payload: Partial<Address>): Promise<void> {
  await userStore.saveAddress(payload)
  const created = userStore.addresses.find((item) => item.id === payload.id)
  if (payload.id) {
    addressId.value = payload.id
  } else if (created) {
    addressId.value = created.id
  }
  refreshPreview()
}

async function submit(): Promise<void> {
  if (!addressId.value) {
    app.warning('请先选择收货地址')
    addressModal.value = true
    return
  }
  if (!items.value.length) {
    app.warning('没有可结算的商品')
    return
  }
  submitting.value = true
  try {
    const order = await createOrder({
      items: items.value.map((item) => ({
        product_id: item.product_id,
        sku_id: item.sku_id,
        quantity: item.quantity,
      })),
      from_cart: !directProductId.value,
      cart_item_ids: directProductId.value
        ? []
        : cart.selectedItems.map((item) => item.id),
      address_id: addressId.value,
      coupon_id: couponId.value,
      remark: remark.value,
      payment_method: paymentMethod.value,
      points_used: 0,
    })
    app.success('订单提交成功')
    router.push({ name: 'payment', params: { orderId: String(order.id) } })
  } catch {
    // 错误提示已由接口层处理
  } finally {
    submitting.value = false
  }
}

watch(addressId, () => {
  refreshPreview()
})

watch(couponId, () => {
  refreshPreview()
})

onMounted(async () => {
  await userStore.loadAddresses()
  addressId.value = userStore.defaultAddress?.id ?? userStore.addresses[0]?.id ?? 0
  await Promise.all([loadItems(), loadCoupons()])
  await refreshPreview()
})
</script>

<template>
  <div class="checkout ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">确认订单</h1>
        <p class="ss-page-sub">核对地址与商品，选择优惠后提交订单</p>
      </div>
    </div>

    <div class="checkout__layout">
      <div class="ss-col checkout__main">
        <!-- 收货地址 -->
        <section class="ss-card ss-card-pad">
          <div class="ss-row-between checkout__block-head">
            <h2>收货地址</h2>
            <button type="button" class="ss-btn ss-btn-ghost ss-btn-sm" @click="editingAddress = null; addressModal = true">
              + 新增地址
            </button>
          </div>
          <AddressPicker
            v-model="addressId"
            :addresses="userStore.addresses"
            @create="editingAddress = null; addressModal = true"
            @edit="(address) => { editingAddress = address; addressModal = true }"
          />
        </section>

        <!-- 商品清单 -->
        <section class="ss-card ss-card-pad">
          <div class="ss-row-between checkout__block-head">
            <h2>商品清单</h2>
            <span class="ss-muted-block">共 {{ items.length }} 种商品</span>
          </div>
          <div v-for="item in items" :key="`${item.product_id}-${item.sku_id}`" class="checkout__item">
            <img :src="item.image" :alt="item.product_title" @error="handleImageError" />
            <div class="ss-grow">
              <RouterLink :to="`/product/${item.product_id}`" class="checkout__item-title">
                {{ item.product_title }}
              </RouterLink>
              <span class="ss-muted-block">{{ item.spec_text }}</span>
            </div>
            <span class="ss-num">{{ formatYuan(item.price_cents) }}</span>
            <span class="ss-num ss-muted-block">×{{ item.quantity }}</span>
            <strong class="ss-num">{{ formatYuan(item.price_cents * item.quantity) }}</strong>
          </div>
        </section>

        <!-- 优惠券 -->
        <section class="ss-card ss-card-pad">
          <div class="ss-row-between checkout__block-head">
            <h2>优惠券</h2>
            <span class="ss-muted-block">{{ usableCoupons.length }} 张可用</span>
          </div>
          <div v-if="usableCoupons.length" class="checkout__coupons">
            <button
              v-for="item in usableCoupons"
              :key="item.id"
              type="button"
              class="checkout__coupon"
              :class="{ 'checkout__coupon--active': couponId === item.coupon_id }"
              @click="selectCoupon(item.coupon_id)"
            >
              <span class="checkout__coupon-value">
                {{ item.coupon.type === 'COUPON_TYPE_PERCENT'
                  ? `${item.coupon.percent / 10} 折`
                  : item.coupon.type === 'COUPON_TYPE_SHIPPING'
                    ? '免运费'
                    : formatYuan(item.coupon.face_value_cents) }}
              </span>
              <span class="ss-grow">
                <strong>{{ item.coupon.name }}</strong>
                <small class="ss-muted-block">
                  满 {{ formatYuan(item.coupon.min_amount_cents) }} 可用
                </small>
              </span>
              <span class="ss-tag ss-tag-success">
                {{ couponId === item.coupon_id ? '已选择' : '选择' }}
              </span>
            </button>
          </div>
          <p v-else class="ss-muted-block">暂无可用优惠券</p>
        </section>

        <!-- 支付方式与备注 -->
        <section class="ss-card ss-card-pad">
          <div class="checkout__block-head"><h2>支付方式</h2></div>
          <div class="checkout__methods">
            <label
              v-for="method in [
                { value: 'wechat', label: '微信支付' },
                { value: 'alipay', label: '支付宝' },
                { value: 'balance', label: '余额支付' },
              ]"
              :key="method.value"
              class="checkout__method"
              :class="{ 'checkout__method--active': paymentMethod === method.value }"
            >
              <input v-model="paymentMethod" type="radio" :value="method.value" />
              <span>{{ method.label }}</span>
            </label>
          </div>

          <label class="ss-field checkout__remark">
            <span class="ss-label">订单备注</span>
            <textarea
              v-model="remark"
              class="ss-textarea"
              placeholder="选填，如配送时间、发票等要求"
            />
          </label>
        </section>
      </div>

      <!-- 金额明细 -->
      <aside class="checkout__summary ss-card ss-card-pad">
        <h2>金额明细</h2>
        <div class="checkout__row">
          <span class="ss-muted-block">商品总额</span>
          <span class="ss-num">{{ formatYuan(totalAmount) }}</span>
        </div>
        <div class="checkout__row">
          <span class="ss-muted-block">优惠券</span>
          <span class="ss-num ss-text-danger">-{{ formatYuan(preview?.coupon_discount_cents ?? 0) }}</span>
        </div>
        <div class="checkout__row">
          <span class="ss-muted-block">积分抵扣</span>
          <span class="ss-num ss-text-danger">-{{ formatYuan(preview?.points_discount_cents ?? 0) }}</span>
        </div>
        <div class="checkout__row">
          <span class="ss-muted-block">运费</span>
          <span class="ss-num">{{ formatYuan(freight) }}</span>
        </div>
        <hr class="ss-divider" />
        <div class="checkout__row checkout__row--total">
          <span>应付金额</span>
          <strong class="ss-num">{{ formatYuan(payable) }}</strong>
        </div>
        <p v-if="selectedCoupon" class="ss-muted-block">
          已选：{{ selectedCoupon.coupon.name }}
        </p>
        <button
          type="button"
          class="ss-btn ss-btn-primary ss-btn-lg ss-btn-block"
          :disabled="submitting || !items.length"
          @click="submit"
        >
          {{ submitting ? '提交中…' : '提交订单' }}
        </button>
      </aside>
    </div>

    <AddressFormModal v-model="addressModal" :address="editingAddress" @save="saveAddress" />
  </div>
</template>

<style scoped>
.checkout__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: var(--ss-space-5);
  align-items: start;
}

.checkout__main {
  gap: var(--ss-space-4);
}

.checkout__block-head {
  margin-bottom: var(--ss-space-3);
}

.checkout__block-head h2 {
  font-size: var(--ss-font-size-xl);
}

.checkout__item {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3) 0;
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.checkout__item:last-child {
  border-bottom: 0;
}

.checkout__item img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
}

.checkout__item-title {
  display: block;
  font-weight: var(--ss-font-weight-medium);
  margin-bottom: 2px;
}

.checkout__coupons {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
}

.checkout__coupon {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3);
  border: 1px solid var(--ss-color-border-subtle);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-card);
  cursor: pointer;
  text-align: left;
}

.checkout__coupon--active {
  border-color: var(--ss-color-brand-600);
  background: var(--ss-color-brand-50);
}

.checkout__coupon-value {
  min-width: 72px;
  color: var(--ss-color-danger-600);
  font-weight: var(--ss-font-weight-bold);
  font-size: var(--ss-font-size-lg);
  font-family: var(--ss-font-family-numeric);
}

.checkout__coupon strong {
  display: block;
}

.checkout__coupon small {
  display: block;
}

.checkout__methods {
  display: flex;
  gap: var(--ss-space-3);
  flex-wrap: wrap;
  margin-bottom: var(--ss-space-4);
}

.checkout__method {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  padding: var(--ss-space-2) var(--ss-space-4);
  border: 1px solid var(--ss-color-border-default);
  border-radius: var(--ss-radius-md);
  cursor: pointer;
  font-size: var(--ss-font-size-md);
}

.checkout__method--active {
  border-color: var(--ss-color-brand-600);
  background: var(--ss-color-brand-50);
  color: var(--ss-color-brand-600);
}

.checkout__summary {
  position: sticky;
  top: calc(var(--ss-size-header-desktop) + var(--ss-space-4));
}

.checkout__summary h2 {
  font-size: var(--ss-font-size-xl);
  margin-bottom: var(--ss-space-4);
}

.checkout__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ss-space-2) 0;
  font-size: var(--ss-font-size-md);
}

.checkout__row--total {
  font-size: var(--ss-font-size-lg);
  margin-bottom: var(--ss-space-3);
}

.checkout__row--total strong {
  font-size: var(--ss-font-size-3xl);
  color: var(--ss-color-danger-600);
}

@media (max-width: 1023px) {
  .checkout__layout {
    grid-template-columns: 1fr;
  }

  .checkout__summary {
    position: static;
  }
}
</style>
