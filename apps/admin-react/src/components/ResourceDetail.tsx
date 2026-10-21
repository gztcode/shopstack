/**
 * 通用详情页 —— 参数化的单据 / 实体详情展示
 *
 * 售后详情、拼团详情、入库单详情、盘点单详情等页面共用本组件，
 * 差异仅在于「展示字段」与「附加内容」。
 */
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, Descriptions, Result, Space, Spin, Typography } from 'antd'
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { useApiQuery } from '@/hooks/useApi'
import DemoModeAlert from './DemoModeAlert'

/** 详情字段描述 */
export interface ResourceDetailField<T> {
  label: string
  render: (data: T) => ReactNode
  span?: number
}

export interface ResourceDetailProps<T> {
  title: string
  description?: string
  /** 记录 id，缺省时从查询参数 id 读取 */
  id?: number
  /** 详情请求 */
  fetcher: (id: number) => Promise<T>
  /** 展示字段 */
  fields: ResourceDetailField<T>[]
  /** 附加内容（明细表格、图表等），可以是 (data) => ReactNode */
  children?: ReactNode | ((data: T) => ReactNode)
  /** 顶部操作区 */
  extra?: ReactNode
  /** 返回按钮 */
  backTo?: string
  /** react-query key */
  queryKey?: string
}

/** 通用详情页 */
export default function ResourceDetail<T>({
  title,
  description,
  id,
  fetcher,
  fields,
  children,
  extra,
  backTo,
  queryKey = 'resource-detail',
}: ResourceDetailProps<T>) {
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const recordId = id ?? Number(searchParams.get('id') ?? 0)
  const valid = Number.isFinite(recordId) && recordId > 0

  const query = useApiQuery([queryKey, recordId], () => fetcher(recordId), {
    enabled: valid,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: [queryKey] })

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
        <div className="page-container__extra">
          <Space>
            {backTo ? (
              <Button icon={<ArrowLeftOutlined />} href={backTo}>
                返回列表
              </Button>
            ) : null}
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
            </Button>
            {extra}
          </Space>
        </div>
      </div>

      <div className="page-container__body">
        <DemoModeAlert onRetry={refresh} />

        {!valid ? (
          <Card>
            <Result
              status="warning"
              title="缺少记录标识"
              subTitle="请从列表页进入本页面，URL 中需要携带 id 参数。"
              extra={
                backTo ? (
                  <Button type="primary" href={backTo}>
                    返回列表
                  </Button>
                ) : null
              }
            />
          </Card>
        ) : null}

        {valid ? (
          <Spin spinning={query.isLoading}>
            <Space direction="vertical" size={16} style={{ display: 'flex', width: '100%' }}>
              <Card title="基本信息">
                <Descriptions bordered column={2} size="small">
                  {fields.map((field) => (
                    <Descriptions.Item key={field.label} label={field.label} span={field.span ?? 1}>
                      {field.render((query.data as T) ?? ({} as T))}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </Card>
              {typeof children === 'function' ? (children as (data: T) => ReactNode)(query.data as T) : children}
            </Space>
          </Spin>
        ) : null}
      </div>
    </div>
  )
}
