/**
 * 用户等级详情
 */
import { Tag, Typography } from 'antd'
import { getUserLevel } from '@/api/user'
import { formatNumber } from '@/utils/format'
import type { UserLevel } from '@/types'
import ResourceDetail from '@/components/ResourceDetail'

/** 用户等级详情页 */
export default function UserLevelDetail() {
  return (
    <ResourceDetail<UserLevel>
      title="用户等级详情"
      description="查看单个会员等级的成长值区间、折扣与权益"
      fetcher={getUserLevel}
      queryKey="user-level-detail"
      backTo="/user-levels"
      fields={[
        { label: '等级名称', render: (data) => data.name ?? '—' },
        { label: '等级序号', render: (data) => String(data.level ?? '-') },
        {
          label: '成长值区间',
          render: (data) => `${formatNumber(data.min_growth ?? 0)} ~ ${formatNumber(data.max_growth ?? 0)}`,
        },
        {
          label: '折扣',
          render: (data) => `${((data.discount_percent ?? 100) / 10).toFixed(1)} 折`,
        },
        {
          label: '等级图标',
          span: 2,
          render: (data) =>
            data.icon ? (
              <img src={data.icon} alt={data.name} width={48} height={48} style={{ borderRadius: 8 }} />
            ) : (
              '—'
            ),
        },
        { label: '排序', render: (data) => String(data.sort ?? '-') },
        { label: '说明', render: (data) => data.description ?? '—' },
        {
          label: '会员权益',
          span: 2,
          render: (data) =>
            data.benefits?.length ? (
              <span>
                {data.benefits.map((benefit) => (
                  <Tag key={benefit} bordered={false}>
                    {benefit}
                  </Tag>
                ))}
              </span>
            ) : (
              <Typography.Text type="secondary">未配置权益</Typography.Text>
            ),
        },
      ]}
    />
  )
}
