import 'dart:convert';

class AppUser {
  final String id;
  final String username;
  final String email;
  final String firstName;
  final String lastName;
  final String role;

  const AppUser({
    required this.id,
    required this.username,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
  });

  String get fullName {
    final joined = '$firstName $lastName'.trim();
    return joined.isEmpty ? username : joined;
  }

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: '${json['id'] ?? json['_id'] ?? ''}',
      username: '${json['username'] ?? ''}',
      email: '${json['email'] ?? ''}',
      firstName: '${json['firstName'] ?? ''}',
      lastName: '${json['lastName'] ?? ''}',
      role: '${json['role'] ?? ''}',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'role': role,
    };
  }
}

class StoredSession {
  final String token;
  final AppUser user;
  final String? expiresAtIso;

  const StoredSession({
    required this.token,
    required this.user,
    required this.expiresAtIso,
  });
}

String encodeJson(Map<String, dynamic> value) => jsonEncode(value);

Map<String, dynamic> decodeJsonObject(String value) {
  final decoded = jsonDecode(value);
  if (decoded is Map<String, dynamic>) return decoded;
  return {};
}
