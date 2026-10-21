/**
 * 拼团管理
 */
import { Typography } from 'antd'
import { listGroupBuys, saveGroupBuy } from '@/api/marketing'
import { formatDateTime, formatNumber, formatYuan } from '@/utils/format'
import { GROUP_BUY_STATUS_OPTIONS } from '@/utils/resourceOptions'
import type { GroupBuy, SaveGroupBuyRequest } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<GroupBuy>[] = [
  {
    title: '拼团名称',
    dataIndex: 'name',
    width: 220,
    render: (value, record) => (
      <div>
        <Typography.Text strong>{String(value)}</Typography.Text>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.product_title || '未关联商品'}
          </Typography.Text>
        </div>
      </div>
    ),
  },
  {
    title: '拼团价',
    dataIndex: 'price_cents',
    width: 150,
    render: (value, record) => (
      <div>
        <Typography.Text strong>{formatYuan(Number(value ?? 0))}</Typography.Text>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12, textDecoration: 'line-through' }}>
            {formatYuan(record.original_price_cents)}
          </Typography.Text>
        </div>
      </div>
    ),
  },
  {
    title: '成团人数',
    dataIndex: 'required_members',
    width: 120,
    align: 'right',
    render: (value, record) => `${record.joined_members}/${String(value)} 人`,
  },
  {
    title: '成团数',
    dataIndex: 'group_size',
    width: 100,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (value) => {
      const option = GROUP_BUY_STATUS_OPTIONS.find((item) => item.value === value)
      return boolTag(Number(value) === 1, option?.label ?? '进行中', option?.label ?? '—')
    },
  },
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
]

const fields: ResourceField[] = [
  { name: 'name', label: '拼团名称', required: true, searchable: true, placeholder: '如：双人成团 · 跑鞋' },
  { name: 'description', label: '活动说明', type: 'textarea' },
  { name: 'promotion_id', label: '关联活动 ID', type: 'number', initialValue: 0 },
  { name: 'product_id', label: '商品 ID', type: 'number', required: true },
  { name: 'price_cents', label: '拼团价（元）', type: 'money', required: true },
  { name: 'required_members', label: '成团人数', type: 'number', initialValue: 2 },
  { name: 'start_time', label: '开始时间（unix 秒）', type: 'unix', required: true },
  { name: 'end_time', label: '结束时间（unix 秒）', type: 'unix', required: true },
  { name: 'banner_image', label: '活动横幅', placeholder: 'https://...' },
]

/** 拼团管理页 */
export default function GroupBuys() {
  return (
    <ResourceTable<GroupBuy, Awaited<ReturnType<typeof listGroupBuys>>>
      title="拼团管理"
      description="维护拼团活动的价格、成团人数与有效时间"
      listKey="group_buys"
      queryKey="group-buys"
      fetcher={(params) =>
        listGroupBuys({
          keyword: params.keyword ? String(params.keyword) : undefined,
          status: params.status !== undefined ? Number(params.status) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      fields={fields}
      createLabel="新增拼团"
      onSave={(values) => saveGroupBuy(values as unknown as SaveGroupBuyRequest)}
    />
  )
}
