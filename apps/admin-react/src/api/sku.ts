/**
 * SKU 域接口 —— product.proto(ProductService.ListProducts / GetProduct / SaveSku)
 */
import { get, post, withMock } from './client'
import type {
  ListProductsParams,
  ListProductsResponse,
  ProductDetail,
  ProductSku,
  SaveSkuRequest,
} from '@/types'
import { mockGetProduct, mockListProducts } from '@/mock'

/** 商品列表（用于 SKU 管理的商品选择） */
export function listSkuProducts(
  params: ListProductsParams = {},
): Promise<ListProductsResponse> {
  return withMock(
    '商品列表',
    () => get<ListProductsResponse>('/products', { params }),
    () => mockListProducts(params),
  )
}

/** 商品详情（含 skus） */
export function getProductDetail(id: number): Promise<ProductDetail> {
  return withMock(
    '商品详情',
    () => get<ProductDetail>(`/products/${id}`),
    () => mockGetProduct(id),
  )
}

/**
 * 保存 SKU
 * proto 中 SaveSku 为 POST /admin/skus，带 id 表示更新，不带表示新增。
 */
export function saveSku(payload: SaveSkuRequest): Promise<ProductSku> {
  return withMock(
    '保存 SKU',
    () => post<ProductSku>('/admin/skus', payload),
    () => ({
      id: payload.id ?? 0,
      product_id: payload.product_id,
      sku_code: payload.sku_code,
      spec_text: payload.spec_text,
      specs: payload.specs ?? {},
      price_cents: payload.price_cents,
      original_price_cents: payload.original_price_cents ?? payload.price_cents,
      stock: payload.stock,
      locked_stock: 0,
      image: payload.image ?? '',
      sort: payload.sort ?? 0,
      sales_count: 0,
      enabled: payload.enabled,
      weight_grams: payload.weight_grams ?? 0,
    }),
  )
}
