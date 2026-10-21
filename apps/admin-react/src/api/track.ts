/**
 * 物流轨迹域接口 —— logistics.proto(LogisticsService.ListTracks / GetShipment)
 */
import { get, withMock } from './client'
import type { ListShipmentTracksResponse } from '@/types'
import { mockListTracks } from '@/mock'

/**
 * 按订单号查询物流轨迹
 * 响应 ListShipmentTracksResponse 同时包含轨迹列表与该订单的发货单。
 */
export function listTracks(orderId: number): Promise<ListShipmentTracksResponse> {
  return withMock(
    '物流轨迹',
    () => get<ListShipmentTracksResponse>('/logistics/tracks', { params: { order_id: orderId } }),
    () => mockListTracks(orderId),
  )
}
