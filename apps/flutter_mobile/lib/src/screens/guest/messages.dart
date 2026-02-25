import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class GuestMessagesScreen extends StatelessWidget {
  const GuestMessagesScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Guest Messages',
      auth: auth,
      endpoints: const ['/messages/conversations'],
    );
  }
}
