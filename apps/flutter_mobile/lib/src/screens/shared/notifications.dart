import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class SharedNotificationsScreen extends StatelessWidget {
  const SharedNotificationsScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Notifications',
      auth: auth,
      endpoints: const ['/notifications?limit=80'],
    );
  }
}
