/**
 * 活动管理
 */
import { useMemo, useState } from 'react'
import { Button, Card, DatePicker, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { deletePromotion, listPromotions, savePromotion } from '@/api/marketing'
import { useApiQuery } from '@/hooks/useApi'
import { hasPermission } from '@/utils/permission'
import { PROMOTION_STATUS_OPTIONS, PROMOTION_TYPE_OPTIONS } from '@/utils/enums'
import { formatDateTime, formatNumber, formatYuan, yuanToCents } from '@/utils/format'
import { useAuthStore } from '@/store/auth'
import type { ListPromotionsParams, Promotion, SavePromotionRequest } from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import StatusTag from '@/components/StatusTag'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { validateForm } from '@/utils/form'
import { useMessage } from '@/hooks/useMessage'

interface PromotionFormValues {
  name: string
  description?: string
  type: number
  status: number
  time_range?: [dayjs.Dayjs, dayjs.Dayjs]
  min_amount: number
  discount: number
  percent: number
  product_id: number
  limit_per_user: number
  banner_image?: string
}

/** 活动管理页 */
export default function Promotions() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((state) => state.permissions)
  const [form] = Form.useForm<PromotionFormValues>()
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<number | undefined>()
  const [type, setType] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canUpdate = hasPermission(permissions, 'promotion:update')

  const queryParams = useMemo<ListPromotionsParams>(
    () => ({ page, page_size: pageSize, keyword: keyword || undefined, status, type }),
    [page, pageSize, keyword, status, type],
  )

  const promotionsQuery = useApiQuery(['promotions', queryParams], () => listPromotions(queryParams))

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['promotions'] })

  const handleSearch = (values: SearchFormValues) => {
    setKeyword(String(values.keyword ?? '').trim())
    setStatus(values.status === undefined ? undefined : Number(values.status))
    setType(values.type === undefined ? undefined : Number(values.type))
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setStatus(undefined)
    setType(undefined)
    setPage(1)
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      type: 1,
      status: 0,
      min_amount: 0,
      discount: 0,
      percent: 100,
      product_id: 0,
      limit_per_user: 0,
      time_range: [dayjs(), dayjs().add(7, 'day')],
    })
    setDrawerOpen(true)
  }

  const openEdit = (record: Promotion) => {
    setEditing(record)
    form.resetFields()
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      type: record.type,
      status: record.status,
      min_amount: record.min_amount_cents / 100,
      discount: record.discount_cents / 100,
      percent: record.percent,
      product_id: record.product_id,
      limit_per_user: record.limit_per_user,
      banner_image: record.banner_image,
      time_range: [dayjs.unix(record.start_time), dayjs.unix(record.end_time)],
    })
    setDrawerOpen(true)
  }

  const handleSubmit = async () => {
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      const payload: SavePromotionRequest = {
        id: editing?.id,
        name: values.name,
        description: values.description,
        type: values.type,
        status: values.status,
        start_time: values.time_range?.[0]?.unix() ?? 0,
        end_time: values.time_range?.[1]?.unix() ?? 0,
        min_amount_cents: yuanToCents(values.min_amount),
        discount_cents: yuanToCents(values.discount),
        percent: values.percent ?? 100,
        product_id: values.product_id ?? 0,
        limit_per_user: values.limit_per_user ?? 0,
        banner_image: values.banner_image,
      }
      await savePromotion(payload)
      message.success(editing ? '活动已更新' : '活动已创建')
      setDrawerOpen(false)
      refresh()
    } catch (error) {
      if (error instanceof Error) message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (record: Promotion) => {
    try {
      await deletePromotion(record.id)
      message.success('活动已删除')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  const columns: ColumnsType<Promotion> = [
    {
      title: '活动名称',
      dataIndex: 'name',
      width: 220,
      render: (value: string, record) => (
        <div>
          <Typography.Text strong>{value}</Typography.Text>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.description || '—'}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (value: number) => <StatusTag status={value} kind="promotionType" />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: number) => <StatusTag status={value} kind="promotion" />,
    },
    {
      title: '活动规则',
      dataIndex: 'min_amount_cents',
      width: 200,
      render: (_: number, record) => (
        <span>
          {record.type === 2
            ? `${(record.percent / 10).toFixed(1)} 折`
            : `满 ${formatYuan(record.min_amount_cents)} 减 ${formatYuan(record.discount_cents)}`}
          {record.limit_per_user > 0 ? ` · 限 ${record.limit_per_user} 件` : ''}
        </span>
      ),
    },
    {
      title: '活动时间',
      dataIndex: 'start_time',
      width: 200,
      render: (_: number, record) => (
        <span style={{ fontSize: 12 }}>
          {formatDateTime(new Date(record.start_time * 1000).toISOString())} ~{' '}
          {formatDateTime(new Date(record.end_time * 1000).toISOString())}
        </span>
      ),
    },
    {
      title: '已售',
      dataIndex: 'sold_count',
      width: 100,
      align: 'right',
      render: (value: number) => formatNumber(value),
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
              title="确认删除该活动？"
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

  return (
    <PageContainer title="活动管理" description="配置满减、折扣、秒杀与拼团活动">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <SearchForm onSearch={handleSearch} onReset={handleReset} loading={promotionsQuery.isFetching}>
          <Form.Item name="keyword" label="关键词">
            <Input allowClear placeholder="活动名称 / 描述" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select allowClear placeholder="全部类型" style={{ width: 140 }} options={PROMOTION_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: 140 }}
              options={PROMOTION_STATUS_OPTIONS}
            />
          </Form.Item>
        </SearchForm>

        <TableToolbar
          title="活动列表"
          description={`共 ${formatNumber(promotionsQuery.data?.meta.total ?? 0)} 个`}
          extra={
            <>
              <Button icon={<ReloadOutlined />} onClick={refresh}>
                刷新
              </Button>
              {canUpdate ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  新增活动
                </Button>
              ) : null}
            </>
          }
        />

        <Table<Promotion>
          rowKey="id"
          columns={columns}
          dataSource={promotionsQuery.data?.promotions ?? []}
          loading={promotionsQuery.isLoading || promotionsQuery.isFetching}
          scroll={{ x: 1220 }}
          locale={{ emptyText: '暂无活动' }}
          pagination={{
            current: page,
            pageSize,
            total: promotionsQuery.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${formatNumber(total)} 个`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage)
              setPageSize(nextSize)
            },
          }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑活动 · ${editing.name}` : '新增活动'}
        width={560}
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
            label="活动名称"
            name="name"
            rules={[{ required: true, message: '请输入活动名称' }, { max: 40, message: '最多 40 个字符' }]}
          >
            <Input placeholder="如：夏日数码狂欢季" />
          </Form.Item>
          <Form.Item label="活动描述" name="description">
            <Input.TextArea rows={2} maxLength={100} showCount placeholder="活动说明" />
          </Form.Item>
          <Space size={16}>
            <Form.Item label="活动类型" name="type" rules={[{ required: true, message: '请选择类型' }]}>
              <Select options={PROMOTION_TYPE_OPTIONS} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item label="活动状态" name="status" rules={[{ required: true, message: '请选择状态' }]}>
              <Select options={PROMOTION_STATUS_OPTIONS} style={{ width: 160 }} />
            </Form.Item>
          </Space>
          <Form.Item label="活动时间" name="time_range" rules={[{ required: true, message: '请选择活动时间' }]}>
            <DatePicker.RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Space size={16}>
            <Form.Item label="门槛金额（元）" name="min_amount">
              <InputNumber min={0} precision={2} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item label="优惠金额（元）" name="discount">
              <InputNumber min={0} precision={2} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item label="折扣百分比" name="percent" extra="85 表示 8.5 折">
              <InputNumber min={1} max={99} precision={0} style={{ width: 150 }} />
            </Form.Item>
          </Space>
          <Space size={16}>
            <Form.Item label="指定商品 ID" name="product_id" extra="0 表示全部商品">
              <InputNumber min={0} precision={0} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item label="每人限购" name="limit_per_user">
              <InputNumber min={0} precision={0} style={{ width: 180 }} />
            </Form.Item>
          </Space>
          <Form.Item label="活动 Banner 图" name="banner_image">
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  )
}
