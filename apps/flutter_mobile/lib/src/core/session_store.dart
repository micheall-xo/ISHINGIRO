import 'package:shared_preferences/shared_preferences.dart';

import '../models/auth_models.dart';

class SessionStore {
  static const _tokenKey = 'token';
  static const _userKey = 'user';
  static const _expiresAtKey = 'sessionExpiresAt';

  Future<StoredSession?> load() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    final userRaw = prefs.getString(_userKey);
    if (token == null || userRaw == null) return null;
    return StoredSession(
      token: token,
      user: AppUser.fromJson(decodeJsonObject(userRaw)),
      expiresAtIso: prefs.getString(_expiresAtKey),
    );
  }

  Future<void> save({
    required String token,
    required AppUser user,
    required String? expiresAtIso,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_userKey, encodeJson(user.toJson()));
    if (expiresAtIso != null && expiresAtIso.isNotEmpty) {
      await prefs.setString(_expiresAtKey, expiresAtIso);
    } else {
      await prefs.remove(_expiresAtKey);
    }
  }

  Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
    await prefs.remove(_expiresAtKey);
  }
}
