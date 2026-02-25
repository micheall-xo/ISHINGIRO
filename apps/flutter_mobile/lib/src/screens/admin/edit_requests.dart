import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class AdminEditRequestsScreen extends StatelessWidget {
  const AdminEditRequestsScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Admin Edit Requests',
      auth: auth,
      endpoints: const ['/admin/profile-edit-requests?status=pending'],
    );
  }
}
