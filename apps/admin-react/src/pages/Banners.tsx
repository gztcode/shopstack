/**
 * 轮播管理
 */
import { useState } from 'react'
import { Button, Card, Drawer, Form, Input, InputNumber, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { deleteBanner, listBanners, saveBanner } from '@/api/product'
import { useApiQuery } from '@/hooks/useApi'
import { hasPermission } from '@/utils/permission'
import { BANNER_POSITION_OPTIONS } from '@/utils/enums'
import { formatDateTime } from '@/utils/format'
import { useAuthStore } from '@/store/auth'
import type { Banner, SaveBannerRequest } from '@/types'
import PageContainer from '@/components/PageContainer'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { validateForm } from '@/utils/form'
import { useMessage } from '@/hooks/useMessage'

interface BannerFormValues {
  title: string
  image: string
  link?: string
  sort: number
  position: string
  visible: boolean
}

/** 轮播管理页 */
export default function Banners() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const permissions = useAuthStore((state) => state.permissions)
  const [form] = Form.useForm<BannerFormValues>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canUpdate = hasPermission(permissions, 'banner:update')

  const bannersQuery = useApiQuery(['banners'], () => listBanners())
  const banners = bannersQuery.data?.banners ?? []

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['banners'] })

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ sort: banners.length + 1, position: 'home_banner', visible: true })
    setDrawerOpen(true)
  }

  const openEdit = (record: Banner) => {
    setEditing(record)
    form.resetFields()
    form.setFieldsValue({
      title: record.title,
      image: record.image,
      link: record.link,
      sort: record.sort,
      position: record.position,
      visible: record.visible,
    })
    setDrawerOpen(true)
  }

  const handleSubmit = async () => {
    const values = await validateForm(form)
    if (values === null) return
    setSubmitting(true)
    try {
      const payload: SaveBannerRequest = { id: editing?.id, ...values }
      await saveBanner(payload)
      message.success(editing ? '轮播已更新' : '轮播已创建')
      setDrawerOpen(false)
      refresh()
    } catch (error) {
      if (error instanceof Error) message.error(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (record: Banner) => {
    try {
      await deleteBanner(record.id)
      message.success('轮播已删除')
      refresh()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  const columns: ColumnsType<Banner> = [
    {
      title: '预览',
      dataIndex: 'image',
      width: 160,
      render: (image: string, record) => (
        <img
          src={image}
          alt={record.title}
          style={{ width: 140, height: 58, objectFit: 'cover', borderRadius: 6, background: '#F1F5F9' }}
        />
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      render: (value: string, record) => (
        <div>
          <Typography.Text strong>{value}</Typography.Text>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              链接：{record.link || '—'}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: '位置',
      dataIndex: 'position',
      width: 130,
      render: (value: string) => {
        const option = BANNER_POSITION_OPTIONS.find((item) => item.value === value)
        return <Tag color="blue">{option?.label ?? value}</Tag>
      },
    },
    { title: '排序', dataIndex: 'sort', width: 80, align: 'right' },
    {
      title: '状态',
      dataIndex: 'visible',
      width: 90,
      render: (value: boolean) => (
        <Typography.Text type={value ? 'success' : 'secondary'}>
          {value ? '展示中' : '已隐藏'}
        </Typography.Text>
      ),
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
          {canUpdate ? (
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              编辑
            </Button>
          ) : null}
          {canUpdate ? (
            <Popconfirm
              title="确认删除该轮播？"
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
    <PageContainer title="轮播管理" description="维护首页与分类页轮播位">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <TableToolbar
          title="轮播列表"
          description={`共 ${banners.length} 个轮播位`}
          extra={
            <>
              <Button icon={<ReloadOutlined />} onClick={refresh}>
                刷新
              </Button>
              {canUpdate ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                  新增轮播
                </Button>
              ) : null}
            </>
          }
        />
        <Table<Banner>
          rowKey="id"
          columns={columns}
          dataSource={banners}
          loading={bannersQuery.isLoading || bannersQuery.isFetching}
          scroll={{ x: 1000 }}
          locale={{ emptyText: '暂无轮播' }}
          pagination={false}
        />
      </Card>

      <Drawer
        title={editing ? `编辑轮播 · ${editing.title}` : '新增轮播'}
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
            label="标题"
            name="title"
            rules={[{ required: true, message: '请输入标题' }, { max: 40, message: '最多 40 个字符' }]}
          >
            <Input placeholder="如：夏日数码狂欢季" />
          </Form.Item>
          <Form.Item
            label="图片地址"
            name="image"
            rules={[{ required: true, message: '请输入图片地址' }]}
          >
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item label="跳转链接" name="link">
            <Input placeholder="/category/1" />
          </Form.Item>
          <Space size={16}>
            <Form.Item label="位置" name="position" rules={[{ required: true, message: '请选择位置' }]}>
              <Select options={BANNER_POSITION_OPTIONS} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item label="排序" name="sort" rules={[{ required: true, message: '请输入排序' }]}>
              <InputNumber min={0} precision={0} style={{ width: 140 }} />
            </Form.Item>
          </Space>
          <Form.Item label="是否展示" name="visible" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  )
}
