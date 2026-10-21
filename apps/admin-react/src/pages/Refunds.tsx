/**
 * 退款审核
 */
import { useMemo, useState } from 'react'
import { Button, Card, Form, Input, Modal, Select, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { listRefunds, setRefundStatus } from '@/api/order'
import { useApiQuery } from '@/hooks/useApi'
import { hasPermission } from '@/utils/permission'
import { REFUND_STATUS_OPTIONS } from '@/utils/enums'
import { formatDateTime, formatNumber, formatYuan } from '@/utils/format'
import { useAuthStore } from '@/store/auth'
import type { ListRefundsParams, Refund } from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import StatusTag from '@/components/StatusTag'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { validateForm } from '@/utils/form'
import { useMessage } from '@/hooks/useMessage'

/** 退款审核页 */
export default function Refunds() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((state) => state.permissions)
  const [form] = Form.useForm<{ admin_remark?: string }>()
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [current, setCurrent] = useState<Refund | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canAudit = hasPermission(permissions, 'refund:audit')

  const queryParams = useMemo<ListRefundsParams>(
    () => ({ page, page_size: pageSize, keyword: keyword || undefined, status }),
    [page, pageSize, keyword, status],
  )

  const refundsQuery = useApiQuery(['refunds', queryParams], () => listRefunds(queryParams))

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['refunds'] })

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

  const openAudit = (record: Refund, nextStatus: number) => {
    setCurrent({ ...record, status: nextStatus })
    form.resetFields()
    form.setFieldsValue({ admin_remark: record.admin_remark })
    setModalOpen(true)
  }

  const handleAudit = async () => {
    if (!current) return
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      await setRefundStatus(current.id, current.status, values.admin_remark)
      message.success(current.status === 1 ? '退款已通过' : '退款已驳回')
      setModalOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnsType<Refund> = [
    {
      title: '退款单号',
      dataIndex: 'refund_no',
      width: 180,
      render: (value: string) => (
        <Typography.Text copyable={{ text: value }} style={{ fontFamily: 'monospace' }}>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: '关联订单',
      dataIndex: 'order_no',
      width: 180,
      render: (value: string, record) => (
        <div>
          <div style={{ fontFamily: 'monospace' }}>{value}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            UID {record.user_id}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '退款金额',
      dataIndex: 'amount_cents',
      width: 120,
      align: 'right',
      render: (value: number) => <Typography.Text strong>{formatYuan(value)}</Typography.Text>,
    },
    {
      title: '退款原因',
      dataIndex: 'reason',
      render: (value: string, record) => (
        <div>
          <div>{value}</div>
          {record.description ? (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.description}
            </Typography.Text>
          ) : null}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: number) => <StatusTag status={value} kind="refund" />,
    },
    {
      title: '申请时间',
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
        canAudit && record.status === 0 ? (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => openAudit(record, 1)}
            >
              通过
            </Button>
            <Button
              type="link"
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={() => openAudit(record, 2)}
            >
              驳回
            </Button>
          </Space>
        ) : (
          <Typography.Text type="secondary">
            {record.admin_remark || '—'}
          </Typography.Text>
        ),
    },
  ]

  return (
    <PageContainer title="退款审核" description="处理用户提交的退款申请">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <SearchForm onSearch={handleSearch} onReset={handleReset} loading={refundsQuery.isFetching}>
          <Form.Item name="keyword" label="关键词">
            <Input allowClear placeholder="退款单号 / 订单号" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: 160 }}
              options={REFUND_STATUS_OPTIONS}
            />
          </Form.Item>
        </SearchForm>

        <TableToolbar
          title="退款列表"
          description={`共 ${formatNumber(refundsQuery.data?.meta.total ?? 0)} 条`}
          extra={
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
            </Button>
          }
        />

        <Table<Refund>
          rowKey="id"
          columns={columns}
          dataSource={refundsQuery.data?.refunds ?? []}
          loading={refundsQuery.isLoading || refundsQuery.isFetching}
          scroll={{ x: 1120 }}
          locale={{ emptyText: '暂无退款申请' }}
          pagination={{
            current: page,
            pageSize,
            total: refundsQuery.data?.meta.total ?? 0,
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
        title={current?.status === 1 ? '通过退款' : '驳回退款'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleAudit}
        confirmLoading={submitting}
        okText="提交"
        cancelText="取消"
        destroyOnHidden
      >
        {current ? (
          <Typography.Paragraph>
            退款单 <strong>{current.refund_no}</strong>，金额{' '}
            <strong>{formatYuan(current.amount_cents)}</strong>，原因：{current.reason}
          </Typography.Paragraph>
        ) : null}
        <Form form={form} layout="vertical">
          <Form.Item label="审核备注" name="admin_remark">
            <Input.TextArea rows={3} maxLength={200} showCount placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
