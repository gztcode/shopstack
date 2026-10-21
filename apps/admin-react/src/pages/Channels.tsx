/**
 * 频道管理
 */
import { Typography } from 'antd'
import { deleteChannel, listChannels, saveChannel } from '@/api/product'
import { formatDateTime, formatNumber } from '@/utils/format'
import { CHANNEL_STATUS_OPTIONS, CHANNEL_TYPE_OPTIONS } from '@/utils/resourceOptions'
import type { Channel, SaveChannelRequest } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<Channel>[] = [
  {
    title: '频道名称',
    dataIndex: 'name',
    width: 180,
    render: (value, record) => (
      <div>
        <Typography.Text strong>{String(value)}</Typography.Text>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.code}
          </Typography.Text>
        </div>
      </div>
    ),
  },
  {
    title: '类型',
    dataIndex: 'type',
    width: 100,
    render: (value) => CHANNEL_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? '-',
  },
  {
    title: '商品数',
    dataIndex: 'product_count',
    width: 100,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  { title: '排序', dataIndex: 'sort', width: 80, align: 'right' },
  {
    title: '状态',
    dataIndex: 'status',
    width: 90,
    render: (value) => boolTag(Number(value) === 1, '启用', '停用'),
  },
  {
    title: '描述',
    dataIndex: 'description',
    ellipsis: true,
    render: (value) => String(value || '—'),
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    width: 170,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

const fields: ResourceField[] = [
  { name: 'name', label: '频道名称', required: true, searchable: true, placeholder: '如：推荐' },
  { name: 'code', label: '频道编码', required: true, placeholder: '英文唯一编码，如 recommend' },
  { name: 'type', label: '频道类型', type: 'select', options: CHANNEL_TYPE_OPTIONS, initialValue: 1 },
  { name: 'status', label: '状态', type: 'select', options: CHANNEL_STATUS_OPTIONS, initialValue: 1 },
  { name: 'icon', label: '图标地址', placeholder: 'https://...' },
  { name: 'banner_url', label: '横幅地址', placeholder: 'https://...' },
  { name: 'description', label: '频道描述', type: 'textarea' },
  { name: 'sort', label: '排序', type: 'number', initialValue: 0 },
]

/** 频道管理页 */
export default function Channels() {
  return (
    <ResourceTable<Channel, Awaited<ReturnType<typeof listChannels>>>
      title="频道管理"
      description="维护首页频道的编码、类型与启停状态"
      listKey="channels"
      queryKey="channels"
      fetcher={(params) => listChannels(params as Parameters<typeof listChannels>[0])}
      columns={columns}
      fields={fields}
      createLabel="新增频道"
      onSave={(values) => saveChannel(values as unknown as SaveChannelRequest)}
      onDelete={(record) => deleteChannel(record.id)}
    />
  )
}
