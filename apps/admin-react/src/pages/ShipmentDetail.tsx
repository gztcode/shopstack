/**
 * 发货单详情 —— 查看运单信息并更新发货状态
 */
import { useState } from 'react'
import { Button, Card, Form, Input, Select, Space, Tag } from 'antd'
import { getShipment, setShipmentStatus } from '@/api/logistics'
import { useMessage } from '@/hooks/useMessage'
import { formatDateTime, formatYuan } from '@/utils/format'
import { validateForm } from '@/utils/form'
import { SHIPMENT_STATUS_OPTIONS } from '@/utils/resourceOptions'
import type { Shipment } from '@/types'
import ResourceDetail from '@/components/ResourceDetail'

/** 发货单详情页 */
export default function ShipmentDetail() {
  const message = useMessage()
  const [form] = Form.useForm<{ status: number; remark: string }>()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (record: Shipment) => {
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      await setShipmentStatus(record.id, values.status, values.remark ?? '')
      message.success('发货单状态已更新')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '更新失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ResourceDetail<Shipment>
      title="发货单详情"
      description="查看运单信息并更新发货 / 签收状态"
      fetcher={getShipment}
      queryKey="shipment-detail"
      backTo="/shipments"
      fields={[
        { label: '运单号', render: (data) => data.tracking_no ?? '—' },
        { label: '订单号', render: (data) => data.order_no ?? '—' },
        { label: '快递公司', render: (data) => data.company ?? '—' },
        { label: '公司编码', render: (data) => data.company_code ?? '—' },
        { label: '收件人', render: (data) => data.receiver ?? '—' },
        { label: '联系电话', render: (data) => data.phone ?? '—' },
        { label: '收货地址', span: 2, render: (data) => data.address ?? '—' },
        { label: '运费', render: (data) => formatYuan(data.freight_cents ?? 0) },
        { label: '商品件数', render: (data) => String(data.item_count ?? '-') },
        {
          label: '状态',
          render: (data) => (
            <Tag color={data.status === 'SHIPMENT_STATUS_DELIVERED' ? 'success' : 'processing'}>
              {SHIPMENT_STATUS_OPTIONS.find((item) => item.value === Number(data.status))?.label ??
                String(data.status)}
            </Tag>
          ),
        },
        { label: '发货时间', render: (data) => formatDateTime(data.shipped_at) },
        { label: '备注', render: (data) => data.remark ?? '—' },
      ]}
    >
      {(data) => (
        <Card title="更新发货状态">
          <Form form={form} layout="vertical" initialValues={{ status: 2, remark: '' }}>
            <Space size={16} style={{ display: 'flex', alignItems: 'flex-start' }}>
              <Form.Item label="发货状态" name="status" style={{ width: 200 }}>
                <Select options={SHIPMENT_STATUS_OPTIONS} />
              </Form.Item>
              <Form.Item label="备注" name="remark" style={{ flex: 1, minWidth: 300 }}>
                <Input.TextArea rows={3} maxLength={200} showCount placeholder="填写发货备注" />
              </Form.Item>
            </Space>
            <Button type="primary" loading={submitting} onClick={() => handleSubmit(data)}>
              保存状态
            </Button>
          </Form>
        </Card>
      )}
    </ResourceDetail>
  )
}
