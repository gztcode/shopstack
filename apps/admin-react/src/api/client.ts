/**
 * axios 实例 + 拦截器 + 统一信封解包 + 401 刷新重放 + Mock 兜底
 */
import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import type { ApiEnvelope } from '@/types'
import { useAuthStore } from '@/store/auth'
import { useMockStore } from '@/store/mock'

/**
 * 网关地址：默认同源相对路径 /api/v1（开发环境由 vite 代理到 http://localhost:8080），
 * 可通过环境变量 VITE_API_BASE_URL 覆盖为绝对地址。
 *
 * 注意：环境变量表示的是「网关来源地址」，业务路径前缀 /api/v1 始终由本层补齐。
 * 若直接把环境变量当作完整 base 使用，传入 http://127.0.0.1:8090 会丢掉 /api/v1 前缀，
 * 导致所有接口 404（且会被 Mock 兜底掩盖，只表现为「数据不更新」）。
 * 为兼容「环境变量已带 /api/v1」的情况，这里做了去重处理。
 */
const API_PREFIX = '/api/v1'

function resolveApiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  if (!configured) return API_PREFIX
  const origin = configured.replace(/\/+$/, '')
  if (origin.endsWith(API_PREFIX)) return origin
  return origin + API_PREFIX
}

export const API_BASE_URL: string = resolveApiBaseUrl()

/** 业务错误（信封 code 非成功值或 HTTP 错误） */
export class ApiError extends Error {
  code: number | string
  traceId?: string
  status?: number

  constructor(message: string, code: number | string = -1, traceId?: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.traceId = traceId
    this.status = status
  }
}

/** 信封 code 是否表示成功（后端为数值 0，部分实现返回 'ok' / 'success'） */
function isSuccessCode(code: unknown): boolean {
  return code === 0 || code === '0' || code === 'ok' || code === 'success'
}

type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

/**
 * 查询参数序列化：点号嵌套形式（page.page=1&page.page_size=20）
 * axios 默认会把嵌套对象序列化成 page[page]=1，这里改为后端约定的点号形式。
 */
export function serializeParams(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  const walk = (source: Record<string, unknown>, prefix: string) => {
    Object.entries(source).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      const path = prefix ? `${prefix}.${key}` : key
      if (Array.isArray(value)) {
        value.forEach((item, index) => walk({ [index]: item }, path))
      } else if (typeof value === 'object') {
        walk(value as Record<string, unknown>, path)
      } else {
        search.append(path, String(value))
      }
    })
  }
  walk(params, '')
  return search.toString()
}

/**
 * 把扁平分页参数转换为 proto 的嵌套形式：
 * { page: 1, page_size: 20 } → { page: { page: 1, page_size: 20 } }
 * 其余查询参数保持不变。
 */
export function normalizeParams(params: unknown): unknown {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return params
  const source = { ...(params as Record<string, unknown>) }
  const page = source.page
  const pageSize = source.page_size
  const orderBy = source.order_by
  const orderDir = source.order_dir

  // page 已经是对象时说明调用方自行构造了嵌套结构，直接放行
  if (page && typeof page === 'object') return source
  if (page === undefined && pageSize === undefined && orderBy === undefined && orderDir === undefined) {
    return source
  }

  delete source.page
  delete source.page_size
  delete source.order_by
  delete source.order_dir

  const nested: Record<string, unknown> = {}
  if (typeof page === 'number') nested.page = page
  if (typeof pageSize === 'number') nested.page_size = pageSize
  if (orderBy) nested.order_by = orderBy
  if (orderDir) nested.order_dir = orderDir
  if (Object.keys(nested).length > 0) source.page = nested
  return source
}

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  paramsSerializer: {
    serialize: (params) => serializeParams(params as Record<string, unknown>),
  },
})

/** 请求拦截器：注入 Bearer Token */
http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** 正在进行的刷新请求，避免并发重复刷新 */
let refreshing: Promise<string | null> | null = null

/** 上次刷新失败的时间戳，用于冷却，避免每个请求都去刷新 */
let lastRefreshFailureAt = 0
/** 刷新失败冷却时长（毫秒） */
const REFRESH_COOLDOWN = 30_000

/** 使用 refresh_token 换取新的 access_token */
async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens } = useAuthStore.getState()
  if (!refreshToken) return null
  if (Date.now() - lastRefreshFailureAt < REFRESH_COOLDOWN) return null

  try {
    const res = await axios.request<ApiEnvelope<{ access_token: string; refresh_token: string }>>({
      url: '/auth/refresh',
      baseURL: API_BASE_URL,
      method: 'POST',
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
      data: { refresh_token: refreshToken },
    })
    const body = res.data
    if (!body || !isSuccessCode(body.code) || !body.data?.access_token) {
      lastRefreshFailureAt = Date.now()
      return null
    }
    setTokens(body.data.access_token, body.data.refresh_token || refreshToken)
    return body.data.access_token
  } catch {
    lastRefreshFailureAt = Date.now()
    return null
  }
}

/** 响应拦截器：解包统一信封 */
http.interceptors.response.use(
  ((response: AxiosResponse) => {
    const body = response.data as unknown
    if (body && typeof body === 'object' && 'code' in (body as Record<string, unknown>)) {
      const envelope = body as ApiEnvelope<unknown>
      if (!isSuccessCode(envelope.code)) {
        throw new ApiError(envelope.message || '请求失败', envelope.code, envelope.trace_id, response.status)
      }
      return envelope.data
    }
    return body
  }) as unknown as (value: AxiosResponse) => AxiosResponse,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const original = error.config as RetryableConfig | undefined
    const status = error.response?.status
    const envelope = error.response?.data

    // 401：刷新 token 后重放一次
    if (status === 401 && original && !original._retried) {
      original._retried = true
      const token = refreshing ?? refreshAccessToken()
      refreshing = token
      try {
        const newToken = await token
        if (newToken) {
          original.headers.set('Authorization', `Bearer ${newToken}`)
          return http.request(original)
        }
      } catch {
        /* 刷新失败则走下面的错误处理 */
      } finally {
        refreshing = null
      }
      // 刷新失败时不强制退出登录：交由调用方降级到 Mock 数据，保证后台仍可浏览
    }

    const message =
      envelope?.message || error.message || (status ? `请求失败（${status}）` : '网络异常，请稍后重试')
    const code = envelope?.code ?? -1
    return Promise.reject(new ApiError(message, code, envelope?.trace_id, status))
  },
)

/** GET 请求（响应已在拦截器中解包信封） */
export function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return http.get(url, withNestedPage(config)) as unknown as Promise<T>
}

/** POST 请求 */
export function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return http.post(url, data, withNestedPage(config)) as unknown as Promise<T>
}

/** PUT 请求 */
export function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return http.put(url, data, withNestedPage(config)) as unknown as Promise<T>
}

/** DELETE 请求 */
export function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return http.delete(url, withNestedPage(config)) as unknown as Promise<T>
}

/** 将查询参数中的扁平分页字段转换为嵌套形式 */
function withNestedPage(config?: AxiosRequestConfig): AxiosRequestConfig | undefined {
  if (!config?.params) return config
  return { ...config, params: normalizeParams(config.params) as Record<string, unknown> }
}

/**
 * Mock 兜底：真实请求失败时回退到内置演示数据，并记录降级原因。
 * 后端接口并行迭代，未就绪时后台仍可完整展示。
 */
export async function withMock<T>(
  label: string,
  runner: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  try {
    return await runner()
  } catch (error) {
    const reason = error instanceof Error ? error.message : '未知错误'
    useMockStore.getState().markMock(`${label}：${reason}`)
    return fallback()
  }
}
