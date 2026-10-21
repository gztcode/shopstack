/**
 * 商品参数 —— 维护商品的参数模板
 */
import { useMemo } from 'react'
import { listProductParams, listProducts } from '@/api/product'
import { useApiQuery } from '@/hooks/useApi'
import type { ProductAttribute } from '@/types'
import ResourceTable, { type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<ProductAttribute>[] = [
  { title: '参数名', dataIndex: 'name', width: 200 },
  { title: '参数值', dataIndex: 'value', ellipsis: true, render: (value) => String(value || '—') },
  { title: '商品 ID', dataIndex: 'product_id', width: 110, align: 'right' },
  { title: '排序', dataIndex: 'sort', width: 90, align: 'right' },
]



/** 商品参数页 */
export default function ProductParams() {
  const productsQuery = useApiQuery(['products', 'param-options'], () =>
    listProducts({ page_size: 50 }),
  )
  const searchFields = useMemo<ResourceField[]>(
    () => [
      {
        name: 'product_id',
        label: '商品',
        searchable: true,
        width: 240,
        type: 'select',
        options: (productsQuery.data?.products ?? []).map((product) => ({
          label: product.title,
          value: product.id,
        })),
      },
    ],
    [productsQuery.data],
  )

  return (
    <ResourceTable<ProductAttribute, Awaited<ReturnType<typeof listProductParams>>>
      title="商品参数"
      description="查看与维护商品详情页展示的参数项"
      listKey="params"
      queryKey="product-params"
      initialParams={{ product_id: 1 }}
      searchFields={searchFields}
      fetcher={(params) => listProductParams(Number(params.product_id ?? 1))}
      columns={columns}
      emptyText="该商品暂无参数项"
    />
  )
}
