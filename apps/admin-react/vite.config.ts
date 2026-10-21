import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    proxy: {
      // 开发环境下把 /api 代理到后端网关，Mock 兜底逻辑在 src/api/client.ts
      // 网关地址可用 VITE_API_BASE_URL 覆盖（见 .env.local）
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 拆包：把体积大的三方库单独成块，避免单个 chunk 超过 500KB 告警
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd', '@ant-design/icons'],
          echarts: ['echarts'],
        },
      },
    },
    // antd 本身体积较大（约 1.3MB / gzip 413KB），已单独成块；
    // 这里放宽阈值以免每次构建都告警，实际网络传输看的是 gzip 体积。
    chunkSizeWarningLimit: 1500,
  },
})
