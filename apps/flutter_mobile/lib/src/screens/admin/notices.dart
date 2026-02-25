import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class AdminNoticesScreen extends StatelessWidget {
  const AdminNoticesScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Admin Notices',
      auth: auth,
      endpoints: const ['/admin/notices'],
    );
  }
}
