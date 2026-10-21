/**
 * 搜索表单：统一「查询 / 重置」交互
 */
import type { ReactNode } from 'react'
import { Button, Form, Space } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'

export interface SearchFormValues {
  [key: string]: unknown
}

interface SearchFormProps {
  /** 提交回调 */
  onSearch: (values: SearchFormValues) => void
  /** 重置回调（不传则仅清空表单） */
  onReset?: () => void
  loading?: boolean
  initialValues?: SearchFormValues
  children: ReactNode
}

/** 搜索表单 */
export default function SearchForm({
  onSearch,
  onReset,
  loading,
  initialValues,
  children,
}: SearchFormProps) {
  const [form] = Form.useForm<SearchFormValues>()

  const handleReset = () => {
    form.resetFields()
    onReset?.()
  }

  return (
    <Form
      form={form}
      layout="inline"
      className="search-form"
      initialValues={initialValues}
      onFinish={(values) => onSearch(values)}
    >
      {children}
      <Form.Item className="search-form__actions">
        <Space>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
            查询
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  )
}
