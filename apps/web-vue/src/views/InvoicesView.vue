<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import { createInvoice, listInvoices } from '@/api/user'
import { listOrders } from '@/api/order'
import { useAppStore } from '@/stores/app'
import type { Invoice, Order, PageMeta } from '@/types'
import { invoiceStatusText, invoiceStatusTone } from '@/utils/enums'
import { formatDateTime, formatYuan, yuanToCents } from '@/utils/format'

const app = useAppStore()

const tabs = [
  { value: undefined, label: '全部' },
  { value: 0, label: '待开票' },
  { value: 1, label: '已开票' },
  { value: 2, label: '已驳回' },
]

const activeStatus = ref<number | undefined>(undefined)
const invoices = ref<Invoice[]>([])
const meta = ref<PageMeta>({ page: 1, page_size: 20, total: 0, total_pages: 1 })
const loading = ref(false)
const formVisible = ref(false)
const submitting = ref(false)
const orders = ref<Order[]>([])

const form = reactive({
  order_no: '',
  title: '',
  tax_no: '',
  type: 'personal',
  email: '',
  amount_yuan: 0,
  remark: '',
})

const errors = reactive<Record<string, string>>({})

/** 可开票的订单（已付款 / 已完成） */
const invoiceOrders = computed(() =>
  orders.value.filter(
    (order) =>
      order.status === 'ORDER_STATUS_PAID' ||
      order.status === 'ORDER_STATUS_COMPLETED' ||
      order.status === 'ORDER_STATUS_SHIPPED',
  ),
)

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listInvoices({
      page: meta.value.page,
      page_size: meta.value.page_size,
      status: activeStatus.value,
    })
    invoices.value = result.invoices
    meta.value = result.meta
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

async function loadOrders(): Promise<void> {
  try {
    const result = await listOrders({ page: 1, page_size: 20 })
    orders.value = result.orders
  } catch {
    // 订单列表失败不影响发票列表展示
  }
}

function changeTab(value: number | undefined): void {
  activeStatus.value = value
  meta.value = { ...meta.value, page: 1 }
  load()
}

function changePage(page: number): void {
  meta.value = { ...meta.value, page }
  load()
}

function openForm(): void {
  Object.keys(errors).forEach((key) => delete errors[key])
  form.order_no = ''
  form.title = ''
  form.tax_no = ''
  form.type = 'personal'
  form.email = ''
  form.amount_yuan = 0
  form.remark = ''
  // 默认选中第一个可开票订单，避免用户重复选择
  const first = invoiceOrders.value[0]
  if (first) {
    selectOrder(first.order_no)
  }
  formVisible.value = true
}

/** 选择订单后自动带出金额 */
function selectOrder(orderNo: string): void {
  form.order_no = orderNo
  const order = invoiceOrders.value.find((item) => item.order_no === orderNo)
  if (order) form.amount_yuan = order.payable_cents / 100
}

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key])
  if (!form.order_no.trim()) errors.order_no = '请选择或填写订单号'
  if (!form.title.trim()) errors.title = '请填写发票抬头'
  if (form.type === 'company' && !form.tax_no.trim()) errors.tax_no = '企业抬头需填写税号'
  if (!form.email.trim()) errors.email = '请填写接收邮箱'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = '邮箱格式不正确'
  if (!form.amount_yuan || form.amount_yuan <= 0) errors.amount_yuan = '请填写开票金额'
  return Object.keys(errors).length === 0
}

async function submit(): Promise<void> {
  if (!validate()) {
    app.warning('请完善开票申请信息')
    return
  }
  submitting.value = true
  try {
    await createInvoice({
      order_no: form.order_no.trim(),
      title: form.title.trim(),
      tax_no: form.tax_no.trim(),
      type: form.type,
      email: form.email.trim(),
      amount_cents: yuanToCents(form.amount_yuan),
      remark: form.remark.trim(),
    })
    app.success('开票申请已提交')
    formVisible.value = false
    load()
  } catch {
    // 错误提示已由接口层处理
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  load()
  loadOrders()
})
</script>

<template>
  <div class="invoices ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">发票管理</h1>
        <p class="ss-page-sub">申请电子发票并下载发票文件</p>
      </div>
      <button type="button" class="ss-btn ss-btn-primary" @click="openForm">+ 申请开票</button>
    </div>

    <div class="invoices__tabs ss-card">
      <button
        v-for="tab in tabs"
        :key="tab.label"
        type="button"
        class="invoices__tab"
        :class="{ 'invoices__tab--active': activeStatus === tab.value }"
        @click="changeTab(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <EmptyState
      v-if="!invoices.length && !loading"
      icon="🧾"
      title="暂无发票记录"
      description="订单完成后即可申请开具电子发票"
      action-text="申请开票"
      @action="openForm"
    />

    <div v-else class="invoices__list">
      <section v-for="invoice in invoices" :key="invoice.id" class="invoices__card ss-card">
        <div class="ss-row-between">
          <div class="ss-row">
            <strong>{{ invoice.title }}</strong>
            <span class="ss-tag ss-tag-neutral">
              {{ invoice.type === 'company' ? '企业' : '个人' }}
            </span>
            <span class="ss-tag" :class="`ss-tag-${invoiceStatusTone(invoice.status)}`">
              {{ invoiceStatusText(invoice.status) }}
            </span>
          </div>
          <strong class="ss-num ss-text-danger">{{ formatYuan(invoice.amount_cents) }}</strong>
        </div>

        <div class="invoices__meta">
          <span>订单号：{{ invoice.order_no }}</span>
          <span>税号：{{ invoice.tax_no || '个人抬头无需税号' }}</span>
          <span>邮箱：{{ invoice.email }}</span>
          <span>申请时间：{{ formatDateTime(invoice.created_at) }}</span>
        </div>

        <p v-if="invoice.remark" class="ss-muted-block">备注：{{ invoice.remark }}</p>

        <div class="invoices__actions">
          <a
            v-if="invoice.invoice_url"
            class="ss-btn ss-btn-primary ss-btn-sm"
            :href="invoice.invoice_url"
            target="_blank"
            rel="noopener"
            download
          >
            下载发票
          </a>
          <span v-else-if="invoice.status === 0" class="ss-muted-block">等待商家开具</span>
          <span v-else-if="invoice.status === 2" class="ss-text-danger ss-muted-block">
            已驳回：{{ invoice.remark || '请修改后重新申请' }}
          </span>
        </div>
      </section>
    </div>

    <Pagination
      :page="meta.page"
      :page-size="meta.page_size"
      :total="meta.total"
      @change="changePage"
    />

    <!-- 申请开票弹窗 -->
    <Teleport to="body">
      <div v-if="formVisible" class="invoices__dialog" @click.self="formVisible = false">
        <div class="invoices__dialog-panel ss-card">
          <div class="ss-row-between">
            <h3>申请开票</h3>
            <button type="button" class="ss-btn ss-btn-ghost ss-btn-sm" @click="formVisible = false">
              关闭
            </button>
          </div>

          <label class="ss-field">
            <span class="ss-label">关联订单</span>
            <select v-model="form.order_no" class="ss-select" @change="selectOrder(form.order_no)">
              <option value="">请选择可开票订单</option>
              <option v-for="order in invoiceOrders" :key="order.id" :value="order.order_no">
                {{ order.order_no }} · {{ formatYuan(order.payable_cents) }}
              </option>
            </select>
            <input
              v-if="!invoiceOrders.length"
              v-model="form.order_no"
              class="ss-input"
              placeholder="请输入订单号"
            />
            <span v-if="errors.order_no" class="ss-error-text">{{ errors.order_no }}</span>
          </label>

          <div class="ss-field">
            <span class="ss-label">抬头类型</span>
            <div class="invoices__types">
              <label
                class="invoices__type"
                :class="{ 'invoices__type--active': form.type === 'personal' }"
              >
                <input v-model="form.type" type="radio" value="personal" />
                <span>个人</span>
              </label>
              <label
                class="invoices__type"
                :class="{ 'invoices__type--active': form.type === 'company' }"
              >
                <input v-model="form.type" type="radio" value="company" />
                <span>企业</span>
              </label>
            </div>
          </div>

          <label class="ss-field">
            <span class="ss-label">发票抬头</span>
            <input v-model="form.title" class="ss-input" placeholder="个人填姓名，企业填公司全称" />
            <span v-if="errors.title" class="ss-error-text">{{ errors.title }}</span>
          </label>

          <label v-if="form.type === 'company'" class="ss-field">
            <span class="ss-label">纳税人识别号</span>
            <input v-model="form.tax_no" class="ss-input" placeholder="请输入税号" />
            <span v-if="errors.tax_no" class="ss-error-text">{{ errors.tax_no }}</span>
          </label>

          <label class="ss-field">
            <span class="ss-label">接收邮箱</span>
            <input v-model="form.email" class="ss-input" placeholder="用于接收电子发票" />
            <span v-if="errors.email" class="ss-error-text">{{ errors.email }}</span>
          </label>

          <label class="ss-field">
            <span class="ss-label">开票金额（元）</span>
            <input v-model.number="form.amount_yuan" class="ss-input" type="number" min="0" step="0.01" />
            <span v-if="errors.amount_yuan" class="ss-error-text">{{ errors.amount_yuan }}</span>
          </label>

          <label class="ss-field">
            <span class="ss-label">备注（选填）</span>
            <textarea v-model="form.remark" class="ss-textarea" placeholder="如需特殊说明请填写" />
          </label>

          <div class="ss-row-between">
            <span />
            <div class="ss-row">
              <button type="button" class="ss-btn ss-btn-ghost" @click="formVisible = false">取消</button>
              <button
                type="button"
                class="ss-btn ss-btn-primary"
                :disabled="submitting"
                @click="submit"
              >
                {{ submitting ? '提交中…' : '提交申请' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.invoices__tabs {
  display: flex;
  gap: var(--ss-space-1);
  padding: var(--ss-space-2);
  margin-bottom: var(--ss-space-4);
}

.invoices__tab {
  border: 0;
  background: transparent;
  padding: var(--ss-space-2) var(--ss-space-4);
  border-radius: var(--ss-radius-md);
  color: var(--ss-color-text-secondary);
  cursor: pointer;
}

.invoices__tab--active {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
}

.invoices__list {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-3);
}

.invoices__card {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  padding: var(--ss-space-4) var(--ss-space-5);
}

.invoices__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ss-space-2) var(--ss-space-5);
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-sm);
}

.invoices__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--ss-space-1);
}

.invoices__dialog {
  position: fixed;
  inset: 0;
  z-index: var(--ss-z-index-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ss-space-4);
  background: var(--ss-color-bg-overlay);
}

.invoices__dialog-panel {
  width: min(520px, 100%);
  max-height: 88vh;
  overflow-y: auto;
  padding: var(--ss-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-3);
  box-shadow: var(--ss-shadow-xl);
}

.invoices__types {
  display: flex;
  gap: var(--ss-space-2);
}

.invoices__type {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  padding: var(--ss-space-2) var(--ss-space-4);
  border: 1px solid var(--ss-color-border-default);
  border-radius: var(--ss-radius-md);
  cursor: pointer;
}

.invoices__type--active {
  border-color: var(--ss-color-brand-600);
  background: var(--ss-color-brand-50);
  color: var(--ss-color-brand-600);
}
</style>
