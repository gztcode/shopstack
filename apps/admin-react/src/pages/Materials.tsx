/**
 * 素材库管理
 */
import { useMemo, useState } from 'react'
import { Button, Card, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { deleteMaterial, listMaterials, saveMaterial } from '@/api/material'
import { useApiQuery } from '@/hooks/useApi'
import { hasPermission } from '@/utils/permission'
import { formatDateTime, formatNumber } from '@/utils/format'
import { validateForm } from '@/utils/form'
import { useAuthStore } from '@/store/auth'
import type { ListMaterialsParams, Material, SaveMaterialRequest } from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { useMessage } from '@/hooks/useMessage'

const MATERIAL_TYPE_OPTIONS = [
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
]

const FOLDER_OPTIONS = ['首页轮播', '商品图', '详情素材', '视频素材', '营销素材']

/** 素材库管理页 */
export default function Materials() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((state) => state.permissions)
  const [form] = Form.useForm<SaveMaterialRequest>()
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<string | undefined>()
  const [folder, setFolder] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Material | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canEdit = hasPermission(permissions, 'product:update')

  const queryParams = useMemo<ListMaterialsParams>(
    () => ({ page, page_size: pageSize, keyword: keyword || undefined, type, folder }),
    [page, pageSize, keyword, type, folder],
  )

  const materialsQuery = useApiQuery(['materials', queryParams], () => listMaterials(queryParams))

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['materials'] })

  const handleSearch = (values: SearchFormValues) => {
    setKeyword(String(values.keyword ?? '').trim())
    setType(values.type as string | undefined)
    setFolder(values.folder as string | undefined)
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setType(undefined)
    setFolder(undefined)
    setPage(1)
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ id: 0, type: 'image', folder: '商品图', sort: 0, size: 0 })
    setDrawerOpen(true)
  }

  const openEdit = (record: Material) => {
    setEditing(record)
    form.resetFields()
    form.setFieldsValue({
      id: record.id,
      name: record.name,
      url: record.url,
      type: record.type,
      size: record.size,
      folder: record.folder,
      sort: record.sort,
    })
    setDrawerOpen(true)
  }

  const handleSubmit = async () => {
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      await saveMaterial({ ...values, id: editing?.id ?? 0 })
      message.success(editing ? '素材已更新' : '素材已上传')
      setDrawerOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (record: Material) => {
    try {
      await deleteMaterial(record.id)
      message.success('素材已删除')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  const columns: ColumnsType<Material> = [
    {
      title: '预览',
      dataIndex: 'url',
      width: 90,
      render: (url: string, record) =>
        record.type === 'video' ? (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 6,
              background: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8A99AB',
              fontSize: 12,
            }}
          >
            视频
          </div>
        ) : (
          <img
            src={url}
            alt={record.name}
            width={48}
            height={48}
            style={{ borderRadius: 6, objectFit: 'cover', background: '#F1F5F9' }}
          />
        ),
    },
    {
      title: '素材名称',
      dataIndex: 'name',
      render: (value: string, record) => (
        <div>
          <Typography.Text strong>{value}</Typography.Text>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12, wordBreak: 'break-all' }}>
              {record.url}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 90,
      render: (value: string) => (
        <Tag color={value === 'video' ? 'purple' : 'blue'}>{value === 'video' ? '视频' : '图片'}</Tag>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      width: 110,
      align: 'right',
      render: (value: number) => formatBytes(value),
    },
    { title: '文件夹', dataIndex: 'folder', width: 120 },
    { title: '排序', dataIndex: 'sort', width: 80, align: 'right' },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_: unknown, record) =>
        canEdit ? (
          <Space size={4}>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              编辑
            </Button>
            <Popconfirm
              title="确认删除该素材？"
              description="删除后引用该素材的位置将无法展示。"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
  ]

  return (
    <PageContainer title="素材库管理" description="统一管理商品图、轮播图与宣传视频素材">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <SearchForm onSearch={handleSearch} onReset={handleReset} loading={materialsQuery.isFetching}>
          <Form.Item name="keyword" label="关键词">
            <Input allowClear placeholder="素材名称 / 地址" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select allowClear placeholder="全部类型" style={{ width: 140 }} options={MATERIAL_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="folder" label="文件夹">
            <Select
              allowClear
              placeholder="全部文件夹"
              style={{ width: 160 }}
              options={FOLDER_OPTIONS.map((item) => ({ label: item, value: item }))}
            />
          </Form.Item>
        </SearchForm>

        <TableToolbar
          title="素材列表"
          description={`共 ${formatNumber(materialsQuery.data?.meta.total ?? 0)} 个素材`}
          extra={
            <>
              <Button icon={<ReloadOutlined />} onClick={refresh}>
                刷新
              </Button>
              {canEdit ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  新增素材
                </Button>
              ) : null}
            </>
          }
        />

        <Table<Material>
          rowKey="id"
          columns={columns}
          dataSource={materialsQuery.data?.materials ?? []}
          loading={materialsQuery.isLoading || materialsQuery.isFetching}
          scroll={{ x: 1080 }}
          locale={{ emptyText: '暂无素材' }}
          pagination={{
            current: page,
            pageSize,
            total: materialsQuery.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${formatNumber(total)} 个`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage)
              setPageSize(nextSize)
            },
          }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑素材 · ${editing.name}` : '新增素材'}
        width={520}
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
          <Form.Item
            label="素材名称"
            name="name"
            rules={[{ required: true, message: '请输入素材名称' }, { max: 60, message: '最多 60 个字符' }]}
          >
            <Input placeholder="如：夏季主图-数码专场 01" />
          </Form.Item>
          <Form.Item
            label="素材地址"
            name="url"
            rules={[{ required: true, message: '请输入素材地址' }]}
          >
            <Input placeholder="https://..." />
          </Form.Item>
          <Space size={16}>
            <Form.Item label="类型" name="type" rules={[{ required: true, message: '请选择类型' }]}>
              <Select options={MATERIAL_TYPE_OPTIONS} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item
              label="大小（字节）"
              name="size"
              rules={[{ required: true, message: '请输入文件大小' }]}
            >
              <InputNumber min={0} precision={0} style={{ width: 200 }} />
            </Form.Item>
          </Space>
          <Space size={16}>
            <Form.Item
              label="文件夹"
              name="folder"
              rules={[{ required: true, message: '请选择文件夹' }]}
            >
              <Select
                style={{ width: 200 }}
                options={FOLDER_OPTIONS.map((item) => ({ label: item, value: item }))}
              />
            </Form.Item>
            <Form.Item label="排序" name="sort">
              <InputNumber min={0} precision={0} style={{ width: 160 }} />
            </Form.Item>
          </Space>
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  )
}

/** 字节数格式化 */
function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}
