import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'

import { useAppStore } from '@/stores/app'
import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/utils/auth'

/** 网关地址；默认走 Vite 代理（同源 /api），生产环境可用 VITE_API_BASE_URL 指定 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/** 统一响应信封 */
interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
  trace_id: string
}

/** 业务异常，携带后端返回的 code 与 trace_id */
export class ApiError extends Error {
  /** 后端业务码，部分网关返回字符串码 */
  code: number | string
  status: number
  traceId: string

  constructor(message: string, code: number | string = -1, status = 0, traceId = '') {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.traceId = traceId
  }
}

/* ---------------------------------------------------------------------------
 * 响应键名归一化
 * 后端可能返回 proto 字段名（snake_case）或 JSON 名（camelCase），
 * 这里统一转换为 snake_case，与 TS 类型定义保持一致。
 * --------------------------------------------------------------------------- */
const MAP_FIELDS = new Set(['specs', 'pay_params'])

function toSnake(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
}

function normalizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => normalizeKeys(item))
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
      const key = toSnake(rawKey)
      // map 类型字段（specs / pay_params）的 key 属于业务数据，不做转换
      result[key] = MAP_FIELDS.has(key) ? rawValue : normalizeKeys(rawValue)
    }
    return result
  }
  return value
}

/* ---------------------------------------------------------------------------
 * Axios 实例
 * --------------------------------------------------------------------------- */
const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
})

// 用于刷新令牌的裸实例，避免触发拦截器递归
const plainClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
})

/** 最近一次 trace_id，便于排查问题 */
let lastTraceId = ''

export function getLastTraceId(): string {
  return lastTraceId
}

interface RetryConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
  _skipAuth?: boolean
}

client.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

/** 是否已处于演示数据模式（后端不可用，接口回退到 Mock 数据） */
function isDemoMode(): boolean {
  try {
    return useAppStore().demoMode
  } catch {
    return false
  }
}

client.interceptors.response.use(
  (response) => {
    const body = response.data as ApiEnvelope<unknown> | undefined
    // 统一信封：{ code, message, data, trace_id }
    if (body && typeof body === 'object' && 'code' in body) {
      const envelope = body as ApiEnvelope<unknown>
      lastTraceId = envelope.trace_id ?? ''
      if (envelope.code !== 0) {
        throw new ApiError(
          envelope.message || '请求失败',
          envelope.code,
          response.status,
          lastTraceId,
        )
      }
      response.data = normalizeKeys(envelope.data)
      return response
    }
    // 兼容未包装信封的直返结构
    response.data = normalizeKeys(response.data)
    return response
  },
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined
    const status = error.response?.status ?? 0

    // 401：静默刷新令牌后重放一次原请求
    // 演示模式下后端会拒绝本地 Mock 令牌，此时既不刷新也不清空登录态，页面继续使用演示数据
    if (status === 401 && config && !config._retried && !config._skipAuth && !isDemoMode()) {
      config._retried = true
      const refreshed = await refreshTokens()
      if (refreshed) {
        return client.request(config)
      }
      // 刷新失败：标记为登录态失效，由上层决定是降级到演示数据还是退出登录
      authFailedErrors.add(error)
    }
    return Promise.reject(error)
  },
)

/** 刷新令牌失败、登录态已失效的请求 */
const authFailedErrors = new WeakSet<object>()

function isAuthFailed(error: unknown): boolean {
  return typeof error === 'object' && error !== null && authFailedErrors.has(error)
}

/* ---------------------------------------------------------------------------
 * 令牌刷新（并发共享同一个 Promise，只重放一次）
 * --------------------------------------------------------------------------- */
let refreshPromise: Promise<boolean> | null = null

async function refreshTokens(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const response = await plainClient.post('/api/v1/auth/refresh', { refresh_token: refreshToken })
    const body = response.data as ApiEnvelope<{ access_token: string; refresh_token?: string }>
    if (body && body.code === 0 && body.data?.access_token) {
      setAccessToken(body.data.access_token)
      if (body.data.refresh_token) setRefreshToken(body.data.refresh_token)
      return true
    }
    return false
  } catch {
    return false
  }
}

/* ---------------------------------------------------------------------------
 * 请求封装
 * --------------------------------------------------------------------------- */
export interface RequestOptions<T> {
  /** 后端不可用时的兜底数据 */
  fallback?: () => T
  /** 静默模式：不弹出全局错误提示，由页面自行展示 */
  silent?: boolean
  /** 跳过 401 自动刷新（登录、注册等接口使用） */
  skipAuth?: boolean
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiEnvelope<unknown>>
    const status = axiosError.response?.status ?? 0
    const body = axiosError.response?.data
    let message = axiosError.message || '网络请求失败'
    let code: number | string = -1
    let traceId = ''
    if (body && typeof body === 'object' && 'message' in body) {
      message = body.message || message
      code = body.code ?? -1
      traceId = body.trace_id ?? ''
    } else if (status === 0) {
      message = '无法连接服务器，请检查后端服务是否已启动'
    } else if (status === 404) {
      message = '接口不存在，演示数据模式已启用'
    }
    return new ApiError(message, code, status, traceId)
  }
  if (error instanceof Error) return new ApiError(error.message)
  return new ApiError('未知错误')
}

/** 判断是否适合降级到 Mock 数据：网络不通、404、5xx、401 */
function canFallback(error: ApiError): boolean {
  if (error.status === 0) return true
  if (error.status === 404) return true
  if (error.status === 401) return true
  return error.status >= 500
}

function cleanParams(params?: Record<string, unknown>): Record<string, unknown> {
  if (!params) return {}
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    result[key] = value
  }
  return result
}

async function request<T>(
  config: AxiosRequestConfig,
  options: RequestOptions<T> = {},
): Promise<T> {
  try {
    const response = await client.request<unknown>(config)
    return response.data as T
  } catch (error) {
    const apiError = toApiError(error)
    if (options.fallback && canFallback(apiError)) {
      try {
        useAppStore().enterDemoMode(apiError.message)
      } catch {
        // Pinia 尚未就绪时忽略，页面仍会渲染 Mock 数据
      }
      // 演示数据模式下保留本地登录态，避免演示会话被误判为登录失效
      return options.fallback()
    }
    if (isAuthFailed(error)) {
      clearAuthStorage()
      window.dispatchEvent(new CustomEvent('ss:unauthorized'))
    }
    if (!options.silent) {
      try {
        useAppStore().error(apiError.message)
      } catch {
        // 忽略提示失败
      }
    }
    throw apiError
  }
}

/** GET 请求 */
export function httpGet<T>(
  url: string,
  params?: Record<string, unknown>,
  options: RequestOptions<T> = {},
): Promise<T> {
  return request<T>({ method: 'GET', url, params: cleanParams(params) }, options)
}

/** POST 请求 */
export function httpPost<T>(
  url: string,
  data?: unknown,
  options: RequestOptions<T> = {},
): Promise<T> {
  return request<T>({ method: 'POST', url, data }, options)
}

/** PUT 请求 */
export function httpPut<T>(
  url: string,
  data?: unknown,
  options: RequestOptions<T> = {},
): Promise<T> {
  return request<T>({ method: 'PUT', url, data }, options)
}

/** DELETE 请求 */
export function httpDelete<T>(
  url: string,
  params?: Record<string, unknown>,
  options: RequestOptions<T> = {},
): Promise<T> {
  return request<T>({ method: 'DELETE', url, params: cleanParams(params) }, options)
}
