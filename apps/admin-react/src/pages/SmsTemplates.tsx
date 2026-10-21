/**
 * 短信模板管理
 */
import { deleteSmsTemplate, listSmsTemplates, saveSmsTemplate } from '@/api/notification'
import { formatDateTime } from '@/utils/format'
import type { SaveSmsTemplateRequest, SmsTemplate } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<SmsTemplate>[] = [
  { title: '模板名称', dataIndex: 'name', width: 170 },
  { title: '编码', dataIndex: 'code', width: 150 },
  { title: '短信内容', dataIndex: 'content', ellipsis: true, render: (value) => String(value || '—') },
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
  { name: 'name', label: '模板名称', required: true, searchable: true, placeholder: '如：注册验证码' },
  { name: 'code', label: '模板编码', required: true, placeholder: '如：register' },
  { name: 'content', label: '短信内容', type: 'textarea', required: true, placeholder: '支持 {{code}} 占位符' },
  { name: 'enabled', label: '是否启用', type: 'switch', initialValue: true },
]

/** 短信模板管理页 */
export default function SmsTemplates() {
  return (
    <ResourceTable<SmsTemplate, Awaited<ReturnType<typeof listSmsTemplates>>>
      title="短信模板"
      description="维护平台发送的短信文案与启用状态"
      listKey="templates"
      queryKey="sms-templates"
      fetcher={(params) =>
        listSmsTemplates({
          keyword: params.keyword ? String(params.keyword) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      fields={fields}
      createLabel="新增短信模板"
      onSave={(values) => saveSmsTemplate(values as unknown as SaveSmsTemplateRequest)}
      onDelete={(record) => deleteSmsTemplate(record.id)}
    />
  )
}
