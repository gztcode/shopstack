/**
 * 用户 / 后台 / 角色 / 权限类型 —— 对齐 proto/shopstack/user/v1/user.proto
 */
import type { Gender, PageMeta, PageRequest, UserStatus } from './common'

/** 用户（User） */
export interface User {
  id: number
  username: string
  nickname: string
  avatar: string
  phone: string
  email: string
  gender: Gender
  birthday: string
  points: number
  balance_cents: number
  status: UserStatus
  wechat_openid: string
  /** 会员等级 */
  level: number
  /** 成长值 */
  growth: number
  created_at: string
  last_login_at: string
}

/** 后台管理员（Admin） */
export interface Admin {
  id: number
  username: string
  real_name: string
  avatar: string
  email: string
  phone: string
  role_ids: number[]
  role_names: string[]
  status: number
  created_at: string
  last_login_at: string
}

/** 角色（Role） */
export interface Role {
  id: number
  name: string
  code: string
  description: string
  permission_ids: number[]
  permission_codes: string[]
  user_count: number
  created_at: string
}

/** 权限（Permission） */
export interface Permission {
  id: number
  name: string
  code: string
  /** 分组：product / order / user / marketing / system / logistics */
  group: string
  /** menu | action */
  type: string
  parent_code: string
  sort: number
}

/** 登录响应（AuthResponse） */
export interface AuthResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user?: User
  admin?: Admin
  permissions: string[]
}

/** 看板趋势点（AdminTrendPoint） */
export interface AdminTrendPoint {
  date: string
  order_count: number
  revenue_cents: number
  new_users: number
}

/** 分类销售统计（AdminCategoryStat） */
export interface AdminCategoryStat {
  category_id: number
  category_name: string
  sales_count: number
  revenue_cents: number
}

/** 热销商品（AdminTopProduct） */
export interface AdminTopProduct {
  product_id: number
  title: string
  cover: string
  sales_count: number
  revenue_cents: number
}

/** 看板概览（AdminDashboardOverviewResponse） */
export interface DashboardOverview {
  total_users: number
  new_users: number
  total_products: number
  on_shelf_products: number
  total_orders: number
  pending_shipment: number
  paid_orders: number
  total_revenue_cents: number
  today_revenue_cents: number
  pending_refunds: number
  trend: AdminTrendPoint[]
  category_stats: AdminCategoryStat[]
  top_products: AdminTopProduct[]
}

/** 用户列表查询（AdminListUsersRequest） */
export interface ListUsersParams extends Partial<PageRequest> {
  /** 按会员等级筛选 */
  level?: number
  keyword?: string
  status?: number
}

/** 用户列表响应（AdminListUsersResponse） */
export interface ListUsersResponse {
  users: User[]
  meta: PageMeta
}

/** 保存角色（SaveRoleRequest） */
export interface SaveRoleRequest {
  id?: number
  name: string
  code: string
  description?: string
  permission_ids: number[]
}

/** 更新管理员资料（AdminUpdateProfileRequest） */
export interface UpdateAdminProfileRequest {
  admin_id: number
  real_name?: string
  avatar?: string
  email?: string
  phone?: string
}

/** 积分明细（PointsLog） */
export interface PointsLog {
  id: number
  user_id: number
  /** 变动说明 */
  title: string
  /** 正数为增加，负数为减少 */
  change: number
  /** 变动后余额 */
  balance: number
  /** register / order / exchange / admin */
  biz_type: string
  biz_id: string
  created_at: string
}

/** 积分明细分页响应（ListPointsLogsResponse） */
export interface ListPointsLogsResponse {
  logs: PointsLog[]
  meta: PageMeta
  /** 当前积分 */
  current_points: number
}

/** 修改密码（ChangePasswordRequest） */
export interface ChangePasswordRequest {
  old_password: string
  new_password: string
}
