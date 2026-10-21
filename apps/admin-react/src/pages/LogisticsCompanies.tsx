/**
 * 快递公司管理
 */
import { deleteLogisticsCompany, listLogisticsCompanies, saveLogisticsCompany } from '@/api/logistics'
import type { LogisticsCompany, SaveLogisticsCompanyRequest } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<LogisticsCompany>[] = [
  { title: '公司名称', dataIndex: 'name', width: 180 },
  { title: '编码', dataIndex: 'code', width: 140 },
  { title: '客服电话', dataIndex: 'phone', width: 150, render: (value) => String(value || '—') },
  {
    title: '货到付款',
    dataIndex: 'supports_cod',
    width: 110,
    render: (value) => boolTag(Boolean(value), '支持', '不支持'),
  },
  { title: '排序', dataIndex: 'sort', width: 80, align: 'right' },
  {
    title: '状态',
    dataIndex: 'enabled',
    width: 90,
    render: (value) => boolTag(Boolean(value)),
  },
]

const fields: ResourceField[] = [
  { name: 'name', label: '公司名称', required: true, searchable: true, placeholder: '如：顺丰速运' },
  { name: 'code', label: '公司编码', required: true, placeholder: '如：sf' },
  { name: 'logo', label: 'Logo 地址', placeholder: 'https://...' },
  { name: 'phone', label: '客服电话', placeholder: '95338' },
  { name: 'sort', label: '排序', type: 'number', initialValue: 0 },
  { name: 'supports_cod', label: '支持货到付款', type: 'switch', initialValue: false },
  { name: 'enabled', label: '是否启用', type: 'switch', initialValue: true },
]

/** 快递公司管理页 */
export default function LogisticsCompanies() {
  return (
    <ResourceTable<LogisticsCompany, Awaited<ReturnType<typeof listLogisticsCompanies>>>
      title="快递公司"
      description="维护平台合作的快递公司及其服务能力"
      listKey="companies"
      queryKey="logistics-companies"
      fetcher={(params) =>
        listLogisticsCompanies({
          keyword: params.keyword ? String(params.keyword) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      fields={fields}
      createLabel="新增快递公司"
      onSave={(values) => saveLogisticsCompany(values as unknown as SaveLogisticsCompanyRequest)}
      onDelete={(record) => deleteLogisticsCompany(record.id)}
    />
  )
}
