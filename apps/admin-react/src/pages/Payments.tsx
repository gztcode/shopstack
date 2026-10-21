/**
 * 支付管理：流水列表 + 汇总统计
 */
import { useMemo, useState } from 'react'
import { Button, Card, Col, Form, Input, Row, Select, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { listPayments, paymentSummary } from '@/api/payment'
import { useApiQuery } from '@/hooks/useApi'
import { enumToNumber, PAYMENT_CHANNEL_OPTIONS, PAYMENT_STATUS_OPTIONS } from '@/utils/enums'
import { formatDateTime, formatNumber, formatYuan } from '@/utils/format'
import type { ListPaymentsParams, Payment } from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import StatCard from '@/components/StatCard'
import StatusTag from '@/components/StatusTag'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'

/** 支付管理页 */
export default function Payments() {
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<number | undefined>()
  const [channel, setChannel] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const queryParams = useMemo<ListPaymentsParams>(
    () => ({ page, page_size: pageSize, keyword: keyword || undefined, status, channel }),
    [page, pageSize, keyword, status, channel],
  )

  const paymentsQuery = useApiQuery(['payments', queryParams], () => listPayments(queryParams))
  const summaryQuery = useApiQuery(['payments', 'summary'], () => paymentSummary(14))

  const summary = summaryQuery.data

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['payments'] })
  }

  const handleSearch = (values: SearchFormValues) => {
    setKeyword(String(values.keyword ?? '').trim())
    setStatus(values.status === undefined ? undefined : Number(values.status))
    setChannel(values.channel === undefined ? undefined : Number(values.channel))
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setStatus(undefined)
    setChannel(undefined)
    setPage(1)
  }

  const columns: ColumnsType<Payment> = [
    {
      title: '支付单号',
      dataIndex: 'payment_no',
      width: 190,
      render: (value: string) => (
        <Typography.Text copyable={{ text: value }} style={{ fontFamily: 'monospace' }}>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: '订单号',
      dataIndex: 'order_no',
      width: 180,
      render: (value: string) => <span style={{ fontFamily: 'monospace' }}>{value}</span>,
    },
    {
      title: '金额',
      dataIndex: 'amount_cents',
      width: 130,
      align: 'right',
      render: (value: number, record) => (
        <div>
          <Typography.Text strong>{formatYuan(value)}</Typography.Text>
          {record.refunded_cents > 0 ? (
            <div>
              <Typography.Text type="danger" style={{ fontSize: 12 }}>
                已退 {formatYuan(record.refunded_cents)}
              </Typography.Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: '渠道',
      dataIndex: 'channel',
      width: 110,
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: '第三方交易号',
      dataIndex: 'transaction_id',
      width: 180,
      render: (value: string) =>
        value ? (
          <Typography.Text style={{ fontFamily: 'monospace', fontSize: 12 }} copyable>
            {value}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: '支付时间',
      dataIndex: 'paid_at',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
  ]

  return (
    <PageContainer title="支付管理" description="支付流水与资金汇总">
      <DemoModeAlert onRetry={refresh} />

      <Row gutter={[16, 16]} className="dashboard-row">
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="今日支付笔数"
            value={formatNumber(summary?.today_count ?? 0)}
            loading={summaryQuery.isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="今日支付金额"
            value={formatYuan(summary?.today_amount_cents ?? 0)}
            loading={summaryQuery.isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="累计支付金额"
            value={formatYuan(summary?.total_amount_cents ?? 0)}
            hint={`共 ${formatNumber(summary?.total_count ?? 0)} 笔`}
            loading={summaryQuery.isLoading}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="支付成功率"
            value={`${summary?.success_rate ?? 0}%`}
            hint={`已退款 ${formatYuan(summary?.refunded_amount_cents ?? 0)}`}
            loading={summaryQuery.isLoading}
          />
        </Col>
      </Row>

      <Card>
        <SearchForm onSearch={handleSearch} onReset={handleReset} loading={paymentsQuery.isFetching}>
          <Form.Item name="keyword" label="关键词">
            <Input allowClear placeholder="支付单号 / 订单号" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: 160 }}
              options={PAYMENT_STATUS_OPTIONS.map((option) => ({
                label: option.label,
                value: enumToNumber(option.value),
              }))}
            />
          </Form.Item>
          <Form.Item name="channel" label="渠道">
            <Select
              allowClear
              placeholder="全部渠道"
              style={{ width: 160 }}
              options={PAYMENT_CHANNEL_OPTIONS.map((option) => ({
                label: option.label,
                value: enumToNumber(option.value),
              }))}
            />
          </Form.Item>
        </SearchForm>

        <TableToolbar
          title="支付流水"
          description={`共 ${formatNumber(paymentsQuery.data?.meta.total ?? 0)} 条`}
          extra={
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
            </Button>
          }
        />

        <Table<Payment>
          rowKey="id"
          columns={columns}
          dataSource={paymentsQuery.data?.payments ?? []}
          loading={paymentsQuery.isLoading || paymentsQuery.isFetching}
          scroll={{ x: 1320 }}
          locale={{ emptyText: '暂无支付流水' }}
          pagination={{
            current: page,
            pageSize,
            total: paymentsQuery.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${formatNumber(total)} 条`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage)
              setPageSize(nextSize)
            },
          }}
        />
      </Card>
    </PageContainer>
  )
}
