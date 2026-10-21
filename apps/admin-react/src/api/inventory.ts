/**
 * 库存域接口 —— inventory.proto(InventoryService)
 */
import { get, post, put, withMock } from './client'
import type {
  CreateInboundOrderRequest,
  CreateOutboundOrderRequest,
  InboundOrder,
  ListInboundOrdersResponse,
  ListOutboundOrdersResponse,
  ListStockCheckItemsResponse,
  ListStockChecksResponse,
  ListWarehousesResponse,
  OutboundOrder,
  SaveWarehouseRequest,
  StockCheckDetail,
  Warehouse,
  AdjustStockRequest,
  Inventory,
  ListInventoriesParams,
  ListInventoriesResponse,
  ListInventoryLogsParams,
  ListInventoryLogsResponse,
  StockWarningResponse,
} from '@/types'
import {
  mockAdjustStock,
  mockCreateInboundOrder,
  mockCreateOutboundOrder,
  mockGetStockCheck,
  mockListInboundOrders,
  mockListInventories,
  mockListInventoryLogs,
  mockListOutboundOrders,
  mockListStockCheckItems,
  mockListStockChecks,
  mockListWarehouses,
  mockSaveWarehouse,
  mockStockWarning,
} from '@/mock'

/** 库存列表 */
export function listInventories(
  params: ListInventoriesParams = {},
): Promise<ListInventoriesResponse> {
  return withMock(
    '库存列表',
    () => get<ListInventoriesResponse>('/admin/inventory', { params }),
    () => mockListInventories(params),
  )
}

/** 库存流水 */
export function listInventoryLogs(
  params: ListInventoryLogsParams = {},
): Promise<ListInventoryLogsResponse> {
  return withMock(
    '库存流水',
    () => get<ListInventoryLogsResponse>('/admin/inventory/logs', { params }),
    () => mockListInventoryLogs(params),
  )
}

/** 低库存预警 */
export function stockWarning(threshold?: number): Promise<StockWarningResponse> {
  return withMock(
    '低库存预警',
    () => get<StockWarningResponse>('/admin/inventory/warning', { params: { threshold } }),
    () => mockStockWarning(),
  )
}

/** 库存调整 */
export function adjustStock(payload: AdjustStockRequest): Promise<Inventory> {
  return withMock(
    '库存调整',
    () => put<Inventory>('/admin/inventory/adjust', payload),
    () => mockAdjustStock(payload),
  )
}

// ---------------------------------------------------------------------------
// 仓库 / 入库单 / 出库单 / 盘点单
// ---------------------------------------------------------------------------

/** 仓库列表 */
export function listWarehouses(
  params: { keyword?: string; page?: number; page_size?: number } = {},
): Promise<ListWarehousesResponse> {
  return withMock(
    '仓库列表',
    () => get<ListWarehousesResponse>('/admin/warehouses', { params }),
    () => mockListWarehouses(params),
  )
}

/** 保存仓库 */
export function saveWarehouse(payload: SaveWarehouseRequest): Promise<Warehouse> {
  return withMock(
    '保存仓库',
    () => post<Warehouse>('/admin/warehouses', payload),
    () => mockSaveWarehouse(payload),
  )
}

/** 入库单列表 */
export function listInboundOrders(
  params: { keyword?: string; status?: number; page?: number; page_size?: number } = {},
): Promise<ListInboundOrdersResponse> {
  return withMock(
    '入库单列表',
    () => get<ListInboundOrdersResponse>('/admin/inbound-orders', { params }),
    () => mockListInboundOrders(params),
  )
}

/** 创建入库单 */
export function createInboundOrder(payload: CreateInboundOrderRequest): Promise<InboundOrder> {
  return withMock(
    '创建入库单',
    () => post<InboundOrder>('/admin/inbound-orders', payload),
    () => mockCreateInboundOrder(payload),
  )
}

/** 出库单列表 */
export function listOutboundOrders(
  params: { keyword?: string; status?: number; page?: number; page_size?: number } = {},
): Promise<ListOutboundOrdersResponse> {
  return withMock(
    '出库单列表',
    () => get<ListOutboundOrdersResponse>('/admin/outbound-orders', { params }),
    () => mockListOutboundOrders(params),
  )
}

/** 创建出库单 */
export function createOutboundOrder(payload: CreateOutboundOrderRequest): Promise<OutboundOrder> {
  return withMock(
    '创建出库单',
    () => post<OutboundOrder>('/admin/outbound-orders', payload),
    () => mockCreateOutboundOrder(payload),
  )
}

/** 盘点单列表 */
export function listStockChecks(
  params: { keyword?: string; status?: number; page?: number; page_size?: number } = {},
): Promise<ListStockChecksResponse> {
  return withMock(
    '盘点单列表',
    () => get<ListStockChecksResponse>('/admin/stock-checks', { params }),
    () => mockListStockChecks(params),
  )
}

/** 盘点单详情 */
export function getStockCheck(id: number): Promise<StockCheckDetail> {
  return withMock(
    '盘点单详情',
    () => get<StockCheckDetail>(`/admin/stock-checks/${id}`),
    () => mockGetStockCheck(id),
  )
}

/** 盘点明细 */
export function listStockCheckItems(
  params: { id: number; page?: number; page_size?: number },
): Promise<ListStockCheckItemsResponse> {
  return withMock(
    '盘点明细',
    () => get<ListStockCheckItemsResponse>(`/admin/stock-checks/${params.id}/items`, { params }),
    () => mockListStockCheckItems(params),
  )
}

/** 入库单详情（后端暂无单条查询接口，从列表中定位） */
export function getInboundOrder(id: number): Promise<InboundOrder> {
  return withMock(
    '入库单详情',
    () => get<InboundOrder>(`/admin/inbound-orders/${id}`),
    () => {
      const result = mockListInboundOrders({ page_size: 100 })
      const found = result.inbound_orders.find((order) => order.id === id)
      if (!found) throw new Error('入库单不存在')
      return found
    },
  )
}

/** 出库单详情（后端暂无单条查询接口，从列表中定位） */
export function getOutboundOrder(id: number): Promise<OutboundOrder> {
  return withMock(
    '出库单详情',
    () => get<OutboundOrder>(`/admin/outbound-orders/${id}`),
    () => {
      const result = mockListOutboundOrders({ page_size: 100 })
      const found = result.outbound_orders.find((order) => order.id === id)
      if (!found) throw new Error('出库单不存在')
      return found
    },
  )
}
