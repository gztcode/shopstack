/**
 * 发票管理
 */
import { useMemo, useState } from 'react'
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CheckOutlined, CloseOutlined, FileTextOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { listInvoices, setInvoiceStatus } from '@/api/invoice'
import { useApiQuery } from '@/hooks/useApi'
import { hasPermission } from '@/utils/permission'
import { formatDateTime, formatNumber, formatYuan } from '@/utils/format'
import { validateForm } from '@/utils/form'
import { useAuthStore } from '@/store/auth'
import type { Invoice, ListInvoicesParams } from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { useMessage } from '@/hooks/useMessage'

/** 发票状态：0 待开票 1 已开票 2 已驳回 */
const INVOICE_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: '待开票', color: 'warning' },
  1: { label: '已开票', color: 'success' },
  2: { label: '已驳回', color: 'error' },
}

const INVOICE_TYPE: Record<string, string> = {
  personal: '个人',
  company: '企业',
}

interface AuditFormValues {
  invoice_url?: string
  remark?: string
}

/** 发票管理页 */
export default function Invoices() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((state) => state.permissions)
  const [form] = Form.useForm<AuditFormValues>()
  const [status, setStatus] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([])
  const [current, setCurrent] = useState<Invoice | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [nextStatus, setNextStatus] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const canAudit = hasPermission(permissions, 'system:audit')

  const queryParams = useMemo<ListInvoicesParams>(
    () => ({ page, page_size: pageSize, status }),
    [page, pageSize, status],
  )

  const invoicesQuery = useApiQuery(['invoices', queryParams], () => listInvoices(queryParams))
  const invoices = invoicesQuery.data?.invoices ?? []

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['invoices'] })

  const handleSearch = (values: SearchFormValues) => {
    setStatus(values.status === undefined ? undefined : Number(values.status))
    setPage(1)
  }

  const handleReset = () => {
    setStatus(undefined)
    setPage(1)
    setSelectedKeys([])
  }

  const openAudit = (record: Invoice, targetStatus: number) => {
    setCurrent(record)
    setNextStatus(targetStatus)
    form.resetFields()
    form.setFieldsValue({ invoice_url: record.invoice_url, remark: record.remark })
    setModalOpen(true)
  }

  const handleAudit = async () => {
    if (!current) return
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      await setInvoiceStatus(current.id, nextStatus, values.invoice_url, values.remark)
      message.success(nextStatus === 1 ? '发票已开具' : '发票申请已驳回')
      setModalOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  /** 批量开票：逐条调用状态接口 */
  const handleBatchApprove = async () => {
    const targets = invoices.filter((item) => selectedKeys.includes(item.id) && item.status === 0)
    if (targets.length === 0) {
      message.warning('请选择待开票的发票')
      return
    }
    setSubmitting(true)
    try {
      for (const item of targets) {
        await setInvoiceStatus(item.id, 1)
      }
      message.success(`已批量开具 ${targets.length} 张发票`)
      setSelectedKeys([])
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '批量操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnsType<Invoice> = [
    {
      title: '订单号',
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
      title: '发票抬头',
      dataIndex: 'title',
      render: (value: string, record) => (
        <div>
          <Typography.Text strong>{value}</Typography.Text>
          {record.tax_no ? (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                税号 {record.tax_no}
              </Typography.Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 90,
      render: (value: string) => <Tag color={value === 'company' ? 'blue' : 'default'}>{INVOICE_TYPE[value] ?? value}</Tag>,
    },
    {
      title: '金额',
      dataIndex: 'amount_cents',
      width: 120,
      align: 'right',
      render: (value: number) => <Typography.Text strong>{formatYuan(value)}</Typography.Text>,
    },
    {
      title: '接收邮箱',
      dataIndex: 'email',
      width: 200,
      render: (value: string) => value || '—',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: number) => {
        const meta = INVOICE_STATUS[value] ?? { label: '未知', color: 'default' }
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '电子发票',
      dataIndex: 'invoice_url',
      width: 200,
      render: (value: string, record) =>
        value ? (
          <a href={value} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
            查看发票
          </a>
        ) : (
          <Typography.Text type="secondary">{record.remark || '—'}</Typography.Text>
        ),
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
              开票
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
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
  ]

  return (
    <PageContainer title="发票管理" description="处理用户提交的发票开具申请">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <SearchForm onSearch={handleSearch} onReset={handleReset} loading={invoicesQuery.isFetching}>
          <Form.Item name="status" label="状态">
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: 160 }}
              options={[
                { label: '待开票', value: 0 },
                { label: '已开票', value: 1 },
                { label: '已驳回', value: 2 },
              ]}
            />
          </Form.Item>
        </SearchForm>

        <TableToolbar
          title="发票列表"
          description={`共 ${formatNumber(invoicesQuery.data?.meta.total ?? 0)} 张发票`}
          extra={
            <>
              <Button icon={<ReloadOutlined />} onClick={refresh}>
                刷新
              </Button>
              {canAudit ? (
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  loading={submitting}
                  onClick={handleBatchApprove}
                >
                  批量开票{selectedKeys.length ? `（${selectedKeys.length}）` : ''}
                </Button>
              ) : null}
            </>
          }
        />

        <Table<Invoice>
          rowKey="id"
          columns={columns}
          dataSource={invoices}
          loading={invoicesQuery.isLoading || invoicesQuery.isFetching}
          scroll={{ x: 1400 }}
          locale={{ emptyText: '暂无发票申请' }}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: (keys) => setSelectedKeys(keys),
          }}
          pagination={{
            current: page,
            pageSize,
            total: invoicesQuery.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${formatNumber(total)} 张`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage)
              setPageSize(nextSize)
            },
          }}
        />
      </Card>

      <Modal
        title={nextStatus === 1 ? '开具发票' : '驳回发票申请'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleAudit}
        confirmLoading={submitting}
        okText={nextStatus === 1 ? '确认开票' : '确认驳回'}
        cancelText="取消"
        destroyOnHidden
      >
        {current ? (
          <Typography.Paragraph>
            订单 <strong>{current.order_no}</strong>，抬头{' '}
            <strong>{current.title}</strong>，金额{' '}
            <strong>{formatYuan(current.amount_cents)}</strong>
          </Typography.Paragraph>
        ) : null}
        <Form form={form} layout="vertical">
          {nextStatus === 1 ? (
            <Form.Item
              label="电子发票地址"
              name="invoice_url"
              extra="留空时服务端会自动生成占位 PDF 地址"
            >
              <Input placeholder="https://invoice.shopstack.dev/xxx.pdf" />
            </Form.Item>
          ) : null}
          <Form.Item
            label={nextStatus === 1 ? '备注' : '驳回原因'}
            name="remark"
            rules={nextStatus === 2 ? [{ required: true, message: '请填写驳回原因' }] : undefined}
          >
            <Input.TextArea rows={3} maxLength={200} showCount placeholder="选填" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
