import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class StudentQuizQuestionScreen extends StatelessWidget {
  const StudentQuizQuestionScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Student Quiz Question',
      auth: auth,
      endpoints: const [],
    );
  }
}
