import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class GuestReportsScreen extends StatelessWidget {
  const GuestReportsScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Guest Reports',
      auth: auth,
      endpoints: const ['/pocket-money/parent-reports?period=month'],
    );
  }
}
