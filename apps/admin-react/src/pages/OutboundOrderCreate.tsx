/**
 * 新建出库单
 */
import { useMemo } from 'react'
import { createOutboundOrder, listWarehouses } from '@/api/inventory'
import { useApiQuery } from '@/hooks/useApi'
import type { CreateOutboundOrderRequest } from '@/types'
import ResourceFormPage from '@/components/ResourceFormPage'
import type { ResourceField } from '@/components/ResourceTable'

/** 新建出库单页 */
export default function OutboundOrderCreate() {
  const warehousesQuery = useApiQuery(['warehouses', 'options'], () =>
    listWarehouses({ page_size: 50 }),
  )

  const fields = useMemo<ResourceField[]>(
    () => [
      {
        name: 'warehouse_id',
        label: '出库仓库',
        type: 'select',
        required: true,
        options: (warehousesQuery.data?.warehouses ?? []).map((warehouse) => ({
          label: warehouse.name,
          value: warehouse.id,
        })),
      },
      { name: 'order_id', label: '关联订单 ID', type: 'number', required: true },
      { name: 'remark', label: '备注', type: 'textarea', placeholder: '如：加急出库' },
    ],
    [warehousesQuery.data],
  )

  const details = useMemo(
    () => ({
      name: 'items',
      label: '出库明细',
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
      title="新建出库单"
      description="按订单生成出库单据并登记出库明细"
      fields={fields}
      details={details}
      successTo="/outbound-orders"
      onSubmit={async (values) => {
        await createOutboundOrder(values as unknown as CreateOutboundOrderRequest)
      }}
    />
  )
}
