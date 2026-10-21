/**
 * 充值订单 —— 查看用户余额充值记录
 */
import { listRecharges } from '@/api/payment'
import { formatDateTime, formatYuan } from '@/utils/format'
import { PAY_CHANNEL_OPTIONS, RECHARGE_STATUS_OPTIONS } from '@/utils/resourceOptions'
import type { RechargeOrder } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<RechargeOrder>[] = [
  { title: '充值单号', dataIndex: 'recharge_no', width: 180 },
  { title: '用户 ID', dataIndex: 'user_id', width: 110, align: 'right' },
  {
    title: '充值金额',
    dataIndex: 'amount_cents',
    width: 130,
    align: 'right',
    render: (value) => formatYuan(Number(value ?? 0)),
  },
  {
    title: '赠送金额',
    dataIndex: 'bonus_cents',
    width: 130,
    align: 'right',
    render: (value) => formatYuan(Number(value ?? 0)),
  },
  {
    title: '支付渠道',
    dataIndex: 'channel',
    width: 130,
    render: (value) => PAY_CHANNEL_OPTIONS.find((item) => item.value === value)?.label ?? '-',
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (value) => {
      const option = RECHARGE_STATUS_OPTIONS.find((item) => item.value === value)
      return boolTag(Number(value) === 1, option?.label ?? '已支付', option?.label ?? '-')
    },
  },
  { title: '支付单号', dataIndex: 'payment_no', width: 180, render: (value) => String(value || '—') },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    width: 170,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

const searchFields: ResourceField[] = [
  { name: 'status', label: '状态', type: 'select', searchable: true, width: 150, options: RECHARGE_STATUS_OPTIONS },
  { name: 'user_id', label: '用户 ID', type: 'number', searchable: true, width: 140 },
]

/** 充值订单页 */
export default function RechargeOrders() {
  return (
    <ResourceTable<RechargeOrder, Awaited<ReturnType<typeof listRecharges>>>
      title="充值订单"
      description="查看用户余额充值记录与赠送金额"
      listKey="recharges"
      queryKey="recharges"
      searchFields={searchFields}
      fetcher={(params) =>
        listRecharges({
          status: params.status !== undefined ? Number(params.status) : undefined,
          user_id: params.user_id !== undefined ? Number(params.user_id) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      emptyText="暂无充值记录"
    />
  )
}
