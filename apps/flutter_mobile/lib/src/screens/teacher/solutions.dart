import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class TeacherSolutionsScreen extends StatelessWidget {
  const TeacherSolutionsScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Teacher Solutions',
      auth: auth,
      endpoints: const ['/teacher-content/qa-posts'],
    );
  }
}
