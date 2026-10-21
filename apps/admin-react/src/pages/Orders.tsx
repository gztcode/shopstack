/**
 * 订单管理
 */
import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Descriptions, Drawer, Form, Input, Select, Space, Table, Timeline, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EyeOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { createShipment, getOrder, listOrderLogs, listOrders, updateOrderRemark } from '@/api/order'
import { useApiQuery } from '@/hooks/useApi'
import { hasPermission } from '@/utils/permission'
import { enumToNumber, ORDER_STATUS_OPTIONS } from '@/utils/enums'
import { formatDateTime, formatNumber, formatYuan } from '@/utils/format'
import { useAuthStore } from '@/store/auth'
import type { ListOrdersParams, Order, OrderDetail } from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import StatusTag from '@/components/StatusTag'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { validateForm } from '@/utils/form'
import { useMessage } from '@/hooks/useMessage'

const SHIP_COMPANIES = [
  { value: '顺丰速运', label: '顺丰速运' },
  { value: '中通快递', label: '中通快递' },
  { value: '圆通速递', label: '圆通速递' },
  { value: '韵达快递', label: '韵达快递' },
  { value: '京东物流', label: '京东物流' },
  { value: '邮政EMS', label: '邮政EMS' },
]

/** 构造仅含订单基础信息的详情骨架（详情接口返回前先渲染） */
function emptyDetail(record: Order): OrderDetail {
  return {
    order: record,
    items: [],
    logs: [],
    coupon_id: 0,
    coupon_name: '',
    payment_id: 0,
    shipment_id: record.shipment_id,
    tracking_no: '',
    logistics_company: '',
    logistics_tracks: [],
    can_cancel: false,
    can_pay: false,
    can_confirm: false,
    can_refund: false,
    can_review: false,
  }
}

/** 订单管理页 */
export default function Orders() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((state) => state.permissions)
  const [shipForm] = Form.useForm<{ company: string; tracking_no: string; remark?: string }>()
  const [remarkForm] = Form.useForm<{ admin_remark: string }>()
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [shipOpen, setShipOpen] = useState(false)
  const [remarkOpen, setRemarkOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canShip = hasPermission(permissions, 'order:ship')
  const canRemark = hasPermission(permissions, 'order:update')

  const queryParams = useMemo<ListOrdersParams>(
    () => ({ page, page_size: pageSize, keyword: keyword || undefined, status }),
    [page, pageSize, keyword, status],
  )

  const ordersQuery = useApiQuery(['orders', queryParams], () => listOrders(queryParams))
  const counts = ordersQuery.data

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['orders'] })

  const detailQuery = useApiQuery(
    ['order', 'detail', detail?.order.id],
    () => getOrder(detail!.order.id),
    { enabled: !!detail?.order.id },
  )

  const logsQuery = useApiQuery(
    ['order', 'logs', detail?.order.id],
    () => listOrderLogs(detail!.order.id),
    { enabled: !!detail?.order.id },
  )

  useEffect(() => {
    if (detailQuery.data) setDetail(detailQuery.data)
  }, [detailQuery.data])

  const openDetail = (record: Order) => {
    setDetail(emptyDetail(record))
    setDrawerOpen(true)
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

  const openShip = () => {
    shipForm.resetFields()
    setShipOpen(true)
  }

  /** 列表内直接发货：只打开发货抽屉，不叠加详情抽屉 */
  const openShipFor = (record: Order) => {
    setDetail((prev) =>
      prev && prev.order.id === record.id ? prev : { ...emptyDetail(record) },
    )
    shipForm.resetFields()
    setShipOpen(true)
  }

  const handleShip = async () => {
    if (!detail) return
    const values = await validateForm(shipForm)
    if (values === null) return
    setSubmitting(true)
    try {
      await createShipment({
        order_id: detail.order.id,
        company: values.company,
        tracking_no: values.tracking_no,
        remark: values.remark,
      })
      message.success('发货成功')
      setShipOpen(false)
      setDrawerOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '发货失败')
    } finally {
      setSubmitting(false)
    }
  }

  const openRemark = () => {
    remarkForm.resetFields()
    remarkForm.setFieldsValue({ admin_remark: detail?.order.admin_remark ?? '' })
    setRemarkOpen(true)
  }

  /** 列表内直接写备注：只打开备注抽屉 */
  const openRemarkFor = (record: Order) => {
    setDetail((prev) => (prev && prev.order.id === record.id ? prev : emptyDetail(record)))
    remarkForm.resetFields()
    remarkForm.setFieldsValue({ admin_remark: record.admin_remark })
    setRemarkOpen(true)
  }

  const handleRemark = async () => {
    if (!detail) return
    const values = await validateForm(remarkForm)
    if (values === null) return
    setSubmitting(true)
    try {
      await updateOrderRemark(detail.order.id, values.admin_remark)
      message.success('备注已保存')
      setRemarkOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnsType<Order> = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      width: 180,
      render: (value: string) => (
        <Typography.Text copyable={{ text: value }} style={{ fontFamily: 'monospace' }}>
          {value}
        </Typography.Text>
      ),
    },
    {
      title: '用户',
      dataIndex: 'user_nickname',
      width: 130,
      render: (value: string, record) => (
        <div>
          <span>{value}</span>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              UID {record.user_id}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: '商品缩略',
      dataIndex: 'id',
      width: 110,
      render: (_: number, record) => (
        <Space size={6}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 6,
              background: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8A99AB',
              fontSize: 12,
            }}
          >
            {record.total_quantity}
          </div>
          <Typography.Text type="secondary">{record.item_count} 个商品</Typography.Text>
        </Space>
      ),
    },
    {
      title: '订单金额',
      dataIndex: 'payable_cents',
      width: 140,
      align: 'right',
      render: (value: number, record) => (
        <div>
          <Typography.Text strong>{formatYuan(value)}</Typography.Text>
          {record.discount_cents > 0 ? (
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                已优惠 {formatYuan(record.discount_cents)}
              </Typography.Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: '下单时间',
      dataIndex: 'created_at',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_: unknown, record) => (
        <Space size={4} wrap>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            详情
          </Button>
          {canShip && record.status === 'ORDER_STATUS_PAID' ? (
            <Button
              type="link"
              size="small"
              icon={<SendOutlined />}
              onClick={() => openShipFor(record)}
            >
              发货
            </Button>
          ) : null}
          {canRemark ? (
            <Button type="link" size="small" onClick={() => openRemarkFor(record)}>
              备注
            </Button>
          ) : null}        </Space>
      ),
    },
  ]

  const orderDetail = detailQuery.data ?? detail

  return (
    <PageContainer title="订单管理" description="查询订单、发货与售后备注">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <SearchForm onSearch={handleSearch} onReset={handleReset} loading={ordersQuery.isFetching}>
          <Form.Item name="keyword" label="关键词">
            <Input allowClear placeholder="订单号 / 用户昵称" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: 160 }}
              options={ORDER_STATUS_OPTIONS.map((option) => ({
                label: option.label,
                value: enumToNumber(option.value),
              }))}
            />
          </Form.Item>
        </SearchForm>

        <TableToolbar
          title="订单列表"
          description={
            counts
              ? `待付款 ${counts.pending_payment_count} · 待发货 ${counts.pending_shipment_count} · 待收货 ${counts.pending_receipt_count} · 退款中 ${counts.refunding_count}`
              : undefined
          }
          extra={
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
            </Button>
          }
        />

        <Table<Order>
          rowKey="id"
          columns={columns}
          dataSource={ordersQuery.data?.orders ?? []}
          loading={ordersQuery.isLoading || ordersQuery.isFetching}
          scroll={{ x: 1180 }}
          locale={{ emptyText: '暂无订单数据' }}
          pagination={{
            current: page,
            pageSize,
            total: ordersQuery.data?.meta.total ?? 0,
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
        title={detail ? `订单详情 · ${detail.order.order_no}` : '订单详情'}
        width={720}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        extra={
          <Space>
            {canShip && detail?.order.status === 'ORDER_STATUS_PAID' ? (
              <Button type="primary" icon={<SendOutlined />} onClick={openShip}>
                发货
              </Button>
            ) : null}
            {canRemark ? <Button onClick={openRemark}>写备注</Button> : null}
          </Space>
        }
      >
        {orderDetail ? (
          <>
            <Descriptions bordered size="small" column={2} title="订单信息">
              <Descriptions.Item label="订单号">{orderDetail.order.order_no}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <StatusTag status={orderDetail.order.status} />
              </Descriptions.Item>
              <Descriptions.Item label="用户">
                {orderDetail.order.user_nickname}（UID {orderDetail.order.user_id}）
              </Descriptions.Item>
              <Descriptions.Item label="支付方式">
                {orderDetail.order.payment_method || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="商品总额">
                {formatYuan(orderDetail.order.total_amount_cents)}
              </Descriptions.Item>
              <Descriptions.Item label="优惠金额">
                {formatYuan(orderDetail.order.discount_cents)}
              </Descriptions.Item>
              <Descriptions.Item label="运费">
                {formatYuan(orderDetail.order.freight_cents)}
              </Descriptions.Item>
              <Descriptions.Item label="实付金额">
                {formatYuan(orderDetail.order.payable_cents)}
              </Descriptions.Item>
              <Descriptions.Item label="下单时间">
                {formatDateTime(orderDetail.order.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="发货时间">
                {formatDateTime(orderDetail.order.shipped_at)}
              </Descriptions.Item>
              <Descriptions.Item label="用户备注" span={2}>
                {orderDetail.order.remark || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="商家备注" span={2}>
                {orderDetail.order.admin_remark || '—'}
              </Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5}>收货信息</Typography.Title>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="收货人">
                {orderDetail.order.address?.receiver} {orderDetail.order.address?.phone}
              </Descriptions.Item>
              <Descriptions.Item label="收货地址">
                {orderDetail.order.address?.province}
                {orderDetail.order.address?.city}
                {orderDetail.order.address?.district}
                {orderDetail.order.address?.detail}
              </Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5}>订单商品</Typography.Title>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={orderDetail.items}
              locale={{ emptyText: '暂无商品信息' }}
              columns={[
                {
                  title: '商品',
                  dataIndex: 'product_title',
                  render: (value: string, row) => (
                    <Space>
                      {row.image ? (
                        <img
                          src={row.image}
                          alt={value}
                          width={40}
                          height={40}
                          style={{ borderRadius: 6, objectFit: 'cover' }}
                        />
                      ) : null}
                      <div>
                        <div>{value}</div>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {row.spec_text}
                        </Typography.Text>
                      </div>
                    </Space>
                  ),
                },
                {
                  title: '单价',
                  dataIndex: 'price_cents',
                  width: 110,
                  align: 'right',
                  render: (value: number) => formatYuan(value),
                },
                {
                  title: '数量',
                  dataIndex: 'quantity',
                  width: 80,
                  align: 'right',
                },
                {
                  title: '小计',
                  dataIndex: 'subtotal_cents',
                  width: 120,
                  align: 'right',
                  render: (value: number) => formatYuan(value),
                },
              ]}
            />

            <Typography.Title level={5}>状态时间线</Typography.Title>
            <Timeline
              items={(logsQuery.data?.logs ?? orderDetail.logs ?? []).map((log) => ({
                children: (
                  <div>
                    <Typography.Text strong>{log.action}</Typography.Text>
                    <div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDateTime(log.created_at)} · {log.operator}
                        {log.remark ? ` · ${log.remark}` : ''}
                      </Typography.Text>
                    </div>
                  </div>
                ),
              }))}
            />
          </>
        ) : (
          <Typography.Text type="secondary">加载中…</Typography.Text>
        )}
      </Drawer>

      <Drawer
        title="订单发货"
        width={420}
        open={shipOpen}
        onClose={() => setShipOpen(false)}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={() => setShipOpen(false)}>取消</Button>
            <Button type="primary" loading={submitting} onClick={handleShip}>
              确认发货
            </Button>
          </Space>
        }
      >
        <Form form={shipForm} layout="vertical">
          <Form.Item
            label="快递公司"
            name="company"
            rules={[{ required: true, message: '请选择快递公司' }]}
          >
            <Select placeholder="请选择快递公司" options={SHIP_COMPANIES} />
          </Form.Item>
          <Form.Item
            label="运单号"
            name="tracking_no"
            rules={[{ required: true, message: '请输入运单号' }, { min: 6, message: '运单号至少 6 位' }]}
          >
            <Input placeholder="请输入运单号" />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} maxLength={100} showCount placeholder="选填" />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title="订单备注"
        width={420}
        open={remarkOpen}
        onClose={() => setRemarkOpen(false)}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={() => setRemarkOpen(false)}>取消</Button>
            <Button type="primary" loading={submitting} onClick={handleRemark}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={remarkForm} layout="vertical">
          <Form.Item label="商家备注" name="admin_remark">
            <Input.TextArea rows={4} maxLength={200} showCount placeholder="仅后台可见" />
          </Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  )
}
