/**
 * 通知模板管理
 */
import { deleteNotificationTemplate, listNotificationTemplates, saveNotificationTemplate } from '@/api/notification'
import { formatDateTime } from '@/utils/format'
import { NOTIFICATION_TEMPLATE_TYPE_OPTIONS } from '@/utils/resourceOptions'
import type { NotificationTemplate, SaveNotificationTemplateRequest } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<NotificationTemplate>[] = [
  { title: '模板名称', dataIndex: 'name', width: 170 },
  { title: '编码', dataIndex: 'code', width: 150 },
  {
    title: '类型',
    dataIndex: 'type',
    width: 120,
    render: (value) => NOTIFICATION_TEMPLATE_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? '-',
  },
  { title: '标题', dataIndex: 'title', width: 220, ellipsis: true, render: (value) => String(value || '—') },
  { title: '内容', dataIndex: 'content', ellipsis: true, render: (value) => String(value || '—') },
  { title: '跳转链接', dataIndex: 'link', width: 180, ellipsis: true, render: (value) => String(value || '—') },
  {
    title: '状态',
    dataIndex: 'enabled',
    width: 90,
    render: (value) => boolTag(Boolean(value)),
  },
  {
    title: '更新时间',
    dataIndex: 'updated_at',
    width: 170,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

const fields: ResourceField[] = [
  { name: 'name', label: '模板名称', required: true, searchable: true, placeholder: '如：订单支付成功' },
  { name: 'code', label: '模板编码', required: true, placeholder: '如：order_paid' },
  { name: 'type', label: '通知类型', type: 'select', options: NOTIFICATION_TEMPLATE_TYPE_OPTIONS, initialValue: 1 },
  { name: 'title', label: '通知标题', required: true, placeholder: '支持 {{order_no}} 占位符' },
  { name: 'content', label: '通知内容', type: 'textarea', required: true, placeholder: '支持 {{amount}} 等占位符' },
  { name: 'link', label: '跳转链接', placeholder: '如：/orders' },
  { name: 'enabled', label: '是否启用', type: 'switch', initialValue: true },
]

/** 通知模板管理页 */
export default function NotificationTemplates() {
  return (
    <ResourceTable<NotificationTemplate, Awaited<ReturnType<typeof listNotificationTemplates>>>
      title="通知模板"
      description="维护站内通知的标题、正文与跳转链接"
      listKey="templates"
      queryKey="notification-templates"
      fetcher={(params) =>
        listNotificationTemplates({
          keyword: params.keyword ? String(params.keyword) : undefined,
          type: params.type !== undefined ? Number(params.type) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      fields={fields}
      createLabel="新增模板"
      onSave={(values) => saveNotificationTemplate(values as unknown as SaveNotificationTemplateRequest)}
      onDelete={(record) => deleteNotificationTemplate(record.id)}
    />
  )
}
