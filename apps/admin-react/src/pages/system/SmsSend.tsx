/**
 * 短信发送台
 */
import { useMemo, useState } from 'react'
import { Alert, Button, Card, Col, Form, Input, Row, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, SendOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { listSmsRecords, sendSms } from '@/api/notification'
import { useApiQuery } from '@/hooks/useApi'
import { formatDateTime, formatNumber } from '@/utils/format'
import { validateForm } from '@/utils/form'
import type { ListSmsRecordsParams, SmsRecord, SendSmsResponse } from '@/types'
import PageContainer from '@/components/PageContainer'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { useMessage } from '@/hooks/useMessage'

/** 短信场景 */
const SCENE_OPTIONS = [
  { value: 'login', label: '登录验证码' },
  { value: 'register', label: '注册验证码' },
  { value: 'reset_password', label: '重置密码' },
  { value: 'bind_phone', label: '绑定手机号' },
  { value: 'order_pay', label: '支付通知' },
]

interface SendFormValues {
  phone: string
  scene: string
}

/** 短信发送台 */
export default function SmsConsole() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<SendFormValues>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SendSmsResponse | null>(null)

  const queryParams = useMemo<ListSmsRecordsParams>(
    () => ({ page, page_size: pageSize }),
    [page, pageSize],
  )

  const recordsQuery = useApiQuery(['sms-records', queryParams], () => listSmsRecords(queryParams))

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['sms-records'] })

  const handleSend = async () => {
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      const response = await sendSms({ phone: values.phone.trim(), scene: values.scene })
      setResult(response)
      if (response.success) {
        message.success('短信已发送')
        refresh()
      } else {
        message.error('短信发送失败')
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '发送失败')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnsType<SmsRecord> = [
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 150,
      render: (value: string) => (
        <Typography.Text style={{ fontFamily: 'monospace' }}>{value}</Typography.Text>
      ),
    },
    {
      title: '验证码',
      dataIndex: 'code',
      width: 120,
      render: (value: string) => (
        <Typography.Text style={{ fontFamily: 'monospace' }}>{value}</Typography.Text>
      ),
    },
    {
      title: '场景',
      dataIndex: 'scene',
      width: 140,
      render: (value: string) => {
        const option = SCENE_OPTIONS.find((item) => item.value === value)
        return option?.label ?? value
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (value: number) => (
        <Tag color={value === 1 ? 'success' : value === 2 ? 'error' : 'default'}>
          {value === 1 ? '发送成功' : value === 2 ? '发送失败' : '待发送'}
        </Tag>
      ),
    },
    {
      title: '发送次数',
      dataIndex: 'send_count',
      width: 100,
      align: 'right',
    },
    {
      title: '错误信息',
      dataIndex: 'error_message',
      render: (value: string) =>
        value ? <Typography.Text type="danger">{value}</Typography.Text> : '—',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
  ]

  return (
    <PageContainer title="短信发送台" description="手动下发短信验证码并查看发送记录">
      <DemoModeAlert onRetry={refresh} />

      <Row gutter={[16, 16]} className="dashboard-row">
        <Col xs={24} lg={10}>
          <Card title="发送短信" variant="outlined">
            <Form
              form={form}
              layout="vertical"
              initialValues={{ phone: '', scene: 'login' }}
              onFinish={handleSend}
            >
              <Form.Item
                label="手机号"
                name="phone"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
                ]}
              >
                <Input placeholder="13800138000" maxLength={11} />
              </Form.Item>
              <Form.Item
                label="短信场景"
                name="scene"
                rules={[{ required: true, message: '请选择短信场景' }]}
              >
                <Select options={SCENE_OPTIONS} />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SendOutlined />}
                  loading={submitting}
                  block
                >
                  立即发送
                </Button>
              </Form.Item>
            </Form>

            {result ? (
              <Alert
                type={result.success ? 'success' : 'error'}
                showIcon
                message={result.success ? '短信发送成功' : '短信发送失败'}
                description={
                  result.success ? (
                    <Space direction="vertical" size={2}>
                      <span>
                        验证码：<Typography.Text code>{result.code || '（未返回）'}</Typography.Text>
                      </span>
                      <span>有效期：{result.expire_seconds} 秒</span>
                    </Space>
                  ) : (
                    undefined
                  )
                }
              />
            ) : null}
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card variant="outlined">
            <TableToolbar
              title="发送记录"
              description={`共 ${formatNumber(recordsQuery.data?.meta.total ?? 0)} 条`}
              extra={
                <Button icon={<ReloadOutlined />} onClick={refresh}>
                  刷新
                </Button>
              }
            />
            <Table<SmsRecord>
              rowKey="id"
              size="small"
              columns={columns}
              dataSource={recordsQuery.data?.records ?? []}
              loading={recordsQuery.isLoading || recordsQuery.isFetching}
              scroll={{ x: 880 }}
              locale={{ emptyText: '暂无发送记录' }}
              pagination={{
                current: page,
                pageSize,
                total: recordsQuery.data?.meta.total ?? 0,
                showSizeChanger: true,
                showTotal: (total) => `共 ${formatNumber(total)} 条`,
                onChange: (nextPage, nextSize) => {
                  setPage(nextPage)
                  setPageSize(nextSize)
                },
              }}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  )
}
