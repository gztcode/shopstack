/**
 * 路由配置
 *
 * 页面组件按需懒加载（React.lazy + Suspense），受保护路由统一由 AuthGuard 校验权限，
 * 权限点与 src/layouts/menu.tsx 中的菜单项保持一致。
 */
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'
import { Spin } from 'antd'
import MainLayout from '@/layouts/MainLayout'
import { canAccess } from '@/layouts/menu'
import { useAuthStore } from '@/store/auth'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Products = lazy(() => import('@/pages/Products'))
const Categories = lazy(() => import('@/pages/Categories'))
const Reviews = lazy(() => import('@/pages/Reviews'))
const Orders = lazy(() => import('@/pages/Orders'))
const Refunds = lazy(() => import('@/pages/Refunds'))
const Payments = lazy(() => import('@/pages/Payments'))
const Users = lazy(() => import('@/pages/Users'))
const Inventory = lazy(() => import('@/pages/Inventory'))
const Coupons = lazy(() => import('@/pages/Coupons'))
const Promotions = lazy(() => import('@/pages/Promotions'))
const Banners = lazy(() => import('@/pages/Banners'))
const Logistics = lazy(() => import('@/pages/Logistics'))
const Roles = lazy(() => import('@/pages/system/Roles'))
const AuditLogs = lazy(() => import('@/pages/system/AuditLogs'))
const SmsRecords = lazy(() => import('@/pages/system/SmsRecords'))
const Materials = lazy(() => import('@/pages/Materials'))
const Invoices = lazy(() => import('@/pages/Invoices'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const Settings = lazy(() => import('@/pages/Settings'))
const Skus = lazy(() => import('@/pages/Skus'))
const ProductDetail = lazy(() => import('@/pages/ProductDetail'))
const Permissions = lazy(() => import('@/pages/system/Permissions'))
const InventoryLogs = lazy(() => import('@/pages/system/InventoryLogs'))
const LogisticsTrack = lazy(() => import('@/pages/LogisticsTrack'))
const SmsSend = lazy(() => import('@/pages/system/SmsSend'))
const Channels = lazy(() => import('@/pages/Channels'))
const ChannelProducts = lazy(() => import('@/pages/ChannelProducts'))
const ReviewTags = lazy(() => import('@/pages/ReviewTags'))
const Guarantees = lazy(() => import('@/pages/Guarantees'))
const Questions = lazy(() => import('@/pages/Questions'))
const QuestionAnswer = lazy(() => import('@/pages/QuestionAnswer'))
const PromotionSessions = lazy(() => import('@/pages/PromotionSessions'))
const GroupBuys = lazy(() => import('@/pages/GroupBuys'))
const GroupBuyDetail = lazy(() => import('@/pages/GroupBuyDetail'))
const MarketingTasks = lazy(() => import('@/pages/MarketingTasks'))
const SignInConfig = lazy(() => import('@/pages/SignInConfig'))
const ProductParams = lazy(() => import('@/pages/ProductParams'))
const AfterSales = lazy(() => import('@/pages/AfterSales'))
const AfterSaleDetail = lazy(() => import('@/pages/AfterSaleDetail'))
const RefundReasons = lazy(() => import('@/pages/RefundReasons'))
const OrderList = lazy(() => import('@/pages/OrderList'))
const OrderStatsChannel = lazy(() => import('@/pages/OrderStatsChannel'))
const OrderStatsHour = lazy(() => import('@/pages/OrderStatsHour'))
const OrderStatsRegion = lazy(() => import('@/pages/OrderStatsRegion'))
const OrderLogs = lazy(() => import('@/pages/OrderLogs'))
const PayChannels = lazy(() => import('@/pages/PayChannels'))
const RechargeOrders = lazy(() => import('@/pages/RechargeOrders'))
const BalanceLogs = lazy(() => import('@/pages/BalanceLogs'))
const ReturnShipments = lazy(() => import('@/pages/ReturnShipments'))
const Warehouses = lazy(() => import('@/pages/Warehouses'))
const InboundOrders = lazy(() => import('@/pages/InboundOrders'))
const InboundOrderDetail = lazy(() => import('@/pages/InboundOrderDetail'))
const InboundOrderCreate = lazy(() => import('@/pages/InboundOrderCreate'))
const OutboundOrders = lazy(() => import('@/pages/OutboundOrders'))
const OutboundOrderDetail = lazy(() => import('@/pages/OutboundOrderDetail'))
const OutboundOrderCreate = lazy(() => import('@/pages/OutboundOrderCreate'))
const StockChecks = lazy(() => import('@/pages/StockChecks'))
const StockCheckDetail = lazy(() => import('@/pages/StockCheckDetail'))
const StockCheckItems = lazy(() => import('@/pages/StockCheckItems'))
const UserLevels = lazy(() => import('@/pages/UserLevels'))
const UserLevelDetail = lazy(() => import('@/pages/UserLevelDetail'))
const UserLevelStats = lazy(() => import('@/pages/UserLevelStats'))
const UsersByLevel = lazy(() => import('@/pages/UsersByLevel'))
const GrowthLogs = lazy(() => import('@/pages/GrowthLogs'))
const Feedbacks = lazy(() => import('@/pages/Feedbacks'))
const FeedbackDetail = lazy(() => import('@/pages/FeedbackDetail'))
const GroupBuyMembers = lazy(() => import('@/pages/GroupBuyMembers'))
const LogisticsCompanies = lazy(() => import('@/pages/LogisticsCompanies'))
const DeliveryRanges = lazy(() => import('@/pages/DeliveryRanges'))
const LogisticsTemplates = lazy(() => import('@/pages/LogisticsTemplates'))
const LogisticsTemplateDetail = lazy(() => import('@/pages/LogisticsTemplateDetail'))
const FreightCalc = lazy(() => import('@/pages/FreightCalc'))
const NotificationTemplates = lazy(() => import('@/pages/NotificationTemplates'))
const SmsTemplates = lazy(() => import('@/pages/SmsTemplates'))
const SensitiveWords = lazy(() => import('@/pages/SensitiveWords'))
const NotificationCategories = lazy(() => import('@/pages/NotificationCategories'))
const Shipments = lazy(() => import('@/pages/Shipments'))
const ShipmentDetail = lazy(() => import('@/pages/ShipmentDetail'))

const Login = lazy(() => import('@/pages/Login'))
const Forbidden = lazy(() => import('@/pages/Forbidden'))
const NotFound = lazy(() => import('@/pages/NotFound'))

/** 登录与权限守卫 */
function AuthGuard({ children }: { children: ReactElement }) {
  const location = useLocation()
  const accessToken = useAuthStore((state) => state.accessToken)
  const permissions = useAuthStore((state) => state.permissions)

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!canAccess(location.pathname, permissions)) {
    return <Forbidden />
  }

  return children
}

/** 懒加载占位 */
function RouteLoading() {
  // antd 5 的 tip 仅在嵌套（nest）或 fullscreen 模式下生效，独立使用会告警。
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <Spin size="large" tip="加载中...">
        <div style={{ height: 120, width: 1 }} />
      </Spin>
    </div>
  )
}

/** 路由表 */
export default function AppRouter() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        {/* 公开路由：根路径重定向、登录页、403 兜底；其后是受保护路由块 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} /><Route path="/login" element={<Login />} /><Route path="/forbidden" element={<Forbidden />} /><Route path="*" element={<NotFound />} /><Route element={<AuthGuard><MainLayout /></AuthGuard>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/refunds" element={<Refunds />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/users" element={<Users />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/coupons" element={<Coupons />} />
        <Route path="/promotions" element={<Promotions />} />
        <Route path="/banners" element={<Banners />} />
        <Route path="/logistics" element={<Logistics />} />
        <Route path="/system/roles" element={<Roles />} />
        <Route path="/system/audit-logs" element={<AuditLogs />} />
        <Route path="/system/sms" element={<SmsRecords />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/skus" element={<Skus />} />
        <Route path="/products/detail" element={<ProductDetail />} />
        <Route path="/system/permissions" element={<Permissions />} />
        <Route path="/inventory/logs" element={<InventoryLogs />} />
        <Route path="/logistics/track" element={<LogisticsTrack />} />
        <Route path="/system/sms/send" element={<SmsSend />} />
        <Route path="/channels" element={<Channels />} />
        <Route path="/channels/products" element={<ChannelProducts />} />
        <Route path="/review-tags" element={<ReviewTags />} />
        <Route path="/guarantees" element={<Guarantees />} />
        <Route path="/questions" element={<Questions />} />
        <Route path="/questions/answer" element={<QuestionAnswer />} />
        <Route path="/promotion-sessions" element={<PromotionSessions />} />
        <Route path="/group-buys" element={<GroupBuys />} />
        <Route path="/group-buys/detail" element={<GroupBuyDetail />} />
        <Route path="/marketing-tasks" element={<MarketingTasks />} />
        <Route path="/sign-in-config" element={<SignInConfig />} />
        <Route path="/product-params" element={<ProductParams />} />
        <Route path="/after-sales" element={<AfterSales />} />
        <Route path="/after-sales/detail" element={<AfterSaleDetail />} />
        <Route path="/refund-reasons" element={<RefundReasons />} />
        <Route path="/orders/list" element={<OrderList />} />
        <Route path="/orders/stats/channel" element={<OrderStatsChannel />} />
        <Route path="/orders/stats/hour" element={<OrderStatsHour />} />
        <Route path="/orders/stats/region" element={<OrderStatsRegion />} />
        <Route path="/order-logs" element={<OrderLogs />} />
        <Route path="/pay-channels" element={<PayChannels />} />
        <Route path="/recharge-orders" element={<RechargeOrders />} />
        <Route path="/balance-logs" element={<BalanceLogs />} />
        <Route path="/return-shipments" element={<ReturnShipments />} />
        <Route path="/warehouses" element={<Warehouses />} />
        <Route path="/inbound-orders" element={<InboundOrders />} />
        <Route path="/inbound-orders/detail" element={<InboundOrderDetail />} />
        <Route path="/inbound-orders/create" element={<InboundOrderCreate />} />
        <Route path="/outbound-orders" element={<OutboundOrders />} />
        <Route path="/outbound-orders/detail" element={<OutboundOrderDetail />} />
        <Route path="/outbound-orders/create" element={<OutboundOrderCreate />} />
        <Route path="/stock-checks" element={<StockChecks />} />
        <Route path="/stock-checks/detail" element={<StockCheckDetail />} />
        <Route path="/stock-checks/items" element={<StockCheckItems />} />
        <Route path="/user-levels" element={<UserLevels />} />
        <Route path="/user-levels/detail" element={<UserLevelDetail />} />
        <Route path="/user-levels/stats" element={<UserLevelStats />} />
        <Route path="/users/by-level" element={<UsersByLevel />} />
        <Route path="/growth-logs" element={<GrowthLogs />} />
        <Route path="/feedbacks" element={<Feedbacks />} />
        <Route path="/feedbacks/detail" element={<FeedbackDetail />} />
        <Route path="/group-buys/members" element={<GroupBuyMembers />} />
        <Route path="/logistics/companies" element={<LogisticsCompanies />} />
        <Route path="/logistics/ranges" element={<DeliveryRanges />} />
        <Route path="/logistics/templates" element={<LogisticsTemplates />} />
        <Route path="/logistics/templates/detail" element={<LogisticsTemplateDetail />} />
        <Route path="/logistics/freight" element={<FreightCalc />} />
        <Route path="/notification-templates" element={<NotificationTemplates />} />
        <Route path="/sms-templates" element={<SmsTemplates />} />
        <Route path="/sensitive-words" element={<SensitiveWords />} />
        <Route path="/notification-categories" element={<NotificationCategories />} />
        <Route path="/shipments" element={<Shipments />} />
        <Route path="/shipments/detail" element={<ShipmentDetail />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
