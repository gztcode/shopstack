import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// 开发环境把 /api 代理到后端网关，避免浏览器跨域限制。
// 需要指向其它网关时设置 VITE_GATEWAY_URL 环境变量。
const gateway = process.env.VITE_GATEWAY_URL ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: gateway,
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: gateway,
        changeOrigin: true,
      },
    },
  },
})
