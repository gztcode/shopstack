/**
 * 商品详情编辑
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, Col, Descriptions, Form, Input, InputNumber, Row, Select, Space, Switch, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { listCategories, saveProduct, setProductStatus } from '@/api/product'
import { getProductDetail, listSkuProducts, saveSku } from '@/api/sku'
import { useApiQuery } from '@/hooks/useApi'
import { hasPermission } from '@/utils/permission'
import { formatDateTime, formatNumber, formatYuan, yuanToCents } from '@/utils/format'
import { validateForm } from '@/utils/form'
import { useAuthStore } from '@/store/auth'
import type { ListProductsParams, Product, ProductSku, SaveSkuRequest } from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import StatusTag from '@/components/StatusTag'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { useMessage } from '@/hooks/useMessage'

interface DetailFormValues {
  title: string
  subtitle?: string
  category_id: number
  cover?: string
  description?: string
  tags?: string[]
  status: number
}

interface SkuFormValues {
  id?: number
  sku_code: string
  spec_text: string
  price: number
  original_price?: number
  stock: number
  enabled: boolean
}

/** 商品状态：字符串枚举 → 数值枚举（proto ProductStatus） */
const PRODUCT_STATUS_VALUE: Record<string, number> = {
  PRODUCT_STATUS_DRAFT: 1,
  PRODUCT_STATUS_ON_SHELF: 2,
  PRODUCT_STATUS_OFF_SHELF: 3,
}

/** 商品详情编辑页 */
export default function ProductDetail() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((state) => state.permissions)
  const [searchParams, setSearchParams] = useSearchParams()
  const [detailForm] = Form.useForm<DetailFormValues>()
  const [skuForm] = Form.useForm<SkuFormValues>()
  const [keyword, setKeyword] = useState('')
  const [productId, setProductId] = useState<number | null>(
    searchParams.get('id') ? Number(searchParams.get('id')) : null,
  )
  const [skuModalOpen, setSkuModalOpen] = useState(false)
  const [editingSku, setEditingSku] = useState<ProductSku | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canEdit = hasPermission(permissions, 'product:update')

  const listParams = useMemo<ListProductsParams>(
    () => ({ page: 1, page_size: 20, keyword: keyword || undefined }),
    [keyword],
  )

  const productsQuery = useApiQuery(['product-detail', 'list', listParams], () =>
    listSkuProducts(listParams),
  )
  const categoriesQuery = useApiQuery(['categories', 'options'], () => listCategories())
  const detailQuery = useApiQuery(
    ['product-detail', 'detail', productId],
    () => getProductDetail(productId!),
    { enabled: !!productId },
  )

  const product = detailQuery.data?.product

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
    if (!product) return
    detailForm.setFieldsValue({
      title: product.title,
      subtitle: product.subtitle,
      category_id: product.category_id,
      cover: product.cover,
      description: product.description,
      tags: product.tags,
      status: PRODUCT_STATUS_VALUE[product.status] ?? 1,
    })
  }, [product, detailForm])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['product-detail'] })
  }

  const handleSearch = (values: SearchFormValues) => {
    setKeyword(String(values.keyword ?? '').trim())
  }

  const handleSelect = (record: Product) => {
    setProductId(record.id)
    setSearchParams({ id: String(record.id) })
  }

  const handleSaveProduct = async () => {
    if (!product) return
    const values = await validateForm(detailForm)
    if (values === null) return
    setSubmitting(true)
    try {
      await saveProduct({
        id: product.id,
        title: values.title,
        subtitle: values.subtitle,
        cover: values.cover,
        category_id: values.category_id,
        min_price_cents: product.min_price_cents,
        max_price_cents: product.max_price_cents,
        description: values.description,
        tags: values.tags ?? [],
        status: values.status,
        skus: detailQuery.data?.skus ?? [],
      })
      message.success('商品信息已保存')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (target: number) => {
    if (!product) return
    try {
      await setProductStatus(product.id, target)
      message.success(target === 2 ? '商品已上架' : '商品已下架')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const openSkuModal = (record?: ProductSku) => {
    setEditingSku(record ?? null)
    skuForm.resetFields()
    if (record) {
      skuForm.setFieldsValue({
        id: record.id,
        sku_code: record.sku_code,
        spec_text: record.spec_text,
        price: record.price_cents / 100,
        original_price: record.original_price_cents / 100,
        stock: record.stock,
        enabled: record.enabled,
      })
    } else {
      skuForm.setFieldsValue({
        id: 0,
        sku_code: `SKU-P${product?.id ?? 0}-`,
        spec_text: '',
        price: (product?.min_price_cents ?? 0) / 100,
        original_price: (product?.max_price_cents ?? 0) / 100,
        stock: 0,
        enabled: true,
      })
    }
    setSkuModalOpen(true)
  }

  const handleSaveSku = async () => {
    if (!product) return
    const values = await validateForm(skuForm)
    if (values === null) return
    setSubmitting(true)
    try {
      const payload: SaveSkuRequest = {
        id: editingSku?.id ?? 0,
        product_id: product.id,
        sku_code: values.sku_code,
        spec_text: values.spec_text,
        specs: {},
        price_cents: yuanToCents(values.price),
        original_price_cents: yuanToCents(values.original_price ?? values.price),
        stock: values.stock ?? 0,
        image: editingSku?.image ?? '',
        sort: (detailQuery.data?.skus.length ?? 0) + 1,
        enabled: values.enabled ?? true,
      }
      await saveSku(payload)
      message.success(editingSku ? 'SKU 已更新' : 'SKU 已新增')
      setSkuModalOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

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
      title: '库存',
      dataIndex: 'stock',
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
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openSkuModal(record)}>
            编辑
          </Button>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
  ]

  return (
    <PageContainer title="商品详情编辑" description="编辑商品基础信息与规格（SKU）">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <SearchForm onSearch={handleSearch} onReset={() => setKeyword('')} loading={productsQuery.isFetching}>
          <Form.Item name="keyword" label="选择商品">
            <Input allowClear placeholder="搜索商品标题" style={{ width: 240 }} />
          </Form.Item>
        </SearchForm>

        <TableToolbar
          title="商品列表"
          description={`共 ${formatNumber(productsQuery.data?.meta.total ?? 0)} 个商品`}
          extra={
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
            </Button>
          }
        />

        <Table<Product>
          rowKey="id"
          size="small"
          dataSource={productsQuery.data?.products ?? []}
          loading={productsQuery.isLoading || productsQuery.isFetching}
          pagination={{ pageSize: 5, showSizeChanger: false }}
          rowSelection={{
            type: 'radio',
            selectedRowKeys: productId ? [productId] : [],
            onChange: (keys) => {
              const key = keys[0]
              if (key !== undefined) {
                const record = productsQuery.data?.products.find((item) => item.id === key)
                if (record) handleSelect(record)
              }
            },
          }}
          onRow={(record) => ({
            onClick: () => handleSelect(record),
            style: { cursor: 'pointer' },
          })}
          columns={[
            {
              title: '商品',
              dataIndex: 'title',
              render: (value: string, record) => (
                <Space>
                  <img
                    src={record.cover}
                    alt={value}
                    width={32}
                    height={32}
                    style={{ borderRadius: 6, objectFit: 'cover', background: '#F1F5F9' }}
                  />
                  <Typography.Text strong>{value}</Typography.Text>
                </Space>
              ),
            },
            { title: '分类', dataIndex: 'category_name', width: 130 },
            {
              title: '价格',
              dataIndex: 'min_price_cents',
              width: 140,
              align: 'right',
              render: (value: number, record) =>
                value === record.max_price_cents
                  ? formatYuan(value)
                  : `${formatYuan(value)} ~ ${formatYuan(record.max_price_cents)}`,
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 100,
              render: (value: string) => <StatusTag status={value} />,
            },
          ]}
        />
      </Card>

      {product ? (
        <>
          <Card
            title={`商品基础信息 · ${product.title}`}
            variant="outlined"
            extra={
              <Space>
                {canEdit ? (
                  <>
                    {product.status === 'PRODUCT_STATUS_ON_SHELF' ? (
                      <Button onClick={() => handleToggleStatus(3)}>下架</Button>
                    ) : (
                      <Button onClick={() => handleToggleStatus(2)}>上架</Button>
                    )}
                    <Button type="primary" icon={<SaveOutlined />} loading={submitting} onClick={handleSaveProduct}>
                      保存商品
                    </Button>
                  </>
                ) : null}
              </Space>
            }
          >
            <Row gutter={16}>
              <Col xs={24} lg={16}>
                <Form form={detailForm} layout="vertical">
                  <Form.Item
                    label="商品标题"
                    name="title"
                    rules={[{ required: true, message: '请输入商品标题' }]}
                  >
                    <Input placeholder="请输入商品标题" />
                  </Form.Item>
                  <Form.Item label="副标题" name="subtitle">
                    <Input placeholder="一句话卖点" />
                  </Form.Item>
                  <Space size={16}>
                    <Form.Item
                      label="所属分类"
                      name="category_id"
                      style={{ minWidth: 220 }}
                      rules={[{ required: true, message: '请选择分类' }]}
                    >
                      <Select placeholder="请选择分类" options={categoryOptions} />
                    </Form.Item>
                    <Form.Item label="状态" name="status" style={{ minWidth: 160 }}>
                      <Select
                        options={[
                          { label: '草稿', value: 1 },
                          { label: '已上架', value: 2 },
                          { label: '已下架', value: 3 },
                        ]}
                      />
                    </Form.Item>
                  </Space>
                  <Form.Item label="封面图 URL" name="cover">
                    <Input placeholder="https://..." />
                  </Form.Item>
                  <Form.Item label="标签" name="tags">
                    <Select mode="tags" placeholder="输入后回车创建标签" style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item label="商品描述" name="description">
                    <Input.TextArea rows={4} maxLength={500} showCount placeholder="请输入商品描述" />
                  </Form.Item>
                </Form>
              </Col>
              <Col xs={24} lg={8}>
                <Descriptions bordered size="small" column={1} title="商品快照">
                  <Descriptions.Item label="ID">{product.id}</Descriptions.Item>
                  <Descriptions.Item label="销量">
                    {formatNumber(product.sales_count)}
                  </Descriptions.Item>
                  <Descriptions.Item label="总库存">
                    {formatNumber(product.stock_total)}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {formatDateTime(product.created_at)}
                  </Descriptions.Item>
                  <Descriptions.Item label="更新时间">
                    {formatDateTime(product.updated_at)}
                  </Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
          </Card>

          <Card
            title="规格（SKU）"
            variant="outlined"
            className="dashboard-row"
            extra={
              canEdit ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openSkuModal()}>
                  新增 SKU
                </Button>
              ) : null
            }
          >
            <Table<ProductSku>
              rowKey="id"
              size="small"
              columns={skuColumns}
              dataSource={detailQuery.data?.skus ?? []}
              loading={detailQuery.isLoading || detailQuery.isFetching}
              pagination={false}
              scroll={{ x: 900 }}
              locale={{ emptyText: '该商品暂无 SKU' }}
            />
          </Card>
        </>
      ) : (
        <Card>
          <Typography.Text type="secondary">请先在上方选择要编辑的商品</Typography.Text>
        </Card>
      )}

      <Card
        title={editingSku ? `编辑 SKU · ${editingSku.sku_code}` : '新增 SKU'}
        variant="outlined"
        className={skuModalOpen ? '' : 'dashboard-row'}
        extra={
          canEdit ? (
            <Space>
              <Button onClick={() => setSkuModalOpen(false)}>取消</Button>
              <Button type="primary" loading={submitting} onClick={handleSaveSku}>
                保存
              </Button>
            </Space>
          ) : null
        }
      >
        {skuModalOpen ? (
          <Form form={skuForm} layout="vertical">
            <Space size={16}>
              <Form.Item
                label="SKU 编码"
                name="sku_code"
                rules={[{ required: true, message: '请输入 SKU 编码' }]}
              >
                <Input placeholder="如：SKU-P1-SILVER-256" style={{ width: 240 }} />
              </Form.Item>
              <Form.Item
                label="规格文案"
                name="spec_text"
                rules={[{ required: true, message: '请输入规格文案' }]}
              >
                <Input placeholder="如：银色 / 12+256GB" style={{ width: 240 }} />
              </Form.Item>
            </Space>
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
              <Form.Item label="库存" name="stock" rules={[{ required: true, message: '请输入库存' }]}>
                <InputNumber min={0} precision={0} style={{ width: 170 }} />
              </Form.Item>
              <Form.Item label="启用" name="enabled" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Space>
            <Form.Item name="id" hidden>
              <Input />
            </Form.Item>
          </Form>
        ) : (
          <Typography.Text type="secondary">点击「新增 SKU」或「编辑」展开表单</Typography.Text>
        )}
      </Card>
    </PageContainer>
  )
}
