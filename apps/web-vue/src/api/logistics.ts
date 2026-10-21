import { httpGet, httpPost } from '@/api/client'
import * as mock from '@/mock'
import type { FreightQuote, ListShipmentTracksResponse } from '@/types'

/** 查询订单物流（返回运单与轨迹） */
export function getShipment(orderId: number): Promise<ListShipmentTracksResponse> {
  return httpGet<ListShipmentTracksResponse>(
    `/api/v1/logistics/order/${orderId}`,
    undefined,
    { fallback: () => mock.shipmentTracks(orderId) },
  )
}

/** 按订单号查询物流轨迹 */
export function listTracks(orderId: number): Promise<ListShipmentTracksResponse> {
  return httpGet<ListShipmentTracksResponse>(
    '/api/v1/logistics/tracks',
    { order_id: orderId },
    { fallback: () => mock.shipmentTracks(orderId) },
  )
}

/* ---------------------------------------------------------------------------
 * 运费试算（阶段 3 扩量）
 * --------------------------------------------------------------------------- */

/** 运费试算 */
export function calculateFreight(payload: {
  amount_cents?: number
  region?: string
  quantity?: number
  template_id?: number
}): Promise<FreightQuote> {
  return httpPost<FreightQuote>(
    '/api/v1/logistics/freight',
    payload,
    { fallback: () => mock.calculateFreight(payload) },
  )
}
