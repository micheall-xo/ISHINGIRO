import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class TeacherResultsScreen extends StatelessWidget {
  const TeacherResultsScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Teacher Results',
      auth: auth,
      endpoints: const ['/teacher-content/results'],
    );
  }
}
