/**
 * 成长值流水
 */
import { Statistic } from 'antd'
import { listGrowthLogs } from '@/api/user'
import { formatDateTime, formatNumber } from '@/utils/format'
import type { GrowthLog } from '@/types'
import ResourceTable, { type ResourceColumn, type ResourceField } from '@/components/ResourceTable'
import { tokens } from '@/theme'

const columns: ResourceColumn<GrowthLog>[] = [
  { title: '用户 ID', dataIndex: 'user_id', width: 110, align: 'right' },
  { title: '事项', dataIndex: 'title', width: 240, render: (value) => String(value || '—') },
  {
    title: '成长值变动',
    dataIndex: 'change',
    width: 130,
    align: 'right',
    render: (value) => {
      const change = Number(value ?? 0)
      return <span style={{ color: change >= 0 ? tokens.colorSuccess : tokens.colorError }}>{formatNumber(change)}</span>
    },
  },
  {
    title: '变动后成长值',
    dataIndex: 'balance',
    width: 140,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  { title: '业务类型', dataIndex: 'biz_type', width: 150, render: (value) => String(value || '—') },
  {
    title: '时间',
    dataIndex: 'created_at',
    width: 170,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

const searchFields: ResourceField[] = [
  { name: 'user_id', label: '用户 ID', type: 'number', searchable: true, width: 140 },
]

/** 成长值流水页 */
export default function GrowthLogs() {
  return (
    <ResourceTable<GrowthLog, Awaited<ReturnType<typeof listGrowthLogs>>>
      title="成长值流水"
      description="追踪用户成长值的来源与消耗"
      listKey="logs"
      queryKey="growth-logs"
      searchFields={searchFields}
      fetcher={(params) =>
        listGrowthLogs({
          user_id: params.user_id !== undefined ? Number(params.user_id) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      emptyText="暂无成长值流水"
      summary={(data) => (
        <Statistic title="当前成长值" value={data?.current_growth ?? 0} />
      )}
    />
  )
}
