/**
 * 优惠券管理
 */
import { useMemo, useState } from 'react'
import { Button, Card, DatePicker, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Switch, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { deleteCoupon, listCoupons, saveCoupon } from '@/api/marketing'
import { listCategories } from '@/api/product'
import { useApiQuery } from '@/hooks/useApi'
import { hasPermission } from '@/utils/permission'
import { COUPON_TYPE_OPTIONS } from '@/utils/enums'
import { formatDateTime, formatNumber, formatYuan, yuanToCents } from '@/utils/format'
import { useAuthStore } from '@/store/auth'
import type { Coupon, ListCouponsParams, SaveCouponRequest } from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import StatusTag from '@/components/StatusTag'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { validateForm } from '@/utils/form'
import { useMessage } from '@/hooks/useMessage'

interface CouponFormValues {
  name: string
  code: string
  type: number
  face_value: number
  percent: number
  min_amount: number
  max_discount: number
  total_quantity: number
  per_user_limit: number
  time_range?: [dayjs.Dayjs, dayjs.Dayjs]
  category_id: number
  enabled: boolean
}

/** 优惠券管理页 */
export default function Coupons() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((state) => state.permissions)
  const [form] = Form.useForm<CouponFormValues>()
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Coupon | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canUpdate = hasPermission(permissions, 'coupon:update')

  const queryParams = useMemo<ListCouponsParams>(
    () => ({ page, page_size: pageSize, keyword: keyword || undefined, type }),
    [page, pageSize, keyword, type],
  )

  const couponsQuery = useApiQuery(['coupons', queryParams], () => listCoupons(queryParams))
  const categoriesQuery = useApiQuery(['categories', 'options'], () => listCategories())

  const categoryOptions = useMemo(() => {
    const categories = categoriesQuery.data?.categories ?? []
    return [
      { value: 0, label: '全场通用' },
      ...categories.map((item) => ({ value: item.id, label: item.name })),
    ]
  }, [categoriesQuery.data])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['coupons'] })

  const handleSearch = (values: SearchFormValues) => {
    setKeyword(String(values.keyword ?? '').trim())
    setType(values.type === undefined ? undefined : Number(values.type))
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setType(undefined)
    setPage(1)
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      type: 1,
      face_value: 0,
      percent: 100,
      min_amount: 0,
      max_discount: 0,
      total_quantity: 1000,
      per_user_limit: 1,
      category_id: 0,
      enabled: true,
      time_range: [dayjs(), dayjs().add(30, 'day')],
    })
    setDrawerOpen(true)
  }

  const openEdit = (record: Coupon) => {
    setEditing(record)
    form.resetFields()
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      type: Number(record.type.replace('COUPON_TYPE_', '')) || 1,
      face_value: record.face_value_cents / 100,
      percent: record.percent,
      min_amount: record.min_amount_cents / 100,
      max_discount: record.max_discount_cents / 100,
      total_quantity: record.total_quantity,
      per_user_limit: record.per_user_limit,
      time_range: [dayjs.unix(record.start_time), dayjs.unix(record.end_time)],
      category_id: record.category_id,
      enabled: record.enabled,
    })
    setDrawerOpen(true)
  }

  const handleSubmit = async () => {
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      const payload: SaveCouponRequest = {
        id: editing?.id,
        name: values.name,
        code: values.code,
        type: values.type,
        face_value_cents: yuanToCents(values.face_value),
        percent: values.percent ?? 100,
        min_amount_cents: yuanToCents(values.min_amount),
        max_discount_cents: yuanToCents(values.max_discount),
        total_quantity: values.total_quantity ?? 0,
        per_user_limit: values.per_user_limit ?? 1,
        start_time: values.time_range?.[0]?.unix() ?? 0,
        end_time: values.time_range?.[1]?.unix() ?? 0,
        category_id: values.category_id ?? 0,
        enabled: values.enabled ?? true,
      }
      await saveCoupon(payload)
      message.success(editing ? '优惠券已更新' : '优惠券已创建')
      setDrawerOpen(false)
      refresh()
    } catch (error) {
      if (error instanceof Error) message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (record: Coupon) => {
    try {
      await deleteCoupon(record.id)
      message.success('优惠券已删除')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  const columns: ColumnsType<Coupon> = [
    {
      title: '优惠券',
      dataIndex: 'name',
      width: 220,
      render: (value: string, record) => (
        <div>
          <Typography.Text strong>{value}</Typography.Text>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
              {record.code}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 110,
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: '优惠',
      dataIndex: 'face_value_cents',
      width: 130,
      render: (_: number, record) =>
        record.type === 'COUPON_TYPE_PERCENT' ? (
          `${(record.percent / 10).toFixed(1)} 折`
        ) : record.type === 'COUPON_TYPE_SHIPPING' ? (
          '免运费'
        ) : (
          formatYuan(record.face_value_cents)
        ),
    },
    {
      title: '使用门槛',
      dataIndex: 'min_amount_cents',
      width: 120,
      align: 'right',
      render: (value: number) => (value > 0 ? `满 ${formatYuan(value)}` : '无门槛'),
    },
    {
      title: '最高优惠',
      dataIndex: 'max_discount_cents',
      width: 110,
      align: 'right',
      render: (value: number) => (value > 0 ? formatYuan(value) : '不限'),
    },
    {
      title: '发行 / 领取 / 使用',
      dataIndex: 'total_quantity',
      width: 170,
      align: 'right',
      render: (_: number, record) => (
        <span>
          {formatNumber(record.total_quantity)} / {formatNumber(record.received_quantity)} /{' '}
          {formatNumber(record.used_quantity)}
        </span>
      ),
    },
    {
      title: '每人限领',
      dataIndex: 'per_user_limit',
      width: 100,
      align: 'right',
      render: (value: number) => `${value} 张`,
    },
    {
      title: '有效期',
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
              title="确认删除该优惠券？"
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
    <PageContainer title="优惠券管理" description="创建与维护优惠券规则、发放量与有效期">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <SearchForm onSearch={handleSearch} onReset={handleReset} loading={couponsQuery.isFetching}>
          <Form.Item name="keyword" label="关键词">
            <Input allowClear placeholder="名称 / 编码" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select allowClear placeholder="全部类型" style={{ width: 160 }} options={COUPON_TYPE_OPTIONS} />
          </Form.Item>
        </SearchForm>

        <TableToolbar
          title="优惠券列表"
          description={`共 ${formatNumber(couponsQuery.data?.meta.total ?? 0)} 张`}
          extra={
            <>
              <Button icon={<ReloadOutlined />} onClick={refresh}>
                刷新
              </Button>
              {canUpdate ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  新增优惠券
                </Button>
              ) : null}
            </>
          }
        />

        <Table<Coupon>
          rowKey="id"
          columns={columns}
          dataSource={couponsQuery.data?.coupons ?? []}
          loading={couponsQuery.isLoading || couponsQuery.isFetching}
          scroll={{ x: 1500 }}
          locale={{ emptyText: '暂无优惠券' }}
          pagination={{
            current: page,
            pageSize,
            total: couponsQuery.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${formatNumber(total)} 张`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage)
              setPageSize(nextSize)
            },
          }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑优惠券 · ${editing.name}` : '新增优惠券'}
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
            label="券名称"
            name="name"
            rules={[{ required: true, message: '请输入券名称' }, { max: 30, message: '最多 30 个字符' }]}
          >
            <Input placeholder="如：新人专享 20 元券" />
          </Form.Item>
          <Form.Item
            label="券码"
            name="code"
            rules={[
              { required: true, message: '请输入券码' },
              { pattern: /^[A-Z0-9_]{2,20}$/i, message: '仅支持字母、数字与下划线' },
            ]}
          >
            <Input placeholder="如：NEW20" />
          </Form.Item>
          <Form.Item label="券类型" name="type" rules={[{ required: true, message: '请选择券类型' }]}>
            <Select options={COUPON_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, next) => prev.type !== next.type}>
            {({ getFieldValue }) => {
              const currentType = getFieldValue('type')
              return (
                <Space size={16}>
                  {currentType === 1 ? (
                    <Form.Item
                      label="面额（元）"
                      name="face_value"
                      rules={[{ required: true, message: '请输入面额' }]}
                    >
                      <InputNumber min={0} precision={2} style={{ width: 200 }} />
                    </Form.Item>
                  ) : null}
                  {currentType === 2 ? (
                    <Form.Item
                      label="折扣百分比"
                      name="percent"
                      rules={[{ required: true, message: '请输入折扣' }]}
                      extra="85 表示 8.5 折"
                    >
                      <InputNumber min={1} max={99} precision={0} style={{ width: 200 }} />
                    </Form.Item>
                  ) : null}
                  <Form.Item label="最高优惠（元）" name="max_discount">
                    <InputNumber min={0} precision={2} style={{ width: 200 }} />
                  </Form.Item>
                </Space>
              )
            }}
          </Form.Item>
          <Form.Item label="使用门槛（元）" name="min_amount">
            <InputNumber min={0} precision={2} style={{ width: 220 }} />
          </Form.Item>
          <Space size={16}>
            <Form.Item
              label="发放总量"
              name="total_quantity"
              rules={[{ required: true, message: '请输入发放总量' }]}
            >
              <InputNumber min={1} precision={0} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item label="每人限领" name="per_user_limit">
              <InputNumber min={1} precision={0} style={{ width: 200 }} />
            </Form.Item>
          </Space>
          <Form.Item label="有效期" name="time_range" rules={[{ required: true, message: '请选择有效期' }]}>
            <DatePicker.RangePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="限定分类" name="category_id">
            <Select options={categoryOptions} />
          </Form.Item>
          <Form.Item label="是否启用" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  )
}
