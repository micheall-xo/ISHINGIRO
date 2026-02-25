import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class SharedUserDetailScreen extends StatelessWidget {
  const SharedUserDetailScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'User Profile',
      auth: auth,
      endpoints: const [],
    );
  }
}
