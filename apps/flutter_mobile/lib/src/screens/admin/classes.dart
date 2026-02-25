import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class AdminClassesScreen extends StatelessWidget {
  const AdminClassesScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Admin Classes',
      auth: auth,
      endpoints: const ['/admin/classes', '/admin/options', '/admin/lessons'],
    );
  }
}
