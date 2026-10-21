/**
 * 新建入库单
 */
import { useMemo } from 'react'
import { createInboundOrder, listWarehouses } from '@/api/inventory'
import { useApiQuery } from '@/hooks/useApi'
import type { CreateInboundOrderRequest } from '@/types'
import ResourceFormPage from '@/components/ResourceFormPage'
import type { ResourceField } from '@/components/ResourceTable'

/** 新建入库单页 */
export default function InboundOrderCreate() {
  const warehousesQuery = useApiQuery(['warehouses', 'options'], () =>
    listWarehouses({ page_size: 50 }),
  )

  const fields = useMemo<ResourceField[]>(
    () => [
      {
        name: 'warehouse_id',
        label: '入库仓库',
        type: 'select',
        required: true,
        options: (warehousesQuery.data?.warehouses ?? []).map((warehouse) => ({
          label: warehouse.name,
          value: warehouse.id,
        })),
      },
      { name: 'supplier', label: '供应商', required: true, placeholder: '供应商名称' },
      { name: 'remark', label: '备注', type: 'textarea', placeholder: '如：常规补货' },
    ],
    [warehousesQuery.data],
  )

  const details = useMemo(
    () => ({
      name: 'items',
      label: '入库明细',
      columns: [
        { name: 'sku_id', label: 'SKU ID', type: 'number' as const, required: true },
        { name: 'sku_code', label: 'SKU 编码' },
        { name: 'spec_text', label: '规格' },
        { name: 'quantity', label: '数量', type: 'number' as const, required: true, initialValue: 1 },
      ],
    }),
    [],
  )

  return (
    <ResourceFormPage
      title="新建入库单"
      description="登记供应商到货并生成入库单据"
      fields={fields}
      details={details}
      successTo="/inbound-orders"
      onSubmit={async (values) => {
        await createInboundOrder(values as unknown as CreateInboundOrderRequest)
      }}
    />
  )
}
