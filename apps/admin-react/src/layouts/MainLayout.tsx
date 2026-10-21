/**
 * 后台主布局：左侧可折叠菜单 + 顶栏（面包屑 / 搜索 / 通知 / 用户菜单）
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Breadcrumb, Layout, Menu, Spin } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined, ShopOutlined } from '@ant-design/icons'
import { useIsFetching } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { filterMenu, routeTitles } from './menu'
import GlobalSearch from './GlobalSearch'
import NotificationBell from './NotificationBell'
import UserMenu from './UserMenu'

const { Header, Sider, Content } = Layout

/** 全局加载遮罩：存在进行中的请求时展示（延迟 250ms 避免闪烁） */
function useGlobalLoading(): boolean {
  const fetching = useIsFetching()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (fetching === 0) {
      setVisible(false)
      return
    }
    const timer = window.setTimeout(() => setVisible(true), 250)
    return () => window.clearTimeout(timer)
  }, [fetching])

  return visible
}

/** 主布局 */
export default function MainLayout() {
  const location = useLocation()
  const permissions = useAuthStore((state) => state.permissions)
  const [collapsed, setCollapsed] = useState(false)
  const globalLoading = useGlobalLoading()

  const menuItems = useMemo(
    () =>
      filterMenu(permissions).map((group) => ({
        key: group.key,
        label: group.label,
        icon: group.icon,
        children: (group.children ?? []).map((item) => ({
          key: item.key,
          icon: item.icon,
          label: <Link to={item.key}>{item.label}</Link>,
        })),
      })),
    [permissions],
  )

  // 依据当前路径展开对应菜单分组
  const openKeys = useMemo(() => {
    for (const group of filterMenu(permissions)) {
      if ((group.children ?? []).some((item) => item.key === location.pathname)) {
        return [group.key]
      }
    }
    return []
  }, [location.pathname, permissions])

  const selectedKeys = [location.pathname]
  const currentTitle = routeTitles[location.pathname] ?? '后台管理'

  return (
    <Layout className="app-layout">
      <Sider
        theme="light"
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={220}
        collapsedWidth={64}
        className="app-sider"
      >
        <div className="app-logo">
          <ShopOutlined className="app-logo__icon" />
          {!collapsed ? <span className="app-logo__text">ShopStack 中台</span> : null}
        </div>
        <Menu
          mode="inline"
          items={menuItems}
          selectedKeys={selectedKeys}
          defaultOpenKeys={openKeys}
          key={openKeys.join(',')}
        />
      </Sider>

      <Layout>
        <Header className="app-header">
          <div className="app-header__left">
            <button
              type="button"
              className="app-collapse"
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label="切换菜单折叠"
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
            <Breadcrumb
              items={[{ title: 'ShopStack 中台' }, { title: currentTitle }]}
              className="app-breadcrumb"
            />
          </div>
          <div className="app-header__right">
            <GlobalSearch />
            <NotificationBell />
            <UserMenu />
          </div>
        </Header>

        <Content className="app-content">
          {globalLoading ? (
            <div className="app-loading-mask">
              <Spin size="large" tip="加载中...">
                <div style={{ height: 120, width: 1 }} />
              </Spin>
            </div>
          ) : null}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
