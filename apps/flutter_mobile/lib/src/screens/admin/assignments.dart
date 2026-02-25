import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class AdminAssignmentsScreen extends StatelessWidget {
  const AdminAssignmentsScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Admin Assignments',
      auth: auth,
      endpoints: const ['/admin/options'],
    );
  }
}
