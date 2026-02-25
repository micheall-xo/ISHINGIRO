import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
import '../shared/endpoint_view_screen.dart';

class TeacherExamRoutineScreen extends StatelessWidget {
  const TeacherExamRoutineScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    return EndpointViewScreen(
      title: 'Teacher Exam Routine',
      auth: auth,
      endpoints: const ['/teacher-content/exam-routine', '/teacher-content/exam-strategies', '/teacher-content/results'],
    );
  }
}
