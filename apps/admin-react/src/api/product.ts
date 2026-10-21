/**
 * 商品域接口 —— product.proto(ProductService / CategoryService / ReviewService)
 */
import { del, get, post, put, withMock } from './client'
import type {
  Banner,
  Category,
  Channel,
  Guarantee,
  ListCategoriesResponse,
  ListChannelProductsResponse,
  ListChannelsResponse,
  ListGuaranteesResponse,
  ListProductParamsResponse,
  ListProductsParams,
  ListProductsResponse,
  ListQuestionsResponse,
  ListReviewTagsResponse,
  ListReviewsParams,
  ListReviewsResponse,
  OperationResult,
  Product,
  ProductDetail,
  ProductQuestion,
  Review,
  ReviewTag,
  SaveBannerRequest,
  SaveCategoryRequest,
  SaveChannelRequest,
  SaveGuaranteeRequest,
  SaveProductRequest,
  SaveReviewTagRequest,
  SetReviewStatusRequest,
} from '@/types'
import {
  mockAnswerQuestion,
  mockDeleteBanner,
  mockDeleteCategory,
  mockDeleteChannel,
  mockDeleteGuarantee,
  mockDeleteProduct,
  mockDeleteReviewTag,
  mockGetProduct,
  mockListBanners,
  mockListCategories,
  mockListChannelProducts,
  mockListChannels,
  mockListGuarantees,
  mockListProductParams,
  mockListProducts,
  mockListQuestions,
  mockListReviewTags,
  mockListReviews,
  mockSaveBanner,
  mockSaveCategory,
  mockSaveChannel,
  mockSaveGuarantee,
  mockSaveProduct,
  mockSaveReviewTag,
  mockSetProductStatus,
  mockSetReviewStatus,
} from '@/mock'

/** 商品列表 */
export function listProducts(params: ListProductsParams = {}): Promise<ListProductsResponse> {
  return withMock(
    '商品列表',
    () => get<ListProductsResponse>('/products', { params }),
    () => mockListProducts(params),
  )
}

/** 商品详情 */
export function getProduct(id: number): Promise<ProductDetail> {
  return withMock('商品详情', () => get<ProductDetail>(`/products/${id}`), () => mockGetProduct(id))
}

/** 保存商品（新增/编辑） */
export function saveProduct(payload: SaveProductRequest): Promise<Product> {
  return withMock(
    '保存商品',
    () => (payload.id ? put<Product>('/admin/products', payload) : post<Product>('/admin/products', payload)),
    () => mockSaveProduct(payload as unknown as Partial<Product> & { title: string }),
  )
}

/** 设置商品状态（1 草稿 2 上架 3 下架） */
export function setProductStatus(id: number, status: number): Promise<Product> {
  return withMock(
    '商品上下架',
    () => put<Product>(`/admin/products/${id}/status`, { id, status }),
    () => mockSetProductStatus(id, status),
  )
}

/** 删除商品 */
export function deleteProduct(id: number): Promise<OperationResult> {
  return withMock(
    '删除商品',
    () => del<OperationResult>(`/admin/products/${id}`),
    () => mockDeleteProduct(id),
  )
}

/** 分类列表（树形） */
export function listCategories(): Promise<ListCategoriesResponse> {
  return withMock(
    '分类列表',
    () => get<ListCategoriesResponse>('/categories', { params: { tree: true } }),
    () => mockListCategories(),
  )
}

/** 保存分类 */
export function saveCategory(payload: SaveCategoryRequest): Promise<Category> {
  return withMock(
    '保存分类',
    () =>
      payload.id
        ? put<Category>('/admin/categories', payload)
        : post<Category>('/admin/categories', payload),
    () => mockSaveCategory(payload),
  )
}

/** 删除分类 */
export function deleteCategory(id: number): Promise<OperationResult> {
  return withMock(
    '删除分类',
    () => del<OperationResult>(`/admin/categories/${id}`),
    () => mockDeleteCategory(id),
  )
}

/** 评价列表 */
export function listReviews(params: ListReviewsParams = {}): Promise<ListReviewsResponse> {
  return withMock(
    '评价列表',
    () => get<ListReviewsResponse>('/reviews', { params }),
    () => mockListReviews(params),
  )
}

/** 设置评价状态（1 待审核 2 通过 3 驳回） */
export function setReviewStatus(payload: SetReviewStatusRequest): Promise<Review> {
  return withMock(
    '评价审核',
    () => put<Review>(`/admin/reviews/${payload.id}/status`, payload),
    () => mockSetReviewStatus(payload.id, payload.status, payload.admin_reply),
  )
}

/** 轮播列表 */
export function listBanners(): Promise<{ banners: Banner[] }> {
  return withMock('轮播列表', () => get<{ banners: Banner[] }>('/banners'), () => mockListBanners())
}

/** 保存轮播 */
export function saveBanner(payload: SaveBannerRequest): Promise<Banner> {
  return withMock(
    '保存轮播',
    () => post<Banner>('/admin/banners', payload),
    () => mockSaveBanner(payload as unknown as Partial<Banner> & { title: string }),
  )
}

/** 删除轮播 */
export function deleteBanner(id: number): Promise<OperationResult> {
  return withMock(
    '删除轮播',
    () => del<OperationResult>(`/admin/banners/${id}`),
    () => mockDeleteBanner(id),
  )
}

// ---------------------------------------------------------------------------
// 频道 / 评价标签 / 服务保障 / 商品问答 / 商品参数
// ---------------------------------------------------------------------------

/** 频道列表 */
export function listChannels(
  params: { keyword?: string; type?: number; page?: number; page_size?: number } = {},
): Promise<ListChannelsResponse> {
  return withMock(
    '频道列表',
    () => get<ListChannelsResponse>('/channels', { params }),
    () => mockListChannels(params),
  )
}

/** 保存频道（新增/编辑） */
export function saveChannel(payload: SaveChannelRequest): Promise<Channel> {
  return withMock(
    '保存频道',
    () =>
      payload.id
        ? put<Channel>('/admin/channels', payload)
        : post<Channel>('/admin/channels', payload),
    () => mockSaveChannel(payload),
  )
}

/** 删除频道 */
export function deleteChannel(id: number): Promise<OperationResult> {
  return withMock(
    '删除频道',
    () => del<OperationResult>(`/admin/channels/${id}`),
    () => mockDeleteChannel(id),
  )
}

/** 频道商品 */
export function listChannelProducts(
  params: { channel_id?: number; keyword?: string; sort?: string; page?: number; page_size?: number } = {},
): Promise<ListChannelProductsResponse> {
  return withMock(
    '频道商品',
    () => get<ListChannelProductsResponse>(`/channels/${params.channel_id ?? 1}/products`, { params }),
    () => mockListChannelProducts(params),
  )
}

/** 评价标签列表 */
export function listReviewTags(
  params: { keyword?: string; page?: number; page_size?: number } = {},
): Promise<ListReviewTagsResponse> {
  return withMock(
    '评价标签',
    () => get<ListReviewTagsResponse>('/reviews/tags', { params }),
    () => mockListReviewTags(params),
  )
}

/** 保存评价标签 */
export function saveReviewTag(payload: SaveReviewTagRequest): Promise<ReviewTag> {
  return withMock(
    '保存评价标签',
    () => post<ReviewTag>('/admin/review-tags', payload),
    () => mockSaveReviewTag(payload),
  )
}

/** 删除评价标签 */
export function deleteReviewTag(id: number): Promise<OperationResult> {
  return withMock(
    '删除评价标签',
    () => del<OperationResult>(`/admin/review-tags/${id}`),
    () => mockDeleteReviewTag(id),
  )
}

/** 服务保障列表 */
export function listGuarantees(
  params: { page?: number; page_size?: number } = {},
): Promise<ListGuaranteesResponse> {
  return withMock(
    '服务保障',
    () => get<ListGuaranteesResponse>('/guarantees', { params }),
    () => mockListGuarantees(params),
  )
}

/** 保存服务保障 */
export function saveGuarantee(payload: SaveGuaranteeRequest): Promise<Guarantee> {
  return withMock(
    '保存服务保障',
    () => post<Guarantee>('/admin/guarantees', payload),
    () => mockSaveGuarantee(payload),
  )
}

/** 删除服务保障 */
export function deleteGuarantee(id: number): Promise<OperationResult> {
  return withMock(
    '删除服务保障',
    () => del<OperationResult>(`/admin/guarantees/${id}`),
    () => mockDeleteGuarantee(id),
  )
}

/** 商品问答列表（后台） */
export function listQuestions(
  params: { keyword?: string; product_id?: number; page?: number; page_size?: number } = {},
): Promise<ListQuestionsResponse> {
  return withMock(
    '商品问答',
    () => get<ListQuestionsResponse>('/admin/questions', { params }),
    () => mockListQuestions(params),
  )
}

/** 回复商品问答 */
export function answerQuestion(id: number, reply: string): Promise<ProductQuestion> {
  return withMock(
    '回复问答',
    () => post<ProductQuestion>(`/admin/questions/${id}/answer`, { id, reply }),
    () => mockAnswerQuestion(id, reply),
  )
}

/** 商品参数（按商品 id） */
export function listProductParams(productId: number): Promise<ListProductParamsResponse> {
  return withMock(
    '商品参数',
    () => get<ListProductParamsResponse>(`/products/${productId}/params`),
    () => mockListProductParams(productId),
  )
}
