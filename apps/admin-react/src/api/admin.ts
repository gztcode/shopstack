/**
 * 后台管理域接口 —— user.proto(AdminService) / 看板 / 角色权限
 */
import { ApiError, del, get, post, put, withMock } from './client'
import type {
  Admin,
  AuthResponse,
  ChangePasswordRequest,
  DashboardOverview,
  ListUsersParams,
  ListUsersResponse,
  OperationResult,
  Permission,
  Role,
  SaveRoleRequest,
  UpdateAdminProfileRequest,
} from '@/types'
import {
  mockAdminLogin,
  mockDashboardOverview,
  mockDeleteRole,
  mockGetAdminProfile,
  mockListPermissions,
  mockListRoles,
  mockListUsers,
  mockSaveRole,
  mockUpdateUserStatus,
} from '@/mock'

/**
 * 后台登录
 * 网关不可用（或登录接口尚未放行）时回退到演示账号（admin / admin123456）；
 * 密码错误由 mock 侧校验并抛出「账号或密码错误」。
 */
export async function adminLogin(username: string, password: string): Promise<AuthResponse> {
  try {
    return await post<AuthResponse>('/admin/auth/login', { username, password })
  } catch (error) {
    const status = error instanceof ApiError ? error.status : undefined
    // 业务类错误（参数错误、账号锁定等）直接透出网关提示
    if (status && status !== 401 && status !== 403 && status !== 404 && status !== 502 && status !== 503) {
      throw error
    }
    return mockAdminLogin(username, password)
  }
}

/** 获取当前管理员资料 */
export function getAdminProfile(): Promise<Admin> {
  return withMock('管理员资料', () => get<Admin>('/admin/me'), () => mockGetAdminProfile())
}

/** 更新管理员资料 */
export function updateAdminProfile(payload: UpdateAdminProfileRequest): Promise<Admin> {
  return withMock(
    '更新管理员资料',
    () => put<Admin>('/admin/me', payload),
    () =>
      ({
        id: payload.admin_id,
        username: 'admin',
        real_name: payload.real_name ?? '',
        avatar: payload.avatar ?? '',
        email: payload.email ?? '',
        phone: payload.phone ?? '',
        role_ids: [],
        role_names: [],
        status: 1,
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      }) as Admin,
  )
}

/** 修改密码 */
export function changePassword(payload: ChangePasswordRequest): Promise<OperationResult> {
  return withMock(
    '修改密码',
    () => post<OperationResult>('/users/password', payload),
    () => ({ success: true, message: '密码修改成功' }),
  )
}

/** 用户列表 */
export function listUsers(params: ListUsersParams = {}): Promise<ListUsersResponse> {
  return withMock(
    '用户列表',
    () => get<ListUsersResponse>('/admin/users', { params }),
    () => mockListUsers(params),
  )
}

/** 更新用户状态（1 正常 2 禁用 3 冻结） */
export function updateUserStatus(
  userId: number,
  status: number,
  reason?: string,
): Promise<OperationResult> {
  return withMock(
    '更新用户状态',
    () => put<OperationResult>(`/admin/users/${userId}/status`, { user_id: userId, status, reason }),
    () => mockUpdateUserStatus(userId, status),
  )
}

/** 角色列表 */
export function listRoles(): Promise<{ roles: Role[] }> {
  return withMock('角色列表', () => get<{ roles: Role[] }>('/admin/roles'), () => mockListRoles())
}

/** 保存角色（新增/编辑） */
export function saveRole(payload: SaveRoleRequest): Promise<Role> {
  return withMock(
    '保存角色',
    () => post<Role>('/admin/roles', payload),
    () => mockSaveRole(payload),
  )
}

/** 删除角色 */
export function deleteRole(id: number): Promise<OperationResult> {
  return withMock(
    '删除角色',
    () => del<OperationResult>(`/admin/roles/${id}`),
    () => mockDeleteRole(id),
  )
}

/** 权限列表 */
export function listPermissions(): Promise<{ permissions: Permission[] }> {
  return withMock(
    '权限列表',
    () => get<{ permissions: Permission[] }>('/admin/permissions'),
    () => mockListPermissions(),
  )
}

/** 数据看板概览 */
export function dashboardOverview(days = 30): Promise<DashboardOverview> {
  return withMock(
    '数据看板',
    () => get<DashboardOverview>('/admin/dashboard/overview', { params: { days } }),
    () => mockDashboardOverview(days),
  )
}
