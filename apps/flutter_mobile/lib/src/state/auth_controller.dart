import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../core/session_store.dart';
import '../models/auth_models.dart';

class AuthController extends ChangeNotifier {
  AuthController({SessionStore? store})
      : _store = store ?? SessionStore(),
        _api = ApiClient(tokenProvider: (() => _token));

  final SessionStore _store;
  final ApiClient _api;
  Timer? _expiryTimer;

  static String? _token;

  bool _booting = true;
  AppUser? _user;
  String? _expiresAtIso;
  String? _error;

  bool get isBooting => _booting;
  bool get isAuthenticated => _user != null && (_token?.isNotEmpty ?? false);
  AppUser? get user => _user;
  String? get error => _error;
  ApiClient get api => _api;

  Future<void> bootstrap() async {
    _booting = true;
    _error = null;
    notifyListeners();
    try {
      final session = await _store.load();
      if (session == null) {
        await signOut(notify: false);
      } else {
        _token = session.token;
        _user = session.user;
        _expiresAtIso = session.expiresAtIso ?? _parseTokenExpiry(session.token);
        await _validateSession();
        _scheduleExpiry();
      }
    } catch (error) {
      _error = '$error';
      await signOut(notify: false);
    } finally {
      _booting = false;
      notifyListeners();
    }
  }

  Future<void> signIn({
    required String identifier,
    required String password,
  }) async {
    _error = null;
    notifyListeners();
    final data = await _api.post(
      '/auth/login',
      auth: false,
      body: {
        'username': identifier.trim(),
        'password': password,
      },
    );
    if (data is! Map<String, dynamic>) {
      throw ApiException('Unexpected login response');
    }
    final token = '${data['token'] ?? ''}';
    final userJson = data['user'];
    if (token.isEmpty || userJson is! Map<String, dynamic>) {
      throw ApiException('Invalid login response from server');
    }
    _token = token;
    _user = AppUser.fromJson(userJson);
    _expiresAtIso = data['session'] is Map<String, dynamic>
        ? '${(data['session'] as Map<String, dynamic>)['expiresAt'] ?? ''}'
        : _parseTokenExpiry(token);
    if (_expiresAtIso != null && _expiresAtIso!.isEmpty) _expiresAtIso = null;
    await _store.save(token: token, user: _user!, expiresAtIso: _expiresAtIso);
    _scheduleExpiry();
    notifyListeners();
  }

  Future<void> refreshProfile() async {
    if (!isAuthenticated) return;
    final profile = await _api.get('/auth/profile');
    if (profile is! Map<String, dynamic>) return;
    final merged = AppUser.fromJson({
      ..._user?.toJson() ?? {},
      ...profile,
    });
    _user = merged;
    await _store.save(token: _token!, user: merged, expiresAtIso: _expiresAtIso);
    notifyListeners();
  }

  Future<void> signOut({bool notify = true}) async {
    _expiryTimer?.cancel();
    _token = null;
    _user = null;
    _expiresAtIso = null;
    await _store.clear();
    if (notify) notifyListeners();
  }

  Future<void> _validateSession() async {
    try {
      final response = await _api.get('/auth/session');
      if (response is Map<String, dynamic>) {
        if (response['user'] is Map<String, dynamic>) {
          _user = AppUser.fromJson(response['user'] as Map<String, dynamic>);
        }
        if (response['session'] is Map<String, dynamic>) {
          final sessionData = response['session'] as Map<String, dynamic>;
          final nextExpiry = '${sessionData['expiresAt'] ?? ''}'.trim();
          if (nextExpiry.isNotEmpty) _expiresAtIso = nextExpiry;
        }
        if (_token != null && _user != null) {
          await _store.save(token: _token!, user: _user!, expiresAtIso: _expiresAtIso);
        }
      }
    } catch (_) {
      // Keep cached session unless explicitly expired.
    }
  }

  String? _parseTokenExpiry(String token) {
    try {
      final parts = token.split('.');
      if (parts.length < 2) return null;
      final normalized = base64.normalize(parts[1]);
      final payloadJson = utf8.decode(base64.decode(normalized));
      final payload = jsonDecode(payloadJson) as Map<String, dynamic>;
      if (payload['exp'] == null) return null;
      final expSeconds = payload['exp'] as int;
      return DateTime.fromMillisecondsSinceEpoch(expSeconds * 1000, isUtc: true).toIso8601String();
    } catch (_) {
      return null;
    }
  }

  void _scheduleExpiry() {
    _expiryTimer?.cancel();
    if (_expiresAtIso == null || _expiresAtIso!.isEmpty) return;
    final expiry = DateTime.tryParse(_expiresAtIso!);
    if (expiry == null) return;
    final ttl = expiry.toLocal().difference(DateTime.now());
    if (ttl.isNegative) {
      signOut();
      return;
    }
    _expiryTimer = Timer(ttl, () => signOut());
  }

  @override
  void dispose() {
    _expiryTimer?.cancel();
    super.dispose();
  }
}
