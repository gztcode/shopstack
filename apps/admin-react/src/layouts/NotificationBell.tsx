/**
 * 顶栏通知铃铛
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Empty, List, Popover, Space, Typography } from 'antd'
import { BellOutlined, CheckOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/api/notification'
import { useApiQuery } from '@/hooks/useApi'
import { useAuthStore } from '@/store/auth'
import { formatDateTime } from '@/utils/format'
import StatusTag from '@/components/StatusTag'
import { useMessage } from '@/hooks/useMessage'

/** 通知铃铛 */
export default function NotificationBell() {
  const message = useMessage()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const adminId = useAuthStore((state) => state.admin?.id)

  const { data, isFetching } = useApiQuery(
    ['notifications', adminId],
    () => listNotifications({ user_id: adminId, page: 1, page_size: 8 }),
    { refetchInterval: 60000 },
  )

  const notifications = data?.notifications ?? []
  const unread = data?.unread_count ?? 0

  const handleRead = async (id: number) => {
    await markNotificationRead(id, adminId)
    await queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const handleReadAll = async () => {
    await markAllNotificationsRead(adminId)
    await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    message.success('全部通知已标记为已读')
  }

  const content = (
    <div style={{ width: 340 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Typography.Text strong>通知中心</Typography.Text>
        <Button
          type="link"
          size="small"
          icon={<CheckOutlined />}
          disabled={unread === 0}
          onClick={handleReadAll}
        >
          全部已读
        </Button>
      </div>
      {notifications.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无通知" />
      ) : (
        <List
          size="small"
          dataSource={notifications}
          loading={isFetching}
          renderItem={(item) => (
            <List.Item
              style={{ cursor: 'pointer' }}
              onClick={() => {
                handleRead(item.id)
                if (item.link) navigate(item.link)
                setOpen(false)
              }}
            >
              <List.Item.Meta
                avatar={
                  <span style={{ color: item.read ? '#B3BECC' : '#2A4AD9' }}>
                    <BellOutlined />
                  </span>
                }
                title={
                  <Space size={6}>
                    <span style={{ fontWeight: item.read ? 400 : 600 }}>{item.title}</span>
                    <StatusTag status={item.type} />
                  </Space>
                }
                description={
                  <div>
                    <div style={{ fontSize: 12 }}>{item.content}</div>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>{formatDateTime(item.created_at)}</div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  )

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <Badge count={unread} size="small" offset={[-2, 4]}>
        <Button type="text" shape="circle" icon={<BellOutlined />} aria-label="通知" />
      </Badge>
    </Popover>
  )
}
