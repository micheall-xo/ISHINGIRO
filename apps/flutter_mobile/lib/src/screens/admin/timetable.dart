import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class AdminTimetableScreen extends StatelessWidget {
  const AdminTimetableScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Admin Timetable',
      auth: auth,
      endpoints: const ['/admin/options', '/admin/timetable/current'],
    );
  }
}
