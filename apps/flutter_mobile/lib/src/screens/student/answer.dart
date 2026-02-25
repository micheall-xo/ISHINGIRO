import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class StudentAnswerScreen extends StatelessWidget {
  const StudentAnswerScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Student Answer',
      auth: auth,
      endpoints: const [],
    );
  }
}
