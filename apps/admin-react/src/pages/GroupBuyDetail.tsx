/**
 * 拼团详情 —— 查看单个拼团活动与参团成员
 */
import { Card, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getGroupBuy } from '@/api/marketing'
import { formatDateTime, formatNumber, formatYuan } from '@/utils/format'
import { GROUP_BUY_STATUS_OPTIONS } from '@/utils/resourceOptions'
import type { GroupBuyMember } from '@/types'
import ResourceDetail from '@/components/ResourceDetail'

const memberColumns: ColumnsType<GroupBuyMember> = [
  { title: '成员 ID', dataIndex: 'id', width: 100, align: 'right' },
  { title: '用户 ID', dataIndex: 'user_id', width: 110, align: 'right' },
  { title: '昵称', dataIndex: 'user_nickname', width: 160 },
  {
    title: '参团时间',
    dataIndex: 'joined_at',
    width: 180,
    render: (value: string) => formatDateTime(String(value ?? '')),
  },
]

/** 拼团详情页 */
export default function GroupBuyDetail() {
  return (
    <ResourceDetail
      title="拼团详情"
      description="查看拼团活动的价格、成团进度与参团成员"
      fetcher={getGroupBuy}
      queryKey="group-buy-detail"
      backTo="/group-buys"
      fields={[
        {
          label: '拼团名称',
          render: (data) => data.group_buy?.name ?? '—',
        },
        {
          label: '关联商品',
          render: (data) => data.group_buy?.product_title ?? '—',
        },
        {
          label: '拼团价',
          render: (data) => formatYuan(data.group_buy?.price_cents ?? 0),
        },
        {
          label: '原价',
          render: (data) => formatYuan(data.group_buy?.original_price_cents ?? 0),
        },
        {
          label: '成团人数',
          render: (data) => `${data.group_buy?.joined_members ?? 0} / ${data.group_buy?.required_members ?? 0} 人`,
        },
        {
          label: '成团数',
          render: (data) => formatNumber(data.group_buy?.group_size ?? 0),
        },
        {
          label: '状态',
          render: (data) => {
            const option = GROUP_BUY_STATUS_OPTIONS.find(
              (item) => item.value === data.group_buy?.status,
            )
            return <Tag color={data.group_buy?.status === 1 ? 'processing' : 'default'}>{option?.label ?? '—'}</Tag>
          },
        },
        {
          label: '开始时间',
          render: (data) =>
            formatDateTime(new Date((data.group_buy?.start_time ?? 0) * 1000).toISOString()),
        },
        {
          label: '结束时间',
          render: (data) =>
            formatDateTime(new Date((data.group_buy?.end_time ?? 0) * 1000).toISOString()),
        },
        {
          label: '活动说明',
          span: 2,
          render: (data) => <Typography.Paragraph style={{ marginBottom: 0 }}>{data.group_buy?.description || '—'}</Typography.Paragraph>,
        },
      ]}
    >
      {(data) => (
        <Card title="参团成员">
          <Table<GroupBuyMember>
            rowKey="id"
            columns={memberColumns}
            dataSource={data.members ?? []}
            pagination={false}
            locale={{ emptyText: '暂无参团成员' }}
            scroll={{ x: 'max-content' }}
          />
        </Card>
      )}
    </ResourceDetail>
  )
}
