import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class GuestManageKidsScreen extends StatelessWidget {
  const GuestManageKidsScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Guest Manage Kids',
      auth: auth,
      endpoints: const ['/students/parent/children', '/pocket-money/parent-summary'],
    );
  }
}
