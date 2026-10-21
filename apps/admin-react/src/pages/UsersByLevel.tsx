/**
 * 用户列表-按等级 —— 筛选某个会员等级下的用户
 */
import { useMemo } from 'react'
import { listUserLevels, listUsersByLevel } from '@/api/user'
import { useApiQuery } from '@/hooks/useApi'
import { formatDateTime, formatNumber, formatYuan } from '@/utils/format'
import type { User } from '@/types'
import ResourceTable, { type ResourceColumn, type ResourceField } from '@/components/ResourceTable'
import StatusTag from '@/components/StatusTag'

const columns: ResourceColumn<User>[] = [
  { title: '用户 ID', dataIndex: 'id', width: 100, align: 'right' },
  { title: '昵称', dataIndex: 'nickname', width: 140, render: (value) => String(value || '—') },
  { title: '账号', dataIndex: 'username', width: 140 },
  { title: '手机号', dataIndex: 'phone', width: 140, render: (value) => String(value || '—') },
  {
    title: '成长值',
    dataIndex: 'growth',
    width: 110,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  {
    title: '余额',
    dataIndex: 'balance_cents',
    width: 130,
    align: 'right',
    render: (value) => formatYuan(Number(value ?? 0)),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (value) => <StatusTag status={String(value)} />,
  },
  {
    title: '最近登录',
    dataIndex: 'last_login_at',
    width: 170,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

/** 按等级筛选用户页 */
export default function UsersByLevel() {
  const levelsQuery = useApiQuery(['user-levels', 'options'], () => listUserLevels())

  const searchFields = useMemo<ResourceField[]>(
    () => [
      {
        name: 'level',
        label: '会员等级',
        type: 'select',
        searchable: true,
        width: 200,
        options: (levelsQuery.data?.levels ?? []).map((level) => ({
          label: `${level.name}（Lv.${level.level}）`,
          value: level.level,
        })),
      },
      { name: 'keyword', label: '关键词', searchable: true, width: 180, placeholder: '昵称 / 手机号' },
    ],
    [levelsQuery.data],
  )

  return (
    <ResourceTable<User, Awaited<ReturnType<typeof listUsersByLevel>>>
      title="按等级用户列表"
      description="按会员等级筛选平台用户，核对等级权益覆盖情况"
      listKey="users"
      queryKey="users-by-level"
      initialParams={{ level: 1 }}
      searchFields={searchFields}
      fetcher={(params) =>
        listUsersByLevel({
          level: params.level !== undefined ? Number(params.level) : undefined,
          keyword: params.keyword ? String(params.keyword) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      emptyText="该等级下暂无用户"
    />
  )
}
