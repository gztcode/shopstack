/**
 * 权限清单
 */
import { useMemo, useState } from 'react'
import { Button, Card, Input, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { CopyOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { listPermissions } from '@/api/admin'
import { useApiQuery } from '@/hooks/useApi'
import { formatNumber } from '@/utils/format'
import type { Permission } from '@/types'
import PageContainer from '@/components/PageContainer'
import TableToolbar from '@/components/TableToolbar'
import DemoModeAlert from '@/components/DemoModeAlert'
import { useMessage } from '@/hooks/useMessage'

/** 权限分组中文名 */
const GROUP_LABELS: Record<string, string> = {
  product: '商品',
  order: '订单',
  user: '用户',
  marketing: '营销',
  logistics: '物流',
  system: '系统',
}

/** 权限清单页 */
export default function Permissions() {
  const message = useMessage()
  const queryClient = useQueryClient()
  const [keyword, setKeyword] = useState('')
  const [group, setGroup] = useState<string | undefined>()

  const permissionsQuery = useApiQuery(['permissions', 'catalog'], () => listPermissions())
  const all = permissionsQuery.data?.permissions ?? []

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['permissions'] })

  const groupOptions = useMemo(() => {
    const groups = Array.from(new Set(all.map((item) => item.group)))
    return groups.map((item) => ({ label: GROUP_LABELS[item] ?? item, value: item }))
  }, [all])

  const list = useMemo(() => {
    let result = all
    if (group) result = result.filter((item) => item.group === group)
    if (keyword.trim()) {
      const key = keyword.trim().toLowerCase()
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(key) ||
          item.code.toLowerCase().includes(key) ||
          (GROUP_LABELS[item.group] ?? item.group).includes(key),
      )
    }
    return result
  }, [all, group, keyword])

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      message.success(`已复制权限码：${code}`)
    } catch {
      message.warning('当前浏览器不支持自动复制，请手动选择复制')
    }
  }

  const columns: ColumnsType<Permission> = [
    {
      title: '权限名称',
      dataIndex: 'name',
      width: 200,
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: '权限码',
      dataIndex: 'code',
      width: 240,
      render: (value: string) => (
        <Space size={6}>
          <Typography.Text style={{ fontFamily: 'monospace' }} copyable={{ text: value }}>
            {value}
          </Typography.Text>
          <Tooltip title="复制权限码">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(value)}
              aria-label="复制权限码"
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '所属模块',
      dataIndex: 'group',
      width: 120,
      render: (value: string) => <Tag color="blue">{GROUP_LABELS[value] ?? value}</Tag>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      render: (value: string) => (
        <Tag color={value === 'menu' ? 'green' : 'default'}>{value === 'menu' ? '菜单' : '操作'}</Tag>
      ),
    },
    {
      title: '父级权限',
      dataIndex: 'parent_code',
      width: 180,
      render: (value: string) =>
        value ? (
          <Typography.Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{value}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">顶级权限</Typography.Text>
        ),
    },
    { title: '排序', dataIndex: 'sort', width: 80, align: 'right' },
    { title: 'ID', dataIndex: 'id', width: 70, align: 'right' },
  ]

  return (
    <PageContainer title="权限清单" description="后台功能权限码总览，可搜索与复制权限码">
      <DemoModeAlert onRetry={refresh} />

      <Card>
        <div className="search-form">
          <Space size={12} wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索权限名称或权限码"
              style={{ width: 260 }}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Select
              allowClear
              placeholder="全部模块"
              style={{ width: 160 }}
              options={groupOptions}
              value={group}
              onChange={(value) => setGroup(value as string | undefined)}
            />
            <Button onClick={() => { setKeyword(''); setGroup(undefined) }}>重置</Button>
          </Space>
        </div>

        <TableToolbar
          title="权限列表"
          description={`共 ${formatNumber(all.length)} 条权限，当前筛选 ${list.length} 条`}
          extra={
            <Button icon={<ReloadOutlined />} onClick={refresh}>
              刷新
            </Button>
          }
        />

        <Table<Permission>
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={permissionsQuery.isLoading || permissionsQuery.isFetching}
          scroll={{ x: 1000 }}
          locale={{ emptyText: '没有匹配的权限' }}
          pagination={false}
        />
      </Card>
    </PageContainer>
  )
}
