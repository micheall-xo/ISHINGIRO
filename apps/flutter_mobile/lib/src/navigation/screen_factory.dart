import 'package:flutter/material.dart';

import '../state/auth_controller.dart';
import '../screens/shared/messages.dart';
import '../screens/shared/notifications.dart';
import '../screens/shared/profile_edit.dart';
import '../screens/shared/endpoint_view_screen.dart';
import '../screens/shared/user_detail.dart';
import '../screens/admin/assignments.dart';
import '../screens/admin/classes.dart';
import '../screens/admin/dashboard.dart';
import '../screens/admin/edit_requests.dart';
import '../screens/admin/messages.dart';
import '../screens/admin/notices.dart';
import '../screens/admin/requests.dart';
import '../screens/admin/student_leave.dart';
import '../screens/admin/timetable.dart';
import '../screens/admin/users.dart';
import '../screens/guest/calendar.dart';
import '../screens/guest/dashboard.dart';
import '../screens/guest/manage_kids.dart';
import '../screens/guest/messages.dart';
import '../screens/guest/profile.dart';
import '../screens/guest/reports.dart';
import '../screens/guest/child_detail.dart';
import '../screens/student/answer.dart';
import '../screens/student/ask.dart';
import '../screens/student/exam_routine.dart';
import '../screens/student/homework.dart';
import '../screens/student/learning_path.dart';
import '../screens/student/messages.dart';
import '../screens/student/notices.dart';
import '../screens/student/plans.dart';
import '../screens/student/profile.dart';
import '../screens/student/question_list.dart';
import '../screens/student/quiz.dart';
import '../screens/student/quiz_question.dart';
import '../screens/student/quiz_score.dart';
import '../screens/student/quiz_start.dart';
import '../screens/student/reminders.dart';
import '../screens/student/result_first.dart';
import '../screens/student/result_second.dart';
import '../screens/student/results.dart';
import '../screens/student/results_list.dart';
import '../screens/student/solution.dart';
import '../screens/student/special_days.dart';
import '../screens/teacher/add_marks.dart';
import '../screens/teacher/attendance.dart';
import '../screens/teacher/exam_routine.dart';
import '../screens/teacher/homework.dart';
import '../screens/teacher/messages.dart';
import '../screens/teacher/notices.dart';
import '../screens/teacher/profile.dart';
import '../screens/teacher/profile_edit.dart';
import '../screens/teacher/results.dart';
import '../screens/teacher/solutions.dart';

class ScreenFactory {
  static Widget build(String route, AuthController auth) {
    switch (route) {
      case '/messages':
        return SharedMessagesScreen(auth: auth);
      case '/notifications':
        return SharedNotificationsScreen(auth: auth);
      case '/profile-edit':
        return SharedProfileEditScreen(auth: auth);
      case '/register':
        return RegisterScreen(auth: auth);
      case '/user-detail':
        return SharedUserDetailScreen(auth: auth);
      case '/admin/assignments':
        return AdminAssignmentsScreen(auth: auth);
      case '/admin/classes':
        return AdminClassesScreen(auth: auth);
      case '/admin/dashboard':
        return AdminDashboardScreen(auth: auth);
      case '/admin/edit-requests':
        return AdminEditRequestsScreen(auth: auth);
      case '/admin/messages':
        return AdminMessagesScreen(auth: auth);
      case '/admin/notices':
        return AdminNoticesScreen(auth: auth);
      case '/admin/requests':
        return AdminRequestsScreen(auth: auth);
      case '/admin/student-leave':
        return AdminStudentLeaveScreen(auth: auth);
      case '/admin/timetable':
        return AdminTimetableScreen(auth: auth);
      case '/admin/users':
        return AdminUsersScreen(auth: auth);
      case '/guest/calendar':
        return GuestCalendarScreen(auth: auth);
      case '/guest/dashboard':
        return GuestDashboardScreen(auth: auth);
      case '/guest/manage-kids':
        return GuestManageKidsScreen(auth: auth);
      case '/guest/messages':
        return GuestMessagesScreen(auth: auth);
      case '/guest/profile':
        return GuestProfileScreen(auth: auth);
      case '/guest/reports':
        return GuestReportsScreen(auth: auth);
      case '/guest/child-detail':
        return GuestChildDetailScreen(auth: auth);
      case '/student/answer':
        return StudentAnswerScreen(auth: auth);
      case '/student/ask':
        return StudentAskScreen(auth: auth);
      case '/student/exam-routine':
        return StudentExamRoutineScreen(auth: auth);
      case '/student/homework':
        return StudentHomeworkScreen(auth: auth);
      case '/student/learning-path':
        return StudentLearningPathScreen(auth: auth);
      case '/student/messages':
        return StudentMessagesScreen(auth: auth);
      case '/student/notices':
        return StudentNoticesScreen(auth: auth);
      case '/student/plans':
        return StudentPlansScreen(auth: auth);
      case '/student/profile':
        return StudentProfileScreen(auth: auth);
      case '/student/question-list':
        return StudentQuestionListScreen(auth: auth);
      case '/student/quiz':
        return StudentQuizScreen(auth: auth);
      case '/student/quiz-question':
        return StudentQuizQuestionScreen(auth: auth);
      case '/student/quiz-score':
        return StudentQuizScoreScreen(auth: auth);
      case '/student/quiz-start':
        return StudentQuizStartScreen(auth: auth);
      case '/student/reminders':
        return StudentRemindersScreen(auth: auth);
      case '/student/result-first':
        return StudentResultFirstScreen(auth: auth);
      case '/student/result-second':
        return StudentResultSecondScreen(auth: auth);
      case '/student/results':
        return StudentResultsScreen(auth: auth);
      case '/student/results-list':
        return StudentResultsListScreen(auth: auth);
      case '/student/solution':
        return StudentSolutionScreen(auth: auth);
      case '/student/special-days':
        return StudentSpecialDaysScreen(auth: auth);
      case '/teacher/add-marks':
        return TeacherAddMarksScreen(auth: auth);
      case '/teacher/attendance':
        return TeacherAttendanceScreen(auth: auth);
      case '/teacher/exam-routine':
        return TeacherExamRoutineScreen(auth: auth);
      case '/teacher/homework':
        return TeacherHomeworkScreen(auth: auth);
      case '/teacher/messages':
        return TeacherMessagesScreen(auth: auth);
      case '/teacher/notices':
        return TeacherNoticesScreen(auth: auth);
      case '/teacher/profile':
        return TeacherProfileScreen(auth: auth);
      case '/teacher/profile-edit':
        return TeacherProfileEditScreen(auth: auth);
      case '/teacher/results':
        return TeacherResultsScreen(auth: auth);
      case '/teacher/solutions':
        return TeacherSolutionsScreen(auth: auth);
      default:
        return Scaffold(
          appBar: AppBar(title: const Text('Screen not found')),
          body: Center(child: Text('No screen mapped for: ' + route)),
        );
    }
  }

  static Future<void> open(BuildContext context, AuthController auth, String route) {
    return Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => build(route, auth)),
    );
  }
}