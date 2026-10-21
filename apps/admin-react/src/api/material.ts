/**
 * 素材库域接口 —— product.proto(ProductService.ListMaterials / SaveMaterial / DeleteMaterial)
 */
import { del, get, post, withMock } from './client'
import type {
  ListMaterialsParams,
  ListMaterialsResponse,
  Material,
  OperationResult,
  SaveMaterialRequest,
} from '@/types'
import { mockDeleteMaterial, mockListMaterials, mockSaveMaterial } from '@/mock'

/** 素材列表 */
export function listMaterials(params: ListMaterialsParams = {}): Promise<ListMaterialsResponse> {
  return withMock(
    '素材列表',
    () => get<ListMaterialsResponse>('/admin/materials', { params }),
    () => mockListMaterials(params),
  )
}

/** 保存素材（id 传 0 表示新增） */
export function saveMaterial(payload: SaveMaterialRequest): Promise<Material> {
  return withMock(
    '保存素材',
    () => post<Material>('/admin/materials', { ...payload, id: payload.id ?? 0 }),
    () => mockSaveMaterial(payload),
  )
}

/** 删除素材 */
export function deleteMaterial(id: number): Promise<OperationResult> {
  return withMock(
    '删除素材',
    () => del<OperationResult>(`/admin/materials/${id}`),
    () => mockDeleteMaterial(id),
  )
}
