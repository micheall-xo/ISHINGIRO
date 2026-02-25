import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class StudentQuizScreen extends StatelessWidget {
  const StudentQuizScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Student Quiz',
      auth: auth,
      endpoints: const [],
    );
  }
}
