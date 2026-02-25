import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class StudentQuestionListScreen extends StatelessWidget {
  const StudentQuestionListScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Student Question List',
      auth: auth,
      endpoints: const [],
    );
  }
}
