/**
 * 角色权限管理
 */
import { useMemo, useState } from 'react'
import { Button, Card, Drawer, Form, Input, Popconfirm, Space, Table, Tag, Tree, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { DataNode } from 'antd/es/tree'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { deleteRole, listPermissions, listRoles, saveRole } from '@/api/admin'
import { useApiQuery } from '@/hooks/useApi'
import { hasPermission } from '@/utils/permission'
import { formatDateTime, formatNumber } from '@/utils/format'
import { useAuthStore } from '@/store/auth'
import type { Role, SaveRoleRequest } from '@/types'
import PageContainer from '@/components/PageContainer'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { validateForm } from '@/utils/form'
import { useMessage } from '@/hooks/useMessage'

const GROUP_LABELS: Record<string, string> = {
  product: '商品',
  order: '订单',
  user: '用户',
  marketing: '营销',
  logistics: '物流',
  system: '系统',
}

/** 角色权限管理页 */
export default function Roles() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((state) => state.permissions)
  const [form] = Form.useForm<SaveRoleRequest>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkedKeys, setCheckedKeys] = useState<number[]>([])

  const canManage = hasPermission(permissions, 'system:role')

  const rolesQuery = useApiQuery(['roles'], () => listRoles())
  const permissionsQuery = useApiQuery(['permissions'], () => listPermissions())

  const permissionTree = useMemo<DataNode[]>(() => {
    const list = permissionsQuery.data?.permissions ?? []
    const groups = Array.from(new Set(list.map((item) => item.group)))
    return groups.map((group) => ({
      key: `group:${group}`,
      title: GROUP_LABELS[group] ?? group,
      selectable: false,
      children: list
        .filter((item) => item.group === group)
        .map((item) => ({
          key: item.id,
          title: (
            <span>
              {item.name}
              <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                {item.code}
              </Typography.Text>
            </span>
          ),
        })),
    }))
  }, [permissionsQuery.data])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['roles'] })
    queryClient.invalidateQueries({ queryKey: ['permissions'] })
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ permission_ids: [] })
    setCheckedKeys([])
    setDrawerOpen(true)
  }

  const openEdit = (record: Role) => {
    setEditing(record)
    form.resetFields()
    form.setFieldsValue({
      id: record.id,
      name: record.name,
      code: record.code,
      description: record.description,
      permission_ids: record.permission_ids,
    })
    setCheckedKeys(record.permission_ids)
    setDrawerOpen(true)
  }

  const handleSubmit = async () => {
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      await saveRole({ ...values, id: editing?.id, permission_ids: values.permission_ids ?? [] })
      message.success(editing ? '角色已更新' : '角色已创建')
      setDrawerOpen(false)
      refresh()
    } catch (error) {
      if (error instanceof Error) message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (record: Role) => {
    try {
      await deleteRole(record.id)
      message.success('角色已删除')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  const columns: ColumnsType<Role> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      width: 180,
      render: (value: string, record) => (
        <div>
          <Typography.Text strong>{value}</Typography.Text>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12, fontFamily: 'monospace' }}>
              {record.code}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      render: (value: string) => value || '—',
    },
    {
      title: '权限数',
      dataIndex: 'permission_ids',
      width: 100,
      align: 'right',
      render: (value: number[]) => `${value?.length ?? 0} 项`,
    },
    {
      title: '权限码',
      dataIndex: 'permission_codes',
      width: 320,
      render: (value: string[]) => (
        <Space size={4} wrap>
          {(value ?? []).slice(0, 5).map((code) => (
            <Tag key={code} bordered={false}>
              {code}
            </Tag>
          ))}
          {(value?.length ?? 0) > 5 ? <Tag>+{value.length - 5}</Tag> : null}
        </Space>
      ),
    },
    {
      title: '关联用户',
      dataIndex: 'user_count',
      width: 100,
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_: unknown, record) => (
        <Space size={4}>
          {canManage ? (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              编辑
            </Button>
          ) : null}
          {canManage ? (
            <Popconfirm
              title="确认删除该角色？"
              description="删除后关联管理员将失去该角色权限。"
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

  return (
    <PageContainer title="角色权限" description="维护后台角色与其可访问的功能权限">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <TableToolbar
          title="角色列表"
          description={`共 ${rolesQuery.data?.roles.length ?? 0} 个角色`}
          extra={
            <>
              <Button icon={<ReloadOutlined />} onClick={refresh}>
                刷新
              </Button>
              {canManage ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  新增角色
                </Button>
              ) : null}
            </>
          }
        />
        <Table<Role>
          rowKey="id"
          columns={columns}
          dataSource={rolesQuery.data?.roles ?? []}
          loading={rolesQuery.isLoading || rolesQuery.isFetching}
          scroll={{ x: 1180 }}
          locale={{ emptyText: '暂无角色' }}
          pagination={false}
        />
      </Card>

      <Drawer
        title={editing ? `编辑角色 · ${editing.name}` : '新增角色'}
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
          <Form.Item
            label="角色名称"
            name="name"
            rules={[{ required: true, message: '请输入角色名称' }, { max: 20, message: '最多 20 个字符' }]}
          >
            <Input placeholder="如：运营专员" />
          </Form.Item>
          <Form.Item
            label="角色编码"
            name="code"
            rules={[
              { required: true, message: '请输入角色编码' },
              { pattern: /^[a-z][a-z0-9_]{1,30}$/, message: '仅支持小写字母、数字与下划线' },
            ]}
          >
            <Input placeholder="如：operator" disabled={!!editing} />
          </Form.Item>
          <Form.Item label="角色描述" name="description">
            <Input.TextArea rows={2} maxLength={100} showCount placeholder="角色职责说明" />
          </Form.Item>
          <Form.Item
            label="权限配置"
            name="permission_ids"
            rules={[{ required: true, message: '请至少选择一个权限' }]}
          >
            <Tree
              checkable
              selectable={false}
              treeData={permissionTree}
              checkedKeys={checkedKeys}
              onCheck={(keys) => {
                const list = Array.isArray(keys) ? keys : keys.checked
                setCheckedKeys(list as number[])
                form.setFieldValue('permission_ids', list as number[])
              }}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  )
}
