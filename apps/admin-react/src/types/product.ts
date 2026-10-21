/**
 * 商品 / 分类 / 轮播 / 评价类型 —— 对齐 proto/shopstack/product/v1/product.proto
 */
import type { ImageItem, PageMeta, PageRequest, ProductStatus, ReviewStatus } from './common'

/** 分类（Category） */
export interface Category {
  id: number
  name: string
  parent_id: number
  icon: string
  description: string
  sort: number
  visible: boolean
  product_count: number
  children?: Category[]
}

/** 商品（Product） */
export interface Product {
  id: number
  title: string
  subtitle: string
  cover: string
  category_id: number
  category_name: string
  min_price_cents: number
  max_price_cents: number
  sales_count: number
  stock_total: number
  status: ProductStatus
  description: string
  tags: string[]
  created_at: string
  updated_at: string
}

/** 商品规格（ProductSku） */
export interface ProductSku {
  id: number
  product_id: number
  sku_code: string
  spec_text: string
  specs: Record<string, string>
  price_cents: number
  original_price_cents: number
  stock: number
  locked_stock: number
  image: string
  sort: number
  sales_count: number
  enabled: boolean
  weight_grams: number
}

/** 商品属性（ProductAttribute） */
export interface ProductAttribute {
  id: number
  product_id: number
  name: string
  value: string
  sort: number
}

/** 轮播（Banner） */
export interface Banner {
  id: number
  title: string
  image: string
  link: string
  sort: number
  /** home_banner | home_float | category */
  position: string
  visible: boolean
  created_at: string
}

/** 评价（Review） */
export interface Review {
  id: number
  product_id: number
  product_title: string
  user_id: number
  user_nickname: string
  user_avatar: string
  rating: number
  content: string
  images: string[]
  sku_id: number
  sku_text: string
  status: ReviewStatus
  admin_reply: string
  like_count: number
  created_at: string
}

/** 评价汇总（ReviewSummary） */
export interface ReviewSummary {
  total: number
  good: number
  medium: number
  bad: number
  average: number
}

/** 商品详情（ProductDetail） */
export interface ProductDetail {
  product: Product
  skus: ProductSku[]
  images: ImageItem[]
  attributes: ProductAttribute[]
  reviews: Review[]
  review_count: number
  review_rating: number
  related: Product[]
}

/** 商品列表查询（ListProductsRequest） */
export interface ListProductsParams extends Partial<PageRequest> {
  keyword?: string
  category_id?: number
  status?: number
  min_price_cents?: number
  max_price_cents?: number
  sort?: 'default' | 'sales' | 'price_asc' | 'price_desc' | 'newest'
  only_in_stock?: boolean
  tags?: string[]
}

/** 商品列表响应（ListProductsResponse） */
export interface ListProductsResponse {
  products: Product[]
  meta: PageMeta
}

/** 保存商品（SaveProductRequest） */
export interface SaveProductRequest {
  id?: number
  title: string
  subtitle?: string
  cover?: string
  category_id: number
  min_price_cents: number
  max_price_cents: number
  description?: string
  tags?: string[]
  status?: number
  images?: ImageItem[]
  attributes?: ProductAttribute[]
  skus?: ProductSku[]
}

/** 分类列表响应（ListCategoriesResponse） */
export interface ListCategoriesResponse {
  categories: Category[]
}

/** 保存 SKU（SaveSkuRequest） */
export interface SaveSkuRequest {
  id?: number
  product_id: number
  sku_code: string
  spec_text: string
  specs?: Record<string, string>
  price_cents: number
  original_price_cents?: number
  stock: number
  image?: string
  sort?: number
  enabled: boolean
  weight_grams?: number
}

/** 保存分类（SaveCategoryRequest） */
export interface SaveCategoryRequest {
  id?: number
  name: string
  parent_id: number
  icon?: string
  description?: string
  sort: number
  visible: boolean
}

/** 保存轮播（SaveBannerRequest） */
export interface SaveBannerRequest {
  id?: number
  title: string
  image: string
  link?: string
  sort: number
  position: string
  visible: boolean
}

/** 评价列表查询（ListReviewsRequest） */
export interface ListReviewsParams extends Partial<PageRequest> {
  product_id?: number
  status?: number
  user_id?: number
  keyword?: string
}

/** 评价列表响应（ListReviewsResponse） */
export interface ListReviewsResponse {
  reviews: Review[]
  meta: PageMeta
  summary: ReviewSummary
}

/** 设置评价状态（SetReviewStatusRequest） */
export interface SetReviewStatusRequest {
  id: number
  status: number
  admin_reply?: string
}
