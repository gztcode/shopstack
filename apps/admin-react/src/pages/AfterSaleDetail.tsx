/**
 * 售后详情 —— 查看单笔售后申请并给出审核结论
 */
import { useState } from 'react'
import { Button, Card, Form, Input, Select, Space, Tag, Typography } from 'antd'
import { getAfterSale, setAfterSaleStatus } from '@/api/order'
import { useMessage } from '@/hooks/useMessage'
import { formatDateTime, formatYuan } from '@/utils/format'
import { validateForm } from '@/utils/form'
import { AFTER_SALE_STATUS_OPTIONS, AFTER_SALE_TYPE_OPTIONS } from '@/utils/resourceOptions'
import type { AfterSale } from '@/types'
import ResourceDetail from '@/components/ResourceDetail'

/** 售后详情页 */
export default function AfterSaleDetail() {
  const message = useMessage()
  const [form] = Form.useForm<{ status: number; admin_remark: string }>()
  const [submitting, setSubmitting] = useState(false)

  const handleAudit = async (record: AfterSale) => {
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      await setAfterSaleStatus(record.id, values.status, values.admin_remark ?? '')
      message.success('售后单状态已更新')
      form.resetFields()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ResourceDetail<AfterSale>
      title="售后详情"
      description="查看售后申请内容并给出审核结论"
      fetcher={getAfterSale}
      queryKey="after-sale-detail"
      backTo="/after-sales"
      fields={[
        { label: '售后单号', render: (data) => data.after_sale_no ?? '—' },
        { label: '订单号', render: (data) => data.order_no ?? '—' },
        {
          label: '售后类型',
          render: (data) =>
            AFTER_SALE_TYPE_OPTIONS.find((item) => item.value === data.type)?.label ?? '-',
        },
        { label: '退款金额', render: (data) => formatYuan(data.amount_cents ?? 0) },
        { label: '申请原因', render: (data) => data.reason ?? '—' },
        { label: '申请人', render: (data) => data.user_nickname ?? '匿名用户' },
        {
          label: '状态',
          render: (data) => (
            <Tag color={data.status === 0 ? 'warning' : data.status === 1 ? 'success' : 'default'}>
              {AFTER_SALE_STATUS_OPTIONS.find((item) => item.value === data.status)?.label ?? '-'}
            </Tag>
          ),
        },
        { label: '申请时间', render: (data) => formatDateTime(data.created_at) },
        {
          label: '申请说明',
          span: 2,
          render: (data) => (
            <Typography.Paragraph style={{ marginBottom: 0 }}>{data.description || '—'}</Typography.Paragraph>
          ),
        },
        {
          label: '审核备注',
          span: 2,
          render: (data) => data.admin_remark || '—',
        },
      ]}
    >
      {(data) => (
        <Card title="审核处理">
          <Form form={form} layout="vertical" initialValues={{ status: 1, admin_remark: '' }}>
            <Space size={16} style={{ display: 'flex', alignItems: 'flex-start' }}>
              <Form.Item label="审核结果" name="status" style={{ width: 220 }}>
                <Select options={AFTER_SALE_STATUS_OPTIONS.slice(0, 3)} />
              </Form.Item>
              <Form.Item label="审核备注" name="admin_remark" style={{ flex: 1, minWidth: 320 }}>
                <Input.TextArea rows={3} maxLength={200} showCount placeholder="填写给用户看的审核说明" />
              </Form.Item>
            </Space>
            <Button type="primary" loading={submitting} onClick={() => handleAudit(data)}>
              提交审核结果
            </Button>
          </Form>
        </Card>
      )}
    </ResourceDetail>
  )
}
