/**
 * 活动场次管理
 */
import { listPromotionSessions, savePromotionSession } from '@/api/marketing'
import { formatDateTime, formatNumber } from '@/utils/format'
import type { PromotionSession, SavePromotionSessionRequest } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<PromotionSession>[] = [
  { title: '场次名称', dataIndex: 'name', width: 180 },
  { title: '所属活动 ID', dataIndex: 'promotion_id', width: 120, align: 'right' },
  {
    title: '开始时间',
    dataIndex: 'start_time',
    width: 170,
    render: (value) => formatDateTime(new Date(Number(value ?? 0) * 1000).toISOString()),
  },
  {
    title: '结束时间',
    dataIndex: 'end_time',
    width: 170,
    render: (value) => formatDateTime(new Date(Number(value ?? 0) * 1000).toISOString()),
  },
  {
    title: '库存',
    dataIndex: 'stock',
    width: 100,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  {
    title: '已售',
    dataIndex: 'sold_count',
    width: 100,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (value) =>
      boolTag(Number(value) === 1, '进行中', Number(value) === 0 ? '未开始' : '已结束'),
  },
]

const fields: ResourceField[] = [
  { name: 'promotion_id', label: '所属活动 ID', type: 'number', required: true, initialValue: 1 },
  { name: 'name', label: '场次名称', required: true, placeholder: '如：10:00 场' },
  { name: 'start_time', label: '开始时间（unix 秒）', type: 'unix', required: true },
  { name: 'end_time', label: '结束时间（unix 秒）', type: 'unix', required: true },
  { name: 'stock', label: '场次库存', type: 'number', initialValue: 100 },
]

/** 活动场次管理页 */
export default function PromotionSessions() {
  return (
    <ResourceTable<PromotionSession, Awaited<ReturnType<typeof listPromotionSessions>>>
      title="活动场次"
      description="维护秒杀等活动的分场次时间与库存"
      listKey="sessions"
      queryKey="promotion-sessions"
      fetcher={(params) =>
        listPromotionSessions({
          promotion_id: params.promotion_id ? Number(params.promotion_id) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      fields={fields}
      createLabel="新增场次"
      onSave={(values) => savePromotionSession(values as unknown as SavePromotionSessionRequest)}
    />
  )
}
