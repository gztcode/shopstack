/**
 * 侧边菜单配置：按模块分组，菜单项按权限码过滤显示
 *
 * 权限码沿用 deploy/mysql/init/02-seed.sql 中 permissions 表已定义的 25 个权限码，
 * 新增页面复用既有权限码（不新增权限点）。
 */
import {
  AimOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BellOutlined,
  BarChartOutlined,
  BgColorsOutlined,
  CalendarOutlined,
  CarOutlined,
  CommentOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FundOutlined,
  GiftOutlined,
  HighlightOutlined,
  HistoryOutlined,
  InboxOutlined,
  KeyOutlined,
  LineChartOutlined,
  MailOutlined,
  MessageOutlined,
  PercentageOutlined,
  PhoneOutlined,
  PictureOutlined,
  PieChartOutlined,
  ProfileOutlined,
  QuestionCircleOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SolutionOutlined,
  TagsOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  TruckOutlined,
  UserOutlined,
  WalletOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'
import { hasAnyPermission } from '@/utils/permission'

export interface MenuItem {
  key: string
  label: string
  icon?: ReactNode
  /** 命中任意一个权限码即可见 */
  permissions: string[]
  children?: MenuItem[]
}

/** 菜单分组 */
export const menuGroups: MenuItem[] = [
  {
    key: 'overview',
    label: '概览',
    icon: <DashboardOutlined />,
    permissions: ['system:dashboard'],
    children: [
      { key: '/dashboard', label: '数据看板', icon: <BarChartOutlined />, permissions: ['system:dashboard'] },
      { key: '/analytics', label: '经营分析', icon: <RiseOutlined />, permissions: ['system:dashboard'] },
    ],
  },
  {
    key: 'product',
    label: '商品与内容',
    icon: <AppstoreOutlined />,
    permissions: [
      'product:view',
      'category:view',
      'inventory:view',
      'review:audit',
      'product:update',
    ],
    children: [
      { key: '/products', label: '商品管理', icon: <ShoppingCartOutlined />, permissions: ['product:view'] },
      { key: '/products/detail', label: '商品详情编辑', icon: <ProfileOutlined />, permissions: ['product:update'] },
      { key: '/skus', label: 'SKU 管理', icon: <TagsOutlined />, permissions: ['product:update'] },
      { key: '/materials', label: '素材库', icon: <PictureOutlined />, permissions: ['product:update'] },
      { key: '/categories', label: '分类管理', icon: <TagsOutlined />, permissions: ['category:view'] },
      { key: '/channels', label: '频道管理', icon: <AppstoreOutlined />, permissions: ['product:view'] },
      { key: '/channels/products', label: '频道商品', icon: <ShopOutlined />, permissions: ['product:view'] },
      { key: '/review-tags', label: '评价标签', icon: <TagsOutlined />, permissions: ['product:view'] },
      { key: '/reviews', label: '评价审核', icon: <CommentOutlined />, permissions: ['review:audit', 'product:view'] },
      { key: '/questions', label: '商品问答', icon: <QuestionCircleOutlined />, permissions: ['product:view'] },
      { key: '/questions/answer', label: '问答回复', icon: <MessageOutlined />, permissions: ['product:update'] },
      { key: '/guarantees', label: '服务保障', icon: <SafetyCertificateOutlined />, permissions: ['product:view'] },
      { key: '/product-params', label: '商品参数', icon: <FileTextOutlined />, permissions: ['product:view'] },
      { key: '/inventory', label: '库存管理', icon: <DatabaseOutlined />, permissions: ['inventory:view'] },
      { key: '/inventory/logs', label: '库存流水', icon: <HistoryOutlined />, permissions: ['inventory:view'] },
      { key: '/warehouses', label: '仓库管理', icon: <InboxOutlined />, permissions: ['inventory:view'] },
      { key: '/inbound-orders', label: '入库单', icon: <InboxOutlined />, permissions: ['inventory:view'] },
      { key: '/inbound-orders/create', label: '新建入库单', icon: <InboxOutlined />, permissions: ['inventory:adjust'] },
      { key: '/inbound-orders/detail', label: '入库单详情', icon: <InboxOutlined />, permissions: ['inventory:view'] },
      { key: '/outbound-orders', label: '出库单', icon: <AuditOutlined />, permissions: ['inventory:view'] },
      { key: '/outbound-orders/create', label: '新建出库单', icon: <AuditOutlined />, permissions: ['inventory:adjust'] },
      { key: '/outbound-orders/detail', label: '出库单详情', icon: <AuditOutlined />, permissions: ['inventory:view'] },
      { key: '/stock-checks', label: '盘点单', icon: <SolutionOutlined />, permissions: ['inventory:view'] },
      { key: '/stock-checks/detail', label: '盘点单详情', icon: <SolutionOutlined />, permissions: ['inventory:view'] },
      { key: '/stock-checks/items', label: '盘点明细', icon: <SolutionOutlined />, permissions: ['inventory:view'] },
    ],
  },
  {
    key: 'order',
    label: '交易与售后',
    icon: <SafetyCertificateOutlined />,
    permissions: ['order:view', 'refund:audit', 'payment:view'],
    children: [
      { key: '/orders', label: '订单管理', icon: <ShoppingCartOutlined />, permissions: ['order:view'] },
      { key: '/orders/list', label: '全部订单', icon: <FundOutlined />, permissions: ['order:view'] },
      { key: '/order-logs', label: '订单日志', icon: <HistoryOutlined />, permissions: ['order:view'] },
      { key: '/orders/stats/channel', label: '订单渠道统计', icon: <PieChartOutlined />, permissions: ['order:view'] },
      { key: '/orders/stats/hour', label: '订单时段统计', icon: <LineChartOutlined />, permissions: ['order:view'] },
      { key: '/orders/stats/region', label: '订单地区统计', icon: <EnvironmentOutlined />, permissions: ['order:view'] },
      { key: '/refunds', label: '退款审核', icon: <GiftOutlined />, permissions: ['refund:audit', 'order:view'] },
      { key: '/after-sales', label: '售后管理', icon: <SolutionOutlined />, permissions: ['refund:audit', 'order:view'] },
      { key: '/after-sales/detail', label: '售后详情', icon: <SolutionOutlined />, permissions: ['refund:audit', 'order:view'] },
      { key: '/refund-reasons', label: '退款原因', icon: <PercentageOutlined />, permissions: ['refund:audit'] },
      { key: '/payments', label: '支付管理', icon: <HighlightOutlined />, permissions: ['payment:view'] },
      { key: '/pay-channels', label: '支付渠道', icon: <WalletOutlined />, permissions: ['payment:view'] },
      { key: '/recharge-orders', label: '充值订单', icon: <WalletOutlined />, permissions: ['payment:view'] },
      { key: '/balance-logs', label: '余额流水', icon: <WalletOutlined />, permissions: ['payment:view'] },
    ],
  },
  {
    key: 'user',
    label: '用户与会员',
    icon: <TeamOutlined />,
    permissions: ['user:view'],
    children: [
      { key: '/users', label: '用户管理', icon: <UserOutlined />, permissions: ['user:view'] },
      { key: '/users/by-level', label: '按等级用户', icon: <TeamOutlined />, permissions: ['user:view'] },
      { key: '/user-levels', label: '会员等级', icon: <ThunderboltOutlined />, permissions: ['user:view'] },
      { key: '/user-levels/detail', label: '等级详情', icon: <ThunderboltOutlined />, permissions: ['user:view'] },
      { key: '/user-levels/stats', label: '等级分布', icon: <PieChartOutlined />, permissions: ['user:view'] },
      { key: '/growth-logs', label: '成长值流水', icon: <RiseOutlined />, permissions: ['user:view'] },
      { key: '/feedbacks', label: '用户反馈', icon: <CommentOutlined />, permissions: ['user:view'] },
      { key: '/feedbacks/detail', label: '反馈处理', icon: <CommentOutlined />, permissions: ['user:update', 'user:view'] },
    ],
  },
  {
    key: 'marketing',
    label: '营销与活动',
    icon: <GiftOutlined />,
    permissions: ['marketing:view', 'coupon:update', 'promotion:update', 'content:view', 'banner:update'],
    children: [
      { key: '/coupons', label: '优惠券', icon: <GiftOutlined />, permissions: ['coupon:update', 'marketing:view'] },
      { key: '/promotions', label: '活动管理', icon: <BgColorsOutlined />, permissions: ['promotion:update', 'marketing:view'] },
      { key: '/promotion-sessions', label: '活动场次', icon: <ScheduleOutlined />, permissions: ['promotion:update'] },
      { key: '/group-buys', label: '拼团管理', icon: <TeamOutlined />, permissions: ['promotion:update'] },
      { key: '/group-buys/detail', label: '拼团详情', icon: <TeamOutlined />, permissions: ['promotion:update'] },
      { key: '/group-buys/members', label: '拼团成员', icon: <TeamOutlined />, permissions: ['promotion:update'] },
      { key: '/marketing-tasks', label: '营销任务', icon: <ExperimentOutlined />, permissions: ['promotion:update'] },
      { key: '/sign-in-config', label: '签到配置', icon: <CalendarOutlined />, permissions: ['promotion:update'] },
      { key: '/banners', label: '轮播管理', icon: <BgColorsOutlined />, permissions: ['banner:update', 'content:view'] },
    ],
  },
  {
    key: 'logistics',
    label: '物流与配送',
    icon: <CarOutlined />,
    permissions: ['logistics:view'],
    children: [
      { key: '/logistics', label: '运费与发货', icon: <CarOutlined />, permissions: ['logistics:view'] },
      { key: '/logistics/track', label: '物流轨迹', icon: <AimOutlined />, permissions: ['logistics:view'] },
      { key: '/logistics/companies', label: '快递公司', icon: <TruckOutlined />, permissions: ['logistics:view'] },
      { key: '/logistics/ranges', label: '配送范围', icon: <EnvironmentOutlined />, permissions: ['logistics:view'] },
      { key: '/logistics/templates', label: '运费模板', icon: <FileTextOutlined />, permissions: ['logistics:view'] },
      { key: '/logistics/templates/detail', label: '模板详情', icon: <FileTextOutlined />, permissions: ['logistics:view'] },
      { key: '/logistics/freight', label: '运费试算', icon: <ToolOutlined />, permissions: ['logistics:view'] },
      { key: '/shipments', label: '发货单', icon: <InboxOutlined />, permissions: ['logistics:view'] },
      { key: '/shipments/detail', label: '发货单详情', icon: <InboxOutlined />, permissions: ['logistics:view'] },
      { key: '/return-shipments', label: '退货运单', icon: <TruckOutlined />, permissions: ['logistics:view'] },
    ],
  },
  {
    key: 'system',
    label: '系统与通知',
    icon: <SettingOutlined />,
    permissions: ['system:role', 'system:audit'],
    children: [
      { key: '/system/roles', label: '角色权限', icon: <SafetyCertificateOutlined />, permissions: ['system:role'] },
      { key: '/system/permissions', label: '权限清单', icon: <KeyOutlined />, permissions: ['system:role'] },
      { key: '/settings', label: '系统设置', icon: <ToolOutlined />, permissions: ['system:role'] },
      { key: '/system/audit-logs', label: '操作日志', icon: <HighlightOutlined />, permissions: ['system:audit'] },
      { key: '/system/sms', label: '短信记录', icon: <CommentOutlined />, permissions: ['system:audit', 'system:role'] },
      { key: '/system/sms/send', label: '短信发送台', icon: <MessageOutlined />, permissions: ['system:audit'] },
      { key: '/notification-templates', label: '通知模板', icon: <BellOutlined />, permissions: ['system:audit'] },
      { key: '/sms-templates', label: '短信模板', icon: <PhoneOutlined />, permissions: ['system:audit'] },
      { key: '/sensitive-words', label: '敏感词管理', icon: <WarningOutlined />, permissions: ['system:audit'] },
      { key: '/notification-categories', label: '通知分类', icon: <MailOutlined />, permissions: ['system:audit'] },
      { key: '/invoices', label: '发票管理', icon: <FileTextOutlined />, permissions: ['system:audit'] },
    ],
  },
]

/** 路由路径 → 面包屑标题 */
export const routeTitles: Record<string, string> = {
  '/dashboard': '数据看板',
  '/products': '商品管理',
  '/categories': '分类管理',
  '/reviews': '评价审核',
  '/inventory': '库存管理',
  '/orders': '订单管理',
  '/refunds': '退款审核',
  '/payments': '支付管理',
  '/users': '用户管理',
  '/coupons': '优惠券',
  '/promotions': '活动管理',
  '/banners': '轮播管理',
  '/logistics': '运费与发货',
  '/system/roles': '角色权限',
  '/system/audit-logs': '操作日志',
  '/system/sms': '短信记录',
  '/materials': '素材库',
  '/invoices': '发票管理',
  '/analytics': '经营分析',
  '/settings': '系统设置',
  '/skus': 'SKU 管理',
  '/products/detail': '商品详情编辑',
  '/system/permissions': '权限清单',
  '/inventory/logs': '库存流水',
  '/logistics/track': '物流轨迹',
  '/system/sms/send': '短信发送台',
  '/channels': '频道管理',
  '/channels/products': '频道商品',
  '/review-tags': '评价标签',
  '/questions': '商品问答',
  '/questions/answer': '问答回复',
  '/guarantees': '服务保障',
  '/promotion-sessions': '活动场次',
  '/group-buys': '拼团管理',
  '/group-buys/detail': '拼团详情',
  '/group-buys/members': '拼团成员',
  '/marketing-tasks': '营销任务',
  '/sign-in-config': '签到配置',
  '/product-params': '商品参数',
  '/after-sales': '售后管理',
  '/after-sales/detail': '售后详情',
  '/refund-reasons': '退款原因',
  '/orders/list': '全部订单',
  '/orders/stats/channel': '订单渠道统计',
  '/orders/stats/hour': '订单时段统计',
  '/orders/stats/region': '订单地区统计',
  '/order-logs': '订单日志',
  '/pay-channels': '支付渠道',
  '/recharge-orders': '充值订单',
  '/balance-logs': '余额流水',
  '/return-shipments': '退货运单',
  '/warehouses': '仓库管理',
  '/inbound-orders': '入库单',
  '/inbound-orders/detail': '入库单详情',
  '/inbound-orders/create': '新建入库单',
  '/outbound-orders': '出库单',
  '/outbound-orders/detail': '出库单详情',
  '/outbound-orders/create': '新建出库单',
  '/stock-checks': '盘点单',
  '/stock-checks/detail': '盘点单详情',
  '/stock-checks/items': '盘点明细',
  '/user-levels': '会员等级',
  '/user-levels/detail': '用户等级详情',
  '/user-levels/stats': '用户等级分布',
  '/users/by-level': '按等级用户列表',
  '/growth-logs': '成长值流水',
  '/feedbacks': '用户反馈',
  '/feedbacks/detail': '反馈处理',
  '/logistics/companies': '快递公司',
  '/logistics/ranges': '配送范围',
  '/logistics/templates': '运费模板',
  '/logistics/templates/detail': '运费模板详情',
  '/logistics/freight': '运费试算',
  '/notification-templates': '通知模板',
  '/sms-templates': '短信模板',
  '/sensitive-words': '敏感词',
  '/notification-categories': '通知分类',
  '/shipments': '发货单',
  '/shipments/detail': '发货单详情',
}

/** 根据权限码过滤菜单 */
export function filterMenu(permissions: string[]): MenuItem[] {
  return menuGroups
    .map((group) => {
      const children = (group.children ?? []).filter((item) =>
        hasAnyPermission(permissions, item.permissions),
      )
      return { ...group, children }
    })
    .filter((group) => (group.children ?? []).length > 0)
}

/** 路由是否可访问 */
export function canAccess(pathname: string, permissions: string[]): boolean {
  for (const group of menuGroups) {
    for (const item of group.children ?? []) {
      if (item.key === pathname) return hasAnyPermission(permissions, item.permissions)
    }
  }
  return false
}
