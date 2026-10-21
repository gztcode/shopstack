import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../core/constants/api_constants.dart';
import '../models/user.dart';

/// 基于 shared_preferences 的令牌与用户缓存。
class TokenStore {
  TokenStore(this._prefs);

  final SharedPreferences _prefs;

  static Future<TokenStore> create() async {
    final prefs = await SharedPreferences.getInstance();
    return TokenStore(prefs);
  }

  String? get accessToken => _prefs.getString(ApiConstants.keyAccessToken);

  String? get refreshToken => _prefs.getString(ApiConstants.keyRefreshToken);

  User? get cachedUser {
    final raw = _prefs.getString(ApiConstants.keyUser);
    if (raw == null || raw.isEmpty) return null;
    try {
      return User.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  bool get hasSession =>
      (accessToken?.isNotEmpty ?? false) || (refreshToken?.isNotEmpty ?? false);

  Future<void> saveSession({
    required String accessToken,
    required String refreshToken,
    User? user,
  }) async {
    await _prefs.setString(ApiConstants.keyAccessToken, accessToken);
    await _prefs.setString(ApiConstants.keyRefreshToken, refreshToken);
    if (user != null) {
      await _prefs.setString(ApiConstants.keyUser, jsonEncode(user.toJson()));
    }
  }

  Future<void> saveUser(User user) async {
    await _prefs.setString(ApiConstants.keyUser, jsonEncode(user.toJson()));
  }

  Future<void> clear() async {
    await _prefs.remove(ApiConstants.keyAccessToken);
    await _prefs.remove(ApiConstants.keyRefreshToken);
    await _prefs.remove(ApiConstants.keyUser);
  }
}
