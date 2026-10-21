/**
 * 请求 Hooks —— 基于 @tanstack/react-query
 */
import { useMutation, useQuery, type UseMutationOptions, type UseQueryOptions } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { hasPermission } from '@/utils/permission'

/** 查询 Hook：统一注入登录态，key 由调用方给出 */
export function useApiQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<T, Error, T, readonly unknown[]>({
    queryKey,
    queryFn,
    ...options,
  })
}

/** 变更 Hook */
export function useApiMutation<TVariables, TData = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>,
) {
  return useMutation<TData, Error, TVariables>({ mutationFn, ...options })
}

/** 权限判断 Hook */
export function usePermission(code: string): boolean {
  const permissions = useAuthStore((state) => state.permissions)
  return hasPermission(permissions, code)
}
