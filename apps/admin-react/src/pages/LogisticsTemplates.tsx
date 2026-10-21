/**
 * 运费模板管理
 */
import { deleteTemplate, listTemplates, saveTemplate } from '@/api/logistics'
import { formatYuan } from '@/utils/format'
import type { LogisticTemplate, SaveTemplateRequest } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<LogisticTemplate>[] = [
  { title: '模板名称', dataIndex: 'name', width: 180 },
  { title: '快递公司', dataIndex: 'company', width: 140, render: (value) => String(value || '—') },
  { title: '公司编码', dataIndex: 'company_code', width: 140, render: (value) => String(value || '—') },
  {
    title: '默认运费',
    dataIndex: 'freight_cents',
    width: 130,
    align: 'right',
    render: (value) => formatYuan(Number(value ?? 0)),
  },
  {
    title: '包邮门槛',
    dataIndex: 'free_freight_amount_cents',
    width: 140,
    align: 'right',
    render: (value) => formatYuan(Number(value ?? 0)),
  },
  { title: '适用地区', dataIndex: 'regions', ellipsis: true, render: (value) => String(value || '全国') },
  { title: '排序', dataIndex: 'sort', width: 80, align: 'right' },
  {
    title: '状态',
    dataIndex: 'enabled',
    width: 90,
    render: (value) => boolTag(Boolean(value)),
  },
]

const fields: ResourceField[] = [
  { name: 'name', label: '模板名称', required: true, placeholder: '如：默认运费模板' },
  { name: 'company', label: '快递公司', placeholder: '如：顺丰速运' },
  { name: 'company_code', label: '公司编码', placeholder: '如：sf' },
  { name: 'freight_cents', label: '默认运费（元）', type: 'money', required: true },
  { name: 'free_freight_amount_cents', label: '包邮门槛（元）', type: 'money', initialValue: 0 },
  { name: 'regions', label: '适用地区', placeholder: '逗号分隔，留空表示全国' },
  { name: 'sort', label: '排序', type: 'number', initialValue: 0 },
  { name: 'enabled', label: '是否启用', type: 'switch', initialValue: true },
]

/** 运费模板管理页 */
export default function LogisticsTemplates() {
  return (
    <ResourceTable<LogisticTemplate, Awaited<ReturnType<typeof listTemplates>>>
      title="运费模板"
      description="维护平台使用的运费模板、默认运费与包邮门槛"
      listKey="templates"
      queryKey="logistics-templates"
      fetcher={() => listTemplates()}
      columns={columns}
      fields={fields}
      createLabel="新增模板"
      onSave={(values) => saveTemplate(values as unknown as SaveTemplateRequest)}
      onDelete={(record) => deleteTemplate(record.id)}
    />
  )
}
