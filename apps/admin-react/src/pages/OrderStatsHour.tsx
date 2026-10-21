/**
 * 订单统计 · 下单时段
 */
import type { ColumnsType } from 'antd/es/table'
import { orderStatsByHour } from '@/api/order'
import { formatNumber, formatYuan } from '@/utils/format'
import type { OrderHourStat } from '@/types'
import StatsBoard from '@/components/StatsBoard'

const columns: ColumnsType<OrderHourStat> = [
  {
    title: '时段',
    dataIndex: 'hour',
    width: 120,
    render: (value) => `${String(value).padStart(2, '0')}:00 - ${String(value).padStart(2, '0')}:59`,
  },
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
]

/** 订单时段统计页 */
export default function OrderStatsHour() {
  return (
    <StatsBoard<OrderHourStat>
      title="订单时段统计"
      description="查看一天 24 个时段内的订单分布，识别下单高峰"
      queryKey="order-stats-hour"
      fetcher={orderStatsByHour}
      listKey="hour_stats"
      categoryField="hour"
      valueField="order_count"
      valueLabel="订单数"
      chartType="bar"
      columns={columns}
      formatValue={(value) => formatNumber(value)}
      formatCategory={(value) => `${String(value).padStart(2, '0')}:00`}
      stats={[]}
    />
  )
}
