/**
 * 物流管理：运费模板 + 发货单列表
 */
import { useMemo, useState } from 'react'
import { Button, Card, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Switch, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { deleteTemplate, listShipments, listTemplates, saveTemplate } from '@/api/logistics'
import { useApiQuery } from '@/hooks/useApi'
import { hasPermission } from '@/utils/permission'
import { enumToNumber, SHIPMENT_STATUS_OPTIONS } from '@/utils/enums'
import { formatDateTime, formatNumber, formatYuan, yuanToCents } from '@/utils/format'
import { useAuthStore } from '@/store/auth'
import type {
  ListShipmentsParams,
  LogisticTemplate,
  SaveTemplateRequest,
  Shipment,
} from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import StatusTag from '@/components/StatusTag'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { validateForm } from '@/utils/form'
import { useMessage } from '@/hooks/useMessage'

interface TemplateFormValues {
  name: string
  company: string
  company_code: string
  freight: number
  free_freight_amount: number
  enabled: boolean
  sort: number
  regions: string
}

/** 物流管理页 */
export default function Logistics() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((state) => state.permissions)
  const [form] = Form.useForm<TemplateFormValues>()
  const [tab, setTab] = useState<'templates' | 'shipments'>('templates')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<LogisticTemplate | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canUpdate = hasPermission(permissions, 'logistics:view')

  const queryParams = useMemo<ListShipmentsParams>(
    () => ({ page, page_size: pageSize, keyword: keyword || undefined, status }),
    [page, pageSize, keyword, status],
  )

  const templatesQuery = useApiQuery(['logistics', 'templates'], () => listTemplates())
  const shipmentsQuery = useApiQuery(
    ['logistics', 'shipments', queryParams],
    () => listShipments(queryParams),
    { enabled: tab === 'shipments' },
  )

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['logistics'] })
  }

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

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ enabled: true, sort: (templatesQuery.data?.templates.length ?? 0) + 1 })
    setDrawerOpen(true)
  }

  const openEdit = (record: LogisticTemplate) => {
    setEditing(record)
    form.resetFields()
    form.setFieldsValue({
      name: record.name,
      company: record.company,
      company_code: record.company_code,
      freight: record.freight_cents / 100,
      free_freight_amount: record.free_freight_amount_cents / 100,
      enabled: record.enabled,
      sort: record.sort,
      regions: record.regions,
    })
    setDrawerOpen(true)
  }

  const handleSubmit = async () => {
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      const payload: SaveTemplateRequest = {
        id: editing?.id,
        name: values.name,
        company: values.company,
        company_code: values.company_code,
        freight_cents: yuanToCents(values.freight),
        free_freight_amount_cents: yuanToCents(values.free_freight_amount),
        enabled: values.enabled,
        sort: values.sort,
        regions: values.regions,
      }
      await saveTemplate(payload)
      message.success(editing ? '运费模板已更新' : '运费模板已创建')
      setDrawerOpen(false)
      refresh()
    } catch (error) {
      if (error instanceof Error) message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (record: LogisticTemplate) => {
    try {
      await deleteTemplate(record.id)
      message.success('运费模板已删除')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  const templateColumns: ColumnsType<LogisticTemplate> = [
    {
      title: '模板名称',
      dataIndex: 'name',
      width: 200,
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: '快递公司',
      dataIndex: 'company',
      width: 160,
      render: (value: string, record) => (
        <Space>
          <span>{value}</span>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.company_code}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '运费',
      dataIndex: 'freight_cents',
      width: 110,
      align: 'right',
      render: (value: number) => formatYuan(value),
    },
    {
      title: '包邮门槛',
      dataIndex: 'free_freight_amount_cents',
      width: 120,
      align: 'right',
      render: (value: number) => (value > 0 ? `满 ${formatYuan(value)}` : '不包邮'),
    },
    {
      title: '适用地区',
      dataIndex: 'regions',
      render: (value: string) => value || '全国',
    },
    { title: '排序', dataIndex: 'sort', width: 80, align: 'right' },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 90,
      render: (value: boolean) => (
        <Typography.Text type={value ? 'success' : 'secondary'}>
          {value ? '启用' : '停用'}
        </Typography.Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_: unknown, record) => (
        <Space size={4}>
          {canUpdate ? (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              编辑
            </Button>
          ) : null}
          {canUpdate ? (
            <Popconfirm
              title="确认删除该运费模板？"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ]

  const shipmentColumns: ColumnsType<Shipment> = [
    {
      title: '运单号',
      dataIndex: 'tracking_no',
      width: 190,
      render: (value: string) => (
        <Typography.Text copyable={{ text: value }} style={{ fontFamily: 'monospace' }}>
          {value || '—'}
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
      title: '快递公司',
      dataIndex: 'company',
      width: 120,
      render: (value: string) => value || '—',
    },
    {
      title: '收货人',
      dataIndex: 'receiver',
      width: 160,
      render: (value: string, record) => (
        <div>
          <div>{value}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.phone}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '收货地址',
      dataIndex: 'address',
      render: (value: string) => value || '—',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: '发货时间',
      dataIndex: 'shipped_at',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
  ]

  return (
    <PageContainer title="物流管理" description="运费模板与发货单跟踪">
      <DemoModeAlert onRetry={refresh} />

      <Card
        tabList={[
          { key: 'templates', label: '运费模板' },
          { key: 'shipments', label: '发货单' },
        ]}
        activeTabKey={tab}
        onTabChange={(key) => setTab(key as 'templates' | 'shipments')}
      >
        {tab === 'templates' ? (
          <>
            <TableToolbar
              title="运费模板"
              description={`共 ${templatesQuery.data?.templates.length ?? 0} 个模板`}
              extra={
                <>
                  <Button icon={<ReloadOutlined />} onClick={refresh}>
                    刷新
                  </Button>
                  {canUpdate ? (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                      新增模板
                    </Button>
                  ) : null}
                </>
              }
            />
            <Table<LogisticTemplate>
              rowKey="id"
              columns={templateColumns}
              dataSource={templatesQuery.data?.templates ?? []}
              loading={templatesQuery.isLoading || templatesQuery.isFetching}
              scroll={{ x: 1100 }}
              locale={{ emptyText: '暂无运费模板' }}
              pagination={false}
            />
          </>
        ) : (
          <>
            <SearchForm onSearch={handleSearch} onReset={handleReset} loading={shipmentsQuery.isFetching}>
              <Form.Item name="keyword" label="关键词">
                <Input allowClear placeholder="运单号 / 订单号" style={{ width: 220 }} />
              </Form.Item>
              <Form.Item name="status" label="状态">
                <Select
                  allowClear
                  placeholder="全部状态"
                  style={{ width: 160 }}
                  options={SHIPMENT_STATUS_OPTIONS.map((option) => ({
                    label: option.label,
                    value: enumToNumber(option.value),
                  }))}
                />
              </Form.Item>
            </SearchForm>

            <TableToolbar
              title="发货单"
              description={`共 ${formatNumber(shipmentsQuery.data?.meta.total ?? 0)} 条`}
              extra={
                <Button icon={<ReloadOutlined />} onClick={() => shipmentsQuery.refetch()}>
                  刷新
                </Button>
              }
            />
            <Table<Shipment>
              rowKey="id"
              columns={shipmentColumns}
              dataSource={shipmentsQuery.data?.shipments ?? []}
              loading={shipmentsQuery.isLoading || shipmentsQuery.isFetching}
              scroll={{ x: 1300 }}
              locale={{ emptyText: '暂无发货单' }}
              pagination={{
                current: page,
                pageSize,
                total: shipmentsQuery.data?.meta.total ?? 0,
                showSizeChanger: true,
                showTotal: (total) => `共 ${formatNumber(total)} 条`,
                onChange: (nextPage, nextSize) => {
                  setPage(nextPage)
                  setPageSize(nextSize)
                },
              }}
            />
          </>
        )}
      </Card>

      <Drawer
        title={editing ? `编辑运费模板 · ${editing.name}` : '新增运费模板'}
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="模板名称"
            name="name"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="如：全国包邮（默认）" />
          </Form.Item>
          <Space size={16}>
            <Form.Item
              label="快递公司"
              name="company"
              rules={[{ required: true, message: '请输入快递公司' }]}
            >
              <Input placeholder="如：顺丰速运" style={{ width: 180 }} />
            </Form.Item>
            <Form.Item label="公司编码" name="company_code">
              <Input placeholder="如：SF" style={{ width: 140 }} />
            </Form.Item>
          </Space>
          <Space size={16}>
            <Form.Item label="运费（元）" name="freight">
              <InputNumber min={0} precision={2} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item label="包邮门槛（元）" name="free_freight_amount">
              <InputNumber min={0} precision={2} style={{ width: 180 }} />
            </Form.Item>
          </Space>
          <Form.Item
            label="适用地区"
            name="regions"
            extra="多个地区用英文逗号分隔，留空表示全国"
          >
            <Input placeholder="浙江省,上海市,江苏省" />
          </Form.Item>
          <Space size={16}>
            <Form.Item label="排序" name="sort">
              <InputNumber min={0} precision={0} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item label="是否启用" name="enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Drawer>
    </PageContainer>
  )
}
