/**
 * ECharts 轻量封装
 * 说明：当前 npm 源无法安装 react-echarts（仅提供 0.1.1 版本），
 * 因此直接基于 echarts 核心实现等价的 React 组件。
 */
import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer,
])

export type EChartsOption = echarts.EChartsCoreOption

interface EChartProps {
  option: EChartsOption
  height?: number | string
  loading?: boolean
}

/** ECharts 图表容器 */
export default function EChart({ option, height = 320, loading }: EChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const chart = echarts.init(containerRef.current, undefined, { renderer: 'canvas' })
    chartRef.current = chart

    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option])

  useEffect(() => {
    if (!loading) return
    chartRef.current?.showLoading('default', {
      text: '加载中',
      color: '#2A4AD9',
      textColor: '#6B7A8F',
    })
  }, [loading])

  useEffect(() => {
    if (loading) chartRef.current?.hideLoading()
  }, [loading, option])

  return <div ref={containerRef} style={{ width: '100%', height }} />
}
