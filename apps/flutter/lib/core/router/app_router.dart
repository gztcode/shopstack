import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../models/address_draft.dart';
import '../../models/checkout_args.dart';
import '../../pages/address_edit/address_edit_page.dart';
import '../../pages/address_list/address_list_page.dart';
import '../../pages/cart/cart_page.dart';
import '../../pages/coupon_center/coupon_center_page.dart';
import '../../pages/category/category_page.dart';
import '../../pages/checkout/checkout_page.dart';
import '../../pages/coupons/coupons_page.dart';
import '../../pages/favorites/favorites_page.dart';
import '../../pages/invoices/invoices_page.dart';
import '../../pages/home/home_page.dart';
import '../../pages/login/login_page.dart';
import '../../pages/logistics/logistics_page.dart';
import '../../pages/notifications/notifications_page.dart';
import '../../pages/order_detail/order_detail_page.dart';
import '../../pages/order_list/order_list_page.dart';
import '../../pages/payment/payment_page.dart';
import '../../pages/points/points_page.dart';
import '../../pages/product_detail/product_detail_page.dart';
import '../../pages/refund/refund_page.dart';
import '../../pages/review/review_page.dart';
import '../../pages/profile/profile_page.dart';
import '../../pages/search/search_page.dart';
import '../../pages/settings/settings_page.dart';
import '../../pages/splash/splash_page.dart';
import '../../pages/after_sale_apply/after_sale_apply_page.dart';
import '../../pages/after_sale_detail/after_sale_detail_page.dart';
import '../../pages/after_sale_list/after_sale_list_page.dart';
import '../../pages/account_security/account_security_page.dart';
import '../../pages/channel_clearance/channel_clearance_page.dart';
import '../../pages/channel_cross/channel_cross_page.dart';
import '../../pages/channel_flash/channel_flash_page.dart';
import '../../pages/channel_fresh/channel_fresh_page.dart';
import '../../pages/channel_freeship/channel_freeship_page.dart';
import '../../pages/channel_hot/channel_hot_page.dart';
import '../../pages/channel_list/channel_list_page.dart';
import '../../pages/channel_newest/channel_newest_page.dart';
import '../../pages/channel_presale/channel_presale_page.dart';
import '../../pages/channel_recommend/channel_recommend_page.dart';
import '../../pages/feedback/feedback_page.dart';
import '../../pages/growth_logs/growth_logs_page.dart';
import '../../pages/group_buy_detail/group_buy_detail_page.dart';
import '../../pages/group_buy_join/group_buy_join_page.dart';
import '../../pages/group_buy_list/group_buy_list_page.dart';
import '../../pages/help_article/help_article_page.dart';
import '../../pages/help_center/help_center_page.dart';
import '../../pages/invoice_template/invoice_template_page.dart';
import '../../pages/logistics_trace/logistics_trace_page.dart';
import '../../pages/logistics_track/logistics_track_page.dart';
import '../../pages/my_group_buy/my_group_buy_page.dart';
import '../../pages/my_reviews/my_reviews_page.dart';
import '../../pages/notification_setting/notification_setting_page.dart';
import '../../pages/order_all/order_all_page.dart';
import '../../pages/order_cancel/order_cancel_page.dart';
import '../../pages/order_confirm/order_confirm_page.dart';
import '../../pages/order_done/order_done_page.dart';
import '../../pages/order_pay/order_pay_page.dart';
import '../../pages/order_receive/order_receive_page.dart';
import '../../pages/order_refunding/order_refunding_page.dart';
import '../../pages/order_ship/order_ship_page.dart';
import '../../pages/product_params/product_params_page.dart';
import '../../pages/product_questions/product_questions_page.dart';
import '../../pages/promotion_flash/promotion_flash_page.dart';
import '../../pages/promotion_list/promotion_list_page.dart';
import '../../pages/promotion_presale/promotion_presale_page.dart';
import '../../pages/promotion_session/promotion_session_page.dart';
import '../../pages/realname/realname_page.dart';
import '../../pages/refund_reason/refund_reason_page.dart';
import '../../pages/region/region_page.dart';
import '../../pages/review_all/review_all_page.dart';
import '../../pages/review_bad/review_bad_page.dart';
import '../../pages/review_good/review_good_page.dart';
import '../../pages/review_image/review_image_page.dart';
import '../../pages/review_medium/review_medium_page.dart';
import '../../pages/review_reply/review_reply_page.dart';
import '../../pages/review_tags/review_tags_page.dart';
import '../../pages/sign_in/sign_in_page.dart';
import '../../pages/sign_in_calendar/sign_in_calendar_page.dart';
import '../../pages/task_center/task_center_page.dart';
import '../../pages/task_detail/task_detail_page.dart';
import '../../pages/user_level/user_level_page.dart';
import '../../providers/auth_provider.dart';
import '../../providers/core_providers.dart';
import '../constants/app_routes.dart';
import '../../widgets/bottom_nav.dart';

export '../constants/app_routes.dart';


/// 全局路由。
final routerProvider = Provider<GoRouter>((ref) {
  final gate = ref.watch(authGateProvider);
  return GoRouter(
    initialLocation: AppRoutes.splash,
    refreshListenable: gate,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final location = state.matchedLocation;
      if (location == AppRoutes.splash) return null;
      if (auth.bootstrapping) return AppRoutes.splash;
      if (!auth.authenticated) {
        return location == AppRoutes.login ? null : AppRoutes.login;
      }
      if (location == AppRoutes.login) return AppRoutes.home;
      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginPage(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => AppShell(
          navigationShell: navigationShell,
        ),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.home,
                builder: (context, state) => const HomePage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.category,
                builder: (context, state) =>
                    CategoryPage(initialCategoryId: state.extra as int?),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.cart,
                builder: (context, state) => const CartPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.profile,
                builder: (context, state) => const ProfilePage(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.search,
        builder: (context, state) => const SearchPage(),
      ),
      GoRoute(
        path: AppRoutes.productDetail,
        builder: (context, state) => ProductDetailPage(
          productId: int.tryParse(state.pathParameters['id'] ?? '0') ?? 0,
        ),
      ),
      GoRoute(
        path: AppRoutes.checkout,
        builder: (context, state) => CheckoutPage(args: state.extra as CheckoutArgs?),
      ),
      GoRoute(
        path: AppRoutes.payment,
        builder: (context, state) => PaymentPage(
          orderId: int.tryParse(state.pathParameters['orderId'] ?? '0') ?? 0,
        ),
      ),
      GoRoute(
        path: AppRoutes.orders,
        builder: (context, state) => const OrderListPage(),
      ),
      GoRoute(
        path: AppRoutes.orderAll,
        builder: (context, state) => const OrderAllPage(),
      ),
      GoRoute(
        path: AppRoutes.orderPay,
        builder: (context, state) => const OrderPayPage(),
      ),
      GoRoute(
        path: AppRoutes.orderShip,
        builder: (context, state) => const OrderShipPage(),
      ),
      GoRoute(
        path: AppRoutes.orderReceive,
        builder: (context, state) => const OrderReceivePage(),
      ),
      GoRoute(
        path: AppRoutes.orderDone,
        builder: (context, state) => const OrderDonePage(),
      ),
      GoRoute(
        path: AppRoutes.orderCancel,
        builder: (context, state) => const OrderCancelPage(),
      ),
      GoRoute(
        path: AppRoutes.orderRefunding,
        builder: (context, state) => const OrderRefundingPage(),
      ),
      GoRoute(
        path: AppRoutes.orderConfirm,
        builder: (context, state) => const OrderConfirmPage(),
      ),
      GoRoute(
        path: AppRoutes.orderDetail,
        builder: (context, state) => OrderDetailPage(
          orderId: int.tryParse(state.pathParameters['id'] ?? '0') ?? 0,
        ),
      ),
      GoRoute(
        path: AppRoutes.addresses,
        builder: (context, state) => const AddressListPage(),
      ),
      GoRoute(
        path: AppRoutes.addressEdit,
        builder: (context, state) =>
            AddressEditPage(address: state.extra as AddressDraft?),
      ),
      GoRoute(
        path: AppRoutes.favorites,
        builder: (context, state) => const FavoritesPage(),
      ),
      GoRoute(
        path: AppRoutes.coupons,
        builder: (context, state) => const CouponsPage(),
      ),
      GoRoute(
        path: AppRoutes.notifications,
        builder: (context, state) => const NotificationsPage(),
      ),
      GoRoute(
        path: AppRoutes.settings,
        builder: (context, state) => const SettingsPage(),
      ),
      GoRoute(
        path: AppRoutes.points,
        builder: (context, state) => const PointsPage(),
      ),
      GoRoute(
        path: AppRoutes.invoices,
        builder: (context, state) => const InvoicesPage(),
      ),
      GoRoute(
        path: AppRoutes.logistics,
        builder: (context, state) =>
            LogisticsPage(initialOrderId: state.extra as int?),
      ),
      GoRoute(
        path: AppRoutes.couponCenter,
        builder: (context, state) => const CouponCenterPage(),
      ),
      GoRoute(
        path: AppRoutes.review,
        builder: (context, state) =>
            ReviewPage(initialProductId: state.extra as int?),
      ),
      GoRoute(
        path: AppRoutes.refund,
        builder: (context, state) =>
            RefundPage(initialOrderId: state.extra as int?),
      ),
      GoRoute(
        path: AppRoutes.channelList,
        builder: (context, state) => const ChannelListPage(),
      ),
      GoRoute(
        path: AppRoutes.channelRecommend,
        builder: (context, state) => ChannelRecommendPage(
          channelId: _queryInt(state.uri.queryParameters['channelId']),
        ),
      ),
      GoRoute(
        path: AppRoutes.channelNewest,
        builder: (context, state) => ChannelNewestPage(
          channelId: _queryInt(state.uri.queryParameters['channelId']),
        ),
      ),
      GoRoute(
        path: AppRoutes.channelHot,
        builder: (context, state) => ChannelHotPage(
          channelId: _queryInt(state.uri.queryParameters['channelId']),
        ),
      ),
      GoRoute(
        path: AppRoutes.channelFlash,
        builder: (context, state) => ChannelFlashPage(
          channelId: _queryInt(state.uri.queryParameters['channelId']),
        ),
      ),
      GoRoute(
        path: AppRoutes.channelPresale,
        builder: (context, state) => ChannelPresalePage(
          channelId: _queryInt(state.uri.queryParameters['channelId']),
        ),
      ),
      GoRoute(
        path: AppRoutes.channelClearance,
        builder: (context, state) => ChannelClearancePage(
          channelId: _queryInt(state.uri.queryParameters['channelId']),
        ),
      ),
      GoRoute(
        path: AppRoutes.channelFreeship,
        builder: (context, state) => ChannelFreeshipPage(
          channelId: _queryInt(state.uri.queryParameters['channelId']),
        ),
      ),
      GoRoute(
        path: AppRoutes.channelCross,
        builder: (context, state) => ChannelCrossPage(
          channelId: _queryInt(state.uri.queryParameters['channelId']),
        ),
      ),
      GoRoute(
        path: AppRoutes.channelFresh,
        builder: (context, state) => ChannelFreshPage(
          channelId: _queryInt(state.uri.queryParameters['channelId']),
        ),
      ),
      GoRoute(
        path: AppRoutes.productParams,
        builder: (context, state) => ProductParamsPage(
          productId: int.tryParse(state.pathParameters['id'] ?? '0') ?? 0,
        ),
      ),
      GoRoute(
        path: AppRoutes.productQuestions,
        builder: (context, state) => ProductQuestionsPage(
          productId: int.tryParse(state.pathParameters['id'] ?? '0') ?? 0,
        ),
      ),
      GoRoute(
        path: AppRoutes.reviewAll,
        builder: (context, state) => const ReviewAllPage(),
      ),
      GoRoute(
        path: AppRoutes.reviewGood,
        builder: (context, state) => const ReviewGoodPage(),
      ),
      GoRoute(
        path: AppRoutes.reviewMedium,
        builder: (context, state) => const ReviewMediumPage(),
      ),
      GoRoute(
        path: AppRoutes.reviewBad,
        builder: (context, state) => const ReviewBadPage(),
      ),
      GoRoute(
        path: AppRoutes.reviewImage,
        builder: (context, state) => const ReviewImagePage(),
      ),
      GoRoute(
        path: AppRoutes.reviewReply,
        builder: (context, state) => const ReviewReplyPage(),
      ),
      GoRoute(
        path: AppRoutes.reviewTags,
        builder: (context, state) => const ReviewTagsPage(),
      ),
      GoRoute(
        path: AppRoutes.myReviews,
        builder: (context, state) => const MyReviewsPage(),
      ),
      GoRoute(
        path: AppRoutes.signIn,
        builder: (context, state) => const SignInPage(),
      ),
      GoRoute(
        path: AppRoutes.signInCalendar,
        builder: (context, state) => const SignInCalendarPage(),
      ),
      GoRoute(
        path: AppRoutes.taskCenter,
        builder: (context, state) => const TaskCenterPage(),
      ),
      GoRoute(
        path: AppRoutes.taskDetail,
        builder: (context, state) => TaskDetailPage(
          taskId: int.tryParse(state.pathParameters['id'] ?? '0') ?? 0,
        ),
      ),
      GoRoute(
        path: AppRoutes.promotionList,
        builder: (context, state) => const PromotionListPage(),
      ),
      GoRoute(
        path: AppRoutes.promotionFlash,
        builder: (context, state) => const PromotionFlashPage(),
      ),
      GoRoute(
        path: AppRoutes.promotionPresale,
        builder: (context, state) => const PromotionPresalePage(),
      ),
      GoRoute(
        path: AppRoutes.promotionSessions,
        builder: (context, state) => PromotionSessionPage(
          promotionId: int.tryParse(state.pathParameters['id'] ?? '0') ?? 0,
        ),
      ),
      GoRoute(
        path: AppRoutes.groupBuyList,
        builder: (context, state) => const GroupBuyListPage(),
      ),
      GoRoute(
        path: AppRoutes.groupBuyJoin,
        builder: (context, state) => GroupBuyJoinPage(
          groupBuyId: int.tryParse(state.pathParameters['id'] ?? '0') ?? 0,
        ),
      ),
      GoRoute(
        path: AppRoutes.groupBuyDetail,
        builder: (context, state) => GroupBuyDetailPage(
          groupBuyId: int.tryParse(state.pathParameters['id'] ?? '0') ?? 0,
        ),
      ),
      GoRoute(
        path: AppRoutes.myGroupBuy,
        builder: (context, state) => const MyGroupBuyPage(),
      ),
      GoRoute(
        path: AppRoutes.afterSaleList,
        builder: (context, state) => const AfterSaleListPage(),
      ),
      GoRoute(
        path: AppRoutes.afterSaleApply,
        builder: (context, state) => const AfterSaleApplyPage(),
      ),
      GoRoute(
        path: AppRoutes.afterSaleDetail,
        builder: (context, state) => AfterSaleDetailPage(
          afterSaleId: int.tryParse(state.pathParameters['id'] ?? '0') ?? 0,
        ),
      ),
      GoRoute(
        path: AppRoutes.refundReason,
        builder: (context, state) => const RefundReasonPage(),
      ),
      GoRoute(
        path: AppRoutes.logisticsTrace,
        builder: (context, state) => const LogisticsTracePage(),
      ),
      GoRoute(
        path: AppRoutes.logisticsTrack,
        builder: (context, state) => const LogisticsTrackPage(),
      ),
      GoRoute(
        path: AppRoutes.userLevel,
        builder: (context, state) => const UserLevelPage(),
      ),
      GoRoute(
        path: AppRoutes.growthLogs,
        builder: (context, state) => const GrowthLogsPage(),
      ),
      GoRoute(
        path: AppRoutes.invoiceTemplates,
        builder: (context, state) => const InvoiceTemplatePage(),
      ),
      GoRoute(
        path: AppRoutes.notificationSettings,
        builder: (context, state) => const NotificationSettingPage(),
      ),
      GoRoute(
        path: AppRoutes.accountSecurity,
        builder: (context, state) => const AccountSecurityPage(),
      ),
      GoRoute(
        path: AppRoutes.realname,
        builder: (context, state) => const RealnamePage(),
      ),
      GoRoute(
        path: AppRoutes.feedback,
        builder: (context, state) => const FeedbackPage(),
      ),
      GoRoute(
        path: AppRoutes.helpCenter,
        builder: (context, state) => const HelpCenterPage(),
      ),
      GoRoute(
        path: AppRoutes.helpArticle,
        builder: (context, state) => HelpArticlePage(
          articleId: int.tryParse(state.pathParameters['id'] ?? '0') ?? 0,
        ),
      ),
      GoRoute(
        path: AppRoutes.regions,
        builder: (context, state) => const RegionPage(),
      ),
    ],
  );
});

/// 解析路由 query 中的整型参数。
int? _queryInt(String? raw) {
  if (raw == null || raw.isEmpty) return null;
  return int.tryParse(raw);
}
