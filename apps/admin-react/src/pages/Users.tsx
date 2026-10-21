/**
 * 用户管理
 */
import { useMemo, useState } from 'react'
import { Avatar, Button, Card, Form, Input, Modal, Select, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, StopOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { listUsers, updateUserStatus } from '@/api/admin'
import { useApiQuery } from '@/hooks/useApi'
import { hasPermission } from '@/utils/permission'
import { formatDateTime, formatNumber, formatYuan } from '@/utils/format'
import { USER_STATUS_OPTIONS } from '@/utils/enums'
import { useAuthStore } from '@/store/auth'
import type { ListUsersParams, User } from '@/types'
import PageContainer from '@/components/PageContainer'
import SearchForm, { type SearchFormValues } from '@/components/SearchForm'
import StatusTag from '@/components/StatusTag'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { validateForm } from '@/utils/form'
import { useMessage } from '@/hooks/useMessage'

/** 用户管理页 */
export default function Users() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((state) => state.permissions)
  const [form] = Form.useForm<{ reason?: string }>()
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<number | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [current, setCurrent] = useState<User | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const canUpdate = hasPermission(permissions, 'user:update')

  const queryParams = useMemo<ListUsersParams>(
    () => ({ page, page_size: pageSize, keyword: keyword || undefined, status }),
    [page, pageSize, keyword, status],
  )

  const usersQuery = useApiQuery(['users', queryParams], () => listUsers(queryParams))

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['users'] })

  const handleSearch = (values: SearchFormValues) => {
    setKeyword(String(values.keyword ?? '').trim())
    setStatus(values.status === undefined ? undefined : Number(values.status))
    setPage(1)
  }

  const handleReset = () => {
    setKeyword('')
    setStatus(undefined)
    setPage(1)
  }

  const openDisable = (record: User) => {
    setCurrent(record)
    form.resetFields()
    setModalOpen(true)
  }

  const handleDisable = async () => {
    if (!current) return
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      await updateUserStatus(current.id, 2, values.reason)
      message.success('用户已被禁用')
      setModalOpen(false)
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEnable = async (record: User) => {
    try {
      await updateUserStatus(record.id, 1, '恢复正常')
      message.success('用户已启用')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  const columns: ColumnsType<User> = [
    {
      title: '用户',
      dataIndex: 'nickname',
      width: 180,
      render: (value: string, record) => (
        <Space>
          <Avatar size={34} src={record.avatar} />
          <div>
            <Typography.Text strong>{value}</Typography.Text>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {record.username} · UID {record.id}
              </Typography.Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '联系方式',
      dataIndex: 'phone',
      width: 190,
      render: (value: string, record) => (
        <div>
          <div>{value || '—'}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.email || '—'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '积分',
      dataIndex: 'points',
      width: 100,
      align: 'right',
      render: (value: number) => formatNumber(value),
    },
    {
      title: '余额',
      dataIndex: 'balance_cents',
      width: 120,
      align: 'right',
      render: (value: number) => formatYuan(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '最近登录',
      dataIndex: 'last_login_at',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_: unknown, record) => {
        if (!canUpdate) return <Typography.Text type="secondary">—</Typography.Text>
        return record.status === 'USER_STATUS_ACTIVE' ? (
          <Button type="link" size="small" danger icon={<StopOutlined />} onClick={() => openDisable(record)}>
            禁用
          </Button>
        ) : (
          <Button type="link" size="small" onClick={() => handleEnable(record)}>
            启用
          </Button>
        )
      },
    },
  ]

  return (
    <PageContainer title="用户管理" description="查看用户资料、积分余额与账号状态">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <SearchForm onSearch={handleSearch} onReset={handleReset} loading={usersQuery.isFetching}>
          <Form.Item name="keyword" label="关键词">
            <Input allowClear placeholder="昵称 / 账号 / 手机号" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: 160 }}
              options={USER_STATUS_OPTIONS}
            />
          </Form.Item>
        </SearchForm>

        <TableToolbar
          title="用户列表"
          description={`共 ${formatNumber(usersQuery.data?.meta.total ?? 0)} 位用户`}
          extra={
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
            </Button>
          }
        />

        <Table<User>
          rowKey="id"
          columns={columns}
          dataSource={usersQuery.data?.users ?? []}
          loading={usersQuery.isLoading || usersQuery.isFetching}
          scroll={{ x: 1180 }}
          locale={{ emptyText: '暂无用户数据' }}
          pagination={{
            current: page,
            pageSize,
            total: usersQuery.data?.meta.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${formatNumber(total)} 位`,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage)
              setPageSize(nextSize)
            },
          }}
        />
      </Card>

      <Modal
        title="禁用用户"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleDisable}
        confirmLoading={submitting}
        okText="确认禁用"
        okButtonProps={{ danger: true }}
        cancelText="取消"
        destroyOnHidden
      >
        <Typography.Paragraph>
          即将禁用用户 <strong>{current?.nickname}</strong>（{current?.username}）。
        </Typography.Paragraph>
        <Form form={form} layout="vertical">
          <Form.Item label="禁用原因" name="reason">
            <Input.TextArea rows={3} maxLength={200} showCount placeholder="选填，将记录到操作日志" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
