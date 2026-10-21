import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../mock/mock_data.dart';
import '../models/user.dart';
import 'core_providers.dart';

/// 登录态。
class AuthState {
  const AuthState({
    this.bootstrapping = true,
    this.authenticated = false,
    this.user,
    this.loading = false,
    this.error,
  });

  /// 是否仍在读取本地令牌。
  final bool bootstrapping;

  /// 是否已登录。
  final bool authenticated;

  /// 当前用户。
  final User? user;

  /// 登录 / 注册请求中。
  final bool loading;

  /// 错误提示。
  final String? error;

  AuthState copyWith({
    bool? bootstrapping,
    bool? authenticated,
    User? user,
    bool? loading,
    String? error,
    bool clearError = false,
  }) =>
      AuthState(
        bootstrapping: bootstrapping ?? this.bootstrapping,
        authenticated: authenticated ?? this.authenticated,
        user: user ?? this.user,
        loading: loading ?? this.loading,
        error: clearError ? null : (error ?? this.error),
      );
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() => const AuthState(bootstrapping: true);

  /// 启动时读取本地令牌，决定进入首页还是登录页。
  Future<void> bootstrap() async {
    final store = ref.read(tokenStoreProvider);
    if (!store.hasSession) {
      _set(const AuthState(bootstrapping: false, authenticated: false));
      return;
    }
    try {
      final user = await ref.read(authApiProvider).profile();
      await store.saveUser(user);
      _set(AuthState(bootstrapping: false, authenticated: true, user: user));
    } on NetworkException {
      // 后端未就绪：使用本地缓存用户进入演示模式。
      ref.read(demoModeProvider.notifier).enable();
      final cached = store.cachedUser ?? MockData.demoUser;
      _set(AuthState(bootstrapping: false, authenticated: true, user: cached));
    } catch (_) {
      await store.clear();
      _set(const AuthState(bootstrapping: false, authenticated: false));
    }
  }

  /// 账号密码登录。
  Future<bool> login(String username, String password) async {
    _set(state.copyWith(loading: true, clearError: true));
    try {
      final session = await ref.read(authApiProvider).login(username, password);
      await _applySession(session);
      return true;
    } on ApiException catch (e) {
      _set(state.copyWith(loading: false, error: e.message));
      return false;
    } on NetworkException {
      // 后端未就绪：进入演示模式并使用演示账号。
      ref.read(demoModeProvider.notifier).enable();
      await _applySession(_mockSession());
      return true;
    }
  }

  /// 注册。
  Future<bool> register({
    required String username,
    required String password,
    String phone = '',
    String nickname = '',
  }) async {
    _set(state.copyWith(loading: true, clearError: true));
    try {
      final session = await ref.read(authApiProvider).register(
            username: username,
            password: password,
            phone: phone,
            nickname: nickname,
          );
      await _applySession(session);
      return true;
    } on ApiException catch (e) {
      _set(state.copyWith(loading: false, error: e.message));
      return false;
    } on NetworkException {
      ref.read(demoModeProvider.notifier).enable();
      await _applySession(_mockSession());
      return true;
    }
  }

  /// 微信登录。
  Future<bool> wechatLogin() async {
    _set(state.copyWith(loading: true, clearError: true));
    try {
      final session = await ref
          .read(authApiProvider)
          .wechatLogin(code: 'demo-wx-code-${DateTime.now().millisecondsSinceEpoch}');
      await _applySession(session);
      return true;
    } on ApiException catch (e) {
      _set(state.copyWith(loading: false, error: e.message));
      return false;
    } on NetworkException {
      ref.read(demoModeProvider.notifier).enable();
      await _applySession(_mockSession());
      return true;
    }
  }

  /// 退出登录。
  Future<void> logout() async {
    try {
      await ref.read(authApiProvider).client.post('/auth/logout');
    } catch (_) {
      // 忽略网络异常，本地清理即可。
    }
    await ref.read(tokenStoreProvider).clear();
    _set(const AuthState(bootstrapping: false, authenticated: false));
  }

  /// 刷新当前用户资料。
  Future<void> refreshProfile() async {
    if (!state.authenticated) return;
    try {
      final user = await ref.read(authApiProvider).profile();
      await ref.read(tokenStoreProvider).saveUser(user);
      _set(state.copyWith(user: user));
    } catch (_) {
      // 保持原状态。
    }
  }

  AuthSession _mockSession() => const AuthSession(
        accessToken: 'demo-access-token',
        refreshToken: 'demo-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
        user: MockData.demoUser,
      );

  Future<void> _applySession(AuthSession session) async {
    await ref.read(tokenStoreProvider).saveSession(
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
        );
    _set(AuthState(
      bootstrapping: false,
      authenticated: true,
      user: session.user ?? MockData.demoUser,
    ));
  }

  void _set(AuthState next) {
    state = next;
    ref.read(authGateProvider).bump();
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

/// 当前登录用户 id（部分后端接口不会从令牌推导，需要显式传入）。
final currentUserIdProvider = Provider<int>((ref) {
  return ref.watch(authProvider).user?.id ?? 0;
});
