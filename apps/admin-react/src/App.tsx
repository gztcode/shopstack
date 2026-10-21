/**
 * 应用根组件：主题、查询缓存与路由
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App as AntApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { BrowserRouter } from 'react-router-dom'
import AppRouter from '@/router'
import { shopstackTheme } from '@/theme'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 后端未就绪时由 mock 兜底，重试节奏保持温和
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

/** 应用根组件 */
export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={shopstackTheme}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  )
}
