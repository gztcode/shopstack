/**
 * 入库单详情
 */
import { Card, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getInboundOrder } from '@/api/inventory'
import { formatDateTime, formatNumber } from '@/utils/format'
import { INBOUND_STATUS_OPTIONS } from '@/utils/resourceOptions'
import type { InboundOrder, StockMoveItem } from '@/types'
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

/** 入库单详情页 */
export default function InboundOrderDetail() {
  return (
    <ResourceDetail<InboundOrder>
      title="入库单详情"
      description="查看单张入库单的供应商、数量与明细"
      fetcher={getInboundOrder}
      queryKey="inbound-order-detail"
      backTo="/inbound-orders"
      fields={[
        { label: '入库单号', render: (data) => data.inbound_no ?? '—' },
        { label: '仓库', render: (data) => data.warehouse_name ?? '—' },
        { label: '供应商', render: (data) => data.supplier ?? '—' },
        { label: '入库数量', render: (data) => formatNumber(data.total_quantity ?? 0) },
        {
          label: '状态',
          render: (data) =>
            INBOUND_STATUS_OPTIONS.find((item) => item.value === data.status)?.label ?? '-',
        },
        { label: '操作人', render: (data) => data.operator ?? '—' },
        { label: '创建时间', render: (data) => formatDateTime(data.created_at) },
        { label: '备注', render: (data) => data.remark ?? '—' },
      ]}
    >
      {(data) => (
        <Card title="入库明细">
          <Table<StockMoveItem>
            rowKey="sku_id"
            columns={itemColumns}
            dataSource={data.items ?? []}
            pagination={false}
            locale={{ emptyText: '暂无入库明细' }}
            scroll={{ x: 'max-content' }}
          />
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            共 {formatNumber(data.total_quantity ?? 0)} 件商品完成入库。
          </Typography.Paragraph>
        </Card>
      )}
    </ResourceDetail>
  )
}
