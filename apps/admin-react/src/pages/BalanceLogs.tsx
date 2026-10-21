/**
 * 余额流水 —— 用户账户余额的收支明细
 */
import { Statistic } from 'antd'
import { listBalanceLogs } from '@/api/payment'
import { formatDateTime, formatYuan } from '@/utils/format'
import type { BalanceLog } from '@/types'
import ResourceTable, { type ResourceColumn, type ResourceField } from '@/components/ResourceTable'
import { tokens } from '@/theme'

const columns: ResourceColumn<BalanceLog>[] = [
  { title: '用户 ID', dataIndex: 'user_id', width: 110, align: 'right' },
  { title: '事项', dataIndex: 'title', width: 240, render: (value) => String(value || '—') },
  {
    title: '变动',
    dataIndex: 'change',
    width: 130,
    align: 'right',
    render: (value) => {
      const amount = Number(value ?? 0)
      return <span style={{ color: amount >= 0 ? tokens.colorSuccess : tokens.colorError }}>{formatYuan(amount)}</span>
    },
  },
  {
    title: '变动后余额',
    dataIndex: 'balance',
    width: 140,
    align: 'right',
    render: (value) => formatYuan(Number(value ?? 0)),
  },
  { title: '业务类型', dataIndex: 'biz_type', width: 140, render: (value) => String(value || '—') },
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

/** 余额流水页 */
export default function BalanceLogs() {
  return (
    <ResourceTable<BalanceLog, Awaited<ReturnType<typeof listBalanceLogs>>>
      title="余额流水"
      description="追踪用户账户余额的每一笔收支变动"
      listKey="logs"
      queryKey="balance-logs"
      searchFields={searchFields}
      fetcher={(params) =>
        listBalanceLogs({
          user_id: params.user_id !== undefined ? Number(params.user_id) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      emptyText="暂无余额流水"
      summary={(data) => (
        <Statistic
          title="当前账户余额"
          value={data?.current_balance ?? 0}
          precision={2}
          prefix="¥"
        />
      )}
    />
  )
}
