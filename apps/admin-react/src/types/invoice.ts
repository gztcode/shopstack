/**
 * 发票类型 —— 对齐 proto/shopstack/user/v1/user.proto(Invoice)
 */
import type { PageMeta, PageRequest } from './common'

/** 发票（Invoice） */
export interface Invoice {
  id: number
  user_id: number
  order_no: string
  /** 发票抬头 */
  title: string
  /** 纳税人识别号 */
  tax_no: string
  /** personal / company */
  type: string
  email: string
  amount_cents: number
  /** 0 待开票 1 已开票 2 已驳回 */
  status: number
  /** 电子发票地址 */
  invoice_url: string
  remark: string
  created_at: string
}

/** 发票列表查询（ListInvoicesRequest） */
export interface ListInvoicesParams extends Partial<PageRequest> {
  user_id?: number
  status?: number
}

/** 发票列表响应（ListInvoicesResponse） */
export interface ListInvoicesResponse {
  invoices: Invoice[]
  meta: PageMeta
}

/** 设置发票状态（SetInvoiceStatusRequest） */
export interface SetInvoiceStatusRequest {
  id: number
  /** 0 待开票 1 已开票 2 已驳回 */
  status: number
  /** 开票后回填的电子发票地址 */
  invoice_url?: string
  /** 驳回原因 */
  remark?: string
}
