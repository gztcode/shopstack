import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

/**
 * 路由表
 * meta.requiresAuth 为 true 的页面需要登录后访问。
 */
const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: '首页' },
    },
    {
      path: '/category/:id?',
      name: 'category',
      component: () => import('@/views/CategoryView.vue'),
      meta: { title: '商品分类' },
    },
    {
      path: '/product/:id',
      name: 'product',
      component: () => import('@/views/ProductDetailView.vue'),
      meta: { title: '商品详情' },
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/views/SearchView.vue'),
      meta: { title: '搜索结果' },
    },
    {
      path: '/cart',
      name: 'cart',
      component: () => import('@/views/CartView.vue'),
      meta: { title: '购物车' },
    },
    {
      path: '/checkout',
      name: 'checkout',
      component: () => import('@/views/CheckoutView.vue'),
      meta: { title: '结算确认', requiresAuth: true },
    },
    {
      path: '/payment/:orderId',
      name: 'payment',
      component: () => import('@/views/PaymentView.vue'),
      meta: { title: '收银台', requiresAuth: true },
    },
    {
      path: '/order',
      name: 'order',
      component: () => import('@/views/OrderListView.vue'),
      meta: { title: '我的订单', requiresAuth: true },
    },
    {
      path: '/order/:id',
      name: 'order-detail',
      component: () => import('@/views/OrderDetailView.vue'),
      meta: { title: '订单详情', requiresAuth: true },
    },
    {
      path: '/user',
      name: 'user',
      component: () => import('@/views/UserCenterView.vue'),
      meta: { title: '个人中心', requiresAuth: true },
    },
    {
      path: '/user/address',
      name: 'user-address',
      component: () => import('@/views/AddressView.vue'),
      meta: { title: '收货地址', requiresAuth: true },
    },
    {
      path: '/user/favorites',
      name: 'user-favorites',
      component: () => import('@/views/FavoritesView.vue'),
      meta: { title: '我的收藏', requiresAuth: true },
    },
    {
      path: '/user/coupons',
      name: 'user-coupons',
      component: () => import('@/views/CouponsView.vue'),
      meta: { title: '我的优惠券', requiresAuth: true },
    },
    {
      path: '/user/notification',
      name: 'user-notification',
      component: () => import('@/views/NotificationView.vue'),
      meta: { title: '消息通知', requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: '登录 / 注册' },
    },
    /* ---------------- 新增页面（16 → 30） ---------------- */
    {
      path: '/points',
      name: 'points',
      component: () => import('@/views/PointsView.vue'),
      meta: { title: '积分中心', requiresAuth: true },
    },
    {
      path: '/invoices',
      name: 'invoices',
      component: () => import('@/views/InvoicesView.vue'),
      meta: { title: '发票管理', requiresAuth: true },
    },
    {
      path: '/logistics',
      name: 'logistics',
      component: () => import('@/views/LogisticsView.vue'),
      meta: { title: '物流跟踪' },
    },
    {
      path: '/coupon-center',
      name: 'coupon-center',
      component: () => import('@/views/CouponCenterView.vue'),
      meta: { title: '领券中心' },
    },
    {
      path: '/reviews',
      name: 'reviews',
      component: () => import('@/views/MyReviewsView.vue'),
      meta: { title: '我的评价', requiresAuth: true },
    },
    {
      path: '/refund',
      name: 'refund',
      component: () => import('@/views/RefundView.vue'),
      meta: { title: '售后申请', requiresAuth: true },
    },
    {
      path: '/pay-result',
      name: 'pay-result',
      component: () => import('@/views/PayResultView.vue'),
      meta: { title: '支付结果' },
    },
    {
      path: '/flash-sale',
      name: 'flash-sale',
      component: () => import('@/views/FlashSaleView.vue'),
      meta: { title: '限时秒杀' },
    },
    {
      path: '/group-buy',
      name: 'group-buy',
      component: () => import('@/views/GroupBuyView.vue'),
      meta: { title: '拼团专区' },
    },
    {
      path: '/member',
      name: 'member',
      component: () => import('@/views/MemberView.vue'),
      meta: { title: '会员中心', requiresAuth: true },
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/HistoryView.vue'),
      meta: { title: '浏览足迹' },
    },
    {
      path: '/compare',
      name: 'compare',
      component: () => import('@/views/CompareView.vue'),
      meta: { title: '商品对比' },
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('@/views/CategoriesView.vue'),
      meta: { title: '全部分类' },
    },
    {
      path: '/order-trace',
      name: 'order-trace',
      component: () => import('@/views/OrderTraceView.vue'),
      meta: { title: '订单轨迹' },
    },
    /* ---------------- 新增页面（30 → 80） ---------------- */
    /* 频道与商品浏览（12） */
    {
      path: '/channels',
      name: 'channels',
      component: () => import('@/views/ChannelHubView.vue'),
      meta: { title: '频道首页' },
    },
    {
      path: '/channel/recommend',
      name: 'channel-recommend',
      component: () => import('@/views/ChannelRecommendView.vue'),
      meta: { title: '推荐频道' },
    },
    {
      path: '/channel/newest',
      name: 'channel-newest',
      component: () => import('@/views/ChannelNewestView.vue'),
      meta: { title: '新品频道' },
    },
    {
      path: '/channel/hot',
      name: 'channel-hot',
      component: () => import('@/views/ChannelHotView.vue'),
      meta: { title: '热销频道' },
    },
    {
      path: '/channel/flash',
      name: 'channel-flash',
      component: () => import('@/views/ChannelFlashView.vue'),
      meta: { title: '限时频道' },
    },
    {
      path: '/channel/presale',
      name: 'channel-presale',
      component: () => import('@/views/ChannelPresaleView.vue'),
      meta: { title: '预售频道' },
    },
    {
      path: '/channel/clearance',
      name: 'channel-clearance',
      component: () => import('@/views/ChannelClearanceView.vue'),
      meta: { title: '清仓频道' },
    },
    {
      path: '/channel/freeship',
      name: 'channel-freeship',
      component: () => import('@/views/ChannelFreeshipView.vue'),
      meta: { title: '包邮频道' },
    },
    {
      path: '/channel/cross',
      name: 'channel-cross',
      component: () => import('@/views/ChannelCrossView.vue'),
      meta: { title: '跨境频道' },
    },
    {
      path: '/channel/fresh',
      name: 'channel-fresh',
      component: () => import('@/views/ChannelFreshView.vue'),
      meta: { title: '生鲜频道' },
    },
    {
      path: '/product/:id/params',
      name: 'product-params',
      component: () => import('@/views/ProductParamsView.vue'),
      meta: { title: '商品参数' },
    },
    {
      path: '/product/:id/questions',
      name: 'product-questions',
      component: () => import('@/views/ProductQuestionsView.vue'),
      meta: { title: '商品问答' },
    },
    /* 评价体系（7） */
    {
      path: '/review/all',
      name: 'review-all',
      component: () => import('@/views/ReviewAllView.vue'),
      meta: { title: '全部评价' },
    },
    {
      path: '/review/good',
      name: 'review-good',
      component: () => import('@/views/ReviewGoodView.vue'),
      meta: { title: '好评' },
    },
    {
      path: '/review/medium',
      name: 'review-medium',
      component: () => import('@/views/ReviewMediumView.vue'),
      meta: { title: '中评' },
    },
    {
      path: '/review/bad',
      name: 'review-bad',
      component: () => import('@/views/ReviewBadView.vue'),
      meta: { title: '差评' },
    },
    {
      path: '/review/image',
      name: 'review-image',
      component: () => import('@/views/ReviewImageView.vue'),
      meta: { title: '有图评价' },
    },
    {
      path: '/review/reply',
      name: 'review-reply',
      component: () => import('@/views/ReviewReplyView.vue'),
      meta: { title: '已回复评价' },
    },
    {
      path: '/review/tags',
      name: 'review-tags',
      component: () => import('@/views/ReviewTagView.vue'),
      meta: { title: '评价标签' },
    },
    /* 营销与活动（8） */
    {
      path: '/sign-in',
      name: 'sign-in',
      component: () => import('@/views/SignInView.vue'),
      meta: { title: '签到中心', requiresAuth: true },
    },
    {
      path: '/task-center',
      name: 'task-center',
      component: () => import('@/views/TaskCenterView.vue'),
      meta: { title: '任务中心', requiresAuth: true },
    },
    {
      path: '/promotion-list',
      name: 'promotion-list',
      component: () => import('@/views/PromotionListView.vue'),
      meta: { title: '活动列表' },
    },
    {
      path: '/flash-sale-list',
      name: 'flash-sale-list',
      component: () => import('@/views/FlashSaleListView.vue'),
      meta: { title: '限时秒杀' },
    },
    {
      path: '/presale',
      name: 'presale',
      component: () => import('@/views/PresaleView.vue'),
      meta: { title: '预售专区' },
    },
    {
      path: '/group-buy-list',
      name: 'group-buy-list',
      component: () => import('@/views/GroupBuyListView.vue'),
      meta: { title: '拼团列表' },
    },
    {
      path: '/group-buy-detail/:id',
      name: 'group-buy-detail',
      component: () => import('@/views/GroupBuyDetailView.vue'),
      meta: { title: '拼团详情' },
    },
    {
      path: '/promotion-session/:id',
      name: 'promotion-session',
      component: () => import('@/views/PromotionSessionView.vue'),
      meta: { title: '活动场次' },
    },
    /* 订单与售后（12） */
    {
      path: '/order/all',
      name: 'order-all',
      component: () => import('@/views/OrderAllView.vue'),
      meta: { title: '全部订单', requiresAuth: true },
    },
    {
      path: '/order/pay',
      name: 'order-pay',
      component: () => import('@/views/OrderPayView.vue'),
      meta: { title: '待付款订单', requiresAuth: true },
    },
    {
      path: '/order/ship',
      name: 'order-ship',
      component: () => import('@/views/OrderShipView.vue'),
      meta: { title: '待发货订单', requiresAuth: true },
    },
    {
      path: '/order/receive',
      name: 'order-receive',
      component: () => import('@/views/OrderReceiveView.vue'),
      meta: { title: '待收货订单', requiresAuth: true },
    },
    {
      path: '/order/done',
      name: 'order-done',
      component: () => import('@/views/OrderDoneView.vue'),
      meta: { title: '已完成订单', requiresAuth: true },
    },
    {
      path: '/order/refunding',
      name: 'order-refunding',
      component: () => import('@/views/OrderRefundingView.vue'),
      meta: { title: '售后中订单', requiresAuth: true },
    },
    {
      path: '/after-sales',
      name: 'after-sales',
      component: () => import('@/views/AfterSaleListView.vue'),
      meta: { title: '售后列表', requiresAuth: true },
    },
    {
      path: '/after-sales/apply',
      name: 'after-sale-apply',
      component: () => import('@/views/AfterSaleApplyView.vue'),
      meta: { title: '申请售后', requiresAuth: true },
    },
    {
      path: '/after-sales/:id',
      name: 'after-sale-detail',
      component: () => import('@/views/AfterSaleDetailView.vue'),
      meta: { title: '售后详情', requiresAuth: true },
    },
    {
      path: '/refund-reasons',
      name: 'refund-reasons',
      component: () => import('@/views/RefundReasonView.vue'),
      meta: { title: '退款原因' },
    },
    {
      path: '/logistics-traces',
      name: 'logistics-traces',
      component: () => import('@/views/LogisticsTraceListView.vue'),
      meta: { title: '物流轨迹' },
    },
    {
      path: '/freight-calc',
      name: 'freight-calc',
      component: () => import('@/views/FreightCalcView.vue'),
      meta: { title: '运费试算' },
    },
    /* 用户中心与账户（11） */
    {
      path: '/user/level',
      name: 'user-level',
      component: () => import('@/views/UserLevelView.vue'),
      meta: { title: '会员等级', requiresAuth: true },
    },
    {
      path: '/user/growth-logs',
      name: 'user-growth-logs',
      component: () => import('@/views/GrowthLogsView.vue'),
      meta: { title: '成长值明细', requiresAuth: true },
    },
    {
      path: '/user/invoice-templates',
      name: 'user-invoice-templates',
      component: () => import('@/views/InvoiceTemplateView.vue'),
      meta: { title: '发票抬头模板', requiresAuth: true },
    },
    {
      path: '/user/notification-settings',
      name: 'user-notification-settings',
      component: () => import('@/views/NotificationSettingView.vue'),
      meta: { title: '通知设置', requiresAuth: true },
    },
    {
      path: '/user/security',
      name: 'user-security',
      component: () => import('@/views/AccountSecurityView.vue'),
      meta: { title: '账号安全', requiresAuth: true },
    },
    {
      path: '/user/realname',
      name: 'user-realname',
      component: () => import('@/views/RealNameView.vue'),
      meta: { title: '实名认证', requiresAuth: true },
    },
    {
      path: '/user/feedback',
      name: 'user-feedback',
      component: () => import('@/views/FeedbackView.vue'),
      meta: { title: '意见反馈' },
    },
    {
      path: '/help-center',
      name: 'help-center',
      component: () => import('@/views/HelpCenterView.vue'),
      meta: { title: '帮助中心' },
    },
    {
      path: '/help-article/:id',
      name: 'help-article',
      component: () => import('@/views/HelpArticleView.vue'),
      meta: { title: '帮助文章' },
    },
    {
      path: '/regions',
      name: 'regions',
      component: () => import('@/views/RegionView.vue'),
      meta: { title: '收货地区' },
    },
    {
      path: '/recharge',
      name: 'recharge',
      component: () => import('@/views/RechargeView.vue'),
      meta: { title: '余额充值', requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: '页面不存在' },
    },
  ],
})

router.beforeEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} · ShopStack 商城` : 'ShopStack 商城'

  if (to.meta.requiresAuth) {
    const auth = useAuthStore()
    if (!auth.isLoggedIn) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }
  return true
})

export default router
