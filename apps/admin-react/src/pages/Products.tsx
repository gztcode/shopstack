/**
 * 商品管理
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { deleteProduct, listCategories, listProducts, saveProduct, setProductStatus } from '@/api/product'
import { useApiQuery } from '@/hooks/useApi'
import { hasPermission } from '@/utils/permission'
import { formatNumber, formatYuan, yuanToCents } from '@/utils/format'
import { useAuthStore } from '@/store/auth'
import type { ListProductsParams, Product, ProductSku } from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import StatusTag from '@/components/StatusTag'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { validateForm } from '@/utils/form'
import { useMessage } from '@/hooks/useMessage'

interface ProductFormValues {
  title: string
  subtitle?: string
  category_id: number
  cover?: string
  description?: string
  tags?: string[]
  status: number
  skus?: Array<{
    spec_text: string
    price: number
    original_price?: number
    stock: number
    sku_code?: string
    enabled: boolean
  }>
}

/** 商品状态：字符串枚举 ↔ 数值枚举（proto ProductStatus） */
const PRODUCT_STATUS_VALUE: Record<string, number> = {
  PRODUCT_STATUS_DRAFT: 1,
  PRODUCT_STATUS_ON_SHELF: 2,
  PRODUCT_STATUS_OFF_SHELF: 3,
}

const PRODUCT_STATUS_FILTER_OPTIONS = [
  { label: '草稿', value: 1 },
  { label: '已上架', value: 2 },
  { label: '已下架', value: 3 },
]

/** 商品管理页 */
export default function Products() {
  const message = useMessage()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((state) => state.permissions)
  const [form] = Form.useForm<ProductFormValues>()
  const [keyword, setKeyword] = useState(searchParams.get('keyword') ?? '')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [status, setStatus] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canCreate = hasPermission(permissions, 'product:create')
  const canUpdate = hasPermission(permissions, 'product:update')
  const canDelete = hasPermission(permissions, 'product:delete')

  const queryParams = useMemo<ListProductsParams>(
    () => ({
      page,
      page_size: pageSize,
      keyword: keyword || undefined,
      category_id: categoryId,
      status: status,
    }),
    [page, pageSize, keyword, categoryId, status],
  )

  const productsQuery = useApiQuery(['products', queryParams], () => listProducts(queryParams))
  const categoriesQuery = useApiQuery(['categories', 'options'], () => listCategories())

  const categoryOptions = useMemo(() => {
    const categories = categoriesQuery.data?.categories ?? []
    const flat: Array<{ value: number; label: string }> = []
    categories.forEach((parent) => {
      flat.push({ value: parent.id, label: parent.name })
      ;(parent.children ?? []).forEach((child) => {
        flat.push({ value: child.id, label: `${parent.name} / ${child.name}` })
      })
    })
    return flat
  }, [categoriesQuery.data])

  useEffect(() => {
    const initial = searchParams.get('keyword')
    if (initial) setKeyword(initial)
  }, [searchParams])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['products'] })

  const handleSearch = (values: SearchFormValues) => {
    const nextKeyword = String(values.keyword ?? '').trim()
    setKeyword(nextKeyword)
    setCategoryId(values.category_id as number | undefined)
    setStatus(values.status as number | undefined)
    setPage(1)
    if (nextKeyword) setSearchParams({ keyword: nextKeyword })
    else setSearchParams({})
  }

  const handleReset = () => {
    setKeyword('')
    setCategoryId(undefined)
    setStatus(undefined)
    setPage(1)
    setSearchParams({})
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      status: 1,
      skus: [{ spec_text: '', price: 0, original_price: 0, stock: 0, sku_code: '', enabled: true }],
    })
    setDrawerOpen(true)
  }

  const openEdit = async (product: Product) => {
    setEditing(product)
    form.resetFields()
    form.setFieldsValue({
      title: product.title,
      subtitle: product.subtitle,
      category_id: product.category_id,
      cover: product.cover,
      description: product.description,
      tags: product.tags,
      status: PRODUCT_STATUS_VALUE[product.status] ?? 1,
      skus: [
        {
          spec_text: '默认规格',
          price: product.min_price_cents / 100,
          original_price: product.max_price_cents / 100,
          stock: product.stock_total,
          sku_code: '',
          enabled: true,
        },
      ],
    })
    setDrawerOpen(true)
  }

  const handleSubmit = async () => {
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      const skus: ProductSku[] = (values.skus ?? []).map((sku, index) => ({
        id: 0,
        product_id: editing?.id ?? 0,
        sku_code: sku.sku_code ?? '',
        spec_text: sku.spec_text ?? '',
        specs: {},
        price_cents: yuanToCents(sku.price),
        original_price_cents: yuanToCents(sku.original_price ?? 0),
        stock: sku.stock ?? 0,
        locked_stock: 0,
        image: '',
        sort: index + 1,
        sales_count: 0,
        enabled: sku.enabled ?? true,
        weight_grams: 0,
      }))
      const prices = skus.map((sku) => sku.price_cents)
      await saveProduct({
        id: editing?.id,
        title: values.title,
        subtitle: values.subtitle,
        cover: values.cover,
        category_id: values.category_id,
        min_price_cents: prices.length ? Math.min(...prices) : 0,
        max_price_cents: prices.length ? Math.max(...prices) : 0,
        description: values.description,
        tags: values.tags ?? [],
        status: values.status,
        skus,
      })
      message.success(editing ? '商品已更新' : '商品已创建')
      setDrawerOpen(false)
      refresh()
    } catch (error) {
      if (error instanceof Error) message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatus = async (product: Product, nextStatus: number) => {
    try {
      await setProductStatus(product.id, nextStatus)
      message.success(nextStatus === 2 ? '商品已上架' : '商品已下架')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const handleDelete = async (product: Product) => {
    try {
      await deleteProduct(product.id)
      message.success('商品已删除')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  const columns: ColumnsType<Product> = [
    {
      title: '封面',
      dataIndex: 'cover',
      width: 76,
      render: (cover: string, row) => (
        <img
          src={cover}
          alt={row.title}
          width={48}
          height={48}
          style={{ borderRadius: 8, objectFit: 'cover', background: '#F1F5F9' }}
        />
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      render: (title: string, row) => (
        <div>
          <Typography.Text strong>{title}</Typography.Text>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {row.subtitle || '—'}
            </Typography.Text>
          </div>
          <Space size={4} wrap style={{ marginTop: 4 }}>
            {(row.tags ?? []).map((tag) => (
              <Tag key={tag} bordered={false}>
                {tag}
              </Tag>
            ))}
          </Space>
        </div>
      ),
    },
    { title: '分类', dataIndex: 'category_name', width: 130 },
    {
      title: '价格区间',
      dataIndex: 'min_price_cents',
      width: 160,
      render: (_: number, row) =>
        row.min_price_cents === row.max_price_cents
          ? formatYuan(row.min_price_cents)
          : `${formatYuan(row.min_price_cents)} ~ ${formatYuan(row.max_price_cents)}`,
    },
    {
      title: '销量',
      dataIndex: 'sales_count',
      width: 100,
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      title: '库存',
      dataIndex: 'stock_total',
      width: 90,
      align: 'right',
      render: (value: number) => (
        <Typography.Text type={value <= 0 ? 'danger' : undefined}>{formatNumber(value)}</Typography.Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_: unknown, row) => (
        <Space size={4} wrap>
          {canUpdate ? (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
              编辑
            </Button>
          ) : null}
          {canUpdate && row.status === 'PRODUCT_STATUS_ON_SHELF' ? (
            <Popconfirm
              title="确认下架该商品？"
              description="下架后用户端将无法购买。"
              onConfirm={() => handleStatus(row, 3)}
            >
              <Button type="link" size="small" icon={<EyeOutlined />}>
                下架
              </Button>
            </Popconfirm>
          ) : null}
          {canUpdate && row.status !== 'PRODUCT_STATUS_ON_SHELF' ? (
            <Button
              type="link"
              size="small"
              icon={<ThunderboltOutlined />}
              onClick={() => handleStatus(row, 2)}
            >
              上架
            </Button>
          ) : null}
          {canDelete ? (
            <Popconfirm
              title="确认删除该商品？"
              description="删除后不可恢复，请谨慎操作。"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(row)}
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
    <PageContainer title="商品管理" description="维护商品信息、库存与上下架状态">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <SearchForm onSearch={handleSearch} onReset={handleReset} loading={productsQuery.isFetching}>
          <Form.Item name="keyword" label="关键词">
            <Input allowClear placeholder="商品标题 / 标签" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="category_id" label="分类">
            <Select
              allowClear
              placeholder="全部分类"
              style={{ width: 200 }}
              options={categoryOptions}
            />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: 160 }}
              options={PRODUCT_STATUS_FILTER_OPTIONS}
            />
          </Form.Item>
        </SearchForm>

        <TableToolbar
          title="商品列表"
          description={`共 ${formatNumber(productsQuery.data?.meta.total ?? 0)} 条`}
          extra={
            <>
              <Button icon={<ReloadOutlined />} onClick={refresh}>
                刷新
              </Button>
              {canCreate ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  新增商品
                </Button>
              ) : null}
            </>
          }
        />

        <Table<Product>
          rowKey="id"
          columns={columns}
          dataSource={productsQuery.data?.products ?? []}
          loading={productsQuery.isLoading || productsQuery.isFetching}
          scroll={{ x: 1080 }}
          locale={{ emptyText: '暂无商品数据' }}
          pagination={{
            current: page,
            pageSize,
            total: productsQuery.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${formatNumber(total)} 条`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage)
              setPageSize(nextSize)
            },
          }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑商品 · ${editing.title}` : '新增商品'}
        width={720}
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
            label="商品标题"
            name="title"
            rules={[{ required: true, message: '请输入商品标题' }, { max: 60, message: '最多 60 个字符' }]}
          >
            <Input placeholder="请输入商品标题" />
          </Form.Item>
          <Form.Item label="副标题" name="subtitle">
            <Input placeholder="一句话卖点" />
          </Form.Item>
          <Space size={16} style={{ display: 'flex' }}>
            <Form.Item
              label="所属分类"
              name="category_id"
              style={{ flex: 1 }}
              rules={[{ required: true, message: '请选择分类' }]}
            >
              <Select placeholder="请选择分类" options={categoryOptions} />
            </Form.Item>
            <Form.Item label="封面图 URL" name="cover" style={{ flex: 1 }}>
              <Input placeholder="https://..." />
            </Form.Item>
          </Space>
          <Form.Item label="标签" name="tags">
            <Select
              mode="tags"
              placeholder="输入后回车创建标签"
              style={{ width: '100%' }}
              options={[
                { value: '爆款', label: '爆款' },
                { value: '新品', label: '新品' },
                { value: '包邮', label: '包邮' },
              ]}
            />
          </Form.Item>
          <Form.Item label="商品描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入商品描述" maxLength={500} showCount />
          </Form.Item>
          <Form.Item label="上架状态" name="status" valuePropName="value">
            <Select
              options={[
                { label: '草稿', value: 1 },
                { label: '已上架', value: 2 },
                { label: '已下架', value: 3 },
              ]}
            />
          </Form.Item>

          <Typography.Title level={5}>规格（SKU）</Typography.Title>
          <Form.List
            name="skus"
            rules={[{ validator: async (_, skus) => (!skus || skus.length ? Promise.resolve() : Promise.reject(new Error('至少保留一个规格'))) }]}
          >
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    style={{ marginBottom: 12 }}
                    title={`规格 ${field.name + 1}`}
                    extra={
                      <Button type="link" danger size="small" onClick={() => remove(field.name)}>
                        删除
                      </Button>
                    }
                  >
                    <Space size={12} wrap>
                      <Form.Item
                        label="规格文案"
                        name={[field.name, 'spec_text']}
                        rules={[{ required: true, message: '请输入规格文案' }]}
                      >
                        <Input placeholder="如：银色 / 12+256GB" style={{ width: 200 }} />
                      </Form.Item>
                      <Form.Item
                        label="编码"
                        name={[field.name, 'sku_code']}
                      >
                        <Input placeholder="SKU-P1-SILVER" style={{ width: 160 }} />
                      </Form.Item>
                      <Form.Item
                        label="售价（元）"
                        name={[field.name, 'price']}
                        rules={[{ required: true, message: '请输入售价' }]}
                      >
                        <InputNumber min={0} precision={2} style={{ width: 130 }} />
                      </Form.Item>
                      <Form.Item label="原价（元）" name={[field.name, 'original_price']}>
                        <InputNumber min={0} precision={2} style={{ width: 130 }} />
                      </Form.Item>
                      <Form.Item
                        label="库存"
                        name={[field.name, 'stock']}
                        rules={[{ required: true, message: '请输入库存' }]}
                      >
                        <InputNumber min={0} precision={0} style={{ width: 110 }} />
                      </Form.Item>
                      <Form.Item label="启用" name={[field.name, 'enabled']} valuePropName="checked">
                        <Switch />
                      </Form.Item>
                    </Space>
                  </Card>
                ))}
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() =>
                    add({ spec_text: '', price: 0, original_price: 0, stock: 0, sku_code: '', enabled: true })
                  }
                >
                  添加规格
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Drawer>
    </PageContainer>
  )
}
