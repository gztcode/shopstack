/**
 * 出库单详情
 */
import { Card, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getOutboundOrder } from '@/api/inventory'
import { formatDateTime, formatNumber } from '@/utils/format'
import { OUTBOUND_STATUS_OPTIONS } from '@/utils/resourceOptions'
import type { OutboundOrder, StockMoveItem } from '@/types'
import ResourceDetail from '@/components/ResourceDetail'

const itemColumns: ColumnsType<StockMoveItem> = [
  { title: 'SKU ID', dataIndex: 'sku_id', width: 110, align: 'right' },
  { title: 'SKU 编码', dataIndex: 'sku_code', width: 170 },
  { title: '规格', dataIndex: 'spec_text', width: 200 },
  {
    title: '数量',
    dataIndex: 'quantity',
    width: 100,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
]

/** 出库单详情页 */
export default function OutboundOrderDetail() {
  return (
    <ResourceDetail<OutboundOrder>
      title="出库单详情"
      description="查看单张出库单关联的订单与出库明细"
      fetcher={getOutboundOrder}
      queryKey="outbound-order-detail"
      backTo="/outbound-orders"
      fields={[
        { label: '出库单号', render: (data) => data.outbound_no ?? '—' },
        { label: '仓库', render: (data) => data.warehouse_name ?? '—' },
        { label: '关联订单', render: (data) => data.order_no ?? '—' },
        { label: '出库数量', render: (data) => formatNumber(data.total_quantity ?? 0) },
        {
          label: '状态',
          render: (data) =>
            OUTBOUND_STATUS_OPTIONS.find((item) => item.value === data.status)?.label ?? '-',
        },
        { label: '操作人', render: (data) => data.operator ?? '—' },
        { label: '创建时间', render: (data) => formatDateTime(data.created_at) },
        { label: '备注', render: (data) => data.remark ?? '—' },
      ]}
    >
      {(data) => (
        <Card title="出库明细">
          <Table<StockMoveItem>
            rowKey="sku_id"
            columns={itemColumns}
            dataSource={data.items ?? []}
            pagination={false}
            locale={{ emptyText: '暂无出库明细' }}
            scroll={{ x: 'max-content' }}
          />
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            共 {formatNumber(data.total_quantity ?? 0)} 件商品完成出库。
          </Typography.Paragraph>
        </Card>
      )}
    </ResourceDetail>
  )
}
