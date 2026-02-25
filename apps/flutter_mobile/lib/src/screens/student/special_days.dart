import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class StudentSpecialDaysScreen extends StatelessWidget {
  const StudentSpecialDaysScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Student Special Days',
      auth: auth,
      endpoints: const [],
    );
  }
}
