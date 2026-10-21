/**
 * SKU 管理
 */
import { useMemo, useState } from 'react'
import { Button, Card, Drawer, Form, Input, InputNumber, Space, Switch, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { getProductDetail, listSkuProducts, saveSku } from '@/api/sku'
import { useApiQuery } from '@/hooks/useApi'
import { hasPermission } from '@/utils/permission'
import { formatNumber, formatYuan, yuanToCents } from '@/utils/format'
import { validateForm } from '@/utils/form'
import { useAuthStore } from '@/store/auth'
import type { ListProductsParams, Product, ProductSku, SaveSkuRequest } from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { useMessage } from '@/hooks/useMessage'

interface SkuFormValues {
  id?: number
  sku_code: string
  spec_text: string
  price: number
  original_price?: number
  stock: number
  image?: string
  enabled: boolean
}

/** SKU 管理页 */
export default function Skus() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((state) => state.permissions)
  const [form] = Form.useForm<SkuFormValues>()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [current, setCurrent] = useState<Product | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<ProductSku | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canEdit = hasPermission(permissions, 'product:update')

  const queryParams = useMemo<ListProductsParams>(
    () => ({ page, page_size: pageSize, keyword: keyword || undefined }),
    [page, pageSize, keyword],
  )

  const productsQuery = useApiQuery(['skus', 'products', queryParams], () =>
    listSkuProducts(queryParams),
  )
  const products = productsQuery.data?.products ?? []

  const detailQuery = useApiQuery(
    ['skus', 'detail', current?.id],
    () => getProductDetail(current!.id),
    { enabled: !!current?.id },
  )

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['skus'] })
  }

  const handleSearch = (values: SearchFormValues) => {
    setKeyword(String(values.keyword ?? '').trim())
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setPage(1)
  }

  const selectProduct = (record: Product) => {
    setCurrent(record)
  }

  const openCreate = () => {
    if (!current) return
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      id: 0,
      sku_code: `SKU-P${current.id}-`,
      spec_text: '',
      price: current.min_price_cents / 100,
      original_price: current.max_price_cents / 100,
      stock: 0,
      image: '',
      enabled: true,
    })
    setDrawerOpen(true)
  }

  const openEdit = (record: ProductSku) => {
    setEditing(record)
    form.resetFields()
    form.setFieldsValue({
      id: record.id,
      sku_code: record.sku_code,
      spec_text: record.spec_text,
      price: record.price_cents / 100,
      original_price: record.original_price_cents / 100,
      stock: record.stock,
      image: record.image,
      enabled: record.enabled,
    })
    setDrawerOpen(true)
  }

  const handleSubmit = async () => {
    if (!current) return
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      const payload: SaveSkuRequest = {
        id: editing?.id ?? 0,
        product_id: current.id,
        sku_code: values.sku_code,
        spec_text: values.spec_text,
        specs: {},
        price_cents: yuanToCents(values.price),
        original_price_cents: yuanToCents(values.original_price ?? values.price),
        stock: values.stock ?? 0,
        image: values.image ?? '',
        sort: (detailQuery.data?.skus.length ?? 0) + 1,
        enabled: values.enabled ?? true,
      }
      await saveSku(payload)
      message.success(editing ? 'SKU 已更新' : 'SKU 已新增')
      setDrawerOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const productColumns: ColumnsType<Product> = [
    {
      title: '商品',
      dataIndex: 'title',
      render: (value: string, record) => (
        <Space>
          <img
            src={record.cover}
            alt={value}
            width={38}
            height={38}
            style={{ borderRadius: 6, objectFit: 'cover', background: '#F1F5F9' }}
          />
          <div>
            <Typography.Text strong>{value}</Typography.Text>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {record.category_name} · 价格 {formatYuan(record.min_price_cents)}
              </Typography.Text>
            </div>
          </div>
        </Space>
      ),
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
      width: 100,
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => selectProduct(record)}
          style={{ color: current?.id === record.id ? undefined : '#2A4AD9' }}
        >
          {current?.id === record.id ? '当前商品' : '查看 SKU'}
        </Button>
      ),
    },
  ]

  const skuColumns: ColumnsType<ProductSku> = [
    { title: 'SKU 编码', dataIndex: 'sku_code', width: 200 },
    {
      title: '规格',
      dataIndex: 'spec_text',
      width: 180,
      render: (value: string) => value || '—',
    },
    {
      title: '售价',
      dataIndex: 'price_cents',
      width: 120,
      align: 'right',
      render: (value: number) => formatYuan(value),
    },
    {
      title: '原价',
      dataIndex: 'original_price_cents',
      width: 120,
      align: 'right',
      render: (value: number) => formatYuan(value),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 100,
      align: 'right',
      render: (value: number) => (
        <Typography.Text type={value <= 0 ? 'danger' : undefined}>{formatNumber(value)}</Typography.Text>
      ),
    },
    {
      title: '销量',
      dataIndex: 'sales_count',
      width: 100,
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 90,
      render: (value: boolean) => (
        <Tag color={value ? 'success' : 'default'}>{value ? '启用' : '停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_: unknown, record) =>
        canEdit ? (
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
  ]

  return (
    <PageContainer title="SKU 管理" description="按商品维护规格、价格与库存">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <SearchForm onSearch={handleSearch} onReset={handleReset} loading={productsQuery.isFetching}>
          <Form.Item name="keyword" label="商品">
            <Input allowClear placeholder="商品标题" style={{ width: 220 }} />
          </Form.Item>
        </SearchForm>

        <TableToolbar
          title="商品列表"
          description={`共 ${formatNumber(productsQuery.data?.meta.total ?? 0)} 个商品，点击「查看 SKU」展开规格`}
          extra={
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
            </Button>
          }
        />

        <Table<Product>
          rowKey="id"
          columns={productColumns}
          dataSource={products}
          loading={productsQuery.isLoading || productsQuery.isFetching}
          scroll={{ x: 800 }}
          locale={{ emptyText: '暂无商品' }}
          pagination={{
            current: page,
            pageSize,
            total: productsQuery.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${formatNumber(total)} 个`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage)
              setPageSize(nextSize)
            },
          }}
        />
      </Card>

      <Card
        title={current ? `SKU 列表 · ${current.title}` : 'SKU 列表'}
        variant="outlined"
        className="dashboard-row"
        extra={
          canEdit ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              disabled={!current}
              onClick={openCreate}
            >
              新增 SKU
            </Button>
          ) : null
        }
      >
        {!current ? (
          <Typography.Text type="secondary">请先在上方选择一个商品</Typography.Text>
        ) : (
          <Table<ProductSku>
            rowKey="id"
            columns={skuColumns}
            dataSource={detailQuery.data?.skus ?? []}
            loading={detailQuery.isLoading || detailQuery.isFetching}
            scroll={{ x: 1000 }}
            locale={{ emptyText: '该商品暂无 SKU' }}
            pagination={false}
          />
        )}
      </Card>

      <Drawer
        title={editing ? `编辑 SKU · ${editing.sku_code}` : '新增 SKU'}
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
            label="SKU 编码"
            name="sku_code"
            rules={[{ required: true, message: '请输入 SKU 编码' }]}
          >
            <Input placeholder="如：SKU-P1-SILVER-256" />
          </Form.Item>
          <Form.Item
            label="规格文案"
            name="spec_text"
            rules={[{ required: true, message: '请输入规格文案' }]}
          >
            <Input placeholder="如：银色 / 12+256GB" />
          </Form.Item>
          <Space size={16}>
            <Form.Item
              label="售价（元）"
              name="price"
              rules={[{ required: true, message: '请输入售价' }]}
            >
              <InputNumber min={0} precision={2} style={{ width: 190 }} />
            </Form.Item>
            <Form.Item label="原价（元）" name="original_price">
              <InputNumber min={0} precision={2} style={{ width: 190 }} />
            </Form.Item>
          </Space>
          <Space size={16}>
            <Form.Item
              label="库存"
              name="stock"
              rules={[{ required: true, message: '请输入库存' }]}
            >
              <InputNumber min={0} precision={0} style={{ width: 190 }} />
            </Form.Item>
            <Form.Item label="启用" name="enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item label="图片地址" name="image">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  )
}
