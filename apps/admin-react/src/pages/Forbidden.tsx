/**
 * 403 无权限
 */
import { useNavigate } from 'react-router-dom'
import { Button, Result } from 'antd'

/** 403 页面 */
export default function Forbidden() {
  const navigate = useNavigate()
  return (
    <div className="app-layout">
      <Result
        status="403"
        title="403"
        subTitle="抱歉，你没有访问该页面的权限，请联系管理员分配角色权限。"
        extra={
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            返回首页
          </Button>
        }
      />
    </div>
  )
}
