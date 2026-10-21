/**
 * 统计卡片
 */
import type { ReactNode } from 'react'
import { Card, Skeleton, Statistic } from 'antd'

interface StatCardProps {
  title: string
  value: number | string
  precision?: number
  prefix?: ReactNode
  suffix?: ReactNode
  icon?: ReactNode
  hint?: ReactNode
  loading?: boolean
  /** 数值区配色 */
  accent?: string
}

/** 统计卡片 */
export default function StatCard({
  title,
  value,
  precision,
  prefix,
  suffix,
  icon,
  hint,
  loading,
  accent,
}: StatCardProps) {
  return (
    <Card className="stat-card" variant="outlined">
      {loading ? (
        <Skeleton active paragraph={{ rows: 1 }} title={false} />
      ) : (
        <>
          <div className="stat-card__top">
            <span className="stat-card__title">{title}</span>
            {icon ? <span className="stat-card__icon">{icon}</span> : null}
          </div>
          <Statistic
            value={value}
            precision={precision}
            prefix={prefix}
            suffix={suffix}
            valueStyle={accent ? { color: accent } : undefined}
          />
          {hint ? <div className="stat-card__hint">{hint}</div> : null}
        </>
      )}
    </Card>
  )
}
