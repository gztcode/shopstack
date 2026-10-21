/**
 * 会员等级管理
 */
import { listUserLevels, saveUserLevel } from '@/api/user'
import { formatNumber } from '@/utils/format'
import type { SaveUserLevelRequest, UserLevel } from '@/types'
import ResourceTable, { type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<UserLevel>[] = [
  { title: '等级名称', dataIndex: 'name', width: 160 },
  { title: '等级', dataIndex: 'level', width: 90, align: 'right' },
  {
    title: '成长值区间',
    dataIndex: 'min_growth',
    width: 200,
    render: (value, record) => `${formatNumber(Number(value ?? 0))} ~ ${formatNumber(record.max_growth ?? 0)}`,
  },
  {
    title: '折扣',
    dataIndex: 'discount_percent',
    width: 110,
    align: 'right',
    render: (value) => `${(Number(value ?? 100) / 10).toFixed(1)} 折`,
  },
  {
    title: '会员权益',
    dataIndex: 'benefits',
    width: 260,
    ellipsis: true,
    render: (value) => (Array.isArray(value) && value.length ? value.join('、') : '—'),
  },
  { title: '说明', dataIndex: 'description', ellipsis: true, render: (value) => String(value || '—') },
  { title: '排序', dataIndex: 'sort', width: 80, align: 'right' },
]

const fields: ResourceField[] = [
  { name: 'name', label: '等级名称', required: true, placeholder: '如：金卡会员' },
  { name: 'level', label: '等级序号', type: 'number', required: true, initialValue: 1 },
  { name: 'min_growth', label: '成长值下限', type: 'number', initialValue: 0 },
  { name: 'max_growth', label: '成长值上限', type: 'number', initialValue: 0 },
  { name: 'discount_percent', label: '折扣百分比', type: 'number', initialValue: 100, help: '100 表示无折扣，95 表示 9.5 折' },
  { name: 'icon', label: '等级图标', placeholder: 'https://...' },
  { name: 'description', label: '等级说明', type: 'textarea' },
  { name: 'benefits', label: '会员权益', type: 'tags', help: '输入后回车添加权益条目' },
  { name: 'sort', label: '排序', type: 'number', initialValue: 0 },
]

/** 会员等级管理页 */
export default function UserLevels() {
  return (
    <ResourceTable<UserLevel, Awaited<ReturnType<typeof listUserLevels>>>
      title="会员等级"
      description="维护会员等级、成长值区间与折扣权益"
      listKey="levels"
      queryKey="user-levels"
      fetcher={() => listUserLevels()}
      columns={columns}
      fields={fields}
      createLabel="新增等级"
      onSave={(values) => saveUserLevel(values as unknown as SaveUserLevelRequest)}
    />
  )
}
