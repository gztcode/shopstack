/**
 * 拼团成员 —— 查看参与拼团的用户名单
 */
import { useMemo } from 'react'
import { listGroupBuys, listGroupBuyMembers } from '@/api/marketing'
import { useApiQuery } from '@/hooks/useApi'
import { formatDateTime } from '@/utils/format'
import type { GroupBuyMember } from '@/types'
import ResourceTable, { type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<GroupBuyMember>[] = [
  { title: '成员 ID', dataIndex: 'id', width: 110, align: 'right' },
  { title: '用户 ID', dataIndex: 'user_id', width: 110, align: 'right' },
  { title: '昵称', dataIndex: 'user_nickname', width: 180, render: (value) => String(value || '—') },
  { title: '拼团 ID', dataIndex: 'group_buy_id', width: 110, align: 'right' },
  {
    title: '参团时间',
    dataIndex: 'joined_at',
    width: 180,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

/** 拼团成员页 */
export default function GroupBuyMembers() {
  const groupBuysQuery = useApiQuery(['group-buys', 'member-options'], () =>
    listGroupBuys({ page_size: 50 }),
  )

  const searchFields = useMemo<ResourceField[]>(
    () => [
      {
        name: 'group_buy_id',
        label: '拼团活动',
        type: 'select',
        searchable: true,
        width: 240,
        options: (groupBuysQuery.data?.group_buys ?? []).map((groupBuy) => ({
          label: `#${groupBuy.id} ${groupBuy.name}`,
          value: groupBuy.id,
        })),
      },
    ],
    [groupBuysQuery.data],
  )

  return (
    <ResourceTable<GroupBuyMember, Awaited<ReturnType<typeof listGroupBuyMembers>>>
      title="拼团成员"
      description="查看参与各拼团活动的用户与参团时间"
      listKey="members"
      queryKey="group-buy-members"
      initialParams={{ group_buy_id: 1 }}
      searchFields={searchFields}
      fetcher={(params) =>
        listGroupBuyMembers({
          group_buy_id: params.group_buy_id !== undefined ? Number(params.group_buy_id) : undefined,
        })
      }
      columns={columns}
      emptyText="该拼团暂无成员"
    />
  )
}
