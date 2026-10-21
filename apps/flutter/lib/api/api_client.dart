import 'package:dio/dio.dart';

import '../core/constants/api_constants.dart';
import '../models/user.dart';
import 'json_key_converter.dart';
import 'token_store.dart';

/// 业务错误：后端返回 `code !== 0`。
class ApiException implements Exception {
  ApiException(this.code, this.message);

  final int code;
  final String message;

  @override
  String toString() => message;
}

/// 网络错误：后端不可达、超时等。
class NetworkException implements Exception {
  NetworkException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Dio 客户端：统一注入鉴权头、解包响应信封、处理 401 静默刷新。
class ApiClient {
  ApiClient({required this.tokens, Dio? dio, String? baseUrl})
      : dio = dio ?? Dio() {
    this.dio.options = BaseOptions(
      baseUrl: baseUrl ?? ApiConstants.baseUrlWithPrefix,
      connectTimeout: ApiConstants.connectTimeout,
      receiveTimeout: ApiConstants.receiveTimeout,
      sendTimeout: ApiConstants.sendTimeout,
      headers: const {'Content-Type': 'application/json'},
    );
    this.dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = tokens.accessToken;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          // 请求体统一转成 snake_case（已是 snake_case 的键保持不变）。
          if (options.data != null) {
            options.data = JsonKeyConverter.camelToSnake(options.data);
          }
          handler.next(options);
        },
        onResponse: (response, handler) {
          // 响应体统一转成 camelCase，App 内的 Model 保持 camelCase 字段。
          final data = response.data;
          if (data is Map || data is List) {
            response.data = JsonKeyConverter.snakeToCamel(data);
          }
          handler.next(response);
        },
        onError: _handleError,
      ),
    );
  }

  final Dio dio;
  final TokenStore tokens;

  Future<void> _handleError(
      DioException error, ErrorInterceptorHandler handler) async {
    final response = error.response;
    final request = error.requestOptions;
    if (response?.statusCode == 401 && request.extra['retried'] != true) {
      final newToken = await refreshAccessToken();
      if (newToken != null && newToken.isNotEmpty) {
        request.extra['retried'] = true;
        request.headers['Authorization'] = 'Bearer $newToken';
        try {
          final retried = await dio.fetch<dynamic>(request);
          return handler.resolve(retried);
        } catch (e) {
          return handler.next(error);
        }
      }
    }
    return handler.next(error);
  }

  Future<String?>? _refreshing;

  /// 使用 refresh_token 静默刷新访问令牌。
  Future<String?> refreshAccessToken() {
    final pending = _refreshing;
    if (pending != null) return pending;
    final future = _doRefresh().whenComplete(() {
      _refreshing = null;
    });
    _refreshing = future;
    return future;
  }

  Future<String?> _doRefresh() async {
    final refreshToken = tokens.refreshToken;
    if (refreshToken == null || refreshToken.isEmpty) return null;
    try {
      final plain = Dio(BaseOptions(
        baseUrl: ApiConstants.baseUrlWithPrefix,
        connectTimeout: ApiConstants.connectTimeout,
        receiveTimeout: ApiConstants.receiveTimeout,
        headers: const {'Content-Type': 'application/json'},
      ));
      final res = await plain.post<dynamic>(
        '/auth/refresh',
        data: {'refresh_token': refreshToken},
      );
      final data = _unwrap(res.data);
      final session = AuthSession.fromJson(data);
      if (session.accessToken.isEmpty) return null;
      await tokens.saveSession(
        accessToken: session.accessToken,
        refreshToken: session.refreshToken.isEmpty
            ? refreshToken
            : session.refreshToken,
        user: session.user,
      );
      return session.accessToken;
    } catch (_) {
      return null;
    }
  }

  /// 解包统一响应信封，失败时抛出异常。
  Map<String, dynamic> _unwrap(dynamic body) {
    if (body is Map) {
      final map = body.map((key, value) => MapEntry(key.toString(), value));
      if (map.containsKey('code')) {
        final code = map['code'];
        final codeInt = code is int ? code : int.tryParse('$code') ?? -1;
        if (codeInt != 0) {
          final message = map['message']?.toString() ?? '请求失败，请稍后重试';
          throw ApiException(codeInt, message);
        }
        final data = map['data'];
        if (data is Map) {
          return data.map((key, value) => MapEntry(key.toString(), value));
        }
        if (data is List) {
          return {'items': data};
        }
        return <String, dynamic>{};
      }
      return map;
    }
    return <String, dynamic>{};
  }

  Future<Map<String, dynamic>> get(String path,
      {Map<String, dynamic>? query}) async {
    try {
      final res = await dio.get<dynamic>(path, queryParameters: query);
      return _unwrap(res.data);
    } on DioException catch (e) {
      throw _toNetworkError(e);
    }
  }

  Future<Map<String, dynamic>> post(String path, {Object? body}) async {
    try {
      final res = await dio.post<dynamic>(path, data: body);
      return _unwrap(res.data);
    } on DioException catch (e) {
      throw _toNetworkError(e);
    }
  }

  Future<Map<String, dynamic>> put(String path, {Object? body}) async {
    try {
      final res = await dio.put<dynamic>(path, data: body);
      return _unwrap(res.data);
    } on DioException catch (e) {
      throw _toNetworkError(e);
    }
  }

  Future<Map<String, dynamic>> delete(String path,
      {Map<String, dynamic>? query}) async {
    try {
      final res = await dio.delete<dynamic>(path, queryParameters: query);
      return _unwrap(res.data);
    } on DioException catch (e) {
      throw _toNetworkError(e);
    }
  }

  /// 提取服务端返回的业务错误信息。
  String _serverMessage(DioException error) {
    final data = error.response?.data;
    if (data is Map) {
      final message = data['message'];
      if (message != null && message.toString().isNotEmpty) {
        return message.toString();
      }
    }
    return error.message ?? '请求失败';
  }

  Exception _toNetworkError(DioException error) {
    final type = error.type;
    if (type == DioExceptionType.connectionTimeout ||
        type == DioExceptionType.receiveTimeout ||
        type == DioExceptionType.sendTimeout ||
        type == DioExceptionType.connectionError) {
      return NetworkException('网络连接失败，请检查后端服务是否已启动');
    }
    if (error.response?.statusCode == 401) {
      return ApiException(401, '登录已过期，请重新登录');
    }
    // 业务错误统一走信封：4xx 响应体里同样带 code / message。
    final body = error.response?.data;
    if (body is Map && body.containsKey('code')) {
      final code = body['code'];
      final codeInt = code is int ? code : int.tryParse('$code') ?? -1;
      if (codeInt != 0) {
        return ApiException(codeInt, body['message']?.toString() ?? '请求失败');
      }
    }
    if (error.response?.statusCode == 403) {
      return ApiException(403, '没有访问权限');
    }
    final status = error.response?.statusCode;
    if (status != null && status >= 500) {
      return NetworkException('服务异常（$status），请稍后重试');
    }
    if (status != null && status >= 400) {
      return NetworkException('请求被拒绝（$status）：${_serverMessage(error)}');
    }
    return NetworkException(_serverMessage(error));
  }
}
