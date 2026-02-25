import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class AdminRequestsScreen extends StatelessWidget {
  const AdminRequestsScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Admin Requests',
      auth: auth,
      endpoints: const ['/admin/profile-edit-requests'],
    );
  }
}
