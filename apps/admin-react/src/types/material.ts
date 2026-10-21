/**
 * 素材库类型 —— 对齐 proto/shopstack/product/v1/product.proto(Material)
 */
import type { PageMeta, PageRequest } from './common'

/** 素材（Material） */
export interface Material {
  id: number
  name: string
  url: string
  /** image / video */
  type: string
  /** 文件大小（字节） */
  size: number
  /** 所属文件夹 */
  folder: string
  sort: number
  created_at: string
}

/** 素材列表查询（ListMaterialsRequest） */
export interface ListMaterialsParams extends Partial<PageRequest> {
  keyword?: string
  type?: string
  folder?: string
}

/** 素材列表响应（ListMaterialsResponse） */
export interface ListMaterialsResponse {
  materials: Material[]
  meta: PageMeta
}

/** 保存素材（SaveMaterialRequest） */
export interface SaveMaterialRequest {
  /** 传 0 表示新增 */
  id?: number
  name: string
  url: string
  type: string
  size: number
  folder: string
  sort: number
}
