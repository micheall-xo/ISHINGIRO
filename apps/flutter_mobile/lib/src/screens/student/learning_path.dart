import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class StudentLearningPathScreen extends StatelessWidget {
  const StudentLearningPathScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Student Learning Path',
      auth: auth,
      endpoints: const [],
    );
  }
}
