import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class GuestCalendarScreen extends StatelessWidget {
  const GuestCalendarScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Guest Calendar',
      auth: auth,
      endpoints: const [],
    );
  }
}
