/**
 * 通用统计看板 —— 参数化的「统计图 + 明细表」页面
 *
 * 订单渠道统计、订单时段统计、订单地区统计共用本组件，
 * 通过配置区分维度字段、指标字段与图表类型。
 */
import { useCallback, useMemo } from 'react'
import { Card, Col, Row, Statistic, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useApiQuery } from '@/hooks/useApi'
import { formatNumber } from '@/utils/format'
import PageContainer from './PageContainer'
import TableToolbar from './TableToolbar'
import DemoModeAlert from './DemoModeAlert'
import EChart, { type EChartsOption } from './EChart'

/** 统计看板配置 */
export interface StatsBoardProps<T extends object> {
  title: string
  description?: string
  /** 统计请求 */
  fetcher: () => Promise<unknown>
  /** 响应数组字段名 */
  listKey: string
  /** 维度字段（分类名 / 地区 / 小时） */
  categoryField: string
  /** 指标字段（订单数 / 金额） */
  valueField: string
  /** 指标标题 */
  valueLabel: string
  /** 图表类型 */
  chartType?: 'bar' | 'pie' | 'line'
  /** 明细表列 */
  columns: ColumnsType<T>
  /** 指标格式化 */
  formatValue?: (value: number) => string
  /** 维度显示格式化 */
  formatCategory?: (value: unknown) => string
  /** 顶部统计卡 */
  stats?: Array<{ title: string; value: number | string; suffix?: string; precision?: number }>
  /** react-query key */
  queryKey: string
}

/** 通用统计看板 */
export default function StatsBoard<T extends object>({
  title,
  description,
  fetcher,
  listKey,
  categoryField,
  valueField,
  valueLabel,
  chartType = 'bar',
  columns,
  formatValue,
  formatCategory,
  stats,
  queryKey,
}: StatsBoardProps<T>) {
  const query = useApiQuery<unknown>([queryKey], () => fetcher())
  const items = useMemo(
    () => ((query.data as Record<string, unknown> | undefined)?.[listKey] as T[]) ?? [],
    [query.data, listKey],
  )

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number((item as Record<string, unknown>)[valueField] ?? 0),
        0,
      ),
    [items, valueField],
  )

  // 行主键取维度字段（如渠道名 / 时段 / 地区），该字段在同一统计维度下唯一。
  // 注意：antd 5 不再支持 rowKey 函数的 index 参数，故只取单参形式。
  const getRowKey = useCallback(
    (record: T): string => {
      const value = (record as Record<string, unknown>)[categoryField]
      return value === undefined || value === null ? 'stat-row' : String(value)
    },
    [categoryField],
  )

  const option = useMemo<EChartsOption>(() => {
    const categories = items.map((item) => {
      const raw = (item as Record<string, unknown>)[categoryField]
      return formatCategory ? formatCategory(raw) : String(raw ?? '-')
    })
    const values = items.map((item) => Number((item as Record<string, unknown>)[valueField] ?? 0))
    const base = {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 48, right: 24, top: 32, bottom: 64 },
      xAxis: { type: 'category' as const, data: categories, axisLabel: { interval: 0, rotate: categories.length > 8 ? 30 : 0 } },
      yAxis: { type: 'value' as const },
    }
    if (chartType === 'pie') {
      return {
        tooltip: { trigger: 'item' },
        legend: { bottom: 0 },
        series: [
          {
            type: 'pie',
            radius: ['42%', '68%'],
            data: items.map((item) => {
              const raw = (item as Record<string, unknown>)[categoryField]
              return {
                name: formatCategory ? formatCategory(raw) : String(raw ?? '-'),
                value: Number((item as Record<string, unknown>)[valueField] ?? 0),
              }
            }),
          },
        ],
      }
    }
    return {
      ...base,
      series: [
        {
          type: chartType,
          data: values,
          areaStyle: chartType === 'line' ? { opacity: 0.18 } : undefined,
          itemStyle: { borderRadius: chartType === 'bar' ? [4, 4, 0, 0] : undefined },
        },
      ],
    }
  }, [items, categoryField, valueField, chartType, formatCategory])

  return (
    <PageContainer title={title} description={description}>
      <DemoModeAlert onRetry={() => query.refetch()} />

      {stats?.length ? (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {stats.map((stat) => (
            <Col key={stat.title} xs={12} md={6}>
              <Card size="small">
                <Statistic
                  title={stat.title}
                  value={stat.value}
                  precision={stat.precision}
                  suffix={stat.suffix}
                />
              </Card>
            </Col>
          ))}
        </Row>
      ) : null}

      <Row gutter={16}>
        <Col xs={24} xl={12}>
          <Card title={`${valueLabel}分布`}>
            <EChart option={option} height={360} loading={query.isLoading || query.isFetching} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card>
            <TableToolbar
              title="明细数据"
              description={`${valueLabel}合计 ${formatValue ? formatValue(total) : formatNumber(total)}`}
            />
            <Table<T>
              rowKey={getRowKey}
              columns={columns}
              dataSource={items}
              loading={query.isLoading || query.isFetching}
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              locale={{ emptyText: '暂无统计数据' }}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  )
}
