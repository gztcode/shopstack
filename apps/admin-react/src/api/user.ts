/**
 * 用户域接口 —— user.proto(UserService)
 */
import { get, post, put, withMock } from './client'
import type {
  Feedback,
  ListFeedbacksResponse,
  ListGrowthLogsResponse,
  ListUserLevelsResponse,
  ListUsersParams,
  ListUsersResponse,
  SaveUserLevelRequest,
  User,
  UserLevel,
} from '@/types'
import {
  mockListFeedbacks,
  mockListGrowthLogs,
  mockListUserLevels,
  mockListUsers,
  mockSaveUserLevel,
  mockSetFeedbackStatus,
  mockUserLevelDistribution,
} from '@/mock'

/** 当前登录用户资料 */
export function getProfile(userId?: number): Promise<User> {
  return withMock(
    '用户资料',
    () => get<User>('/users/me', { params: { user_id: userId } }),
    () => mockListUsers({}).users[0],
  )
}

// ---------------------------------------------------------------------------
// 会员等级 / 成长值 / 用户反馈
// ---------------------------------------------------------------------------

/** 会员等级列表 */
export function listUserLevels(): Promise<ListUserLevelsResponse> {
  return withMock(
    '会员等级',
    () => get<ListUserLevelsResponse>('/marketing/levels'),
    () => mockListUserLevels(),
  )
}

/** 保存会员等级 */
export function saveUserLevel(payload: SaveUserLevelRequest): Promise<UserLevel> {
  return withMock(
    '保存会员等级',
    () => post<UserLevel>('/admin/user-levels', payload),
    () => mockSaveUserLevel(payload),
  )
}

/** 成长值流水 */
export function listGrowthLogs(
  params: { user_id?: number; page?: number; page_size?: number } = {},
): Promise<ListGrowthLogsResponse> {
  return withMock(
    '成长值流水',
    () => get<ListGrowthLogsResponse>('/users/growth-logs', { params }),
    () => mockListGrowthLogs(params),
  )
}

/** 用户反馈列表 */
export function listFeedbacks(
  params: { keyword?: string; status?: number; page?: number; page_size?: number } = {},
): Promise<ListFeedbacksResponse> {
  return withMock(
    '用户反馈',
    () => get<ListFeedbacksResponse>('/admin/feedbacks', { params }),
    () => mockListFeedbacks(params),
  )
}

/** 处理用户反馈（0 待处理 1 处理中 2 已处理 3 已关闭） */
export function setFeedbackStatus(
  id: number,
  status: number,
  reply: string,
): Promise<Feedback> {
  return withMock(
    '处理用户反馈',
    () => put<Feedback>(`/admin/feedbacks/${id}/status`, { id, status, reply }),
    () => mockSetFeedbackStatus(id, status, reply),
  )
}

/** 按会员等级筛选的用户列表 */
export function listUsersByLevel(
  params: ListUsersParams & { level?: number } = {},
): Promise<ListUsersResponse> {
  return withMock(
    '按等级筛选用户',
    () => get<ListUsersResponse>('/admin/users', { params }),
    () => {
      const result = mockListUsers(params)
      return { users: result.users, meta: result.meta }
    },
  )
}

/** 会员等级详情（从等级列表中定位） */
export function getUserLevel(id: number): Promise<UserLevel> {
  return withMock(
    '会员等级详情',
    () => get<UserLevel>(`/admin/user-levels/${id}`),
    () => {
      const level = mockListUserLevels().levels.find((item) => item.id === id)
      if (!level) throw new Error('会员等级不存在')
      return level
    },
  )
}

/** 会员等级分布（各等级的用户数量） */
export function listUserLevelStats(): Promise<{ levels: Array<UserLevel & { user_count: number }> }> {
  return withMock(
    '会员等级分布',
    async () => {
      const levels = await listUserLevels()
      const detailed = await Promise.all(
        levels.levels.map(async (level) => {
          const users = await listUsersByLevel({ level: level.level, page_size: 1 })
          return { ...level, user_count: users.meta.total }
        }),
      )
      return { levels: detailed }
    },
    () => mockUserLevelDistribution(),
  )
}
