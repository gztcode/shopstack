/**
 * 用户反馈
 */
import { useNavigate } from 'react-router-dom'
import { Button } from 'antd'
import { MessageOutlined } from '@ant-design/icons'
import { listFeedbacks } from '@/api/user'
import { formatDateTime } from '@/utils/format'
import { FEEDBACK_STATUS_OPTIONS, FEEDBACK_TYPE_OPTIONS } from '@/utils/resourceOptions'
import type { Feedback } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<Feedback>[] = [
  { title: '用户', dataIndex: 'user_nickname', width: 130, render: (value) => String(value || '匿名用户') },
  {
    title: '类型',
    dataIndex: 'type',
    width: 120,
    render: (value) => FEEDBACK_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? '-',
  },
  { title: '反馈内容', dataIndex: 'content', ellipsis: true, render: (value) => String(value || '—') },
  { title: '联系方式', dataIndex: 'contact', width: 180, render: (value) => String(value || '—') },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (value) => {
      const option = FEEDBACK_STATUS_OPTIONS.find((item) => item.value === value)
      return boolTag(Number(value) === 0, option?.label ?? '待处理', option?.label ?? '-')
    },
  },
  {
    title: '提交时间',
    dataIndex: 'created_at',
    width: 170,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

const searchFields: ResourceField[] = [
  { name: 'keyword', label: '关键词', searchable: true, width: 200, placeholder: '反馈内容 / 用户昵称' },
  { name: 'status', label: '状态', type: 'select', searchable: true, width: 150, options: FEEDBACK_STATUS_OPTIONS },
  { name: 'type', label: '类型', type: 'select', searchable: true, width: 150, options: FEEDBACK_TYPE_OPTIONS },
]

/** 用户反馈列表页 */
export default function Feedbacks() {
  const navigate = useNavigate()

  return (
    <ResourceTable<Feedback, Awaited<ReturnType<typeof listFeedbacks>>>
      title="用户反馈"
      description="查看用户提交的意见反馈并给出处理结论"
      listKey="feedbacks"
      queryKey="feedbacks"
      searchFields={searchFields}
      fetcher={(params) =>
        listFeedbacks({
          keyword: params.keyword ? String(params.keyword) : undefined,
          status: params.status !== undefined ? Number(params.status) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      emptyText="暂无用户反馈"
      rowActions={(record) => (
        <Button
          type="link"
          size="small"
          icon={<MessageOutlined />}
          onClick={() => navigate(`/feedbacks/detail?id=${record.id}`)}
        >
          处理
        </Button>
      )}
    />
  )
}
