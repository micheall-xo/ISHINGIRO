import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class SharedProfileEditScreen extends StatelessWidget {
  const SharedProfileEditScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Profile Edit',
      auth: auth,
      endpoints: const ['/auth/profile', '/auth/profile-edit-request'],
    );
  }
}
