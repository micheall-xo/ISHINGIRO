import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class SharedMessagesScreen extends StatelessWidget {
  const SharedMessagesScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Messages',
      auth: auth,
      endpoints: const ['/messages/contacts', '/messages/conversations'],
    );
  }
}
