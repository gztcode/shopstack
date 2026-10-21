/**
 * 问答回复 —— 针对单条商品提问填写商家回复
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, Form, Input, Select, Space, Typography } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { answerQuestion, listQuestions } from '@/api/product'
import { useApiQuery } from '@/hooks/useApi'
import { useMessage } from '@/hooks/useMessage'
import { formatDateTime } from '@/utils/format'
import { validateForm } from '@/utils/form'
import PageContainer from '@/components/PageContainer'
import DemoModeAlert from '@/components/DemoModeAlert'
import { useQueryClient } from '@tanstack/react-query'

/** 问答回复页 */
export default function QuestionAnswer() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [form] = Form.useForm<{ reply: string }>()
  const [submitting, setSubmitting] = useState(false)
  const [selectedId, setSelectedId] = useState<number | undefined>(
    searchParams.get('id') ? Number(searchParams.get('id')) : undefined,
  )

  const questionsQuery = useApiQuery(['questions', 'answer'], () =>
    listQuestions({ page_size: 100 }),
  )
  const questions = useMemo(() => questionsQuery.data?.questions ?? [], [questionsQuery.data])

  const current = useMemo(
    () => questions.find((item) => item.id === selectedId),
    [questions, selectedId],
  )

  useEffect(() => {
    if (current?.reply) form.setFieldsValue({ reply: current.reply })
  }, [current, form])

  const handleSubmit = async () => {
    if (!current) {
      message.warning('请先选择需要回复的提问')
      return
    }
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      await answerQuestion(current.id, values.reply)
      message.success('回复已提交')
      queryClient.invalidateQueries({ queryKey: ['questions'] })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '回复失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer
      title="问答回复"
      description="选择一条商品提问并填写对外展示的商家回复"
      extra={
        <Button type="primary" icon={<SendOutlined />} loading={submitting} onClick={handleSubmit}>
          提交回复
        </Button>
      }
    >
      <DemoModeAlert onRetry={() => questionsQuery.refetch()} />

      <Card title="选择提问">
        <Form layout="vertical">
          <Form.Item label="商品提问" name="question_id">
            <Select
              showSearch
              allowClear
              value={selectedId}
              placeholder="请选择需要回复的提问"
              optionFilterProp="label"
              onChange={(value) => setSelectedId(value)}
              options={questions.map((item) => ({
                value: item.id,
                label: `#${item.id} ${item.product_title} · ${item.content}`,
              }))}
            />
          </Form.Item>
        </Form>
      </Card>

      {current ? (
        <Card title="提问详情" style={{ marginTop: 16 }}>
          <Space direction="vertical" size={8} style={{ display: 'flex', width: '100%' }}>
            <Typography.Text strong>{current.product_title}</Typography.Text>
            <Typography.Paragraph style={{ marginBottom: 0 }}>{current.content}</Typography.Paragraph>
            <Typography.Text type="secondary">
              提问人：{current.user_nickname || '匿名用户'} · 提问时间：
              {formatDateTime(current.created_at)}
            </Typography.Text>
            {current.reply ? (
              <Typography.Text type="secondary">
                已回复：{current.reply}（{formatDateTime(current.reply_at)}）
              </Typography.Text>
            ) : null}
          </Space>
        </Card>
      ) : null}

      <Card title="回复内容" style={{ marginTop: 16 }}>
        <Form form={form} layout="vertical">
          <Form.Item
            label="回复文案"
            name="reply"
            rules={[{ required: true, message: '请填写回复内容' }, { min: 2, message: '回复内容太短' }]}
          >
            <Input.TextArea rows={5} maxLength={500} showCount placeholder="请填写对用户可见的回复内容" />
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  )
}
