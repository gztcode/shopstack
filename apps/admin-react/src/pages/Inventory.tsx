/**
 * 库存管理：库存列表 / 调整 / 流水 / 低库存预警
 */
import { useMemo, useState } from 'react'
import { Alert, Button, Card, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { adjustStock, listInventories, listInventoryLogs, stockWarning } from '@/api/inventory'
import { useApiQuery } from '@/hooks/useApi'
import { hasPermission } from '@/utils/permission'
import { formatDateTime, formatNumber } from '@/utils/format'
import { useAuthStore } from '@/store/auth'
import type { AdjustStockRequest, Inventory, InventoryLog, ListInventoriesParams } from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import StatusTag from '@/components/StatusTag'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { validateForm } from '@/utils/form'
import { useMessage } from '@/hooks/useMessage'

/** 库存管理页 */
export default function Inventory() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((state) => state.permissions)
  const [form] = Form.useForm<AdjustStockRequest>()
  const [keyword, setKeyword] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [adjusting, setAdjusting] = useState<Inventory | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<'list' | 'logs'>('list')

  const canAdjust = hasPermission(permissions, 'inventory:adjust')

  const queryParams = useMemo<ListInventoriesParams>(
    () => ({
      page,
      page_size: pageSize,
      keyword: keyword || undefined,
      low_stock_only: lowStockOnly ? 1 : undefined,
    }),
    [page, pageSize, keyword, lowStockOnly],
  )

  const inventoriesQuery = useApiQuery(['inventory', queryParams], () => listInventories(queryParams))
  const logsQuery = useApiQuery(
    ['inventory', 'logs'],
    () => listInventoryLogs({ page: 1, page_size: 20 }),
    { enabled: tab === 'logs' },
  )
  const warningQuery = useApiQuery(['inventory', 'warning'], () => stockWarning())

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] })
  }

  const handleSearch = (values: SearchFormValues) => {
    setKeyword(String(values.keyword ?? '').trim())
    setLowStockOnly(Boolean(values.low_stock_only))
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setLowStockOnly(false)
    setPage(1)
  }

  const openAdjust = (record: Inventory) => {
    setAdjusting(record)
    form.resetFields()
    form.setFieldsValue({
      sku_id: record.sku_id,
      quantity: record.available_stock,
      reason: '',
      safety_stock: record.safety_stock,
      warehouse: record.warehouse,
    })
    setModalOpen(true)
  }

  const handleAdjust = async () => {
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      await adjustStock(values)
      message.success('库存调整成功')
      setModalOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '调整失败')
    } finally {
      setSubmitting(false)
    }
  }

  const inventoryColumns: ColumnsType<Inventory> = [
    { title: 'SKU ID', dataIndex: 'sku_id', width: 90 },
    { title: 'SKU 编码', dataIndex: 'sku_code', width: 190 },
    {
      title: '规格',
      dataIndex: 'spec_text',
      width: 190,
      render: (value: string) => value || '—',
    },
    {
      title: '总库存',
      dataIndex: 'total_stock',
      width: 100,
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      title: '可用',
      dataIndex: 'available_stock',
      width: 100,
      align: 'right',
      render: (value: number) => <Typography.Text strong>{formatNumber(value)}</Typography.Text>,
    },
    {
      title: '锁定',
      dataIndex: 'locked_stock',
      width: 90,
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      title: '已售',
      dataIndex: 'sold_stock',
      width: 100,
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      title: '安全库存',
      dataIndex: 'safety_stock',
      width: 100,
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      title: '仓库',
      dataIndex: 'warehouse',
      width: 110,
      render: (value: string) => value || '—',
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_: unknown, record) =>
        canAdjust ? (
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openAdjust(record)}>
            调整
          </Button>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
  ]

  const logColumns: ColumnsType<InventoryLog> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: 'SKU 编码', dataIndex: 'sku_code', width: 190 },
    {
      title: '变更类型',
      dataIndex: 'change_type',
      width: 120,
      render: (value: number) => <StatusTag status={value} kind="inventoryChange" />,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 90,
      align: 'right',
      render: (value: number) => (
        <Typography.Text type={value >= 0 ? 'success' : 'danger'}>
          {value >= 0 ? `+${value}` : value}
        </Typography.Text>
      ),
    },
    { title: '变更前', dataIndex: 'before_stock', width: 90, align: 'right' },
    { title: '变更后', dataIndex: 'after_stock', width: 90, align: 'right' },
    { title: '业务类型', dataIndex: 'biz_type', width: 110, render: (v: string) => v || '—' },
    { title: '业务单号', dataIndex: 'biz_id', width: 160, render: (v: string) => v || '—' },
    { title: '操作人', dataIndex: 'operator', width: 110, render: (v: string) => v || '—' },
    { title: '备注', dataIndex: 'remark', width: 160, render: (v: string) => v || '—' },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
  ]

  const warningList = warningQuery.data?.inventories ?? []

  return (
    <PageContainer title="库存管理" description="库存查询、调整与出入库流水">
      <DemoModeAlert onRetry={refresh} />

      {warningList.length > 0 ? (
        <Alert
          type="warning"
          showIcon
          className="dashboard-row"
          message={`低库存预警：${warningList.length} 个 SKU 低于安全库存`}
          description={
            <Space size={4} wrap>
              {warningList.slice(0, 6).map((item) => (
                <Tag key={item.sku_id} color="orange">
                  {item.sku_code}（可用 {item.available_stock} / 安全 {item.safety_stock}）
                </Tag>
              ))}
            </Space>
          }
        />
      ) : null}

      <Card
        tabList={[
          { key: 'list', label: '库存列表' },
          { key: 'logs', label: '库存流水' },
        ]}
        activeTabKey={tab}
        onTabChange={(key) => setTab(key as 'list' | 'logs')}
      >
        {tab === 'list' ? (
          <>
            <SearchForm
              onSearch={handleSearch}
              onReset={handleReset}
              loading={inventoriesQuery.isFetching}
            >
              <Form.Item name="keyword" label="关键词">
                <Input allowClear placeholder="SKU 编码 / 规格" style={{ width: 220 }} />
              </Form.Item>
              <Form.Item name="low_stock_only" label="低库存">
                <Select
                  allowClear
                  placeholder="全部"
                  style={{ width: 140 }}
                  options={[
                    { label: '仅看低库存', value: 1 },
                    { label: '全部库存', value: 0 },
                  ]}
                />
              </Form.Item>
            </SearchForm>

            <TableToolbar
              title="库存列表"
              description={`共 ${formatNumber(inventoriesQuery.data?.meta.total ?? 0)} 条`}
              extra={
                <Button icon={<ReloadOutlined />} onClick={refresh}>
                  刷新
                </Button>
              }
            />

            <Table<Inventory>
              rowKey="id"
              columns={inventoryColumns}
              dataSource={inventoriesQuery.data?.inventories ?? []}
              loading={inventoriesQuery.isLoading || inventoriesQuery.isFetching}
              scroll={{ x: 1400 }}
              locale={{ emptyText: '暂无库存数据' }}
              pagination={{
                current: page,
                pageSize,
                total: inventoriesQuery.data?.meta.total ?? 0,
                showSizeChanger: true,
                showTotal: (total) => `共 ${formatNumber(total)} 条`,
                onChange: (nextPage, nextSize) => {
                  setPage(nextPage)
                  setPageSize(nextSize)
                },
              }}
            />
          </>
        ) : (
          <>
            <TableToolbar
              title="库存流水"
              description="记录入库、预扣、释放、扣减与调整"
              extra={
                <Button icon={<ReloadOutlined />} onClick={() => logsQuery.refetch()}>
                  刷新
                </Button>
              }
            />
            <Table<InventoryLog>
              rowKey="id"
              columns={logColumns}
              dataSource={logsQuery.data?.logs ?? []}
              loading={logsQuery.isLoading || logsQuery.isFetching}
              scroll={{ x: 1500 }}
              locale={{ emptyText: '暂无库存流水' }}
              pagination={{
                current: 1,
                pageSize: 20,
                total: logsQuery.data?.meta.total ?? 0,
                showTotal: (total) => `共 ${formatNumber(total)} 条`,
              }}
            />
          </>
        )}
      </Card>

      <Modal
        title={adjusting ? `调整库存 · ${adjusting.sku_code}` : '调整库存'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleAdjust}
        confirmLoading={submitting}
        okText="确认调整"
        cancelText="取消"
        destroyOnHidden
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="目标可用库存" name="quantity" rules={[{ required: true, message: '请输入库存数量' }]}>
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="安全库存" name="safety_stock">
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="仓库" name="warehouse">
          <Input placeholder="如：华东仓" />
        </Form.Item>
        <Form.Item
          label="调整原因"
          name="reason"
          rules={[{ required: true, message: '请填写调整原因' }]}
        >
          <Input.TextArea rows={3} maxLength={100} showCount placeholder="如：盘点差异修正" />
        </Form.Item>
        <Form.Item name="sku_id" hidden>
          <Input />
        </Form.Item>
      </Modal>
    </PageContainer>
  )
}
