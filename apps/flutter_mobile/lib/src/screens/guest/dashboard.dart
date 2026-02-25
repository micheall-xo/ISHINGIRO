import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class GuestDashboardScreen extends StatelessWidget {
  const GuestDashboardScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Guest Dashboard',
      auth: auth,
      endpoints: const ['/pocket-money/parent-summary'],
    );
  }
}
