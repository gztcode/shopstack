/// 网关地址与请求常量。
class ApiConstants {
  ApiConstants._();

  /// 后端网关地址，可通过 `--dart-define=API_BASE_URL=...` 覆盖。
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:8080',
  );

  /// 接口前缀。
  static const String prefix = '/api/v1';

  /// 完整的基础地址。
  static const String baseUrlWithPrefix = '$baseUrl$prefix';

  static const Duration connectTimeout = Duration(seconds: 8);
  static const Duration receiveTimeout = Duration(seconds: 15);
  static const Duration sendTimeout = Duration(seconds: 15);

  /// 默认分页大小。
  static const int defaultPageSize = 20;

  /// 本地存储键。
  static const String keyAccessToken = 'shopstack_access_token';
  static const String keyRefreshToken = 'shopstack_refresh_token';
  static const String keyUser = 'shopstack_user';
}
