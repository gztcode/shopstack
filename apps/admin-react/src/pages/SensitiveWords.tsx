/**
 * 敏感词管理
 */
import { deleteSensitiveWord, listSensitiveWords, saveSensitiveWord } from '@/api/notification'
import { formatDateTime } from '@/utils/format'
import { SENSITIVE_WORD_CATEGORY_OPTIONS, SENSITIVE_WORD_STATUS_OPTIONS } from '@/utils/resourceOptions'
import type { SaveSensitiveWordRequest, SensitiveWord } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<SensitiveWord>[] = [
  { title: '敏感词', dataIndex: 'word', width: 220 },
  {
    title: '分类',
    dataIndex: 'category',
    width: 130,
    render: (value) => SENSITIVE_WORD_CATEGORY_OPTIONS.find((item) => item.value === value)?.label ?? '-',
  },
  {
    title: '状态',
    dataIndex: 'status',
    width: 100,
    render: (value) => boolTag(Number(value) === 1, '启用', '停用'),
  },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    width: 170,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

const fields: ResourceField[] = [
  { name: 'word', label: '敏感词', required: true, searchable: true, placeholder: '如：最佳' },
  { name: 'category', label: '分类', type: 'select', options: SENSITIVE_WORD_CATEGORY_OPTIONS, initialValue: 4 },
  { name: 'status', label: '状态', type: 'select', options: SENSITIVE_WORD_STATUS_OPTIONS, initialValue: 1 },
]

/** 敏感词管理页 */
export default function SensitiveWords() {
  return (
    <ResourceTable<SensitiveWord, Awaited<ReturnType<typeof listSensitiveWords>>>
      title="敏感词"
      description="维护内容审核使用的敏感词库"
      listKey="words"
      queryKey="sensitive-words"
      fetcher={(params) =>
        listSensitiveWords({
          keyword: params.keyword ? String(params.keyword) : undefined,
          category: params.category !== undefined ? Number(params.category) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      fields={fields}
      createLabel="新增敏感词"
      onSave={(values) => saveSensitiveWord(values as unknown as SaveSensitiveWordRequest)}
      onDelete={(record) => deleteSensitiveWord(record.id)}
    />
  )
}
