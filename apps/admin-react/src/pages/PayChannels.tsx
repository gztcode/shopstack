/**
 * 支付渠道管理
 */
import { deletePayChannel, listPayChannels, savePayChannel } from '@/api/payment'
import { formatDateTime } from '@/utils/format'
import { PAY_CHANNEL_OPTIONS } from '@/utils/resourceOptions'
import type { PayChannel, SavePayChannelRequest } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<PayChannel>[] = [
  { title: '渠道名称', dataIndex: 'name', width: 160 },
  {
    title: '渠道类型',
    dataIndex: 'channel',
    width: 130,
    render: (value) => PAY_CHANNEL_OPTIONS.find((item) => item.value === value)?.label ?? '-',
  },
  { title: '编码', dataIndex: 'code', width: 140 },
  { title: '配置', dataIndex: 'config', width: 320, ellipsis: true, render: (value) => String(value || '{}') },
  { title: '排序', dataIndex: 'sort', width: 80, align: 'right' },
  {
    title: '状态',
    dataIndex: 'enabled',
    width: 90,
    render: (value) => boolTag(Boolean(value)),
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    width: 170,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

const fields: ResourceField[] = [
  { name: 'name', label: '渠道名称', required: true, placeholder: '如：微信支付' },
  { name: 'channel', label: '渠道类型', type: 'select', options: PAY_CHANNEL_OPTIONS, initialValue: 1 },
  { name: 'code', label: '渠道编码', required: true, placeholder: '如：wechat' },
  { name: 'icon', label: '图标地址', placeholder: 'https://...' },
  { name: 'config', label: '渠道配置（JSON）', type: 'textarea', placeholder: '{"mch_id":"..."}' },
  { name: 'sort', label: '排序', type: 'number', initialValue: 0 },
  { name: 'enabled', label: '是否启用', type: 'switch', initialValue: true },
]

/** 支付渠道管理页 */
export default function PayChannels() {
  return (
    <ResourceTable<PayChannel, Awaited<ReturnType<typeof listPayChannels>>>
      title="支付渠道"
      description="维护平台可用的支付渠道及其参数配置"
      listKey="channels"
      queryKey="pay-channels"
      fetcher={(params) =>
        listPayChannels({
          channel: params.channel !== undefined ? Number(params.channel) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      fields={fields}
      createLabel="新增渠道"
      onSave={(values) => savePayChannel(values as unknown as SavePayChannelRequest)}
      onDelete={(record) => deletePayChannel(record.id)}
    />
  )
}
