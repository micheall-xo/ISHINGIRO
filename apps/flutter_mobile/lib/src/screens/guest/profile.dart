import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class GuestProfileScreen extends StatelessWidget {
  const GuestProfileScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Guest Profile',
      auth: auth,
      endpoints: const ['/auth/profile'],
    );
  }
}
