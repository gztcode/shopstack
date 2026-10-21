/**
 * 售后管理 —— 审核用户提交的售后申请
 */
import { Button, Popconfirm, Space } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { listAfterSales, setAfterSaleStatus } from '@/api/order'
import { useMessage } from '@/hooks/useMessage'
import { formatDateTime, formatYuan } from '@/utils/format'
import { AFTER_SALE_STATUS_OPTIONS, AFTER_SALE_TYPE_OPTIONS } from '@/utils/resourceOptions'
import type { AfterSale } from '@/types'
import ResourceTable, { boolTag, type ResourceColumn, type ResourceField } from '@/components/ResourceTable'

const columns: ResourceColumn<AfterSale>[] = [
  { title: '售后单号', dataIndex: 'after_sale_no', width: 170 },
  { title: '订单号', dataIndex: 'order_no', width: 170 },
  {
    title: '类型',
    dataIndex: 'type',
    width: 110,
    render: (value) => AFTER_SALE_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? '-',
  },
  {
    title: '退款金额',
    dataIndex: 'amount_cents',
    width: 120,
    align: 'right',
    render: (value) => formatYuan(Number(value ?? 0)),
  },
  { title: '原因', dataIndex: 'reason', width: 150, ellipsis: true, render: (value) => String(value || '—') },
  {
    title: '状态',
    dataIndex: 'status',
    width: 110,
    render: (value) => {
      const option = AFTER_SALE_STATUS_OPTIONS.find((item) => item.value === value)
      return boolTag(Number(value) === 0, option?.label ?? '待审核', option?.label ?? '-')
    },
  },
  {
    title: '申请时间',
    dataIndex: 'created_at',
    width: 170,
    render: (value) => formatDateTime(String(value ?? '')),
  },
]

const searchFields: ResourceField[] = [
  { name: 'keyword', label: '关键词', searchable: true, width: 200, placeholder: '售后单号 / 订单号' },
  { name: 'status', label: '状态', type: 'select', searchable: true, width: 150, options: AFTER_SALE_STATUS_OPTIONS },
  { name: 'type', label: '类型', type: 'select', searchable: true, width: 150, options: AFTER_SALE_TYPE_OPTIONS },
]

/** 售后管理页 */
export default function AfterSales() {
  const message = useMessage()

  const handleAudit = async (record: AfterSale, status: number) => {
    try {
      await setAfterSaleStatus(record.id, status, status === 1 ? '审核通过' : '审核驳回')
      message.success(status === 1 ? '售后申请已通过' : '售后申请已驳回')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '操作失败')
    }
  }

  return (
    <ResourceTable<AfterSale, Awaited<ReturnType<typeof listAfterSales>>>
      title="售后管理"
      description="审核用户提交的仅退款 / 退货退款 / 换货申请"
      listKey="after_sales"
      queryKey="after-sales"
      searchFields={searchFields}
      fetcher={(params) =>
        listAfterSales({
          keyword: params.keyword ? String(params.keyword) : undefined,
          status: params.status !== undefined ? Number(params.status) : undefined,
          type: params.type !== undefined ? Number(params.type) : undefined,
          page: Number(params.page ?? 1),
          page_size: Number(params.page_size ?? 20),
        })
      }
      columns={columns}
      emptyText="暂无售后申请"
      rowActions={(record) =>
        record.status === 0 ? (
          <Space size={4}>
            <Popconfirm title="确认通过该售后申请？" onConfirm={() => handleAudit(record, 1)}>
              <Button type="link" size="small" icon={<CheckOutlined />}>
                通过
              </Button>
            </Popconfirm>
            <Popconfirm title="确认驳回该售后申请？" onConfirm={() => handleAudit(record, 2)}>
              <Button type="link" size="small" danger icon={<CloseOutlined />}>
                驳回
              </Button>
            </Popconfirm>
          </Space>
        ) : null
      }
    />
  )
}
