/**
 * 反馈处理
 */
import { useState } from 'react'
import { Button, Card, Form, Input, Select, Space, Tag, Typography } from 'antd'
import { listFeedbacks, setFeedbackStatus } from '@/api/user'
import { useApiQuery } from '@/hooks/useApi'
import { useMessage } from '@/hooks/useMessage'
import { formatDateTime } from '@/utils/format'
import { validateForm } from '@/utils/form'
import { FEEDBACK_STATUS_OPTIONS, FEEDBACK_TYPE_OPTIONS } from '@/utils/resourceOptions'
import PageContainer from '@/components/PageContainer'
import DemoModeAlert from '@/components/DemoModeAlert'

/** 反馈处理页 */
export default function FeedbackDetail() {
  const message = useMessage()
  const [form] = Form.useForm<{ status: number; reply: string }>()
  const [submitting, setSubmitting] = useState(false)
  const [currentId, setCurrentId] = useState<number | undefined>(undefined)

  const feedbacksQuery = useApiQuery(['feedbacks', 'detail'], () => listFeedbacks({ page_size: 100 }))
  const feedbacks = feedbacksQuery.data?.feedbacks ?? []
  const current = feedbacks.find((item) => item.id === currentId)

  const handleSubmit = async () => {
    if (!current) {
      message.warning('请先选择需要处理的反馈')
      return
    }
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      await setFeedbackStatus(current.id, values.status, values.reply ?? '')
      message.success('反馈处理结果已保存')
      feedbacksQuery.refetch()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '处理失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer
      title="反馈处理"
      description="选择一条用户反馈并填写处理结果"
      extra={
        <Button type="primary" loading={submitting} onClick={handleSubmit}>
          提交处理结果
        </Button>
      }
    >
      <DemoModeAlert onRetry={() => feedbacksQuery.refetch()} />

      <Card title="选择反馈">
        <Form layout="vertical">
          <Form.Item label="用户反馈" name="feedback_id">
            <Select
              showSearch
              allowClear
              value={currentId}
              placeholder="请选择需要处理的反馈"
              optionFilterProp="label"
              onChange={(value) => setCurrentId(value)}
              options={feedbacks.map((item) => ({
                value: item.id,
                label: `#${item.id} ${item.user_nickname || '匿名用户'} · ${item.content}`,
              }))}
            />
          </Form.Item>
        </Form>
      </Card>

      {current ? (
        <Card title="反馈详情" style={{ marginTop: 16 }}>
          <Space direction="vertical" size={8} style={{ display: 'flex', width: '100%' }}>
            <Space size={8}>
              <Tag>{FEEDBACK_TYPE_OPTIONS.find((item) => item.value === current.type)?.label ?? '其他'}</Tag>
              <Tag color={current.status === 0 ? 'warning' : 'default'}>
                {FEEDBACK_STATUS_OPTIONS.find((item) => item.value === current.status)?.label ?? '-'}
              </Tag>
            </Space>
            <Typography.Paragraph style={{ marginBottom: 0 }}>{current.content}</Typography.Paragraph>
            <Typography.Text type="secondary">
              联系方式：{current.contact || '未留联系方式'} · 提交时间：{formatDateTime(current.created_at)}
            </Typography.Text>
            {current.reply ? (
              <Typography.Text type="secondary">已回复：{current.reply}</Typography.Text>
            ) : null}
          </Space>
        </Card>
      ) : null}

      <Card title="处理结果" style={{ marginTop: 16 }}>
        <Form form={form} layout="vertical" initialValues={{ status: 2, reply: '' }}>
          <Form.Item label="处理状态" name="status">
            <Select style={{ width: 220 }} options={FEEDBACK_STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item label="回复内容" name="reply">
            <Input.TextArea rows={4} maxLength={300} showCount placeholder="填写对用户的回复" />
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  )
}
