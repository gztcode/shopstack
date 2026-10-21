import { httpGet, httpPost } from '@/api/client'
import * as mock from '@/mock'
import { getCachedUser } from '@/utils/auth'
import type {
  Category,
  Channel,
  ListBannersResponse,
  ListCategoriesResponse,
  ListChannelProductsResponse,
  ListChannelsResponse,
  ListProductParamsResponse,
  ListProductQuestionsResponse,
  ListProductsResponse,
  ListReviewTagsResponse,
  ListReviewsResponse,
  ProductDetail,
  Review,
} from '@/types'

export interface ListProductsParams {
  page?: number
  page_size?: number
  keyword?: string
  category_id?: number
  min_price_cents?: number
  max_price_cents?: number
  sort?: string
  only_in_stock?: boolean
}

/** 商品列表 */
export function listProducts(params: ListProductsParams): Promise<ListProductsResponse> {
  return httpGet<ListProductsResponse>(
    '/api/v1/products',
    {
      'page.page': params.page,
      'page.page_size': params.page_size,
      keyword: params.keyword,
      category_id: params.category_id,
      min_price_cents: params.min_price_cents,
      max_price_cents: params.max_price_cents,
      sort: params.sort,
      only_in_stock: params.only_in_stock,
    },
    { fallback: () => mock.listProducts(params) },
  )
}

/** 商品详情 */
export function getProduct(id: number): Promise<ProductDetail> {
  return httpGet<ProductDetail>(
    '/api/v1/products/{id}'.replace('{id}', String(id)),
    undefined,
    { fallback: () => mock.productDetail(id) },
  )
}

/** 分类列表 */
export function listCategories(params?: {
  parent_id?: number
  tree?: boolean
}): Promise<ListCategoriesResponse> {
  return httpGet<ListCategoriesResponse>(
    '/api/v1/categories',
    { parent_id: params?.parent_id, tree: params?.tree },
    { fallback: () => mock.listCategories() },
  )
}

/** 轮播图 */
export function listBanners(position?: string): Promise<ListBannersResponse> {
  return httpGet<ListBannersResponse>(
    '/api/v1/banners',
    { position },
    { fallback: () => mock.listBanners(position) },
  )
}

/** 评价列表 */
export function listReviews(params: {
  page?: number
  page_size?: number
  product_id?: number
  user_id?: number
  /** 0 全部 1 有图 2 好评 3 中差评 */
  filter?: number
  keyword?: string
}): Promise<ListReviewsResponse> {
  return httpGet<ListReviewsResponse>(
    '/api/v1/reviews',
    {
      'page.page': params.page,
      'page.page_size': params.page_size,
      product_id: params.product_id,
      user_id: params.user_id,
      filter: params.filter,
      keyword: params.keyword,
    },
    { fallback: () => mock.listReviews(params) },
  )
}

/** 提交评价 */
export function createReview(payload: {
  product_id: number
  sku_id: number
  rating: number
  content: string
  images?: string[]
}): Promise<Review> {
  const user = getCachedUser<{ id?: number }>()
  return httpPost<Review>(
    '/api/v1/reviews',
    { user_id: user?.id ?? 0, ...payload },
    {
      fallback: () => ({
        id: Date.now(),
        product_id: payload.product_id,
        product_title: '',
        user_id: 1,
        user_nickname: '演示用户',
        user_avatar: '',
        rating: payload.rating,
        content: payload.content,
        images: payload.images ?? [],
        sku_id: payload.sku_id,
        sku_text: '',
        status: 'REVIEW_STATUS_PENDING',
        admin_reply: '',
        like_count: 0,
        created_at: new Date().toISOString(),
      }),
    },
  )
}

/** 分类树（含子分类） */
export function categoryTree(categories: Category[]): Category[] {
  return categories
}

/* ---------------------------------------------------------------------------
 * 频道 / 楼层（阶段 3 扩量）
 * --------------------------------------------------------------------------- */

/** 频道列表 */
export function listChannels(params?: {
  page?: number
  page_size?: number
  keyword?: string
  type?: number
}): Promise<ListChannelsResponse> {
  return httpGet<ListChannelsResponse>(
    '/api/v1/channels',
    {
      'page.page': params?.page,
      'page.page_size': params?.page_size,
      keyword: params?.keyword,
      type: params?.type,
    },
    {
      fallback: () => mock.listChannels({
        page: params?.page,
        page_size: params?.page_size,
        keyword: params?.keyword,
        type: params?.type,
      }),
    },
  )
}

/** 频道详情 */
export function getChannel(id: number): Promise<Channel> {
  return httpGet<Channel>(
    `/api/v1/channels/${id}`,
    undefined,
    { fallback: () => mock.getChannel(id) },
  )
}

/** 频道商品列表 */
export function listChannelProducts(
  channelId: number,
  params?: {
    page?: number
    page_size?: number
    keyword?: string
    sort?: string
  },
): Promise<ListChannelProductsResponse> {
  return httpGet<ListChannelProductsResponse>(
    `/api/v1/channels/${channelId}/products`,
    {
      'page.page': params?.page,
      'page.page_size': params?.page_size,
      keyword: params?.keyword,
      sort: params?.sort,
    },
    {
      fallback: () =>
        mock.listChannelProducts(channelId, {
          page: params?.page,
          page_size: params?.page_size,
          keyword: params?.keyword,
          sort: params?.sort,
        }),
    },
  )
}

/** 商品参数 */
export function listProductParams(productId: number): Promise<ListProductParamsResponse> {
  return httpGet<ListProductParamsResponse>(
    `/api/v1/products/${productId}/params`,
    undefined,
    { fallback: () => mock.listProductParams(productId) },
  )
}

/** 商品问答 */
export function listProductQuestions(
  productId: number,
  params?: { page?: number; page_size?: number },
): Promise<ListProductQuestionsResponse> {
  return httpGet<ListProductQuestionsResponse>(
    `/api/v1/products/${productId}/questions`,
    {
      'page.page': params?.page,
      'page.page_size': params?.page_size,
    },
    {
      fallback: () =>
        mock.listProductQuestions(productId, {
          page: params?.page,
          page_size: params?.page_size,
        }),
    },
  )
}

/** 评价标签 */
export function listReviewTags(params?: {
  page?: number
  page_size?: number
}): Promise<ListReviewTagsResponse> {
  return httpGet<ListReviewTagsResponse>(
    '/api/v1/reviews/tags',
    {
      'page.page': params?.page,
      'page.page_size': params?.page_size,
    },
    {
      fallback: () =>
        mock.listReviewTags({ page: params?.page, page_size: params?.page_size }),
    },
  )
}
