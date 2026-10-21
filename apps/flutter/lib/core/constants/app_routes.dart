/// 路由路径常量。
class AppRoutes {
  AppRoutes._();

  static const String splash = '/splash';
  static const String login = '/login';
  static const String home = '/home';
  static const String category = '/category';
  static const String cart = '/cart';
  static const String profile = '/profile';
  static const String search = '/search';
  static const String productDetail = '/product/:id';
  static const String checkout = '/checkout';
  static const String payment = '/payment/:orderId';
  static const String orders = '/orders';
  static const String orderDetail = '/order/:id';
  static const String addresses = '/addresses';
  static const String addressEdit = '/address/edit';
  static const String favorites = '/favorites';
  static const String coupons = '/coupons';
  static const String notifications = '/notifications';
  static const String settings = '/settings';

  // 新增页面。
  static const String points = '/points';
  static const String invoices = '/invoices';
  static const String logistics = '/logistics';
  static const String couponCenter = '/coupon-center';
  static const String review = '/review';
  static const String refund = '/refund';

  // 阶段 3 扩量：频道与商品浏览。
  static const String channelList = '/channel/list';
  static const String channelRecommend = '/channel/recommend';
  static const String channelNewest = '/channel/newest';
  static const String channelHot = '/channel/hot';
  static const String channelFlash = '/channel/flash';
  static const String channelPresale = '/channel/presale';
  static const String channelClearance = '/channel/clearance';
  static const String channelFreeship = '/channel/freeship';
  static const String channelCross = '/channel/cross';
  static const String channelFresh = '/channel/fresh';
  static const String productParams = '/product/:id/params';
  static const String productQuestions = '/product/:id/questions';

  // 阶段 3 扩量：评价体系。
  static const String reviewAll = '/review/all';
  static const String reviewGood = '/review/good';
  static const String reviewMedium = '/review/medium';
  static const String reviewBad = '/review/bad';
  static const String reviewImage = '/review/image';
  static const String reviewReply = '/review/reply';
  static const String myReviews = '/my-reviews';
  static const String reviewTags = '/review/tags';

  // 阶段 3 扩量：营销与活动。
  static const String signIn = '/sign-in';
  static const String signInCalendar = '/sign-in/calendar';
  static const String taskCenter = '/task-center';
  static const String taskDetail = '/task/:id';
  static const String promotionList = '/promotion/list';
  static const String promotionFlash = '/promotion/flash';
  static const String promotionPresale = '/promotion/presale';
  static const String promotionSessions = '/promotion/:id/sessions';
  static const String groupBuyList = '/group-buy/list';
  static const String groupBuyDetail = '/group-buy/:id';
  static const String groupBuyJoin = '/group-buy/:id/join';
  static const String myGroupBuy = '/my-group-buy';

  // 阶段 3 扩量：订单与售后。
  static const String orderAll = '/order/all';
  static const String orderPay = '/order/pay';
  static const String orderShip = '/order/ship';
  static const String orderReceive = '/order/receive';
  static const String orderDone = '/order/done';
  static const String orderCancel = '/order/cancel';
  static const String orderRefunding = '/order/refunding';
  static const String orderConfirm = '/order/confirm';
  static const String afterSaleList = '/after-sale/list';
  static const String afterSaleApply = '/after-sale/apply';
  static const String afterSaleDetail = '/after-sale/:id';
  static const String refundReason = '/refund-reason';
  static const String logisticsTrace = '/logistics/trace';
  static const String logisticsTrack = '/logistics/track';

  // 阶段 3 扩量：用户中心与账户。
  static const String userLevel = '/user/level';
  static const String growthLogs = '/user/growth-logs';
  static const String invoiceTemplates = '/user/invoice-templates';
  static const String notificationSettings = '/user/notification-settings';
  static const String accountSecurity = '/user/security';
  static const String realname = '/user/realname';
  static const String feedback = '/user/feedback';
  static const String helpCenter = '/help/center';
  static const String helpArticle = '/help/article/:id';
  static const String regions = '/region';
}
