/**
 * 物流轨迹查询
 */
import { useState } from 'react'
import { Button, Card, Col, Descriptions, Empty, Form, InputNumber, Row, Space, Steps, Table, Tag, Timeline, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { listTracks } from '@/api/track'
import { useApiQuery } from '@/hooks/useApi'
import { formatDateTime, formatYuan } from '@/utils/format'
import type { ShipmentTrack } from '@/types'
import PageContainer from '@/components/PageContainer'
import StatusTag from '@/components/StatusTag'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { useMessage } from '@/hooks/useMessage'

/** 物流轨迹查询页 */
export default function LogisticsTrack() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const [orderId, setOrderId] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState<number | null>(null)
  const [searching, setSearching] = useState(false)

  const tracksQuery = useApiQuery(
    ['logistics', 'tracks', orderId],
    () => listTracks(orderId!),
    { enabled: !!orderId },
  )

  // 轨迹接口一次返回发货单与轨迹列表（ListShipmentTracksResponse）
  const shipment = tracksQuery.data?.shipment
  const tracks = tracksQuery.data?.tracks ?? []

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['logistics'] })
  }

  const handleSearch = async () => {
    if (!inputValue) {
      message.warning('请输入订单 ID')
      return
    }
    setSearching(true)
    try {
      setOrderId(inputValue)
      message.success('正在查询物流轨迹')
    } finally {
      setSearching(false)
    }
  }

  const columns: ColumnsType<ShipmentTrack> = [
    {
      title: '时间',
      dataIndex: 'occurred_at',
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '节点',
      dataIndex: 'location',
      width: 180,
      render: (value: string) => value || '—',
    },
    {
      title: '轨迹描述',
      dataIndex: 'description',
      render: (value: string) => value || '—',
    },
    {
      title: '运单号',
      dataIndex: 'tracking_no',
      width: 190,
      render: (value: string) => (
        <Typography.Text style={{ fontFamily: 'monospace', fontSize: 12 }} copyable>
          {value}
        </Typography.Text>
      ),
    },
  ]

  return (
    <PageContainer title="物流轨迹查询" description="按订单 ID 查询承运商、运单号与配送轨迹">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <Form
          layout="inline"
          onFinish={handleSearch}
          style={{ marginBottom: 16 }}
        >
          <Form.Item label="订单 ID" name="order_id">
            <InputNumber
              min={1}
              placeholder="请输入订单 ID"
              style={{ width: 200 }}
              value={inputValue ?? undefined}
              onChange={(value) => setInputValue(value ?? null)}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={searching}>
                查询轨迹
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setOrderId(null)
                  setInputValue(null)
                }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {!orderId ? (
          <Empty description="请输入订单 ID 后查询物流轨迹" />
        ) : (
          <Row gutter={16}>
            <Col xs={24} lg={10}>
              <Card title="发货单信息" size="small" variant="outlined">
                {shipment ? (
                  <Descriptions bordered size="small" column={1}>
                    <Descriptions.Item label="承运商">{shipment.company}</Descriptions.Item>
                    <Descriptions.Item label="运单号">
                      <Typography.Text
                        style={{ fontFamily: 'monospace', fontSize: 12 }}
                        copyable={{ text: shipment.tracking_no }}
                      >
                        {shipment.tracking_no}
                      </Typography.Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="状态">
                      <StatusTag status={shipment.status} />
                    </Descriptions.Item>
                    <Descriptions.Item label="收货人">
                      {shipment.receiver} {shipment.phone}
                    </Descriptions.Item>
                    <Descriptions.Item label="收货地址">{shipment.address}</Descriptions.Item>
                    <Descriptions.Item label="件数">{shipment.item_count}</Descriptions.Item>
                    <Descriptions.Item label="运费">
                      {formatYuan(shipment.freight_cents)}
                    </Descriptions.Item>
                    <Descriptions.Item label="发货时间">
                      {formatDateTime(shipment.shipped_at)}
                    </Descriptions.Item>
                    <Descriptions.Item label="签收时间">
                      {formatDateTime(shipment.delivered_at)}
                    </Descriptions.Item>
                    <Descriptions.Item label="备注">{shipment.remark || '—'}</Descriptions.Item>
                  </Descriptions>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={tracksQuery.isLoading ? '加载中…' : '该订单暂无发货单'}
                  />
                )}
              </Card>
            </Col>

            <Col xs={24} lg={14}>
              <Card title="配送进度" size="small" variant="outlined">
                {tracks.length > 0 ? (
                  <Steps
                    direction="vertical"
                    current={tracks.length - 1}
                    items={tracks.map((track) => ({
                      title: track.location || '物流节点',
                      description: (
                        <div>
                          <div>{track.description}</div>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {formatDateTime(track.occurred_at)}
                          </Typography.Text>
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <Empty description={tracksQuery.isLoading ? '加载中…' : '该订单暂无轨迹信息'} />
                )}
              </Card>
            </Col>
          </Row>
        )}
      </Card>

      {orderId ? (
        <Card variant="outlined" className="dashboard-row">
          <TableToolbar
            title="轨迹明细"
            description={`订单 ${orderId} 共 ${tracks.length} 条轨迹`}
            extra={
              <Button icon={<ReloadOutlined />} onClick={refresh}>
                刷新
              </Button>
            }
          />
          <Table<ShipmentTrack>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={tracks}
            loading={tracksQuery.isLoading || tracksQuery.isFetching}
            scroll={{ x: 800 }}
            locale={{ emptyText: '暂无轨迹明细' }}
            pagination={false}
          />
        </Card>
      ) : null}

      {shipment ? (
        <Card variant="outlined">
          <Space size={4} wrap>
            <Tag color="blue">订单 {shipment.order_no}</Tag>
            <Tag color="cyan">承运商 {shipment.company}</Tag>
            <Tag>运单 {shipment.tracking_no}</Tag>
          </Space>
          <div style={{ marginTop: 12 }}>
            <Timeline
              items={tracks.slice(-3).map((track) => ({
                children: (
                  <div>
                    <Typography.Text>{track.description}</Typography.Text>
                    <div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDateTime(track.occurred_at)} · {track.location}
                      </Typography.Text>
                    </div>
                  </div>
                ),
              }))}
            />
          </div>
        </Card>
      ) : null}
    </PageContainer>
  )
}
