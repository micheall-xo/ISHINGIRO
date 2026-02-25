import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class TeacherProfileEditScreen extends StatelessWidget {
  const TeacherProfileEditScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Teacher Profile Edit',
      auth: auth,
      endpoints: const ['/auth/profile', '/auth/profile-edit-request'],
    );
  }
}
