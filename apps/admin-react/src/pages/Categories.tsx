/**
 * 分类管理（树形表格）
 */
import { useMemo, useState } from 'react'
import { Button, Card, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { deleteCategory, listCategories, saveCategory } from '@/api/product'
import { useApiQuery } from '@/hooks/useApi'
import { hasPermission } from '@/utils/permission'
import { useAuthStore } from '@/store/auth'
import type { Category, SaveCategoryRequest } from '@/types'
import PageContainer from '@/components/PageContainer'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { validateForm } from '@/utils/form'
import { useMessage } from '@/hooks/useMessage'

/** 分类管理页 */
export default function Categories() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((state) => state.permissions)
  const [form] = Form.useForm<SaveCategoryRequest>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canUpdate = hasPermission(permissions, 'category:update')

  const categoriesQuery = useApiQuery(['categories'], () => listCategories())
  const tree = useMemo(() => categoriesQuery.data?.categories ?? [], [categoriesQuery.data])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['categories'] })

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ parent_id: 0, sort: 10, visible: true })
    setDrawerOpen(true)
  }

  const openEdit = (record: Category) => {
    setEditing(record)
    form.resetFields()
    form.setFieldsValue({
      id: record.id,
      name: record.name,
      parent_id: record.parent_id,
      icon: record.icon,
      description: record.description,
      sort: record.sort,
      visible: record.visible,
    })
    setDrawerOpen(true)
  }

  const handleSubmit = async () => {
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      await saveCategory({ ...values, id: editing?.id })
      message.success(editing ? '分类已更新' : '分类已创建')
      setDrawerOpen(false)
      refresh()
    } catch (error) {
      if (error instanceof Error) message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (record: Category) => {
    try {
      await deleteCategory(record.id)
      message.success('分类已删除')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  const columns: ColumnsType<Category> = [
    {
      title: '分类名称',
      dataIndex: 'name',
      render: (name: string, record) => (
        <Space>
          <span>{record.icon}</span>
          <Typography.Text strong>{name}</Typography.Text>
        </Space>
      ),
    },
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: '描述', dataIndex: 'description', render: (value: string) => value || '—' },
    { title: '商品数', dataIndex: 'product_count', width: 90, align: 'right' },
    { title: '排序', dataIndex: 'sort', width: 90, align: 'right' },
    {
      title: '显示',
      dataIndex: 'visible',
      width: 90,
      render: (visible: boolean) => (
        <Tag color={visible ? 'success' : 'default'}>{visible ? '显示' : '隐藏'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_: unknown, record) => (
        <Space size={4}>
          {canUpdate ? (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              编辑
            </Button>
          ) : null}
          {canUpdate ? (
            <Popconfirm
              title="确认删除该分类？"
              description="删除前请确认分类下没有商品。"
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

  const parentOptions = useMemo(
    () => [
      { value: 0, label: '顶级分类' },
      ...tree.map((item) => ({ value: item.id, label: item.name })),
    ],
    [tree],
  )

  return (
    <PageContainer title="分类管理" description="维护商品分类层级、图标与展示顺序">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <TableToolbar
          title="分类列表"
          description={`共 ${tree.length} 个顶级分类`}
          extra={
            <>
              <Button icon={<ReloadOutlined />} onClick={refresh}>
                刷新
              </Button>
              {canUpdate ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  新增分类
                </Button>
              ) : null}
            </>
          }
        />
        <Table<Category>
          rowKey="id"
          columns={columns}
          dataSource={tree}
          loading={categoriesQuery.isLoading || categoriesQuery.isFetching}
          pagination={false}
          expandable={{ defaultExpandAllRows: true }}
          locale={{ emptyText: '暂无分类数据' }}
        />
      </Card>

      <Drawer
        title={editing ? `编辑分类 · ${editing.name}` : '新增分类'}
        width={480}
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
            label="分类名称"
            name="name"
            rules={[{ required: true, message: '请输入分类名称' }, { max: 20, message: '最多 20 个字符' }]}
          >
            <Input placeholder="如：数码家电" />
          </Form.Item>
          <Form.Item label="父级分类" name="parent_id" rules={[{ required: true, message: '请选择父级分类' }]}>
            <Select options={parentOptions} placeholder="请选择父级分类" />
          </Form.Item>
          <Form.Item label="图标" name="icon" extra="可填写 emoji，如 📱">
            <Input placeholder="📱" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} maxLength={100} showCount placeholder="分类描述" />
          </Form.Item>
          <Space size={16}>
            <Form.Item label="排序" name="sort" rules={[{ required: true, message: '请输入排序值' }]}>
              <InputNumber min={0} precision={0} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item label="是否显示" name="visible" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Drawer>
    </PageContainer>
  )
}
