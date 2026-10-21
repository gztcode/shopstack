/**
 * 订单日志 —— 后台查看订单状态流转记录
 */
import { listAdminOrderLogs } from '@/api/order'
import { formatDateTime } from '@/utils/format'
import type { OrderStatusLog } from '@/types'
import ResourceTable, { type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<OrderStatusLog>[] = [
  { title: '订单 ID', dataIndex: 'order_id', width: 110, align: 'right' },
  { title: '动作', dataIndex: 'action', width: 160, render: (value) => String(value || '—') },
  {
    title: '状态流转',
    dataIndex: 'from_status',
    width: 160,
    render: (value, record) => `${String(value)} → ${String(record.to_status)}`,
  },
  { title: '操作人', dataIndex: 'operator', width: 140, render: (value) => String(value || '—') },
  { title: '备注', dataIndex: 'remark', ellipsis: true, render: (value) => String(value || '—') },
  {
    title: '发生时间',
    dataIndex: 'created_at',
    width: 170,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

const searchFields: ResourceField[] = [
  { name: 'keyword', label: '动作', searchable: true, width: 200, placeholder: '如：支付' },
]

/** 订单日志页 */
export default function OrderLogs() {
  return (
    <ResourceTable<OrderStatusLog, Awaited<ReturnType<typeof listAdminOrderLogs>>>
      title="订单日志"
      description="查看订单从下单到完成的全流程状态流转记录"
      listKey="logs"
      queryKey="admin-order-logs"
      searchFields={searchFields}
      fetcher={(params) =>
        listAdminOrderLogs({
          keyword: params.keyword ? String(params.keyword) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      emptyText="暂无订单日志"
    />
  )
}
