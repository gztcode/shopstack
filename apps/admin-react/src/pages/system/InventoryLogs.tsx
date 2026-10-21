/**
 * 库存流水
 */
import { useMemo, useState } from 'react'
import { Button, Card, Form, Input, Select, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { listInventoryLogs } from '@/api/inventory'
import { useApiQuery } from '@/hooks/useApi'
import { formatDateTime, formatNumber } from '@/utils/format'
import type { InventoryLog, ListInventoryLogsParams } from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import StatusTag from '@/components/StatusTag'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'

/** 库存变更类型 */
const CHANGE_TYPE_OPTIONS = [
  { label: '入库', value: 1 },
  { label: '预扣', value: 2 },
  { label: '释放', value: 3 },
  { label: '扣减', value: 4 },
  { label: '调整', value: 5 },
  { label: '退货入库', value: 6 },
]

/** 库存流水页 */
export default function InventoryLogs() {
  const queryClient = useQueryClient()
  const [skuId, setSkuId] = useState<string>('')
  const [bizId, setBizId] = useState<string>('')
  const [changeType, setChangeType] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const queryParams = useMemo<ListInventoryLogsParams>(
    () => ({
      page,
      page_size: pageSize,
      sku_id: skuId ? Number(skuId) : undefined,
      biz_id: bizId || undefined,
      change_type: changeType,
    }),
    [page, pageSize, skuId, bizId, changeType],
  )

  const logsQuery = useApiQuery(['inventory', 'logs', queryParams], () => listInventoryLogs(queryParams))

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['inventory'] })

  const handleSearch = (values: SearchFormValues) => {
    setSkuId(String(values.sku_id ?? '').trim())
    setBizId(String(values.biz_id ?? '').trim())
    setChangeType(values.change_type === undefined ? undefined : Number(values.change_type))
    setPage(1)
  }

  const handleReset = () => {
    setSkuId('')
    setBizId('')
    setChangeType(undefined)
    setPage(1)
  }

  const columns: ColumnsType<InventoryLog> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: 'SKU 编码', dataIndex: 'sku_code', width: 190 },
    {
      title: '商品 ID',
      dataIndex: 'product_id',
      width: 110,
      align: 'right',
      render: (value: number) => `#${value}`,
    },
    {
      title: '变动类型',
      dataIndex: 'change_type',
      width: 120,
      render: (value: number) => <StatusTag status={value} kind="inventoryChange" />,
    },
    {
      title: '变动数量',
      dataIndex: 'quantity',
      width: 110,
      align: 'right',
      render: (value: number) => (
        <Typography.Text type={value >= 0 ? 'success' : 'danger'}>
          {value >= 0 ? `+${value}` : value}
        </Typography.Text>
      ),
    },
    { title: '变动前', dataIndex: 'before_stock', width: 100, align: 'right' },
    { title: '变动后', dataIndex: 'after_stock', width: 100, align: 'right' },
    {
      title: '业务类型',
      dataIndex: 'biz_type',
      width: 110,
      render: (value: string) => value || '—',
    },
    {
      title: '业务单号',
      dataIndex: 'biz_id',
      width: 170,
      render: (value: string) =>
        value ? (
          <Typography.Text style={{ fontFamily: 'monospace', fontSize: 12 }} copyable>
            {value}
          </Typography.Text>
        ) : (
          '—'
        ),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      width: 110,
      render: (value: string) => value || '—',
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 170,
      render: (value: string) => value || '—',
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
  ]

  return (
    <PageContainer title="库存流水" description="出入库、预扣、扣减与调整的完整变更记录">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <SearchForm onSearch={handleSearch} onReset={handleReset} loading={logsQuery.isFetching}>
          <Form.Item name="sku_id" label="SKU ID">
            <Input allowClear placeholder="按 SKU ID 精确查询" style={{ width: 170 }} />
          </Form.Item>
          <Form.Item name="biz_id" label="业务单号">
            <Input allowClear placeholder="如：SS202405100001" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="change_type" label="变动类型">
            <Select
              allowClear
              placeholder="全部类型"
              style={{ width: 160 }}
              options={CHANGE_TYPE_OPTIONS}
            />
          </Form.Item>
        </SearchForm>

        <TableToolbar
          title="流水列表"
          description={`共 ${formatNumber(logsQuery.data?.meta.total ?? 0)} 条记录`}
          extra={
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
            </Button>
          }
        />

        <Table<InventoryLog>
          rowKey="id"
          columns={columns}
          dataSource={logsQuery.data?.logs ?? []}
          loading={logsQuery.isLoading || logsQuery.isFetching}
          scroll={{ x: 1560 }}
          locale={{ emptyText: '暂无库存流水' }}
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
