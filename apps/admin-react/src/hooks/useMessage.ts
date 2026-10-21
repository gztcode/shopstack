/**
 * 消息提示 Hook
 * antd 5 中静态 message 无法消费 App 的动态主题上下文，会在控制台告警，
 * 这里统一通过 App.useApp() 获取实例。
 */
import { App } from 'antd'

/** 获取与当前主题上下文联动的 message 实例 */
export function useMessage() {
  const { message } = App.useApp()
  return message
}
