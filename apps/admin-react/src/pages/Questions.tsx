/**
 * 商品问答 —— 后台查看用户提问与商家回复
 */
import { useNavigate } from 'react-router-dom'
import { Button, Space, Tag } from 'antd'
import { MessageOutlined } from '@ant-design/icons'
import { listQuestions } from '@/api/product'
import { formatDateTime } from '@/utils/format'
import type { ProductQuestion } from '@/types'
import ResourceTable, { type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<ProductQuestion>[] = [
  {
    title: '商品',
    dataIndex: 'product_title',
    width: 220,
    ellipsis: true,
    render: (value) => String(value || '—'),
  },
  {
    title: '提问内容',
    dataIndex: 'content',
    ellipsis: true,
    render: (value) => String(value || '—'),
  },
  {
    title: '提问人',
    dataIndex: 'user_nickname',
    width: 120,
    render: (value) => String(value || '匿名用户'),
  },
  {
    title: '商家回复',
    dataIndex: 'reply',
    ellipsis: true,
    render: (value) =>
      value ? String(value) : <Tag color="warning">待回复</Tag>,
  },
  {
    title: '提问时间',
    dataIndex: 'created_at',
    width: 170,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

const searchFields: ResourceField[] = [
  { name: 'keyword', label: '关键词', searchable: true, width: 200, placeholder: '问题内容 / 商品标题' },
  { name: 'product_id', label: '商品 ID', searchable: true, width: 140, type: 'number' },
]

/** 商品问答列表页 */
export default function Questions() {
  const navigate = useNavigate()

  return (
    <ResourceTable<ProductQuestion, Awaited<ReturnType<typeof listQuestions>>>
      title="商品问答"
      description="查看用户对商品的提问并逐一回复"
      listKey="questions"
      queryKey="questions"
      searchFields={searchFields}
      fetcher={(params) =>
        listQuestions({
          keyword: params.keyword ? String(params.keyword) : undefined,
          product_id: params.product_id ? Number(params.product_id) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      emptyText="暂无用户提问"
      rowActions={(record) => (
        <Button
          type="link"
          size="small"
          icon={<MessageOutlined />}
          onClick={() => navigate(`/questions/answer?id=${record.id}`)}
        >
          {record.reply ? '修改回复' : '回复'}
        </Button>
      )}
      toolbarExtra={
        <Space size={4}>
          <Tag color="processing">待回复问题可直接进入回复页</Tag>
        </Space>
      }
    />
  )
}
