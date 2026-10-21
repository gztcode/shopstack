/**
 * 发票域接口 —— user.proto(AdminService.ListInvoices / SetInvoiceStatus)
 */
import { get, put, withMock } from './client'
import type { Invoice, ListInvoicesParams, ListInvoicesResponse } from '@/types'
import { mockListInvoices, mockSetInvoiceStatus } from '@/mock'

/** 发票列表 */
export function listInvoices(params: ListInvoicesParams = {}): Promise<ListInvoicesResponse> {
  return withMock(
    '发票列表',
    () => get<ListInvoicesResponse>('/admin/invoices', { params }),
    () => mockListInvoices(params),
  )
}

/**
 * 设置发票状态
 * @param id 发票 ID
 * @param status 0 待开票 / 1 已开票 / 2 已驳回
 * @param invoiceUrl 电子发票地址（status=1 时可省略，服务端会生成占位地址）
 * @param remark 驳回原因
 */
export function setInvoiceStatus(
  id: number,
  status: number,
  invoiceUrl?: string,
  remark?: string,
): Promise<Invoice> {
  return withMock(
    '更新发票状态',
    () =>
      put<Invoice>(`/admin/invoices/${id}/status`, {
        id,
        status,
        invoice_url: invoiceUrl,
        remark,
      }),
    () => mockSetInvoiceStatus(id, status, invoiceUrl, remark),
  )
}
