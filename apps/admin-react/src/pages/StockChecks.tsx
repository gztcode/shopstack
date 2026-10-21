/**
 * 盘点单列表
 */
import { Link } from 'react-router-dom'
import { listStockChecks } from '@/api/inventory'
import { formatDateTime, formatNumber } from '@/utils/format'
import { STOCK_CHECK_STATUS_OPTIONS } from '@/utils/resourceOptions'
import type { StockCheck } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'
import { tokens } from '@/theme'

const columns: ResourceColumn<StockCheck>[] = [
  { title: '盘点单号', dataIndex: 'check_no', width: 170 },
  { title: '仓库', dataIndex: 'warehouse_name', width: 160 },
  {
    title: '盘点商品数',
    dataIndex: 'total_count',
    width: 120,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  {
    title: '差异数',
    dataIndex: 'diff_count',
    width: 100,
    align: 'right',
    render: (value) => {
      const count = Number(value ?? 0)
      return <span style={{ color: count > 0 ? tokens.colorError : undefined }}>{formatNumber(count)}</span>
    },
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (value) => {
      const option = STOCK_CHECK_STATUS_OPTIONS.find((item) => item.value === value)
      return boolTag(Number(value) === 1, option?.label ?? '已完成', option?.label ?? '-')
    },
  },
  { title: '操作人', dataIndex: 'operator', width: 120, render: (value) => String(value || '—') },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    width: 170,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

const searchFields: ResourceField[] = [
  { name: 'keyword', label: '关键词', searchable: true, width: 200, placeholder: '盘点单号 / 仓库' },
  { name: 'status', label: '状态', type: 'select', searchable: true, width: 150, options: STOCK_CHECK_STATUS_OPTIONS },
]

/** 盘点单列表页 */
export default function StockChecks() {
  return (
    <ResourceTable<StockCheck, Awaited<ReturnType<typeof listStockChecks>>>
      title="盘点单"
      description="查看仓库盘点任务与账实差异数量"
      listKey="stock_checks"
      queryKey="stock-checks"
      searchFields={searchFields}
      fetcher={(params) =>
        listStockChecks({
          keyword: params.keyword ? String(params.keyword) : undefined,
          status: params.status !== undefined ? Number(params.status) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      emptyText="暂无盘点单"
      rowActions={(record) => (
        <Link to={`/stock-checks/detail?id=${record.id}`} style={{ fontSize: 12 }}>
          详情
        </Link>
      )}
    />
  )
}
