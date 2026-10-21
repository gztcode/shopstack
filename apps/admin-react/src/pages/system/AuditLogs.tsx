/**
 * 操作日志
 */
import { useMemo, useState } from 'react'
import { Button, Card, Form, Input, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { listAuditLogs } from '@/api/notification'
import { useApiQuery } from '@/hooks/useApi'
import { formatDateTime, formatNumber } from '@/utils/format'
import type { AuditLog, ListAuditLogsParams } from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'

const MODULE_OPTIONS = [
  { value: 'product', label: '商品' },
  { value: 'category', label: '分类' },
  { value: 'order', label: '订单' },
  { value: 'refund', label: '退款' },
  { value: 'user', label: '用户' },
  { value: 'inventory', label: '库存' },
  { value: 'marketing', label: '营销' },
  { value: 'content', label: '内容' },
  { value: 'system', label: '系统' },
]

const ACTION_OPTIONS = [
  { value: 'create', label: '新增' },
  { value: 'update', label: '修改' },
  { value: 'delete', label: '删除' },
  { value: 'ship', label: '发货' },
  { value: 'audit', label: '审核' },
  { value: 'export', label: '导出' },
]

/** 操作日志页 */
export default function AuditLogs() {
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const [module, setModule] = useState<string | undefined>()
  const [action, setAction] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const queryParams = useMemo<ListAuditLogsParams>(
    () => ({ page, page_size: pageSize, keyword: keyword || undefined, module, action }),
    [page, pageSize, keyword, module, action],
  )

  const logsQuery = useApiQuery(['audit-logs', queryParams], () => listAuditLogs(queryParams))

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['audit-logs'] })

  const handleSearch = (values: SearchFormValues) => {
    setKeyword(String(values.keyword ?? '').trim())
    setModule(values.module as string | undefined)
    setAction(values.action as string | undefined)
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setModule(undefined)
    setAction(undefined)
    setPage(1)
  }

  const columns: ColumnsType<AuditLog> = [
    {
      title: '操作人',
      dataIndex: 'admin_name',
      width: 140,
      render: (value: string, record) => (
        <div>
          <div>{value}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            UID {record.admin_id}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '模块',
      dataIndex: 'module',
      width: 110,
      render: (value: string) => {
        const option = MODULE_OPTIONS.find((item) => item.value === value)
        return <Tag color="blue">{option?.label ?? value}</Tag>
      },
    },
    {
      title: '操作',
      dataIndex: 'action',
      width: 100,
      render: (value: string) => {
        const option = ACTION_OPTIONS.find((item) => item.value === value)
        return <Tag>{option?.label ?? value}</Tag>
      },
    },
    {
      title: '操作详情',
      dataIndex: 'detail',
      render: (value: string, record) => (
        <div>
          <div>{value}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.target_type} #{record.target_id}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      width: 140,
      render: (value: string) => (
        <Typography.Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{value}</Typography.Text>
      ),
    },
    {
      title: '结果',
      dataIndex: 'result',
      width: 100,
      render: (value: number, record) => (
        <Space direction="vertical" size={0}>
          <Tag color={value === 1 ? 'success' : 'error'}>{value === 1 ? '成功' : '失败'}</Tag>
          {value === 0 && record.error_message ? (
            <Typography.Text type="danger" style={{ fontSize: 12 }}>
              {record.error_message}
            </Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: '操作时间',
      dataIndex: 'created_at',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
  ]

  return (
    <PageContainer title="操作日志" description="记录后台管理员的关键操作与执行结果">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <SearchForm onSearch={handleSearch} onReset={handleReset} loading={logsQuery.isFetching}>
          <Form.Item name="keyword" label="关键词">
            <Input allowClear placeholder="操作详情 / 目标 ID" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="module" label="模块">
            <Select allowClear placeholder="全部模块" style={{ width: 140 }} options={MODULE_OPTIONS} />
          </Form.Item>
          <Form.Item name="action" label="操作">
            <Select allowClear placeholder="全部操作" style={{ width: 140 }} options={ACTION_OPTIONS} />
          </Form.Item>
        </SearchForm>

        <TableToolbar
          title="日志列表"
          description={`共 ${formatNumber(logsQuery.data?.meta.total ?? 0)} 条`}
          extra={
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
            </Button>
          }
        />

        <Table<AuditLog>
          rowKey="id"
          columns={columns}
          dataSource={logsQuery.data?.logs ?? []}
          loading={logsQuery.isLoading || logsQuery.isFetching}
          scroll={{ x: 1220 }}
          locale={{ emptyText: '暂无操作日志' }}
          pagination={{
            current: page,
            pageSize,
            total: logsQuery.data?.meta.total ?? 0,
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
