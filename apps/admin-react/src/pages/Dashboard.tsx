/**
 * 数据看板
 */
import { useMemo } from 'react'
import { Card, Col, Empty, List, Row, Space, Table, Tag, Typography } from 'antd'
import {
  AccountBookOutlined,
  PayCircleOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { dashboardOverview } from '@/api/admin'
import { paymentSummary } from '@/api/payment'
import { useApiQuery } from '@/hooks/useApi'
import { formatNumber, formatYuan } from '@/utils/format'
import { tokens } from '@/theme'
import PageContainer from '@/components/PageContainer'
import StatCard from '@/components/StatCard'
import DemoModeAlert from '@/components/DemoModeAlert'
import EChart, { type EChartsOption } from '@/components/EChart'

/** 数据看板 */
export default function Dashboard() {
  const overviewQuery = useApiQuery(['dashboard', 'overview'], () => dashboardOverview(30))
  const summaryQuery = useApiQuery(['dashboard', 'payment-summary'], () => paymentSummary(14))

  const overview = overviewQuery.data
  const summary = summaryQuery.data

  /** 趋势折线图 */
  const trendOption = useMemo<EChartsOption>(() => {
    const trend = overview?.trend ?? []
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
          areaStyle: { opacity: 0.08 },
        },
        {
          name: '成交额',
          type: 'line',
          smooth: true,
          showSymbol: false,
          yAxisIndex: 1,
          data: trend.map((point) => point.revenue_cents),
          itemStyle: { color: tokens.colorSuccess },
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
  }, [overview])

  /** 分类销售排行 */
  const categoryOption = useMemo<EChartsOption>(() => {
    const stats = overview?.category_stats ?? []
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 24, top: 16, bottom: 8, containLabel: true },
      xAxis: { type: 'value', name: '销售额（元）' },
      yAxis: {
        type: 'category',
        data: stats.map((stat) => stat.category_name).reverse(),
      },
      series: [
        {
          type: 'bar',
          barWidth: 18,
          data: stats.map((stat) => stat.revenue_cents / 100).reverse(),
          itemStyle: { color: tokens.colorPrimary, borderRadius: [0, 6, 6, 0] },
        },
      ],
    }
  }, [overview])

  /** 支付趋势 */
  const paymentOption = useMemo<EChartsOption>(() => {
    const trend = summary?.trend ?? []
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 8, right: 16, top: 24, bottom: 24, containLabel: true },
      xAxis: { type: 'category', data: trend.map((point) => point.date.slice(5)) },
      yAxis: [
        { type: 'value', name: '笔数' },
        { type: 'value', name: '金额（元）' },
      ],
      series: [
        {
          name: '支付笔数',
          type: 'bar',
          barWidth: 12,
          data: trend.map((point) => point.count),
          itemStyle: { color: tokens.colorInfo, borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '支付金额',
          type: 'line',
          smooth: true,
          showSymbol: false,
          yAxisIndex: 1,
          data: trend.map((point) => point.amount_cents / 100),
          itemStyle: { color: tokens.colorSuccess },
        },
      ],
    }
  }, [summary])

  const reload = () => {
    overviewQuery.refetch()
    summaryQuery.refetch()
  }

  return (
    <PageContainer
      title="数据看板"
      description="近 30 天经营概览与支付表现"
      extra={
        <Typography.Text type="secondary">
          数据时间：近 30 天
        </Typography.Text>
      }
    >
      <DemoModeAlert onRetry={reload} />

      <Row gutter={[16, 16]} className="dashboard-row">
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="总用户"
            value={overview?.total_users ?? 0}
            icon={<TeamOutlined style={{ color: tokens.colorPrimary }} />}
            hint={`新增 ${formatNumber(overview?.new_users ?? 0)}`}
            loading={overviewQuery.isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="总订单"
            value={overview?.total_orders ?? 0}
            icon={<ShoppingCartOutlined style={{ color: tokens.colorInfo }} />}
            hint={`已支付 ${formatNumber(overview?.paid_orders ?? 0)}`}
            loading={overviewQuery.isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="总成交额"
            value={formatYuan(overview?.total_revenue_cents ?? 0)}
            icon={<AccountBookOutlined style={{ color: tokens.colorSuccess }} />}
            hint={`今日 ${formatYuan(overview?.today_revenue_cents ?? 0)}`}
            loading={overviewQuery.isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="待发货"
            value={overview?.pending_shipment ?? 0}
            icon={<PayCircleOutlined style={{ color: tokens.colorWarning }} />}
            hint={`待处理退款 ${formatNumber(overview?.pending_refunds ?? 0)}`}
            loading={overviewQuery.isLoading}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="dashboard-row">
        <Col xs={24} xl={16}>
          <Card title="经营趋势" variant="outlined" loading={overviewQuery.isLoading}>
            {overview?.trend?.length ? (
              <EChart option={trendOption} height={320} loading={overviewQuery.isFetching} />
            ) : (
              <Empty description="暂无趋势数据" />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="分类销售排行" variant="outlined" loading={overviewQuery.isLoading}>
            {overview?.category_stats?.length ? (
              <EChart option={categoryOption} height={320} loading={overviewQuery.isFetching} />
            ) : (
              <Empty description="暂无分类数据" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="dashboard-row">
        <Col xs={24} xl={12}>
          <Card title="热销商品 Top 5" variant="outlined" loading={overviewQuery.isLoading}>
            {overview?.top_products?.length ? (
              <Table
                size="small"
                rowKey="product_id"
                pagination={false}
                dataSource={overview.top_products}
                columns={[
                  {
                    title: '商品',
                    dataIndex: 'title',
                    render: (_: unknown, row) => (
                      <Space size={8}>
                        <img
                          src={row.cover}
                          alt={row.title}
                          width={36}
                          height={36}
                          style={{ borderRadius: 6, objectFit: 'cover' }}
                        />
                        <Typography.Text ellipsis style={{ maxWidth: 220 }}>
                          {row.title}
                        </Typography.Text>
                      </Space>
                    ),
                  },
                  {
                    title: '销量',
                    dataIndex: 'sales_count',
                    width: 90,
                    align: 'right',
                    render: (value: number) => formatNumber(value),
                  },
                  {
                    title: '销售额',
                    dataIndex: 'revenue_cents',
                    width: 120,
                    align: 'right',
                    render: (value: number) => formatYuan(value),
                  },
                ]}
              />
            ) : (
              <Empty description="暂无热销商品" />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card title="支付概览" variant="outlined" loading={summaryQuery.isLoading}>
            <Row gutter={[16, 16]}>
              <Col xs={8}>
                <StatisticBlock label="今日笔数" value={formatNumber(summary?.today_count ?? 0)} />
              </Col>
              <Col xs={8}>
                <StatisticBlock
                  label="今日金额"
                  value={formatYuan(summary?.today_amount_cents ?? 0)}
                />
              </Col>
              <Col xs={8}>
                <StatisticBlock
                  label="成功率"
                  value={`${summary?.success_rate ?? 0}%`}
                  accent={tokens.colorSuccess}
                />
              </Col>
            </Row>
            {summary?.trend?.length ? (
              <EChart option={paymentOption} height={220} loading={summaryQuery.isFetching} />
            ) : (
              <Empty description="暂无支付趋势" />
            )}
          </Card>
        </Col>
      </Row>

      <Card title="分类销售明细" variant="outlined" loading={overviewQuery.isLoading}>
        {overview?.category_stats?.length ? (
          <List
            size="small"
            dataSource={overview.category_stats}
            renderItem={(item) => (
              <List.Item>
                <Space>
                  <Tag color="blue">{item.category_name}</Tag>
                  <Typography.Text type="secondary">销量 {formatNumber(item.sales_count)}</Typography.Text>
                </Space>
                <Typography.Text strong>{formatYuan(item.revenue_cents)}</Typography.Text>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无分类销售数据" />
        )}
      </Card>
    </PageContainer>
  )
}

/** 看板小统计块 */
function StatisticBlock({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="dashboard-block">
      <Typography.Text type="secondary">{label}</Typography.Text>
      <div className="dashboard-block__value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
    </div>
  )
}
