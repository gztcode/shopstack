/**
 * 顶栏用户下拉菜单：个人信息 / 修改密码 / 退出登录
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Dropdown, Modal, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { KeyOutlined, LogoutOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { useMockStore } from '@/store/mock'
import ProfileModal from './ProfileModal'
import PasswordModal from './PasswordModal'
import { useMessage } from '@/hooks/useMessage'

/** 用户下拉菜单 */
export default function UserMenu() {
  const message = useMessage()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const admin = useAuthStore((state) => state.admin)
  const logout = useAuthStore((state) => state.logout)
  const resetMock = useMockStore((state) => state.reset)
  const [profileOpen, setProfileOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出登录？',
      content: '退出后需要重新登录才能访问后台。',
      okText: '退出登录',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        logout()
        resetMock()
        queryClient.clear()
        message.success('已退出登录')
        navigate('/login', { replace: true })
      },
    })
  }

  const items: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
    { key: 'password', icon: <KeyOutlined />, label: '修改密码' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ]

  const onMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'profile') setProfileOpen(true)
    else if (key === 'password') setPasswordOpen(true)
    else if (key === 'logout') handleLogout()
  }

  return (
    <>
      <Dropdown menu={{ items, onClick: onMenuClick }} placement="bottomRight" trigger={['click']}>
        <Space className="user-menu" size={8}>
          <Avatar size={30} src={admin?.avatar} icon={<SettingOutlined />} />
          <div className="user-menu__meta">
            <Typography.Text strong className="user-menu__name">
              {admin?.real_name || admin?.username || '未登录'}
            </Typography.Text>
            <Typography.Text type="secondary" className="user-menu__role">
              {admin?.role_names?.join('、') || '—'}
            </Typography.Text>
          </div>
        </Space>
      </Dropdown>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <PasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  )
}
