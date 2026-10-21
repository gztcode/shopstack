/**
 * 通知分类 —— 查看通知中心的分类与未读数量
 */
import { listNotificationCategories } from '@/api/notification'
import { formatNumber } from '@/utils/format'
import type { NotificationCategory } from '@/types'
import ResourceTable, { type ResourceColumn } from '@/components/ResourceTable'
import { tokens } from '@/theme'

const columns: ResourceColumn<NotificationCategory>[] = [
  { title: '分类', dataIndex: 'name', width: 180 },
  {
    title: '图标',
    dataIndex: 'icon',
    width: 90,
    render: (value) =>
      value ? (
        <img src={String(value)} alt="分类图标" width={32} height={32} style={{ borderRadius: 6 }} />
      ) : (
        '—'
      ),
  },
  {
    title: '消息总数',
    dataIndex: 'count',
    width: 120,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  {
    title: '未读数',
    dataIndex: 'unread_count',
    width: 120,
    align: 'right',
    render: (value) => {
      const count = Number(value ?? 0)
      return <span style={{ color: count > 0 ? tokens.colorError : undefined }}>{formatNumber(count)}</span>
    },
  },
  { title: '分类编码', dataIndex: 'type', width: 110, align: 'right' },
]

/** 通知分类页 */
export default function NotificationCategories() {
  return (
    <ResourceTable<NotificationCategory, Awaited<ReturnType<typeof listNotificationCategories>>>
      title="通知分类"
      description="查看通知中心的分类构成与未读消息数量"
      listKey="categories"
      queryKey="notification-categories"
      rowKey="type"
      fetcher={() => listNotificationCategories()}
      columns={columns}
      emptyText="暂无通知分类"
    />
  )
}
