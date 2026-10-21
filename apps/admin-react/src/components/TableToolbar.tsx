/**
 * 表格工具条：左侧标题/说明，右侧操作区
 */
import type { ReactNode } from 'react'
import { Space, Typography } from 'antd'

interface TableToolbarProps {
  title?: ReactNode
  description?: ReactNode
  extra?: ReactNode
}

/** 表格工具条 */
export default function TableToolbar({ title, description, extra }: TableToolbarProps) {
  return (
    <div className="table-toolbar">
      <div className="table-toolbar__left">
        {title ? (
          <Typography.Text strong style={{ fontSize: 15 }}>
            {title}
          </Typography.Text>
        ) : null}
        {description ? <Typography.Text type="secondary">{description}</Typography.Text> : null}
      </div>
      {extra ? (
        <Space wrap className="table-toolbar__extra">
          {extra}
        </Space>
      ) : null}
    </div>
  )
}
