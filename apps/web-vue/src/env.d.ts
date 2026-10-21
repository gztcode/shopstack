/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 网关地址；默认走 Vite 代理（同源 /api），生产可指定绝对地址 */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
