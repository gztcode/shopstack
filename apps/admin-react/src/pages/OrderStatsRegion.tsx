/**
 * 订单统计 · 收货地区
 */
import type { ColumnsType } from 'antd/es/table'
import { orderStatsByRegion } from '@/api/order'
import { formatNumber, formatYuan } from '@/utils/format'
import type { OrderRegionStat } from '@/types'
import StatsBoard from '@/components/StatsBoard'

const columns: ColumnsType<OrderRegionStat> = [
  { title: '收货地区', dataIndex: 'region', width: 200 },
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
      record.order_count ? formatYuan(Math.round(record.amount_cents / record.order_count)) : '—',
  },
]

/** 订单地区统计页 */
export default function OrderStatsRegion() {
  return (
    <StatsBoard<OrderRegionStat>
      title="订单地区统计"
      description="按收货省市统计订单量与成交金额"
      queryKey="order-stats-region"
      fetcher={orderStatsByRegion}
      listKey="region_stats"
      categoryField="region"
      valueField="amount_cents"
      valueLabel="成交金额"
      chartType="bar"
      columns={columns}
      formatValue={(value) => formatYuan(value)}
      formatCategory={(value) => String(value ?? '-')}
      stats={[]}
    />
  )
}
