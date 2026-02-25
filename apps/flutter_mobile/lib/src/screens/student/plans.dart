import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class StudentPlansScreen extends StatelessWidget {
  const StudentPlansScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Student Plans',
      auth: auth,
      endpoints: const [],
    );
  }
}
