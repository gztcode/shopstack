/**
 * 404 页面
 */
import { useNavigate } from 'react-router-dom'
import { Button, Result } from 'antd'

/** 404 页面 */
export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="app-layout">
      <Result
        status="404"
        title="404"
        subTitle="页面不存在或已被移除。"
        extra={
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            返回首页
          </Button>
        }
      />
    </div>
  )
}
