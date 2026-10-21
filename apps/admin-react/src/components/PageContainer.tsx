/**
 * 页面容器：统一标题区 + 内容卡片
 */
import type { ReactNode } from 'react'
import { Typography } from 'antd'

interface PageContainerProps {
  title: ReactNode
  description?: ReactNode
  extra?: ReactNode
  children: ReactNode
}

/** 页面容器 */
export default function PageContainer({ title, description, extra, children }: PageContainerProps) {
  return (
    <div className="page-container">
      <div className="page-container__header">
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          {description ? (
            <Typography.Text type="secondary" className="page-container__desc">
              {description}
            </Typography.Text>
          ) : null}
        </div>
        {extra ? <div className="page-container__extra">{extra}</div> : null}
      </div>
      <div className="page-container__body">{children}</div>
    </div>
  )
}
