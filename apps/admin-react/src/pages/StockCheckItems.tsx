/**
 * 盘点明细 —— 单张盘点单的逐 SKU 账实差异
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, Typography } from 'antd'
import { listStockCheckItems, listStockChecks } from '@/api/inventory'
import { formatNumber } from '@/utils/format'
import type { StockCheckItem } from '@/types'
import ResourceTable, { type ResourceColumn } from '@/components/ResourceTable'
import PageContainer from '@/components/PageContainer'
import { tokens } from '@/theme'

const columns: ResourceColumn<StockCheckItem>[] = [
  { title: 'SKU ID', dataIndex: 'sku_id', width: 110, align: 'right' },
  { title: 'SKU 编码', dataIndex: 'sku_code', width: 180 },
  { title: '规格', dataIndex: 'spec_text', width: 220 },
  {
    title: '账面数量',
    dataIndex: 'book_quantity',
    width: 120,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  {
    title: '实盘数量',
    dataIndex: 'actual_quantity',
    width: 120,
    align: 'right',
    render: (value) => formatNumber(Number(value ?? 0)),
  },
  {
    title: '差异数量',
    dataIndex: 'diff_quantity',
    width: 120,
    align: 'right',
    render: (value) => {
      const diff = Number(value ?? 0)
      return <span style={{ color: diff !== 0 ? tokens.colorError : undefined }}>{formatNumber(diff)}</span>
    },
  },
]

/** 盘点明细页 */
export default function StockCheckItems() {
  const [searchParams] = useSearchParams()
  // 未显式指定盘点单 id 时，取列表中的第一张，而不是写死 id=1
  // （盘点单 id 随种子与运行变化，写死会直接请求到不存在的单据）。
  const [fallbackId, setFallbackId] = useState<number | null>(null)
  const [resolved, setResolved] = useState(false)
  const explicitId = searchParams.get('id')

  useEffect(() => {
    if (explicitId) {
      setResolved(true)
      return
    }
    let cancelled = false
    listStockChecks({ page: 1, page_size: 1 })
      .then((res) => {
        if (cancelled) return
        const first = res.stock_checks?.[0]
        setFallbackId(first ? first.id : null)
      })
      .catch(() => {
        if (!cancelled) setFallbackId(null)
      })
      .finally(() => {
        if (!cancelled) setResolved(true)
      })
    return () => {
      cancelled = true
    }
  }, [explicitId])

  const checkId = Number(explicitId ?? fallbackId ?? 0)

  // 盘点单 id 未就绪时先不渲染列表：否则会以 id=0 发请求，后端返回 400。
  if (!resolved) {
    return (
      <PageContainer title="盘点明细" description="逐 SKU 核对账面数量与实盘数量，定位账实差异">
        <Card loading>
          <Typography.Text type="secondary">正在定位盘点单…</Typography.Text>
        </Card>
      </PageContainer>
    )
  }

  if (checkId <= 0) {
    return (
      <PageContainer title="盘点明细" description="逐 SKU 核对账面数量与实盘数量，定位账实差异">
        <Card>
          <Typography.Text type="secondary">暂无盘点单，请先在盘点单列表创建一张盘点单。</Typography.Text>
        </Card>
      </PageContainer>
    )
  }

  return (
    <ResourceTable<StockCheckItem, Awaited<ReturnType<typeof listStockCheckItems>>>
      title="盘点明细"
      description="逐 SKU 核对账面数量与实盘数量，定位账实差异"
      listKey="items"
      queryKey="stock-check-items"
      initialParams={{ id: checkId }}
      fetcher={(params) =>
        listStockCheckItems({
          id: Number(params.id ?? checkId),
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      emptyText="该盘点单暂无明细"
    />
  )
}
