import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class AdminUsersScreen extends StatelessWidget {
  const AdminUsersScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Admin Users',
      auth: auth,
      endpoints: const ['/admin/users'],
    );
  }
}
