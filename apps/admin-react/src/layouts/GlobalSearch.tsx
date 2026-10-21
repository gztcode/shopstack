/**
 * 顶栏全局搜索：商品关键词联想
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AutoComplete, Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { listProducts } from '@/api/product'

interface ProductOption {
  value: string
  label: string
  id: number
}

/** 全局搜索 */
export default function GlobalSearch() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [options, setOptions] = useState<ProductOption[]>([])

  const handleSearch = async (value: string) => {
    setKeyword(value)
    if (!value.trim()) {
      setOptions([])
      return
    }
    const result = await listProducts({ keyword: value, page: 1, page_size: 6 })
    setOptions(
      result.products.map((product) => ({
        value: product.title,
        label: product.title,
        id: product.id,
      })),
    )
  }

  const handleSelect = (value: string) => {
    navigate(`/products?keyword=${encodeURIComponent(value)}`)
  }

  const handlePressEnter = () => {
    if (keyword.trim()) {
      navigate(`/products?keyword=${encodeURIComponent(keyword.trim())}`)
    }
  }

  return (
    <AutoComplete
      className="global-search"
      options={options}
      onSearch={handleSearch}
      onSelect={handleSelect}
      value={keyword}
      style={{ width: 260 }}
    >
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="搜索商品 / 订单号"
        onPressEnter={handlePressEnter}
        onChange={(event) => setKeyword(event.target.value)}
      />
    </AutoComplete>
  )
}
