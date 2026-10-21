/**
 * 签到配置 —— 维护用户端签到活动的规则参数
 */
import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, InputNumber, Space, Switch, Typography } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { getSignInConfig, saveSignInConfig } from '@/api/marketing'
import { useApiQuery } from '@/hooks/useApi'
import { useMessage } from '@/hooks/useMessage'
import { formatDateTime } from '@/utils/format'
import { validateForm } from '@/utils/form'
import PageContainer from '@/components/PageContainer'
import DemoModeAlert from '@/components/DemoModeAlert'

interface SignInFormValues {
  enabled: boolean
  continuous_days_required: number
  points_awarded: number
  continuous_step: number
  max_points: number
  calendar_days: number
  description: string
}

/** 签到配置页 */
export default function SignInConfig() {
  const message = useMessage()
  const [form] = Form.useForm<SignInFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const configQuery = useApiQuery(['sign-in-config'], () => getSignInConfig())

  useEffect(() => {
    const config = configQuery.data
    if (!config) return
    form.setFieldsValue({
      enabled: config.enabled,
      continuous_days_required: config.continuous_days_required,
      points_awarded: config.points_awarded,
      continuous_step: config.continuous_step,
      max_points: config.max_points,
      calendar_days: config.calendar_days,
      description: config.description,
    })
  }, [configQuery.data, form])

  const handleSubmit = async () => {
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      await saveSignInConfig(values)
      message.success('签到配置已保存')
      configQuery.refetch()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer
      title="签到配置"
      description="配置用户端每日签到的积分奖励与连续签到规则"
      extra={
        <Button type="primary" icon={<SaveOutlined />} loading={submitting} onClick={handleSubmit}>
          保存配置
        </Button>
      }
    >
      <DemoModeAlert onRetry={() => configQuery.refetch()} />

      <Card
        title="签到规则"
        extra={
          <Typography.Text type="secondary">
            最近更新：{formatDateTime(configQuery.data?.updated_at)}
          </Typography.Text>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item label="是否开启签到" name="enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Space size={16} style={{ display: 'flex', flexWrap: 'wrap' }}>
            <Form.Item
              label="连续签到奖励所需天数"
              name="continuous_days_required"
              rules={[{ required: true, message: '请填写连续签到天数' }]}
            >
              <InputNumber min={1} max={30} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item
              label="每日签到积分"
              name="points_awarded"
              rules={[{ required: true, message: '请填写签到积分' }]}
            >
              <InputNumber min={0} max={9999} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item
              label="连续签到每日额外积分"
              name="continuous_step"
              rules={[{ required: true, message: '请填写连续签到额外积分' }]}
            >
              <InputNumber min={0} max={999} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item
              label="单次签到积分上限"
              name="max_points"
              rules={[{ required: true, message: '请填写单次积分上限' }]}
            >
              <InputNumber min={1} max={9999} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item
              label="签到日历展示天数"
              name="calendar_days"
              rules={[{ required: true, message: '请填写日历天数' }]}
            >
              <InputNumber min={7} max={62} style={{ width: 200 }} />
            </Form.Item>
          </Space>
          <Form.Item label="规则说明" name="description">
            <Input.TextArea rows={3} maxLength={200} showCount placeholder="展示给用户的签到规则说明" />
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  )
}
