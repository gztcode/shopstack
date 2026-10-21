/**
 * 运费模板详情
 */
import { Tag } from 'antd'
import { getTemplate } from '@/api/logistics'
import { formatYuan } from '@/utils/format'
import type { LogisticTemplate } from '@/types'
import ResourceDetail from '@/components/ResourceDetail'

/** 运费模板详情页 */
export default function LogisticsTemplateDetail() {
  return (
    <ResourceDetail<LogisticTemplate>
      title="运费模板详情"
      description="查看运费模板的默认运费、包邮门槛与适用地区"
      fetcher={getTemplate}
      queryKey="logistics-template-detail"
      backTo="/logistics/templates"
      fields={[
        { label: '模板名称', render: (data) => data.name ?? '—' },
        { label: '快递公司', render: (data) => data.company ?? '—' },
        { label: '公司编码', render: (data) => data.company_code ?? '—' },
        { label: '默认运费', render: (data) => formatYuan(data.freight_cents ?? 0) },
        { label: '包邮门槛', render: (data) => formatYuan(data.free_freight_amount_cents ?? 0) },
        { label: '排序', render: (data) => String(data.sort ?? '-') },
        {
          label: '状态',
          render: (data) => (
            <Tag color={data.enabled ? 'success' : 'default'}>{data.enabled ? '启用' : '停用'}</Tag>
          ),
        },
        { label: '适用地区', render: (data) => data.regions || '全国' },
      ]}
    />
  )
}
