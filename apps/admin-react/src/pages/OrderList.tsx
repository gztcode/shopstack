/**
 * 全部订单 —— 后台多维筛选的订单列表
 */
import { listAdminOrders } from '@/api/order'
import { formatDateTime, formatYuan } from '@/utils/format'
import { ADMIN_ORDER_STATUS_OPTIONS, PAYMENT_METHOD_OPTIONS } from '@/utils/resourceOptions'
import type { Order } from '@/types'
import ResourceTable, { type ResourceColumn, type ResourceField } from '@/components/ResourceTable'
import StatusTag from '@/components/StatusTag'

const columns: ResourceColumn<Order>[] = [
  { title: '订单号', dataIndex: 'order_no', width: 180 },
  { title: '用户', dataIndex: 'user_nickname', width: 130, render: (value) => String(value || '—') },
  {
    title: '实付金额',
    dataIndex: 'payable_cents',
    width: 130,
    align: 'right',
    render: (value) => formatYuan(Number(value ?? 0)),
  },
  {
    title: '优惠',
    dataIndex: 'discount_cents',
    width: 120,
    align: 'right',
    render: (value) => formatYuan(Number(value ?? 0)),
  },
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
    render: (value) => <StatusTag status={String(value)} />,
  },
  {
    title: '下单时间',
    dataIndex: 'created_at',
    width: 170,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

const searchFields: ResourceField[] = [
  { name: 'keyword', label: '订单号', searchable: true, width: 200 },
  { name: 'status', label: '订单状态', type: 'select', searchable: true, width: 150, options: ADMIN_ORDER_STATUS_OPTIONS },
  { name: 'payment_method', label: '支付方式', type: 'select', searchable: true, width: 150, options: PAYMENT_METHOD_OPTIONS },
  { name: 'user_id', label: '用户 ID', type: 'number', searchable: true, width: 140 },
]

/** 全部订单页 */
export default function OrderList() {
  return (
    <ResourceTable<Order, Awaited<ReturnType<typeof listAdminOrders>>>
      title="全部订单"
      description="按状态、支付方式与用户筛选平台订单"
      listKey="orders"
      queryKey="admin-orders"
      searchFields={searchFields}
      fetcher={(params) =>
        listAdminOrders({
          keyword: params.keyword ? String(params.keyword) : undefined,
          status: params.status !== undefined ? Number(params.status) : undefined,
          payment_method: params.payment_method !== undefined ? Number(params.payment_method) : undefined,
          user_id: params.user_id !== undefined ? Number(params.user_id) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      emptyText="暂无符合条件的订单"
    />
  )
}
