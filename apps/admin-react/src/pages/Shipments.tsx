/**
 * 发货单管理
 */
import { Link } from 'react-router-dom'
import { listShipments } from '@/api/logistics'
import { formatDateTime, formatYuan } from '@/utils/format'
import { SHIPMENT_STATUS_OPTIONS } from '@/utils/resourceOptions'
import type { Shipment } from '@/types'
import ResourceTable, { type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<Shipment>[] = [
  { title: '运单号', dataIndex: 'tracking_no', width: 180 },
  { title: '订单号', dataIndex: 'order_no', width: 180 },
  { title: '快递公司', dataIndex: 'company', width: 130, render: (value) => String(value || '—') },
  { title: '收件人', dataIndex: 'receiver', width: 120, render: (value) => String(value || '—') },
  { title: '收货地址', dataIndex: 'address', ellipsis: true, render: (value) => String(value || '—') },
  {
    title: '运费',
    dataIndex: 'freight_cents',
    width: 110,
    align: 'right',
    render: (value) => formatYuan(Number(value ?? 0)),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (value) =>
      SHIPMENT_STATUS_OPTIONS.find((item) => item.value === Number(value))?.label ?? String(value),
  },
  {
    title: '发货时间',
    dataIndex: 'shipped_at',
    width: 170,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

const searchFields: ResourceField[] = [
  { name: 'keyword', label: '关键词', searchable: true, width: 200, placeholder: '运单号 / 订单号' },
  { name: 'status', label: '状态', type: 'select', searchable: true, width: 150, options: SHIPMENT_STATUS_OPTIONS },
  { name: 'order_id', label: '订单 ID', type: 'number', searchable: true, width: 140 },
]

/** 发货单管理页 */
export default function Shipments() {
  return (
    <ResourceTable<Shipment, Awaited<ReturnType<typeof listShipments>>>
      title="发货单"
      description="查看订单发货的运单信息与签收状态"
      listKey="shipments"
      queryKey="shipments"
      searchFields={searchFields}
      fetcher={(params) =>
        listShipments({
          keyword: params.keyword ? String(params.keyword) : undefined,
          status: params.status !== undefined ? Number(params.status) : undefined,
          order_id: params.order_id !== undefined ? Number(params.order_id) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      emptyText="暂无发货单"
      rowActions={(record) => (
        <Link to={`/shipments/detail?id=${record.id}`} style={{ fontSize: 12 }}>
          详情
        </Link>
      )}
    />
  )
}
