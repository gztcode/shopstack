/**
 * 营销任务 —— 维护用户端任务中心的任务定义
 */
import { deleteMarketingTask, listMarketingTasks, saveMarketingTask } from '@/api/marketing'
import { formatNumber } from '@/utils/format'
import { MARKETING_TASK_TYPE_OPTIONS } from '@/utils/resourceOptions'
import type { MarketingTask, SaveMarketingTaskRequest } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<MarketingTask>[] = [
  {
    title: '任务名称',
    dataIndex: 'name',
    width: 180,
    render: (value, record) => (
      <div>
        <span>{String(value)}</span>
        <div style={{ fontSize: 12, opacity: 0.65 }}>{record.description || '—'}</div>
      </div>
    ),
  },
  {
    title: '任务类型',
    dataIndex: 'type',
    width: 100,
    render: (value) => MARKETING_TASK_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? '-',
  },
  {
    title: '目标次数',
    dataIndex: 'target_count',
    width: 100,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  {
    title: '奖励积分',
    dataIndex: 'reward_points',
    width: 100,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  {
    title: '奖励券 ID',
    dataIndex: 'reward_coupon_id',
    width: 110,
    align: 'right',
    render: (value) => (Number(value ?? 0) ? String(value) : '—'),
  },
  { title: '排序', dataIndex: 'sort', width: 80, align: 'right' },
  {
    title: '状态',
    dataIndex: 'enabled',
    width: 90,
    render: (value) => boolTag(Boolean(value)),
  },
]

const fields: ResourceField[] = [
  { name: 'name', label: '任务名称', required: true, searchable: true, placeholder: '如：每日签到' },
  { name: 'description', label: '任务说明', type: 'textarea' },
  { name: 'type', label: '任务类型', type: 'select', options: MARKETING_TASK_TYPE_OPTIONS, initialValue: 1 },
  { name: 'target_count', label: '目标次数', type: 'number', initialValue: 1 },
  { name: 'reward_points', label: '奖励积分', type: 'number', initialValue: 10 },
  { name: 'reward_coupon_id', label: '奖励优惠券 ID', type: 'number', initialValue: 0 },
  { name: 'icon', label: '任务图标', placeholder: 'https://...' },
  { name: 'sort', label: '排序', type: 'number', initialValue: 0 },
  { name: 'enabled', label: '是否启用', type: 'switch', initialValue: true },
]

/** 营销任务管理页 */
export default function MarketingTasks() {
  return (
    <ResourceTable<MarketingTask, Awaited<ReturnType<typeof listMarketingTasks>>>
      title="营销任务"
      description="维护任务中心的任务定义、目标次数与奖励"
      listKey="tasks"
      queryKey="marketing-tasks"
      fetcher={(params) =>
        listMarketingTasks({
          keyword: params.keyword ? String(params.keyword) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      fields={fields}
      createLabel="新增任务"
      // editing 携带被编辑记录的 id：表单里没有 id 字段，靠它区分「新建」与「更新」。
      onSave={(values, editing) =>
        saveMarketingTask({
          ...(values as unknown as SaveMarketingTaskRequest),
          id: editing?.id,
        })
      }
      onDelete={(record) => deleteMarketingTask(record.id)}
    />
  )
}
