/**
 * 服务保障管理
 */
import { deleteGuarantee, listGuarantees, saveGuarantee } from '@/api/product'
import type { Guarantee, SaveGuaranteeRequest } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<Guarantee>[] = [
  { title: '保障名称', dataIndex: 'name', width: 180 },
  {
    title: '图标',
    dataIndex: 'icon',
    width: 90,
    render: (value) =>
      value ? (
        <img src={String(value)} alt="保障图标" width={36} height={36} style={{ borderRadius: 6 }} />
      ) : (
        '—'
      ),
  },
  { title: '说明', dataIndex: 'description', ellipsis: true, render: (value) => String(value || '—') },
  { title: '排序', dataIndex: 'sort', width: 90, align: 'right' },
  {
    title: '状态',
    dataIndex: 'enabled',
    width: 100,
    render: (value) => boolTag(Boolean(value)),
  },
]

const fields: ResourceField[] = [
  { name: 'name', label: '保障名称', required: true, placeholder: '如：七天无理由' },
  { name: 'icon', label: '图标地址', placeholder: 'https://...' },
  { name: 'description', label: '保障说明', type: 'textarea' },
  { name: 'sort', label: '排序', type: 'number', initialValue: 0 },
  { name: 'enabled', label: '是否启用', type: 'switch', initialValue: true },
]

/** 服务保障管理页 */
export default function Guarantees() {
  return (
    <ResourceTable<Guarantee, Awaited<ReturnType<typeof listGuarantees>>>
      title="服务保障"
      description="维护商品详情页展示的服务保障项"
      listKey="guarantees"
      queryKey="guarantees"
      fetcher={(params) => listGuarantees(params as Parameters<typeof listGuarantees>[0])}
      columns={columns}
      fields={fields}
      createLabel="新增保障"
      onSave={(values) => saveGuarantee(values as unknown as SaveGuaranteeRequest)}
      onDelete={(record) => deleteGuarantee(record.id)}
    />
  )
}
