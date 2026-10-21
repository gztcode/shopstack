/**
 * 评价审核
 */
import { useMemo, useState } from 'react'
import { Avatar, Button, Card, Form, Input, Modal, Rate, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { listReviews, setReviewStatus } from '@/api/product'
import { useApiQuery } from '@/hooks/useApi'
import { hasPermission } from '@/utils/permission'
import { enumToNumber, REVIEW_STATUS_OPTIONS } from '@/utils/enums'
import { formatDateTime, formatNumber } from '@/utils/format'
import { useAuthStore } from '@/store/auth'
import type { ListReviewsParams, Review } from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import StatusTag from '@/components/StatusTag'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { validateForm } from '@/utils/form'
import { useMessage } from '@/hooks/useMessage'

interface ReviewReplyValues {
  admin_reply?: string
}

/** 评价审核页 */
export default function Reviews() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((state) => state.permissions)
  const [form] = Form.useForm<ReviewReplyValues>()
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [current, setCurrent] = useState<Review | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canAudit = hasPermission(permissions, 'review:audit')

  const queryParams = useMemo<ListReviewsParams>(
    () => ({ page, page_size: pageSize, keyword: keyword || undefined, status }),
    [page, pageSize, keyword, status],
  )

  const reviewsQuery = useApiQuery(['reviews', queryParams], () => listReviews(queryParams))
  const summary = reviewsQuery.data?.summary

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['reviews'] })

  const handleSearch = (values: SearchFormValues) => {
    setKeyword(String(values.keyword ?? '').trim())
    setStatus(values.status === undefined ? undefined : Number(values.status))
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setStatus(undefined)
    setPage(1)
  }

  const openReply = (record: Review, nextStatus: number) => {
    setCurrent({ ...record, status: nextStatus === 2 ? 'REVIEW_STATUS_APPROVED' : 'REVIEW_STATUS_REJECTED' })
    form.resetFields()
    form.setFieldsValue({ admin_reply: record.admin_reply })
    setModalOpen(true)
  }

  const handleAudit = async () => {
    if (!current) return
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      await setReviewStatus({
        id: current.id,
        status: current.status === 'REVIEW_STATUS_APPROVED' ? 2 : 3,
        admin_reply: values.admin_reply,
      })
      message.success(current.status === 'REVIEW_STATUS_APPROVED' ? '评价已通过' : '评价已驳回')
      setModalOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnsType<Review> = [
    {
      title: '商品',
      dataIndex: 'product_title',
      width: 200,
      render: (value: string, record) => (
        <div>
          <Typography.Text strong ellipsis style={{ maxWidth: 180 }}>
            {value}
          </Typography.Text>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.sku_text || '—'}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: '用户',
      dataIndex: 'user_nickname',
      width: 140,
      render: (value: string, record) => (
        <Space>
          <Avatar size={26} src={record.user_avatar} />
          <span>{value}</span>
        </Space>
      ),
    },
    {
      title: '评分',
      dataIndex: 'rating',
      width: 140,
      render: (value: number) => <Rate disabled value={value} style={{ fontSize: 14 }} />,
    },
    {
      title: '评价内容',
      dataIndex: 'content',
      render: (value: string, record) => (
        <div>
          <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 4 }}>
            {value}
          </Typography.Paragraph>
          {record.admin_reply ? (
            <Tag color="blue">商家回复：{record.admin_reply}</Tag>
          ) : null}
        </div>
      ),
    },
    {
      title: '点赞',
      dataIndex: 'like_count',
      width: 80,
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: '评价时间',
      dataIndex: 'created_at',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_: unknown, record) =>
        canAudit && record.status === 'REVIEW_STATUS_PENDING' ? (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => openReply(record, 2)}
            >
              通过
            </Button>
            <Button
              type="link"
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={() => openReply(record, 3)}
            >
              驳回
            </Button>
          </Space>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
  ]

  return (
    <PageContainer title="评价审核" description="审核用户评价并可填写商家回复">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <SearchForm onSearch={handleSearch} onReset={handleReset} loading={reviewsQuery.isFetching}>
          <Form.Item name="keyword" label="关键词">
            <Input allowClear placeholder="评价内容 / 商品 / 用户" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: 160 }}
              options={REVIEW_STATUS_OPTIONS.map((option) => ({
                label: option.label,
                value: enumToNumber(option.value),
              }))}
            />
          </Form.Item>
        </SearchForm>

        <TableToolbar
          title="评价列表"
          description={
            summary
              ? `共 ${summary.total} 条 · 好评 ${summary.good} · 中评 ${summary.medium} · 差评 ${summary.bad} · 平均 ${summary.average} 分`
              : undefined
          }
          extra={
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
            </Button>
          }
        />

        <Table<Review>
          rowKey="id"
          columns={columns}
          dataSource={reviewsQuery.data?.reviews ?? []}
          loading={reviewsQuery.isLoading || reviewsQuery.isFetching}
          scroll={{ x: 1180 }}
          locale={{ emptyText: '暂无评价数据' }}
          pagination={{
            current: page,
            pageSize,
            total: reviewsQuery.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${formatNumber(total)} 条`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage)
              setPageSize(nextSize)
            },
          }}
        />
      </Card>

      <Modal
        title={current?.status === 'REVIEW_STATUS_APPROVED' ? '通过评价' : '驳回评价'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleAudit}
        confirmLoading={submitting}
        okText="提交"
        cancelText="取消"
        destroyOnHidden
      >
        {current ? (
          <div style={{ marginBottom: 16 }}>
            <Typography.Paragraph style={{ marginBottom: 4 }}>
              <strong>{current.product_title}</strong>
            </Typography.Paragraph>
            <Typography.Text type="secondary">{current.content}</Typography.Text>
          </div>
        ) : null}
        <Form form={form} layout="vertical">
          <Form.Item label="商家回复" name="admin_reply">
            <Input.TextArea rows={3} maxLength={200} showCount placeholder="选填，将展示给用户" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
