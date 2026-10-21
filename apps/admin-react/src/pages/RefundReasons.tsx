/**
 * 退款原因 —— 维护用户端可选的退款理由
 */
import { deleteRefundReason, listRefundReasons, saveRefundReason } from '@/api/order'
import type { RefundReason, SaveRefundReasonRequest } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<RefundReason>[] = [
  { title: '原因名称', dataIndex: 'name', width: 220 },
  {
    title: '适用类型',
    dataIndex: 'type',
    width: 130,
    render: (value) =>
      Number(value) === 1 ? '仅退款' : Number(value) === 2 ? '退货退款' : '换货',
  },
  { title: '排序', dataIndex: 'sort', width: 100, align: 'right' },
  {
    title: '状态',
    dataIndex: 'enabled',
    width: 100,
    render: (value) => boolTag(Boolean(value)),
  },
]

const fields: ResourceField[] = [
  { name: 'name', label: '原因名称', required: true, placeholder: '如：七天无理由退换' },
  {
    name: 'type',
    label: '适用类型',
    type: 'select',
    options: [
      { label: '仅退款', value: 1 },
      { label: '退货退款', value: 2 },
      { label: '换货', value: 3 },
    ],
    initialValue: 1,
  },
  { name: 'sort', label: '排序', type: 'number', initialValue: 0 },
  { name: 'enabled', label: '是否启用', type: 'switch', initialValue: true },
]

/** 退款原因管理页 */
export default function RefundReasons() {
  return (
    <ResourceTable<RefundReason, Awaited<ReturnType<typeof listRefundReasons>>>
      title="退款原因"
      description="维护用户申请退款时可选择的原因"
      listKey="reasons"
      queryKey="refund-reasons"
      fetcher={() => listRefundReasons()}
      columns={columns}
      fields={fields}
      createLabel="新增原因"
      onSave={(values) => saveRefundReason(values as unknown as SaveRefundReasonRequest)}
      onDelete={(record) => deleteRefundReason(record.id)}
    />
  )
}
