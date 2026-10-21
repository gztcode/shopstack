import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/auth_api.dart';
import '../api/cart_api.dart';
import '../api/content_api.dart';
import '../api/invoice_api.dart';
import '../api/logistics_api.dart';
import '../api/marketing_api.dart';
import '../api/notification_api.dart';
import '../api/order_api.dart';
import '../api/payment_api.dart';
import '../api/points_api.dart';
import '../api/product_api.dart';
import '../api/token_store.dart';
import '../api/user_api.dart';

/// 本地令牌存储（由 main 在启动时注入实例）。
final tokenStoreProvider = Provider<TokenStore>(
  (ref) => throw UnimplementedError('tokenStoreProvider 必须在 main 中 override'),
);

/// 网络客户端。
final apiClientProvider = Provider<ApiClient>(
  (ref) => ApiClient(tokens: ref.watch(tokenStoreProvider)),
);

final authApiProvider = Provider<AuthApi>(
  (ref) => AuthApi(ref.watch(apiClientProvider)),
);

final productApiProvider = Provider<ProductApi>(
  (ref) => ProductApi(ref.watch(apiClientProvider)),
);

final cartApiProvider = Provider<CartApi>(
  (ref) => CartApi(ref.watch(apiClientProvider)),
);

final orderApiProvider = Provider<OrderApi>(
  (ref) => OrderApi(ref.watch(apiClientProvider)),
);

final paymentApiProvider = Provider<PaymentApi>(
  (ref) => PaymentApi(ref.watch(apiClientProvider)),
);

final marketingApiProvider = Provider<MarketingApi>(
  (ref) => MarketingApi(ref.watch(apiClientProvider)),
);

final logisticsApiProvider = Provider<LogisticsApi>(
  (ref) => LogisticsApi(ref.watch(apiClientProvider)),
);

final notificationApiProvider = Provider<NotificationApi>(
  (ref) => NotificationApi(ref.watch(apiClientProvider)),
);

final pointsApiProvider = Provider<PointsApi>(
  (ref) => PointsApi(ref.watch(apiClientProvider)),
);

final invoiceApiProvider = Provider<InvoiceApi>(
  (ref) => InvoiceApi(ref.watch(apiClientProvider)),
);

final userApiProvider = Provider<UserApi>(
  (ref) => UserApi(ref.watch(apiClientProvider)),
);

final contentApiProvider = Provider<ContentApi>(
  (ref) => ContentApi(ref.watch(apiClientProvider)),
);

/// 演示数据模式：后端不可用时置为 true，页面顶部显示提示条。
class DemoModeNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  /// 切换到演示模式。
  void enable() {
    if (!state) state = true;
  }
}

final demoModeProvider = NotifierProvider<DemoModeNotifier, bool>(
  DemoModeNotifier.new,
);

/// 路由刷新通知器：登录态变化时通知 go_router 重新计算 redirect。
class AuthGate extends ChangeNotifier {
  void bump() => notifyListeners();
}

final authGateProvider = Provider<AuthGate>((ref) => AuthGate());
