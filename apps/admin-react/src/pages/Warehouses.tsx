/**
 * 仓库管理
 */
import { listWarehouses, saveWarehouse } from '@/api/inventory'
import { formatDateTime } from '@/utils/format'
import type { SaveWarehouseRequest, Warehouse } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<Warehouse>[] = [
  { title: '仓库名称', dataIndex: 'name', width: 180 },
  { title: '仓库编码', dataIndex: 'code', width: 140 },
  { title: '地址', dataIndex: 'address', ellipsis: true, render: (value) => String(value || '—') },
  { title: '联系人', dataIndex: 'contact', width: 120, render: (value) => String(value || '—') },
  { title: '联系电话', dataIndex: 'phone', width: 140, render: (value) => String(value || '—') },
  { title: '排序', dataIndex: 'sort', width: 80, align: 'right' },
  {
    title: '状态',
    dataIndex: 'enabled',
    width: 90,
    render: (value) => boolTag(Boolean(value)),
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    width: 170,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

const fields: ResourceField[] = [
  { name: 'name', label: '仓库名称', required: true, searchable: true, placeholder: '如：北京主仓' },
  { name: 'code', label: '仓库编码', required: true, placeholder: '如：WH_BJ' },
  { name: 'address', label: '仓库地址', placeholder: '详细地址' },
  { name: 'contact', label: '联系人', placeholder: '仓管姓名' },
  { name: 'phone', label: '联系电话', placeholder: '010-88880001' },
  { name: 'sort', label: '排序', type: 'number', initialValue: 0 },
  { name: 'enabled', label: '是否启用', type: 'switch', initialValue: true },
]

/** 仓库管理页 */
export default function Warehouses() {
  return (
    <ResourceTable<Warehouse, Awaited<ReturnType<typeof listWarehouses>>>
      title="仓库管理"
      description="维护平台仓库档案与启用状态"
      listKey="warehouses"
      queryKey="warehouses"
      fetcher={(params) =>
        listWarehouses({
          keyword: params.keyword ? String(params.keyword) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      fields={fields}
      createLabel="新增仓库"
      onSave={(values) => saveWarehouse(values as unknown as SaveWarehouseRequest)}
    />
  )
}
