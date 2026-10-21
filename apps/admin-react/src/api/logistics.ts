/**
 * 物流域接口 —— logistics.proto(LogisticsService)
 */
import { del, get, post, put, withMock } from './client'
import type {
  CalculateFreightRequest,
  CalculateFreightResponse,
  DeliveryRange,
  ListDeliveryRangesResponse,
  ListLogisticsCompaniesResponse,
  LogisticsCompany,
  SaveDeliveryRangeRequest,
  SaveLogisticsCompanyRequest,
  ListShipmentsParams,
  ListShipmentsResponse,
  LogisticTemplate,
  Shipment,
  ListTemplatesResponse,
  OperationResult,
  SaveTemplateRequest,
} from '@/types'
import {
  mockCalculateFreight,
  mockDeleteLogisticsCompany,
  mockListDeliveryRanges,
  mockListLogisticsCompanies,
  mockSaveDeliveryRange,
  mockSaveLogisticsCompany,
  mockDeleteTemplate,
  mockListShipments,
  mockListTemplates,
  mockSaveTemplate,
} from '@/mock'

/** 运费模板列表 */
export function listTemplates(): Promise<ListTemplatesResponse> {
  return withMock(
    '运费模板',
    () => get<ListTemplatesResponse>('/logistics/templates'),
    () => mockListTemplates(),
  )
}

/** 保存运费模板 */
export function saveTemplate(payload: SaveTemplateRequest): Promise<{ id: number }> {
  return withMock(
    '保存运费模板',
    () => post<{ id: number }>('/admin/logistics/templates', payload),
    () => ({ id: mockSaveTemplate(payload).id }),
  )
}

/** 删除运费模板 */
export function deleteTemplate(id: number): Promise<OperationResult> {
  return withMock(
    '删除运费模板',
    () => del<OperationResult>(`/admin/logistics/templates/${id}`),
    () => mockDeleteTemplate(id),
  )
}

/** 发货单列表 */
export function listShipments(params: ListShipmentsParams = {}): Promise<ListShipmentsResponse> {
  return withMock(
    '发货单列表',
    () => get<ListShipmentsResponse>('/admin/shipments', { params }),
    () => mockListShipments(params),
  )
}

// ---------------------------------------------------------------------------
// 快递公司 / 配送范围 / 运费试算
// ---------------------------------------------------------------------------

/** 快递公司列表 */
export function listLogisticsCompanies(
  params: { keyword?: string; page?: number; page_size?: number } = {},
): Promise<ListLogisticsCompaniesResponse> {
  return withMock(
    '快递公司',
    () => get<ListLogisticsCompaniesResponse>('/logistics/companies', { params }),
    () => mockListLogisticsCompanies(params),
  )
}

/** 保存快递公司 */
export function saveLogisticsCompany(payload: SaveLogisticsCompanyRequest): Promise<LogisticsCompany> {
  return withMock(
    '保存快递公司',
    () => post<LogisticsCompany>('/admin/logistics/companies', payload),
    () => mockSaveLogisticsCompany(payload),
  )
}

/** 删除快递公司 */
export function deleteLogisticsCompany(id: number): Promise<OperationResult> {
  return withMock(
    '删除快递公司',
    () => del<OperationResult>(`/admin/logistics/companies/${id}`),
    () => mockDeleteLogisticsCompany(id),
  )
}

/** 配送范围列表 */
export function listDeliveryRanges(
  params: { template_id?: number; page?: number; page_size?: number } = {},
): Promise<ListDeliveryRangesResponse> {
  return withMock(
    '配送范围',
    () => get<ListDeliveryRangesResponse>('/logistics/ranges', { params }),
    () => mockListDeliveryRanges(params),
  )
}

/** 保存配送范围 */
export function saveDeliveryRange(payload: SaveDeliveryRangeRequest): Promise<DeliveryRange> {
  return withMock(
    '保存配送范围',
    () => post<DeliveryRange>('/admin/logistics/ranges', payload),
    () => mockSaveDeliveryRange(payload),
  )
}

/** 运费试算 */
export function calculateFreight(payload: CalculateFreightRequest): Promise<CalculateFreightResponse> {
  return withMock(
    '运费试算',
    () => post<CalculateFreightResponse>('/logistics/freight', payload),
    () => mockCalculateFreight(payload),
  )
}

/** 发货单详情（后端暂无单条查询接口，从列表中定位） */
export function getShipment(id: number): Promise<Shipment> {
  return withMock(
    '发货单详情',
    () => get<Shipment>(`/admin/shipments/${id}`),
    () => {
      const result = mockListShipments({ page_size: 100 })
      const found = result.shipments.find((shipment) => shipment.id === id)
      if (!found) throw new Error('发货单不存在')
      return found
    },
  )
}

/** 更新发货单状态 */
export function setShipmentStatus(id: number, status: number, remark: string): Promise<Shipment> {
  return withMock(
    '发货单状态',
    () => put<Shipment>(`/admin/shipments/${id}/status`, { id, status, remark }),
    () => {
      const result = mockListShipments({ page_size: 100 })
      const found = result.shipments.find((shipment) => shipment.id === id)
      if (!found) throw new Error('发货单不存在')
      found.status = status === 3 ? 'SHIPMENT_STATUS_DELIVERED' : 'SHIPMENT_STATUS_SHIPPED'
      found.remark = remark
      return found
    },
  )
}

/** 运费模板详情（从模板列表中定位） */
export function getTemplate(id: number): Promise<LogisticTemplate> {
  return withMock(
    '运费模板详情',
    () => get<LogisticTemplate>(`/admin/logistics/templates/${id}`),
    () => {
      const template = mockListTemplates().templates.find((item) => item.id === id)
      if (!template) throw new Error('运费模板不存在')
      return template
    },
  )
}
