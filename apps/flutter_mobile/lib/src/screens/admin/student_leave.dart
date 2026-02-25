import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class AdminStudentLeaveScreen extends StatelessWidget {
  const AdminStudentLeaveScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Admin Student Leave',
      auth: auth,
      endpoints: const ['/admin/options', '/attendance/leaves'],
    );
  }
}
