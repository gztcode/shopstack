/**
 * 评价标签管理
 */
import { deleteReviewTag, listReviewTags, saveReviewTag } from '@/api/product'
import type { ReviewTag, SaveReviewTagRequest } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<ReviewTag>[] = [
  { title: '标签名称', dataIndex: 'name', width: 200 },
  { title: '排序', dataIndex: 'sort', width: 100, align: 'right' },
  {
    title: '状态',
    dataIndex: 'enabled',
    width: 100,
    render: (value) => boolTag(Boolean(value)),
  },
]

const fields: ResourceField[] = [
  { name: 'name', label: '标签名称', required: true, searchable: true, placeholder: '如：物流快' },
  { name: 'sort', label: '排序', type: 'number', initialValue: 0 },
  { name: 'enabled', label: '是否启用', type: 'switch', initialValue: true },
]

/** 评价标签管理页 */
export default function ReviewTags() {
  return (
    <ResourceTable<ReviewTag, Awaited<ReturnType<typeof listReviewTags>>>
      title="评价标签"
      description="维护用户评价可用的标签词"
      listKey="tags"
      queryKey="review-tags"
      fetcher={(params) => listReviewTags(params as Parameters<typeof listReviewTags>[0])}
      columns={columns}
      fields={fields}
      createLabel="新增标签"
      onSave={(values) => saveReviewTag(values as unknown as SaveReviewTagRequest)}
      onDelete={(record) => deleteReviewTag(record.id)}
    />
  )
}
