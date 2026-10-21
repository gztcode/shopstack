/**
 * 登录页
 */
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd'
import { LockOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons'
import { adminLogin } from '@/api/admin'
import { useAuthStore } from '@/store/auth'
import { useMockStore } from '@/store/mock'

interface LoginFormValues {
  username: string
  password: string
}

/** 登录页 */
export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form] = Form.useForm<LoginFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const setSession = useAuthStore((state) => state.setSession)
  const accessToken = useAuthStore((state) => state.accessToken)
  const resetMock = useMockStore((state) => state.reset)

  useEffect(() => {
    if (accessToken) {
      navigate('/dashboard', { replace: true })
    }
  }, [accessToken, navigate])

  const handleFinish = async (values: LoginFormValues) => {
    setSubmitting(true)
    setErrorMessage('')
    try {
      const result = await adminLogin(values.username.trim(), values.password)
      setSession(result)
      resetMock()
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__brand">
        <ShopOutlined className="login-page__logo" />
        <Typography.Title level={2} className="login-page__title">
          ShopStack 电商中台
        </Typography.Title>
        <Typography.Paragraph className="login-page__slogan">
          运营管理控制台 · 商品 / 订单 / 营销 / 物流 一体化
        </Typography.Paragraph>
      </div>

      <Card className="login-card" variant="outlined">
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          账号登录
        </Typography.Title>

        {errorMessage ? (
          <Alert
            type="error"
            showIcon
            message={errorMessage}
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setErrorMessage('')}
          />
        ) : null}

        <Form<LoginFormValues>
          form={form}
          layout="vertical"
          size="large"
          initialValues={{ username: 'admin', password: '' }}
          onFinish={handleFinish}
        >
          <Form.Item
            label="账号"
            name="username"
            rules={[{ required: true, message: '请输入账号' }, { min: 2, message: '账号至少 2 位' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入账号" autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少 6 位' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 12 }}>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              登录
            </Button>
          </Form.Item>
        </Form>

        <Space direction="vertical" size={4} className="login-card__tips">
          <Typography.Text type="secondary">演示账号：admin / admin123456</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            后端未启动时将自动切换到「演示数据模式」，可完整体验后台功能。
          </Typography.Text>
        </Space>
      </Card>
    </div>
  )
}
