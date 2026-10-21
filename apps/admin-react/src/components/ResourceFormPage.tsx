/**
 * 通用表单页 —— 参数化的「新建 / 编辑」整页表单
 *
 * 入库单新建、出库单新建等页面共用本组件；
 * 通过 details 配置可附加动态明细行（Form.List）。
 */
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Form, Input, InputNumber, Select, Space, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useMessage } from '@/hooks/useMessage'
import { validateForm } from '@/utils/form'
import { yuanToCents } from '@/utils/format'
import PageContainer from './PageContainer'
import DemoModeAlert from './DemoModeAlert'
import type { ResourceField } from './ResourceTable'

/** 动态明细行配置 */
export interface ResourceDetailRow {
  /** 明细字段名 */
  name: string
  /** 明细标题 */
  label: string
  /** 明细列 */
  columns: ResourceField[]
}

export interface ResourceFormPageProps {
  title: string
  description?: string
  /** 主表单字段 */
  fields: ResourceField[]
  /** 提交回调（返回 true 表示保存成功） */
  onSubmit: (values: Record<string, unknown>) => Promise<boolean | void>
  /** 动态明细行 */
  details?: ResourceDetailRow
  /** 保存成功后的跳转路径 */
  successTo?: string
  /** 初始值 */
  initialValues?: Record<string, unknown>
  /** 额外内容 */
  children?: ReactNode
}

/** 通用表单页 */
export default function ResourceFormPage({
  title,
  description,
  fields,
  onSubmit,
  details,
  successTo,
  initialValues,
  children,
}: ResourceFormPageProps) {
  const message = useMessage()
  const navigate = useNavigate()
  const [form] = Form.useForm<Record<string, unknown>>()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    const values = await validateForm(form)
    if (values === null) return
    const payload: Record<string, unknown> = { ...values }
    fields.forEach((field) => {
      if (field.type === 'money' && field.name.endsWith('_cents')) {
        payload[field.name] = yuanToCents(values[field.name] as number)
      }
    })
    setSubmitting(true)
    try {
      await onSubmit(payload)
      message.success('保存成功')
      if (successTo) navigate(successTo)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageContainer
      title={title}
      description={description}
      extra={
        <Space>
          <Button onClick={() => navigate(-1)}>取消</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            提交
          </Button>
        </Space>
      }
    >
      <DemoModeAlert />

      <Card title="基本信息">
        <Form form={form} layout="vertical" initialValues={initialValues}>
          {fields.map((field) => (
            <Form.Item
              key={field.name}
              label={field.label}
              name={field.name}
              rules={field.required ? [{ required: true, message: `请填写${field.label}` }] : undefined}
              extra={field.help}
            >
              {renderField(field)}
            </Form.Item>
          ))}

          {details ? (
            <>
              <Typography.Title level={5}>{details.label}</Typography.Title>
              <Form.List
                name={details.name}
                rules={[
                  {
                    validator: async (_, rows) =>
                      rows && rows.length ? Promise.resolve() : Promise.reject(new Error(`至少添加一行${details.label}`)),
                  },
                ]}
              >
                {(rowFields, { add, remove }) => (
                  <>
                    {rowFields.map((rowField) => (
                      <Card
                        key={rowField.key}
                        size="small"
                        style={{ marginBottom: 12 }}
                        title={`第 ${rowField.name + 1} 行`}
                        extra={
                          <Button type="link" danger size="small" onClick={() => remove(rowField.name)}>
                            删除
                          </Button>
                        }
                      >
                        <Space size={12} wrap>
                          {details.columns.map((column) => (
                            <Form.Item
                              key={column.name}
                              label={column.label}
                              name={[rowField.name, column.name]}
                              rules={
                                column.required
                                  ? [{ required: true, message: `请填写${column.label}` }]
                                  : undefined
                              }
                            >
                              {renderField(column)}
                            </Form.Item>
                          ))}
                        </Space>
                      </Card>
                    ))}
                    <Button
                      type="dashed"
                      block
                      icon={<PlusOutlined />}
                      onClick={() =>
                        add(
                          details.columns.reduce<Record<string, unknown>>((acc, column) => {
                            acc[column.name] = column.initialValue ?? (column.type === 'number' ? 1 : '')
                            return acc
                          }, {}),
                        )
                      }
                    >
                      添加一行
                    </Button>
                  </>
                )}
              </Form.List>
            </>
          ) : null}

          {children}
        </Form>
      </Card>
    </PageContainer>
  )
}

/** 依据字段类型渲染控件 */
function renderField(field: ResourceField) {
  switch (field.type) {
    case 'textarea':
      return <Input.TextArea rows={3} placeholder={field.placeholder ?? `请输入${field.label}`} />
    case 'number':
      return (
        <InputNumber min={field.min} max={field.max} style={{ width: 220 }} placeholder={field.placeholder} />
      )
    case 'money':
      return <InputNumber min={0} precision={2} style={{ width: 220 }} placeholder={field.placeholder} />
    case 'select':
      return <Select style={{ width: 220 }} placeholder={field.placeholder} options={field.options} />
    case 'tags':
      return <Select mode="tags" style={{ width: '100%' }} placeholder={field.placeholder} />
    case 'switch':
      return <Select
        style={{ width: 220 }}
        options={[
          { label: '启用', value: 1 },
          { label: '停用', value: 0 },
        ]}
      />
    default:
      return <Input placeholder={field.placeholder ?? `请输入${field.label}`} style={{ width: 260 }} />
  }
}
