/**
 * 用户等级分布 —— 各会员等级的人数占比
 */
import { Card, Col, Row, Statistic, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { listUserLevelStats } from '@/api/user'
import { useApiQuery } from '@/hooks/useApi'
import { formatNumber } from '@/utils/format'
import PageContainer from '@/components/PageContainer'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import EChart, { type EChartsOption } from '@/components/EChart'
import { useMemo } from 'react'

type LevelStat = { id: number; name: string; level: number; user_count: number; discount_percent: number }


/** 用户等级分布页 */
export default function UserLevelStats() {
  const query = useApiQuery(['user-level-stats'], () => listUserLevelStats())
  const levels = useMemo(() => query.data?.levels ?? [], [query.data])
  const total = levels.reduce((sum, item) => sum + (item.user_count ?? 0), 0)

  const tableColumns: ColumnsType<LevelStat> = useMemo(
    () => [
      { title: '等级', dataIndex: 'name', width: 160 },
      { title: '等级序号', dataIndex: 'level', width: 110, align: 'right' },
      {
        title: '用户数',
        dataIndex: 'user_count',
        width: 130,
        align: 'right',
        render: (value) => formatNumber(Number(value ?? 0)),
      },
      {
        title: '折扣',
        dataIndex: 'discount_percent',
        width: 110,
        align: 'right',
        render: (value) => `${(Number(value ?? 100) / 10).toFixed(1)} 折`,
      },
      {
        title: '占比',
        dataIndex: 'user_count',
        width: 120,
        align: 'right',
        render: (value) =>
          total ? `${((Number(value ?? 0) / total) * 100).toFixed(1)}%` : '—',
      },
    ],
    [total],
  )

  const option = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          type: 'pie',
          radius: ['40%', '66%'],
          data: levels.map((item) => ({ name: item.name, value: item.user_count })),
        },
      ],
    }),
    [levels],
  )

  return (
    <PageContainer title="用户等级分布" description="统计各会员等级的用户数量与占比">
      <DemoModeAlert onRetry={() => query.refetch()} />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="会员总数" value={total} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="等级数量" value={levels.length} suffix="个" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="最高等级人数"
              value={levels.length ? levels[levels.length - 1].user_count : 0}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="平均折扣"
              value={
                levels.length
                  ? levels.reduce((sum, item) => sum + (item.discount_percent ?? 100), 0) / levels.length / 10
                  : 0
              }
              precision={2}
              suffix="折"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} xl={12}>
          <Card title="等级人数占比">
            <EChart option={option} height={340} loading={query.isLoading || query.isFetching} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card>
            <TableToolbar title="等级明细" description={`共 ${levels.length} 个等级`} />
            <Table<LevelStat>
              rowKey="id"
              columns={tableColumns}
              dataSource={levels}
              loading={query.isLoading || query.isFetching}
              pagination={false}
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: '暂无会员等级数据' }}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  )
}
