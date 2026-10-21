/**
 * 库存类型 —— 对齐 proto/shopstack/inventory/v1/inventory.proto
 */
import type { PageMeta, PageRequest } from './common'

/** 库存（Inventory） */
export interface Inventory {
  id: number
  sku_id: number
  product_id: number
  sku_code: string
  spec_text: string
  total_stock: number
  available_stock: number
  locked_stock: number
  sold_stock: number
  safety_stock: number
  warehouse: string
  updated_at: string
}

/** 库存流水（InventoryLog） */
export interface InventoryLog {
  id: number
  sku_id: number
  product_id: number
  sku_code: string
  /** 1 入库 2 预扣 3 释放 4 扣减 5 调整 6 退货入库 */
  change_type: number
  quantity: number
  before_stock: number
  after_stock: number
  biz_type: string
  biz_id: string
  operator: string
  remark: string
  created_at: string
}

/** 库存列表查询（ListInventoriesRequest） */
export interface ListInventoriesParams extends Partial<PageRequest> {
  keyword?: string
  product_id?: number
  low_stock_only?: number
}

/** 库存列表响应（ListInventoriesResponse） */
export interface ListInventoriesResponse {
  inventories: Inventory[]
  meta: PageMeta
}

/** 库存流水查询（ListInventoryLogsRequest） */
export interface ListInventoryLogsParams extends Partial<PageRequest> {
  sku_id?: number
  product_id?: number
  biz_id?: string
  change_type?: number
}

/** 库存流水响应（ListInventoryLogsResponse） */
export interface ListInventoryLogsResponse {
  logs: InventoryLog[]
  meta: PageMeta
}

/** 低库存预警响应（StockWarningResponse） */
export interface StockWarningResponse {
  inventories: Inventory[]
  count: number
}

/** 库存调整（AdjustStockRequest） */
export interface AdjustStockRequest {
  sku_id: number
  /** 目标库存 */
  quantity: number
  reason: string
  safety_stock?: number
  warehouse?: string
}
