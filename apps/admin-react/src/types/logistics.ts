/**
 * 物流类型 —— 对齐 proto/shopstack/logistics/v1/logistics.proto
 */
import type { PageMeta, PageRequest, ShipmentStatus } from './common'

/** 发货单（Shipment） */
export interface Shipment {
  id: number
  order_id: number
  order_no: string
  /** 运单号 */
  tracking_no: string
  /** 快递公司 */
  company: string
  company_code: string
  status: ShipmentStatus
  receiver: string
  phone: string
  address: string
  freight_cents: number
  item_count: number
  shipped_at: string
  delivered_at: string
  created_at: string
  remark: string
}

/** 物流轨迹（ShipmentTrack） */
export interface ShipmentTrack {
  id: number
  shipment_id: number
  tracking_no: string
  location: string
  description: string
  occurred_at: string
  sort: number
}

/** 运费模板（LogisticTemplate） */
export interface LogisticTemplate {
  id: number
  name: string
  company: string
  company_code: string
  freight_cents: number
  free_freight_amount_cents: number
  enabled: boolean
  sort: number
  /** 适用地区，逗号分隔 */
  regions: string
}

/** 发货单列表查询（ListShipmentsRequest） */
export interface ListShipmentsParams extends Partial<PageRequest> {
  status?: number
  keyword?: string
  order_id?: number
}

/** 发货单列表响应（ListShipmentsResponse） */
export interface ListShipmentsResponse {
  shipments: Shipment[]
  meta: PageMeta
}

/** 物流轨迹响应（ListShipmentTracksResponse） */
export interface ListShipmentTracksResponse {
  tracks: ShipmentTrack[]
  shipment?: Shipment
}

/** 运费模板响应（ListTemplatesResponse） */
export interface ListTemplatesResponse {
  templates: LogisticTemplate[]
}

/** 保存运费模板（SaveTemplateRequest） */
export interface SaveTemplateRequest {
  id?: number
  name: string
  company: string
  company_code: string
  freight_cents: number
  free_freight_amount_cents: number
  enabled: boolean
  sort: number
  regions: string
}

/** 创建发货单（CreateShipmentRequest） */
export interface CreateShipmentRequest {
  order_id: number
  company: string
  company_code?: string
  tracking_no: string
  freight_cents?: number
  remark?: string
}
