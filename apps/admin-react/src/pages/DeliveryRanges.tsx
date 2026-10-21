/**
 * 配送范围 —— 维护运费模板按地区的计费规则
 */
import { listDeliveryRanges, saveDeliveryRange } from '@/api/logistics'
import { formatYuan } from '@/utils/format'
import type { DeliveryRange, SaveDeliveryRangeRequest } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<DeliveryRange>[] = [
  { title: '运费模板', dataIndex: 'template_name', width: 180, render: (value) => String(value || '—') },
  { title: '适用地区', dataIndex: 'regions', width: 300, ellipsis: true, render: (value) => String(value || '—') },
  {
    title: '首重运费',
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
  {
    title: '状态',
    dataIndex: 'enabled',
    width: 90,
    render: (value) => boolTag(Boolean(value)),
  },
]

const fields: ResourceField[] = [
  { name: 'template_id', label: '运费模板 ID', type: 'number', required: true, initialValue: 1 },
  { name: 'regions', label: '适用地区', required: true, placeholder: '如：广东省 广州市 天河区' },
  { name: 'freight_cents', label: '首重运费（元）', type: 'money', required: true },
  { name: 'free_freight_amount_cents', label: '包邮门槛（元）', type: 'money', initialValue: 0 },
  { name: 'enabled', label: '是否启用', type: 'switch', initialValue: true },
]

/** 配送范围页 */
export default function DeliveryRanges() {
  return (
    <ResourceTable<DeliveryRange, Awaited<ReturnType<typeof listDeliveryRanges>>>
      title="配送范围"
      description="维护各运费模板按地区设置的运费与包邮门槛"
      listKey="ranges"
      queryKey="delivery-ranges"
      fetcher={(params) =>
        listDeliveryRanges({
          template_id: params.template_id !== undefined ? Number(params.template_id) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      fields={fields}
      createLabel="新增配送范围"
      onSave={(values) => saveDeliveryRange(values as unknown as SaveDeliveryRangeRequest)}
    />
  )
}
