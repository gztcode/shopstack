/**
 * 演示数据模式提示：后端不可用时展示降级原因
 */
import { Alert, Button, Space } from 'antd'
import { ExperimentOutlined } from '@ant-design/icons'
import { useMockStore } from '@/store/mock'

interface DemoModeAlertProps {
  /** 点击「重试」时重新拉取数据 */
  onRetry?: () => void
}

/** 演示数据模式提示条 */
export default function DemoModeAlert({ onRetry }: DemoModeAlertProps) {
  const isMock = useMockStore((state) => state.isMock)
  const reasons = useMockStore((state) => state.reasons)

  if (!isMock) return null

  return (
    <Alert
      className="demo-mode-alert"
      type="warning"
      showIcon
      icon={<ExperimentOutlined />}
      message="演示数据模式"
      description={
        <Space direction="vertical" size={2}>
          <span>后端服务暂不可用，当前展示的是内置演示数据，相关写操作不会持久化。</span>
          {reasons.length ? (
            <span style={{ fontSize: 12, opacity: 0.75 }}>
              最近降级原因：{reasons.slice(-3).join('；')}
            </span>
          ) : null}
        </Space>
      }
      action={
        onRetry ? (
          <Button size="small" onClick={onRetry}>
            重试连接
          </Button>
        ) : undefined
      }
    />
  )
}
