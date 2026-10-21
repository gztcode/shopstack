/**
 * 经营分析
 */
import { useMemo, useState } from 'react'
import { Button, Card, Col, Empty, Radio, Row, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { adminOrderStats, paymentSummary } from '@/api/analytics'
import { useApiQuery } from '@/hooks/useApi'
import { formatNumber, formatYuan } from '@/utils/format'
import { tokens } from '@/theme'
import type { OrderCategoryStat, OrderTopProduct } from '@/types'
import PageContainer from '@/components/PageContainer'
import StatCard from '@/components/StatCard'
import EChart, { type EChartsOption } from '@/components/EChart'
import DemoModeAlert from '@/components/DemoModeAlert'
import { useMessage } from '@/hooks/useMessage'

const RANGE_OPTIONS = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 },
]

/** 经营分析页 */
export default function Analytics() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const [days, setDays] = useState(30)

  const statsQuery = useApiQuery(['analytics', 'order-stats', days], () => adminOrderStats(days), {
    placeholderData: (previous) => previous,
  })
  const summaryQuery = useApiQuery(['analytics', 'payment-summary', days], () => paymentSummary(days), {
    placeholderData: (previous) => previous,
  })

  const stats = statsQuery.data
  const summary = summaryQuery.data

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['analytics'] })
  }

  /** 客单价：成交额 / 已支付订单数 */
  const averageOrderValue = useMemo(() => {
    if (!stats?.paid_orders) return 0
    return Math.round(stats.total_revenue_cents / stats.paid_orders)
  }, [stats])

  /** 完成率：已完成订单 / 总订单 */
  const completionRate = useMemo(() => {
    if (!stats?.total_orders) return 0
    return Math.round(((stats.completed ?? 0) / stats.total_orders) * 100)
  }, [stats])

  /** 趋势图 */
  const trendOption = useMemo<EChartsOption>(() => {
    const trend = stats?.trend ?? []
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['订单数', '成交额', '新增用户'], bottom: 0 },
      grid: { left: 8, right: 16, top: 24, bottom: 36, containLabel: true },
      xAxis: { type: 'category', data: trend.map((point) => point.date.slice(5)) },
      yAxis: [
        { type: 'value', name: '订单数' },
        { type: 'value', name: '成交额', axisLabel: { formatter: (value: number) => `${value / 100}` } },
      ],
      series: [
        {
          name: '订单数',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: trend.map((point) => point.order_count),
          itemStyle: { color: tokens.colorPrimary },
        },
        {
          name: '成交额',
          type: 'line',
          smooth: true,
          showSymbol: false,
          yAxisIndex: 1,
          data: trend.map((point) => point.revenue_cents),
          itemStyle: { color: tokens.colorSuccess },
          areaStyle: { opacity: 0.06 },
        },
        {
          name: '新增用户',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: trend.map((point) => point.new_users),
          itemStyle: { color: tokens.colorWarning },
        },
      ],
    }
  }, [stats])

  /** 分类销售图 */
  const categoryOption = useMemo<EChartsOption>(() => {
    const list = stats?.category_stats ?? []
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 24, top: 16, bottom: 8, containLabel: true },
      xAxis: { type: 'value', name: '销售额（元）' },
      yAxis: { type: 'category', data: list.map((item) => item.category_name).reverse() },
      series: [
        {
          type: 'bar',
          barWidth: 18,
          data: list.map((item) => item.revenue_cents / 100).reverse(),
          itemStyle: { color: tokens.colorInfo, borderRadius: [0, 6, 6, 0] },
        },
      ],
    }
  }, [stats])

  /** 订单状态分布 */
  const statusOption = useMemo<EChartsOption>(() => {
    if (!stats) return {}
    const data = [
      { name: '已完成', value: stats.completed ?? 0 },
      { name: '待发货', value: stats.pending_shipment ?? 0 },
      { name: '待收货', value: stats.pending_receipt ?? 0 },
      { name: '待付款', value: stats.pending_payment ?? 0 },
      { name: '退款中', value: stats.refunding ?? 0 },
      { name: '已取消', value: stats.cancelled ?? 0 },
    ].filter((item) => item.value > 0)
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: ['42%', '68%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: true,
          label: { formatter: '{b}: {c}' },
          data,
        },
      ],
    }
  }, [stats])

  /** 导出 CSV（真实导出当前统计数据） */
  const handleExport = () => {
    if (!stats) {
      message.info('暂无可导出的数据')
      return
    }
    const header = ['日期', '订单数', '成交额(元)', '新增用户']
    const rows = stats.trend.map((point) => [
      point.date,
      String(point.order_count),
      (point.revenue_cents / 100).toFixed(2),
      String(point.new_users),
    ])
    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${cell}"`).join(','))
      .join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `经营分析_${days}天_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success('经营分析数据已导出')
  }

  const categoryColumns: ColumnsType<OrderCategoryStat> = [
    { title: '分类', dataIndex: 'category_name', width: 140 },
    {
      title: '销量',
      dataIndex: 'sales_count',
      width: 110,
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      title: '销售额',
      dataIndex: 'revenue_cents',
      width: 140,
      align: 'right',
      render: (value: number) => formatYuan(value),
    },
  ]

  const productColumns: ColumnsType<OrderTopProduct> = [
    {
      title: '商品',
      dataIndex: 'title',
      render: (value: string, record) => (
        <Space size={8}>
          <img
            src={record.cover}
            alt={value}
            width={32}
            height={32}
            style={{ borderRadius: 6, objectFit: 'cover', background: '#F1F5F9' }}
          />
          <Typography.Text ellipsis style={{ maxWidth: 220 }}>
            {value}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '销量',
      dataIndex: 'sales_count',
      width: 100,
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      title: '销售额',
      dataIndex: 'revenue_cents',
      width: 130,
      align: 'right',
      render: (value: number) => formatYuan(value),
    },
  ]

  return (
    <PageContainer
      title="经营分析"
      description="订单、成交与支付的全维度经营指标"
      extra={
        <Space>
          <Radio.Group
            value={days}
            onChange={(event) => setDays(event.target.value)}
            optionType="button"
            buttonStyle="solid"
            options={RANGE_OPTIONS}
          />
          <Button icon={<ReloadOutlined />} onClick={refresh}>
            刷新
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
            导出 CSV
          </Button>
        </Space>
      }
    >
      <DemoModeAlert onRetry={refresh} />

      <Row gutter={[16, 16]} className="dashboard-row">
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="总订单数"
            value={formatNumber(stats?.total_orders ?? 0)}
            hint={`今日新增 ${formatNumber(stats?.today_orders ?? 0)}`}
            loading={statsQuery.isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="成交额"
            value={formatYuan(stats?.total_revenue_cents ?? 0)}
            hint={`今日 ${formatYuan(stats?.today_revenue_cents ?? 0)}`}
            loading={statsQuery.isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="客单价"
            value={formatYuan(averageOrderValue)}
            hint={`已支付 ${formatNumber(stats?.paid_orders ?? 0)} 单`}
            loading={statsQuery.isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="订单完成率"
            value={`${completionRate}%`}
            hint={`总用户 ${formatNumber(stats?.total_users ?? 0)}`}
            accent={tokens.colorSuccess}
            loading={statsQuery.isLoading}
          />
        </Col>
      </Row>

      <Card title="经营趋势" variant="outlined" loading={statsQuery.isLoading}>
        {stats?.trend?.length ? (
          <EChart option={trendOption} height={320} loading={statsQuery.isFetching} />
        ) : (
          <Empty description="暂无趋势数据" />
        )}
      </Card>

      <Row gutter={[16, 16]} className="dashboard-row">
        <Col xs={24} xl={12}>
          <Card title="分类销售额" variant="outlined" loading={statsQuery.isLoading}>
            {stats?.category_stats?.length ? (
              <EChart option={categoryOption} height={300} loading={statsQuery.isFetching} />
            ) : (
              <Empty description="暂无分类数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="订单状态分布" variant="outlined" loading={statsQuery.isLoading}>
            <EChart option={statusOption} height={300} loading={statsQuery.isFetching} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="dashboard-row">
        <Col xs={24} xl={12}>
          <Card title="分类销售明细" variant="outlined" loading={statsQuery.isLoading}>
            <Table<OrderCategoryStat>
              rowKey="category_id"
              size="small"
              pagination={false}
              dataSource={stats?.category_stats ?? []}
              columns={categoryColumns}
              locale={{ emptyText: '暂无数据' }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="热销商品" variant="outlined" loading={statsQuery.isLoading}>
            <Table<OrderTopProduct>
              rowKey="product_id"
              size="small"
              pagination={false}
              dataSource={stats?.top_products ?? []}
              columns={productColumns}
              locale={{ emptyText: '暂无数据' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="支付概览" variant="outlined" loading={summaryQuery.isLoading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <div className="dashboard-block">
              <Typography.Text type="secondary">支付总笔数</Typography.Text>
              <div className="dashboard-block__value">{formatNumber(summary?.total_count ?? 0)}</div>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div className="dashboard-block">
              <Typography.Text type="secondary">支付总金额</Typography.Text>
              <div className="dashboard-block__value">{formatYuan(summary?.total_amount_cents ?? 0)}</div>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div className="dashboard-block">
              <Typography.Text type="secondary">支付成功率</Typography.Text>
              <div className="dashboard-block__value" style={{ color: tokens.colorSuccess }}>
                {summary?.success_rate ?? 0}%
              </div>
            </div>
          </Col>
        </Row>
        <div style={{ marginTop: 16 }}>
          <Space size={4} wrap>
            <Tag color="blue">已退款 {formatYuan(summary?.refunded_amount_cents ?? 0)}</Tag>
            <Tag color="cyan">今日 {formatNumber(summary?.today_count ?? 0)} 笔</Tag>
            <Tag color="green">今日 {formatYuan(summary?.today_amount_cents ?? 0)}</Tag>
          </Space>
        </div>
      </Card>
    </PageContainer>
  )
}
