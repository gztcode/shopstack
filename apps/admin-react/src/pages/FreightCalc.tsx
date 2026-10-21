/**
 * 运费试算 —— 按地区与金额试算应收运费
 */
import { useState } from 'react'
import { Button, Card, Descriptions, Form, Input, InputNumber, Select, Space, Tag } from 'antd'
import { CalculatorOutlined } from '@ant-design/icons'
import { calculateFreight, listDeliveryRanges, listTemplates } from '@/api/logistics'
import { useApiQuery } from '@/hooks/useApi'
import { useMessage } from '@/hooks/useMessage'
import { formatYuan, yuanToCents } from '@/utils/format'
import { validateForm } from '@/utils/form'
import PageContainer from '@/components/PageContainer'
import DemoModeAlert from '@/components/DemoModeAlert'

interface FreightFormValues {
  template_id: number
  amount: number
  region: string
  quantity: number
}

/** 运费试算页 */
export default function FreightCalc() {
  const message = useMessage()
  const [form] = Form.useForm<FreightFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Awaited<ReturnType<typeof calculateFreight>> | null>(null)

  const templatesQuery = useApiQuery(['logistics', 'templates'], () => listTemplates())
  const rangesQuery = useApiQuery(['logistics', 'ranges'], () => listDeliveryRanges({ page_size: 50 }))

  const handleSubmit = async () => {
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      const response = await calculateFreight({
        template_id: values.template_id,
        amount_cents: yuanToCents(values.amount),
        region: values.region,
        quantity: values.quantity ?? 1,
      })
      setResult(response)
      message.success('运费试算完成')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '试算失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer title="运费试算" description="按运费模板、收货地区与订单金额试算应收运费">
      <DemoModeAlert onRetry={() => templatesQuery.refetch()} />

      <Card title="试算条件">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ template_id: 1, amount: 0, region: '北京市 北京市 朝阳区', quantity: 1 }}
        >
          <Space size={16} style={{ display: 'flex', flexWrap: 'wrap' }}>
            <Form.Item label="运费模板" name="template_id" rules={[{ required: true, message: '请选择运费模板' }]}>
              <Select
                style={{ width: 240 }}
                options={(templatesQuery.data?.templates ?? []).map((template) => ({
                  label: template.name,
                  value: template.id,
                }))}
              />
            </Form.Item>
            <Form.Item label="商品金额（元）" name="amount" rules={[{ required: true, message: '请输入商品金额' }]}>
              <InputNumber min={0} precision={2} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item label="收货地区" name="region" rules={[{ required: true, message: '请输入收货地区' }]}>
              <Input style={{ width: 260 }} placeholder="如：广东省 广州市 天河区" />
            </Form.Item>
            <Form.Item label="商品件数" name="quantity">
              <InputNumber min={1} style={{ width: 140 }} />
            </Form.Item>
          </Space>
          <Button type="primary" icon={<CalculatorOutlined />} loading={submitting} onClick={handleSubmit}>
            开始试算
          </Button>
        </Form>
      </Card>

      {result ? (
        <Card title="试算结果" style={{ marginTop: 16 }}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="运费模板">{result.template_name || '—'}</Descriptions.Item>
            <Descriptions.Item label="是否包邮">
              {result.free ? <Tag color="success">满足包邮</Tag> : <Tag color="warning">收取运费</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="应收运费">
              <strong>{formatYuan(result.freight_cents)}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="包邮门槛">
              {formatYuan(result.free_freight_amount_cents)}
            </Descriptions.Item>
            <Descriptions.Item label="说明" span={2}>
              {result.remark || '—'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ) : null}

      <Card title="已配置的配送范围" style={{ marginTop: 16 }}>
        <Space direction="vertical" size={4} style={{ display: 'flex', width: '100%' }}>
          {(rangesQuery.data?.ranges ?? []).slice(0, 8).map((range) => (
            <span key={range.id}>
              {range.template_name} · {range.regions} · 运费 {formatYuan(range.freight_cents)} · 满{' '}
              {formatYuan(range.free_freight_amount_cents)} 包邮
            </span>
          ))}
          {(rangesQuery.data?.ranges ?? []).length === 0 ? (
            <span style={{ opacity: 0.65 }}>暂无配送范围配置，请先在「配送范围」页面维护。</span>
          ) : null}
        </Space>
      </Card>
    </PageContainer>
  )
}
