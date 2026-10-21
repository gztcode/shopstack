/**
 * 设计令牌 → Ant Design 5 ThemeConfig
 * 取值来源：shopstack/design-tokens/tokens.json（跨端单一数据源）
 */
import type { ThemeConfig } from 'antd'

/** 关键令牌（与 design-tokens/tokens.json 保持一致） */
export const tokens = {
  colorPrimary: '#2A4AD9',
  colorPrimaryHover: '#3B63F6',
  colorPrimaryActive: '#2239AC',
  colorSuccess: '#12B76A',
  colorWarning: '#F5A623',
  colorError: '#F04438',
  colorInfo: '#0BA5EC',
  colorPurple: '#7A5AF8',
  colorTextBase: '#1E2A38',
  colorBgLayout: '#F5F7FA',
  colorBgContainer: '#FFFFFF',
  colorBorderSecondary: '#E6EBF0',
  borderRadius: 10,
  borderRadiusLG: 14,
  borderRadiusSM: 6,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif",
  controlHeight: 34,
  wireframe: false,
} as const

/** 全局主题 */
export const shopstackTheme: ThemeConfig = {
  token: {
    colorPrimary: tokens.colorPrimary,
    colorSuccess: tokens.colorSuccess,
    colorWarning: tokens.colorWarning,
    colorError: tokens.colorError,
    colorInfo: tokens.colorInfo,
    colorTextBase: tokens.colorTextBase,
    colorBgLayout: tokens.colorBgLayout,
    colorBgContainer: tokens.colorBgContainer,
    colorBorderSecondary: tokens.colorBorderSecondary,
    borderRadius: tokens.borderRadius,
    borderRadiusLG: tokens.borderRadiusLG,
    borderRadiusSM: tokens.borderRadiusSM,
    fontFamily: tokens.fontFamily,
    controlHeight: tokens.controlHeight,
  },
  components: {
    Layout: {
      headerBg: '#FFFFFF',
      bodyBg: tokens.colorBgLayout,
      siderBg: '#FFFFFF',
      headerHeight: 56,
      headerPadding: '0 20px',
    },
    Menu: {
      itemHeight: 42,
      itemMarginInline: 8,
      itemBorderRadius: tokens.borderRadius,
      itemSelectedBg: '#EEF4FF',
      itemSelectedColor: tokens.colorPrimary,
    },
    Card: {
      borderRadiusLG: tokens.borderRadiusLG,
      paddingLG: 20,
    },
    Table: {
      headerBg: '#F8FAFC',
      headerColor: '#4B586A',
      rowHoverBg: '#F8FAFC',
      borderColor: '#E6EBF0',
    },
    Statistic: {
      contentFontSize: 26,
      titleFontSize: 14,
    },
    Descriptions: {
      labelBg: '#F8FAFC',
    },
  },
}
