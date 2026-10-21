/**
 * 通用资源列表页 —— 参数化的增删改查页面骨架
 *
 * 本轮扩量的多个后台页面（频道 / 评价标签 / 服务保障 / 快递公司 / 敏感词 …）
 * 数据结构一致、交互一致，因此统一抽成本组件：
 * 页面只提供「接口 + 列 + 表单字段」配置，差异化逻辑由配置驱动。
 */
import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { useApiQuery } from '@/hooks/useApi'
import { useMessage } from '@/hooks/useMessage'
import { validateForm } from '@/utils/form'
import { formatNumber, formatYuan, yuanToCents } from '@/utils/format'
import type { PageMeta } from '@/types/common'
import PageContainer from './PageContainer'
import SearchForm, { type SearchFormValues } from './SearchForm'
import TableToolbar from './TableToolbar'
import DemoModeAlert from './DemoModeAlert'

/** 表单控件类型 */
export type ResourceFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'money'
  | 'switch'
  | 'select'
  | 'tags'
  | 'datetime'
  | 'unix'

/** 表单字段描述 */
export interface ResourceField {
  /** 字段名（同时作为提交给后端的 payload key） */
  name: string
  label: string
  type?: ResourceFieldType
  required?: boolean
  placeholder?: string
  options?: Array<{ label: string; value: number | string }>
  /** 是否作为列表筛选项 */
  searchable?: boolean
  min?: number
  max?: number
  /** 列表页筛选项的控件宽度 */
  width?: number
  help?: string
  initialValue?: unknown
}

/** 表格列描述 */
export interface ResourceColumn<T> {
  title: string
  dataIndex: string
  width?: number
  align?: 'left' | 'center' | 'right'
  ellipsis?: boolean
  render?: (value: unknown, record: T) => React.ReactNode
}

export interface ResourceTableProps<T extends object, R = unknown> {
  /** 页面标题 */
  title: string
  /** 页面副标题 */
  description?: string
  /** 列表请求（响应结构与后端 JSON 一致） */
  fetcher: (params: Record<string, unknown>) => Promise<R>
  /** 响应中数组字段名，如 channels */
  listKey: string
  /** 表格列 */
  columns: ResourceColumn<T>[]
  /** 新增/编辑表单字段 */
  fields?: ResourceField[]
  /** 列表筛选项（不传则取 fields 中 searchable 的项） */
  searchFields?: ResourceField[]
  /** 保存（新增/编辑） */
  onSave?: (values: Record<string, unknown>, editing: T | null) => Promise<unknown>
  /** 删除 */
  onDelete?: (record: T) => Promise<unknown>
  /** 记录 → 表单初始值 */
  toFormValues?: (record: T) => Record<string, unknown>
  /** 行主键 */
  rowKey?: string
  /** 额外行操作 */
  rowActions?: (record: T) => React.ReactNode
  /** 工具条额外内容 */
  toolbarExtra?: React.ReactNode
  /** 表格上方的汇总信息（由响应数据计算） */
  summary?: (data: R | undefined) => React.ReactNode
  /** 初始筛选条件 */
  initialParams?: Record<string, unknown>
  /** 空态文案 */
  emptyText?: string
  /** react-query key */
  queryKey?: string
  /** 是否展示新增按钮 */
  createLabel?: string
}

/** 金额字段识别：形如 *_cents */
function isCentsField(name: string): boolean {
  return name.endsWith('_cents')
}

/** 通用资源列表页 */
export default function ResourceTable<T extends object, R = unknown>({
  title,
  description,
  fetcher,
  listKey,
  columns,
  fields = [],
  searchFields,
  onSave,
  onDelete,
  toFormValues,
  rowKey = 'id',
  rowActions,
  toolbarExtra,
  summary,
  initialParams,
  emptyText = '暂无数据',
  queryKey,
  createLabel = '新增',
}: ResourceTableProps<T, R>) {
  const message = useMessage()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<Record<string, unknown>>()
  const [params, setParams] = useState<Record<string, unknown>>({
    page: 1,
    page_size: 20,
    ...(initialParams ?? {}),
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const cacheKey = queryKey ?? listKey
  const listQuery = useApiQuery<R>([cacheKey, params], () => fetcher(params))
  const data = listQuery.data as Record<string, unknown> | undefined
  const items = useMemo(() => (data?.[listKey] as T[]) ?? [], [data, listKey])
  const meta = data?.meta as PageMeta | undefined

  const refresh = () => queryClient.invalidateQueries({ queryKey: [cacheKey] })

  const activeSearchFields = searchFields ?? fields.filter((field) => field.searchable)

  const handleSearch = (values: SearchFormValues) => {
    const next: Record<string, unknown> = { page: 1, page_size: params.page_size ?? 20 }
    activeSearchFields.forEach((field) => {
      const value = values[field.name]
      if (value !== undefined && value !== null && value !== '') next[field.name] = value
    })
    setParams(next)
  }

  const handleReset = () => {
    setParams({ page: 1, page_size: params.page_size ?? 20, ...(initialParams ?? {}) })
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    const defaults: Record<string, unknown> = {}
    fields.forEach((field) => {
      if (field.initialValue !== undefined) defaults[field.name] = field.initialValue
    })
    form.setFieldsValue(defaults as Record<string, never>)
    setDrawerOpen(true)
  }

  const openEdit = (record: T) => {
    setEditing(record)
    form.resetFields()
    const values = toFormValues ? toFormValues(record) : { ...(record as unknown as Record<string, unknown>) }
    const prepared: Record<string, unknown> = { ...values }
    fields.forEach((field) => {
      if (field.type === 'money' && isCentsField(field.name)) {
        prepared[field.name] = typeof values[field.name] === 'number' ? (values[field.name] as number) / 100 : 0
      }
    })
    form.setFieldsValue(prepared as Record<string, never>)
    setDrawerOpen(true)
  }

  const handleSubmit = async () => {
    if (!onSave) return
    const values = await validateForm(form)
    if (values === null) return
    const payload: Record<string, unknown> = { ...values }
    fields.forEach((field) => {
      if (field.type === 'money' && isCentsField(field.name)) {
        payload[field.name] = yuanToCents(values[field.name] as number)
      }
    })
    setSubmitting(true)
    try {
      await onSave(payload, editing)
      message.success(editing ? '已更新' : '已创建')
      setDrawerOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (record: T) => {
    if (!onDelete) return
    try {
      await onDelete(record)
      message.success('已删除')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  const allColumns: ColumnsType<T> = [
    ...columns,
    ...(onSave || onDelete || rowActions
      ? [
          {
            title: '操作',
            key: 'actions',
            width: 160,
            fixed: 'right' as const,
            render: (_: unknown, record: T) => (
              <Space size={4} wrap>
                {onSave ? (
                  <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                    编辑
                  </Button>
                ) : null}
                {rowActions?.(record)}
                {onDelete ? (
                  <Popconfirm
                    title="确认删除该记录？"
                    description="删除后不可恢复，请谨慎操作。"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleDelete(record)}
                  >
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                ) : null}
              </Space>
            ),
          },
        ]
      : []),
  ]

  return (
    <PageContainer title={title} description={description}>
      <DemoModeAlert onRetry={refresh} />

      <Card>
        {activeSearchFields.length ? (
          <SearchForm onSearch={handleSearch} onReset={handleReset} loading={listQuery.isFetching}>
            {activeSearchFields.map((field) => (
              <Form.Item
                key={field.name}
                name={field.name}
                label={field.label}
                valuePropName={field.type === 'switch' ? 'checked' : 'value'}
              >
                {renderControl(field, true)}
              </Form.Item>
            ))}
          </SearchForm>
        ) : null}

        {summary ? <div style={{ marginBottom: 12 }}>{summary(data as R | undefined)}</div> : null}

        <TableToolbar
          title={`${title}列表`}
          description={`共 ${formatNumber(meta?.total ?? items.length)} 条`}
          extra={
            <>
              <Button icon={<ReloadOutlined />} onClick={refresh}>
                刷新
              </Button>
              {toolbarExtra}
              {onSave ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  {createLabel}
                </Button>
              ) : null}
            </>
          }
        />

        <Table<T>
          rowKey={rowKey}
          columns={allColumns}
          dataSource={items}
          loading={listQuery.isLoading || listQuery.isFetching}
          scroll={{ x: 'max-content' }}
          locale={{
            emptyText: (
              <Space direction="vertical" size={4}>
                <Typography.Text type="secondary">{emptyText}</Typography.Text>
                {onSave ? (
                  <Button type="link" size="small" onClick={openCreate}>
                    立即{createLabel}
                  </Button>
                ) : null}
              </Space>
            ),
          }}
          pagination={
            meta
              ? {
                  current: params.page as number,
                  pageSize: params.page_size as number,
                  total: meta.total,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${formatNumber(total)} 条`,
                  onChange: (nextPage, nextSize) =>
                    setParams((prev) => ({ ...prev, page: nextPage, page_size: nextSize })),
                }
              : false
          }
        />
      </Card>

      {onSave && fields.length ? (
        <Drawer
          title={editing ? `编辑 · ${recordName(editing)}` : `新增${createLabel}`}
          width={560}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          destroyOnHidden
          extra={
            <Space>
              <Button onClick={() => setDrawerOpen(false)}>取消</Button>
              <Button type="primary" loading={submitting} onClick={handleSubmit}>
                保存
              </Button>
            </Space>
          }
        >
          <Form form={form} layout="vertical">
            {fields.map((field) => (
              <Form.Item
                key={field.name}
                label={field.label}
                name={field.name}
                valuePropName={field.type === 'switch' ? 'checked' : 'value'}
                rules={field.required ? [{ required: true, message: `请填写${field.label}` }] : undefined}
                extra={field.help}
              >
                {renderControl(field, false)}
              </Form.Item>
            ))}
          </Form>
        </Drawer>
      ) : null}
    </PageContainer>
  )
}

/** 取记录的展示名 */
function recordName(record: unknown): string {
  const source = (record ?? {}) as Record<string, unknown>
  const candidates = ['name', 'title', 'word', 'code', 'no']
  for (const key of candidates) {
    const value = source[key]
    if (typeof value === 'string' && value) return value
  }
  return `#${String(source.id ?? '')}`
}

/** 依据字段类型渲染表单控件 */
function renderControl(field: ResourceField, isSearch: boolean) {
  const width = isSearch ? field.width ?? 180 : undefined
  switch (field.type) {
    case 'textarea':
      return <Input.TextArea rows={3} placeholder={field.placeholder ?? `请输入${field.label}`} />
    case 'number':
      return (
        <InputNumber
          min={field.min}
          max={field.max}
          style={{ width: width ?? '100%' }}
          placeholder={field.placeholder ?? `请输入${field.label}`}
        />
      )
    case 'money':
      return (
        <InputNumber
          min={0}
          precision={2}
          style={{ width: width ?? '100%' }}
          placeholder={field.placeholder ?? `请输入${field.label}（元）`}
        />
      )
    case 'switch':
      return <Switch />
    case 'select':
      return (
        <Select
          allowClear={isSearch}
          style={{ width: width ?? '100%' }}
          placeholder={field.placeholder ?? `请选择${field.label}`}
          options={field.options}
        />
      )
    case 'tags':
      return <Select mode="tags" style={{ width: '100%' }} placeholder={field.placeholder ?? '输入后回车创建'} />
    case 'datetime':
      return <Input placeholder={field.placeholder ?? '如 2026-01-01T00:00:00Z'} />
    case 'unix':
      return <InputNumber min={0} style={{ width: width ?? '100%' }} placeholder="unix 秒" />
    default:
      return <Input allowClear={isSearch} placeholder={field.placeholder ?? `请输入${field.label}`} style={{ width }} />
  }
}

/** 通用状态标签（供列 render 复用） */
export function boolTag(value: boolean, active = '启用', inactive = '停用'): React.ReactNode {
  return <Tag color={value ? 'success' : 'default'}>{value ? active : inactive}</Tag>
}

/** 通用金额单元格（分 → 元） */
export function moneyCell(cents: unknown): string {
  return formatYuan(typeof cents === 'number' ? cents : 0)
}
