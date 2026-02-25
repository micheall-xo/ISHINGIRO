import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

typedef TokenProvider = String? Function();

class ApiClient {
  ApiClient({required TokenProvider tokenProvider}) : _tokenProvider = tokenProvider;

  final TokenProvider _tokenProvider;

  String get baseUrl {
    const fromEnv = String.fromEnvironment('APP_API_URL');
    if (fromEnv.isNotEmpty) return fromEnv;
    if (kIsWeb) return 'http://localhost:5000/api';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:5000/api';
    }
    return 'http://localhost:5000/api';
  }

  Future<dynamic> get(String endpoint, {bool auth = true}) {
    return request('GET', endpoint, auth: auth);
  }

  Future<dynamic> post(String endpoint, {Object? body, bool auth = true}) {
    return request('POST', endpoint, body: body, auth: auth);
  }

  Future<dynamic> put(String endpoint, {Object? body, bool auth = true}) {
    return request('PUT', endpoint, body: body, auth: auth);
  }

  Future<dynamic> request(
    String method,
    String endpoint, {
    Object? body,
    bool auth = true,
  }) async {
    final uri = Uri.parse('$baseUrl$endpoint');
    final headers = <String, String>{'Content-Type': 'application/json'};
    final token = _tokenProvider();
    if (auth && token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    late http.Response response;
    try {
      final upper = method.toUpperCase();
      if (upper == 'GET') {
        response = await http.get(uri, headers: headers).timeout(const Duration(seconds: 30));
      } else if (upper == 'POST') {
        response = await http
            .post(uri, headers: headers, body: body != null ? jsonEncode(body) : null)
            .timeout(const Duration(seconds: 30));
      } else if (upper == 'PUT') {
        response = await http
            .put(uri, headers: headers, body: body != null ? jsonEncode(body) : null)
            .timeout(const Duration(seconds: 30));
      } else {
        final request = http.Request(upper, uri);
        request.headers.addAll(headers);
        if (body != null) request.body = jsonEncode(body);
        response = await request.send().then(http.Response.fromStream).timeout(const Duration(seconds: 30));
      }
    } catch (error) {
      throw ApiException('Network request failed: $error');
    }

    dynamic data;
    final contentType = response.headers['content-type'] ?? '';
    if (contentType.contains('application/json') && response.body.isNotEmpty) {
      data = jsonDecode(response.body);
    } else {
      data = {'message': response.body};
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = (data is Map && (data['error'] ?? data['message']) != null)
          ? '${data['error'] ?? data['message']}'
          : 'Request failed (${response.statusCode})';
      throw ApiException(message, statusCode: response.statusCode);
    }
    return data;
  }
}
