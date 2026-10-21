/**
 * 短信记录
 */
import { useMemo, useState } from 'react'
import { Button, Card, Form, Input, Select, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { listSmsRecords } from '@/api/notification'
import { useApiQuery } from '@/hooks/useApi'
import { formatDateTime, formatNumber } from '@/utils/format'
import type { ListSmsRecordsParams, SmsRecord } from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import StatusTag from '@/components/StatusTag'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'

const SCENE_OPTIONS = [
  { value: 'login', label: '登录' },
  { value: 'register', label: '注册' },
  { value: 'reset_password', label: '重置密码' },
  { value: 'bind_phone', label: '绑定手机号' },
  { value: 'order_pay', label: '支付通知' },
]

/** 短信记录页 */
export default function SmsRecords() {
  const queryClient = useQueryClient()
  const [phone, setPhone] = useState('')
  const [scene, setScene] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const queryParams = useMemo<ListSmsRecordsParams>(
    () => ({ page, page_size: pageSize, phone: phone || undefined, scene }),
    [page, pageSize, phone, scene],
  )

  const recordsQuery = useApiQuery(['sms-records', queryParams], () => listSmsRecords(queryParams))

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['sms-records'] })

  const handleSearch = (values: SearchFormValues) => {
    setPhone(String(values.phone ?? '').trim())
    setScene(values.scene as string | undefined)
    setPage(1)
  }

  const handleReset = () => {
    setPhone('')
    setScene(undefined)
    setPage(1)
  }

  const columns: ColumnsType<SmsRecord> = [
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 150,
      render: (value: string) => (
        <Typography.Text style={{ fontFamily: 'monospace' }}>{value}</Typography.Text>
      ),
    },
    {
      title: '验证码',
      dataIndex: 'code',
      width: 120,
      render: (value: string) => (
        <Typography.Text style={{ fontFamily: 'monospace' }}>{value}</Typography.Text>
      ),
    },
    {
      title: '场景',
      dataIndex: 'scene',
      width: 130,
      render: (value: string) => {
        const option = SCENE_OPTIONS.find((item) => item.value === value)
        return option?.label ?? value
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: number) => <StatusTag status={value} kind="sms" />,
    },
    {
      title: '发送次数',
      dataIndex: 'send_count',
      width: 100,
      align: 'right',
    },
    {
      title: '错误信息',
      dataIndex: 'error_message',
      render: (value: string) =>
        value ? <Typography.Text type="danger">{value}</Typography.Text> : '—',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
  ]

  return (
    <PageContainer title="短信记录" description="查询短信验证码发送记录与失败原因">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <SearchForm onSearch={handleSearch} onReset={handleReset} loading={recordsQuery.isFetching}>
          <Form.Item name="phone" label="手机号">
            <Input allowClear placeholder="手机号" style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="scene" label="场景">
            <Select allowClear placeholder="全部场景" style={{ width: 160 }} options={SCENE_OPTIONS} />
          </Form.Item>
        </SearchForm>

        <TableToolbar
          title="短信记录"
          description={`共 ${formatNumber(recordsQuery.data?.meta.total ?? 0)} 条`}
          extra={
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
            </Button>
          }
        />

        <Table<SmsRecord>
          rowKey="id"
          columns={columns}
          dataSource={recordsQuery.data?.records ?? []}
          loading={recordsQuery.isLoading || recordsQuery.isFetching}
          scroll={{ x: 1100 }}
          locale={{ emptyText: '暂无短信记录' }}
          pagination={{
            current: page,
            pageSize,
            total: recordsQuery.data?.meta.total ?? 0,
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
