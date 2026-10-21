import { ref } from 'vue'

import { getProduct } from '@/api/product'
import { useAppStore } from '@/stores/app'
import { useCartStore } from '@/stores/cart'

/**
 * 加入购物车
 * 商品卡片只有商品信息，需要先取详情拿到默认 SKU。
 */
export function useAddToCart() {
  const cart = useCartStore()
  const app = useAppStore()
  const loading = ref(false)

  async function add(productId: number, quantity = 1): Promise<boolean> {
    loading.value = true
    try {
      const detail = await getProduct(productId)
      const sku = detail.skus.find((item) => item.enabled && item.stock > 0)
      if (!sku) {
        app.error('该商品暂时缺货')
        return false
      }
      await cart.addToCart({
        product_id: productId,
        sku_id: sku.id,
        quantity,
      })
      app.success('已加入购物车')
      return true
    } catch {
      // 失败提示由接口层统一处理
      return false
    } finally {
      loading.value = false
    }
  }

  return { add, loading }
}
