<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import {
  deleteInvoiceTemplate,
  listInvoiceTemplates,
  saveInvoiceTemplate,
} from '@/api/user'
import { useAppStore } from '@/stores/app'
import type { InvoiceTemplate } from '@/types'
import { formatDateTime } from '@/utils/format'

/**
 * 发票抬头模板
 * 数据来源 GET /api/v1/users/invoice-templates、POST 同路径、DELETE /api/v1/users/invoice-templates/{id}。
 */
const app = useAppStore()

const templates = ref<InvoiceTemplate[]>([])
const loading = ref(false)
const submitting = ref(false)
const editing = ref<InvoiceTemplate | null>(null)
const showForm = ref(false)

const form = reactive({
  title: '',
  tax_no: '',
  type: 'personal',
  email: '',
  phone: '',
  address: '',
  bank_name: '',
  bank_account: '',
  is_default: false,
})

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listInvoiceTemplates()
    templates.value = result.templates
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

function openForm(template?: InvoiceTemplate): void {
  editing.value = template ?? null
  form.title = template?.title ?? ''
  form.tax_no = template?.tax_no ?? ''
  form.type = template?.type ?? 'personal'
  form.email = template?.email ?? ''
  form.phone = template?.phone ?? ''
  form.address = template?.address ?? ''
  form.bank_name = template?.bank_name ?? ''
  form.bank_account = template?.bank_account ?? ''
  form.is_default = template?.is_default ?? false
  showForm.value = true
}

function closeForm(): void {
  showForm.value = false
  editing.value = null
}

async function submit(): Promise<void> {
  if (!form.title.trim()) {
    app.warning('请填写发票抬头')
    return
  }
  if (form.type === 'company' && !form.tax_no.trim()) {
    app.warning('企业抬头需要填写纳税人识别号')
    return
  }
  submitting.value = true
  try {
    await saveInvoiceTemplate({
      id: editing.value?.id,
      title: form.title.trim(),
      tax_no: form.tax_no.trim(),
      type: form.type,
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      bank_name: form.bank_name.trim(),
      bank_account: form.bank_account.trim(),
      is_default: form.is_default,
    })
    app.success(editing.value ? '发票抬头已更新' : '发票抬头已保存')
    closeForm()
    await load()
  } catch {
    // 错误提示已由接口层处理
  } finally {
    submitting.value = false
  }
}

async function onDelete(template: InvoiceTemplate): Promise<void> {
  if (!window.confirm(`确认删除「${template.title}」这条发票抬头吗？`)) return
  try {
    await deleteInvoiceTemplate(template.id)
    app.success('发票抬头已删除')
    await load()
  } catch {
    // 错误提示已由接口层处理
  }
}

onMounted(load)
</script>

<template>
  <div class="invoice-template ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">发票抬头模板</h1>
        <p class="ss-page-sub">保存常用抬头，开票时一键选择</p>
      </div>
      <div class="ss-row">
        <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/invoices">发票管理</RouterLink>
        <button type="button" class="ss-btn ss-btn-primary ss-btn-sm" @click="openForm()">
          新增抬头
        </button>
      </div>
    </div>

    <EmptyState
      v-if="!templates.length && !loading && !showForm"
      icon="🧾"
      title="还没有发票抬头"
      description="添加一个抬头，下次开票就不用重复填写"
      action-text="新增抬头"
      @action="openForm()"
    />

    <section v-else-if="templates.length" class="ss-grid ss-grid-2">
      <article v-for="template in templates" :key="template.id" class="invoice-template__card ss-card">
        <header class="invoice-template__head">
          <strong class="ss-ellipsis">{{ template.title }}</strong>
          <span class="ss-grow" />
          <span class="ss-tag ss-tag-neutral">
            {{ template.type === 'company' ? '企业' : '个人' }}
          </span>
          <span v-if="template.is_default" class="ss-tag ss-tag-accent">默认</span>
        </header>
        <div class="invoice-template__body">
          <div class="invoice-template__row">
            <span class="ss-muted-block">纳税人识别号</span>
            <span>{{ template.tax_no || '—' }}</span>
          </div>
          <div class="invoice-template__row">
            <span class="ss-muted-block">接收邮箱</span>
            <span>{{ template.email || '—' }}</span>
          </div>
          <div class="invoice-template__row">
            <span class="ss-muted-block">联系电话</span>
            <span>{{ template.phone || '—' }}</span>
          </div>
          <div class="invoice-template__row">
            <span class="ss-muted-block">地址</span>
            <span>{{ template.address || '—' }}</span>
          </div>
          <div v-if="template.bank_name" class="invoice-template__row">
            <span class="ss-muted-block">开户银行</span>
            <span>{{ template.bank_name }} / {{ template.bank_account }}</span>
          </div>
          <div class="invoice-template__row">
            <span class="ss-muted-block">创建时间</span>
            <span>{{ formatDateTime(template.created_at) }}</span>
          </div>
        </div>
        <footer class="invoice-template__foot">
          <button type="button" class="ss-btn ss-btn-outline ss-btn-sm" @click="openForm(template)">
            编辑
          </button>
          <span class="ss-grow" />
          <button type="button" class="ss-btn ss-btn-ghost ss-btn-sm" @click="onDelete(template)">
            删除
          </button>
        </footer>
      </article>
    </section>

    <section v-if="showForm" class="invoice-template__form ss-card">
      <h2 class="invoice-template__form-title">
        {{ editing ? '编辑发票抬头' : '新增发票抬头' }}
      </h2>

      <div class="ss-grid ss-grid-2">
        <label class="ss-field">
          <span class="ss-label">抬头名称 *</span>
          <input v-model="form.title" class="ss-input" type="text" placeholder="个人姓名或企业名称" />
        </label>
        <label class="ss-field">
          <span class="ss-label">抬头类型</span>
          <select v-model="form.type" class="ss-select">
            <option value="personal">个人</option>
            <option value="company">企业</option>
          </select>
        </label>
        <label class="ss-field">
          <span class="ss-label">纳税人识别号</span>
          <input v-model="form.tax_no" class="ss-input" type="text" placeholder="企业抬头必填" />
        </label>
        <label class="ss-field">
          <span class="ss-label">接收邮箱</span>
          <input v-model="form.email" class="ss-input" type="email" placeholder="用于接收电子发票" />
        </label>
        <label class="ss-field">
          <span class="ss-label">联系电话</span>
          <input v-model="form.phone" class="ss-input" type="tel" placeholder="选填" />
        </label>
        <label class="ss-field">
          <span class="ss-label">注册地址</span>
          <input v-model="form.address" class="ss-input" type="text" placeholder="选填" />
        </label>
        <label class="ss-field">
          <span class="ss-label">开户银行</span>
          <input v-model="form.bank_name" class="ss-input" type="text" placeholder="选填" />
        </label>
        <label class="ss-field">
          <span class="ss-label">银行账号</span>
          <input v-model="form.bank_account" class="ss-input" type="text" placeholder="选填" />
        </label>
      </div>

      <label class="invoice-template__default">
        <input v-model="form.is_default" type="checkbox" />
        <span>设为默认抬头</span>
      </label>

      <footer class="invoice-template__foot">
        <button type="button" class="ss-btn ss-btn-outline" @click="closeForm">取消</button>
        <span class="ss-grow" />
        <button type="button" class="ss-btn ss-btn-primary" :disabled="submitting" @click="submit">
          {{ submitting ? '保存中…' : '保存' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.invoice-template__card {
  display: flex;
  flex-direction: column;
  padding: var(--ss-space-4);
}

.invoice-template__head {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  padding-bottom: var(--ss-space-3);
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.invoice-template__body {
  display: flex;
  flex-direction: column;
  padding: var(--ss-space-2) 0;
}

.invoice-template__row {
  display: flex;
  justify-content: space-between;
  gap: var(--ss-space-4);
  padding: var(--ss-space-1) 0;
  font-size: var(--ss-font-size-sm);
}

.invoice-template__foot {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  padding-top: var(--ss-space-3);
  border-top: 1px solid var(--ss-color-border-subtle);
  margin-top: auto;
}

.invoice-template__form {
  padding: var(--ss-space-5);
  margin-top: var(--ss-space-4);
}

.invoice-template__form-title {
  font-size: var(--ss-font-size-lg);
  margin-bottom: var(--ss-space-4);
}

.invoice-template__default {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  margin-top: var(--ss-space-3);
  font-size: var(--ss-font-size-sm);
}

@media (max-width: 767px) {
  .invoice-template__row {
    flex-direction: column;
    gap: 2px;
  }
}
</style>
