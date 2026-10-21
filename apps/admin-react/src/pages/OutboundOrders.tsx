/**
 * 出库单列表
 */
import { Link } from 'react-router-dom'
import { listOutboundOrders } from '@/api/inventory'
import { formatDateTime, formatNumber } from '@/utils/format'
import { OUTBOUND_STATUS_OPTIONS } from '@/utils/resourceOptions'
import type { OutboundOrder } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<OutboundOrder>[] = [
  { title: '出库单号', dataIndex: 'outbound_no', width: 170 },
  { title: '仓库', dataIndex: 'warehouse_name', width: 150 },
  { title: '关联订单', dataIndex: 'order_no', width: 180, render: (value) => String(value || '—') },
  {
    title: '出库数量',
    dataIndex: 'total_quantity',
    width: 110,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (value) => {
      const option = OUTBOUND_STATUS_OPTIONS.find((item) => item.value === value)
      return boolTag(Number(value) === 1, option?.label ?? '已出库', option?.label ?? '-')
    },
  },
  { title: '操作人', dataIndex: 'operator', width: 120, render: (value) => String(value || '—') },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    width: 170,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

const searchFields: ResourceField[] = [
  { name: 'keyword', label: '关键词', searchable: true, width: 200, placeholder: '出库单号 / 订单号' },
  { name: 'status', label: '状态', type: 'select', searchable: true, width: 150, options: OUTBOUND_STATUS_OPTIONS },
]

/** 出库单列表页 */
export default function OutboundOrders() {
  return (
    <ResourceTable<OutboundOrder, Awaited<ReturnType<typeof listOutboundOrders>>>
      title="出库单"
      description="查看订单拣货与出库单据"
      listKey="outbound_orders"
      queryKey="outbound-orders"
      searchFields={searchFields}
      fetcher={(params) =>
        listOutboundOrders({
          keyword: params.keyword ? String(params.keyword) : undefined,
          status: params.status !== undefined ? Number(params.status) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      emptyText="暂无出库单"
      rowActions={(record) => (
        <Link to={`/outbound-orders/detail?id=${record.id}`} style={{ fontSize: 12 }}>
          详情
        </Link>
      )}
    />
  )
}
