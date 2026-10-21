/**
 * 订单统计 · 支付渠道
 */
import type { ColumnsType } from 'antd/es/table'
import { orderStatsByChannel } from '@/api/order'
import { formatNumber, formatYuan } from '@/utils/format'
import type { OrderChannelStat } from '@/types'
import StatsBoard from '@/components/StatsBoard'

const columns: ColumnsType<OrderChannelStat> = [
  { title: '支付渠道', dataIndex: 'channel_name', width: 160 },
  {
    title: '订单数',
    dataIndex: 'order_count',
    width: 120,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  {
    title: '成交金额',
    dataIndex: 'amount_cents',
    width: 150,
    align: 'right',
    render: (value) => formatYuan(Number(value ?? 0)),
  },
  {
    title: '客单价',
    dataIndex: 'order_count',
    width: 140,
    align: 'right',
    render: (_value, record) =>
      record.order_count
        ? formatYuan(Math.round(record.amount_cents / record.order_count))
        : '—',
  },
]

/** 订单渠道统计页 */
export default function OrderStatsChannel() {
  return (
    <StatsBoard<OrderChannelStat>
      title="订单渠道统计"
      description="按支付渠道拆解订单量与成交金额"
      queryKey="order-stats-channel"
      fetcher={orderStatsByChannel}
      listKey="channel_stats"
      categoryField="channel_name"
      valueField="amount_cents"
      valueLabel="成交金额"
      chartType="pie"
      columns={columns}
      formatValue={(value) => formatYuan(value)}
      formatCategory={(value) => String(value ?? '-')}
      stats={[]}
    />
  )
}
