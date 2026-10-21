/**
 * 入库单列表
 */
import { Link } from 'react-router-dom'
import { listInboundOrders } from '@/api/inventory'
import { formatDateTime, formatNumber } from '@/utils/format'
import { INBOUND_STATUS_OPTIONS } from '@/utils/resourceOptions'
import type { InboundOrder } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<InboundOrder>[] = [
  { title: '入库单号', dataIndex: 'inbound_no', width: 170 },
  { title: '仓库', dataIndex: 'warehouse_name', width: 150 },
  { title: '供应商', dataIndex: 'supplier', width: 180, render: (value) => String(value || '—') },
  {
    title: '入库数量',
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
      const option = INBOUND_STATUS_OPTIONS.find((item) => item.value === value)
      return boolTag(Number(value) === 1, option?.label ?? '已入库', option?.label ?? '-')
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
  { name: 'keyword', label: '关键词', searchable: true, width: 200, placeholder: '入库单号 / 供应商' },
  { name: 'status', label: '状态', type: 'select', searchable: true, width: 150, options: INBOUND_STATUS_OPTIONS },
]

/** 入库单列表页 */
export default function InboundOrders() {
  return (
    <ResourceTable<InboundOrder, Awaited<ReturnType<typeof listInboundOrders>>>
      title="入库单"
      description="查看供应商到货的入库单据与入库进度"
      listKey="inbound_orders"
      queryKey="inbound-orders"
      searchFields={searchFields}
      fetcher={(params) =>
        listInboundOrders({
          keyword: params.keyword ? String(params.keyword) : undefined,
          status: params.status !== undefined ? Number(params.status) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      emptyText="暂无入库单"
      rowActions={(record) => (
        <Link to={`/inbound-orders/detail?id=${record.id}`} style={{ fontSize: 12 }}>
          详情
        </Link>
      )}
    />
  )
}
