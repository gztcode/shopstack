/**
 * 频道商品 —— 配置某个频道下展示的商品
 */
import { useMemo } from 'react'
import { Typography } from 'antd'
import { listChannelProducts, listChannels } from '@/api/product'
import { useApiQuery } from '@/hooks/useApi'
import { formatNumber, formatYuan } from '@/utils/format'
import type { Channel, Product } from '@/types'
import ResourceTable, { type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<Product>[] = [
  {
    title: '商品标题',
    dataIndex: 'title',
    width: 260,
    render: (value, record) => (
      <div>
        <Typography.Text strong>{String(value)}</Typography.Text>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.subtitle || '—'}
          </Typography.Text>
        </div>
      </div>
    ),
  },
  { title: '分类', dataIndex: 'category_name', width: 140 },
  {
    title: '价格区间',
    dataIndex: 'min_price_cents',
    width: 170,
    render: (_value, record) =>
      record.min_price_cents === record.max_price_cents
        ? formatYuan(record.min_price_cents)
        : `${formatYuan(record.min_price_cents)} ~ ${formatYuan(record.max_price_cents)}`,
  },
  {
    title: '销量',
    dataIndex: 'sales_count',
    width: 100,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  {
    title: '库存',
    dataIndex: 'stock_total',
    width: 100,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
]

const SORT_OPTIONS = [
  { label: '默认排序', value: '' },
  { label: '销量优先', value: 'sales' },
  { label: '价格从低到高', value: 'price_asc' },
  { label: '价格从高到低', value: 'price_desc' },
  { label: '最新上架', value: 'newest' },
]

/** 频道商品配置页 */
export default function ChannelProducts() {
  const channelsQuery = useApiQuery(['channels', 'options'], () => listChannels({ page_size: 50 }))

  const searchFields = useMemo<ResourceField[]>(
    () => [
      {
        name: 'channel_id',
        label: '频道',
        type: 'select',
        searchable: true,
        width: 180,
        options: (channelsQuery.data?.channels ?? []).map((channel: Channel) => ({
          label: channel.name,
          value: channel.id,
        })),
      },
      { name: 'keyword', label: '关键词', searchable: true, width: 180, placeholder: '商品标题' },
      { name: 'sort', label: '排序', type: 'select', searchable: true, width: 160, options: SORT_OPTIONS },
    ],
    [channelsQuery.data],
  )

  return (
    <ResourceTable<Product, Awaited<ReturnType<typeof listChannelProducts>>>
      title="频道商品"
      description="选择频道并维护该频道下展示的商品与排序"
      listKey="products"
      queryKey="channel-products"
      initialParams={{ channel_id: 1 }}
      searchFields={searchFields}
      fetcher={(params) =>
        listChannelProducts({
          channel_id: Number(params.channel_id ?? 1),
          keyword: params.keyword ? String(params.keyword) : undefined,
          sort: params.sort ? String(params.sort) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      emptyText="该频道下暂无商品"
    />
  )
}
