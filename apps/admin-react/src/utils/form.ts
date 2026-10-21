/**
 * 表单辅助方法
 */
import type { FormInstance } from 'antd'

/**
 * 校验表单：校验失败返回 null。
 * antd 的 validateFields 在校验失败时会 reject 一个普通对象，
 * 直接 await 会产生未捕获的 Promise 拒绝，这里统一收敛。
 */
export async function validateForm<T>(form: FormInstance<T>): Promise<T | null> {
  try {
    return await form.validateFields()
  } catch {
    return null
  }
}
