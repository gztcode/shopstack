/**
 * 盘点单详情
 */
import { Card, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getStockCheck } from '@/api/inventory'
import { formatDateTime, formatNumber } from '@/utils/format'
import { STOCK_CHECK_STATUS_OPTIONS } from '@/utils/resourceOptions'
import type { StockCheckDetail as StockCheckDetailData, StockCheckItem } from '@/types'
import ResourceDetail from '@/components/ResourceDetail'
import { tokens } from '@/theme'

const itemColumns: ColumnsType<StockCheckItem> = [
  { title: 'SKU ID', dataIndex: 'sku_id', width: 110, align: 'right' },
  { title: 'SKU 编码', dataIndex: 'sku_code', width: 170 },
  { title: '规格', dataIndex: 'spec_text', width: 200 },
  {
    title: '账面数量',
    dataIndex: 'book_quantity',
    width: 110,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  {
    title: '实盘数量',
    dataIndex: 'actual_quantity',
    width: 110,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  {
    title: '差异',
    dataIndex: 'diff_quantity',
    width: 100,
    align: 'right',
    render: (value) => {
      const diff = Number(value ?? 0)
      return <span style={{ color: diff !== 0 ? tokens.colorError : undefined }}>{formatNumber(diff)}</span>
    },
  },
]

/** 盘点单详情页 */
export default function StockCheckDetail() {
  return (
    <ResourceDetail<StockCheckDetailData>
      title="盘点单详情"
      description="查看盘点任务概况与账实差异明细"
      fetcher={getStockCheck}
      queryKey="stock-check-detail"
      backTo="/stock-checks"
      fields={[
        { label: '盘点单号', render: (data) => data.stock_check?.check_no ?? '—' },
        { label: '仓库', render: (data) => data.stock_check?.warehouse_name ?? '—' },
        {
          label: '状态',
          render: (data) =>
            STOCK_CHECK_STATUS_OPTIONS.find((item) => item.value === data.stock_check?.status)?.label ?? '-',
        },
        {
          label: '盘点商品数',
          render: (data) => formatNumber(data.stock_check?.total_count ?? 0),
        },
        {
          label: '差异数',
          render: (data) => formatNumber(data.stock_check?.diff_count ?? 0),
        },
        { label: '操作人', render: (data) => data.stock_check?.operator ?? '—' },
        { label: '创建时间', render: (data) => formatDateTime(data.stock_check?.created_at) },
        { label: '备注', render: (data) => data.stock_check?.remark ?? '—' },
      ]}
    >
      {(data) => (
        <Card
          title="盘点明细"
          extra={
            <Typography.Link href={`/stock-checks/items?id=${data.stock_check?.id ?? 0}`}>
              查看完整明细
            </Typography.Link>
          }
        >
          <Table<StockCheckItem>
            rowKey="id"
            columns={itemColumns}
            dataSource={data.items ?? []}
            pagination={false}
            locale={{ emptyText: '暂无盘点明细' }}
            scroll={{ x: 'max-content' }}
          />
        </Card>
      )}
    </ResourceDetail>
  )
}
