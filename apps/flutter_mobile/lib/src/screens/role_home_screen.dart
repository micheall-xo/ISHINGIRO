import 'package:flutter/material.dart';

import '../navigation/screen_factory.dart';
import '../state/auth_controller.dart';

class RoleHomeScreen extends StatefulWidget {
  const RoleHomeScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<RoleHomeScreen> createState() => _RoleHomeScreenState();
}

class _RoleHomeScreenState extends State<RoleHomeScreen> {
  @override
  void initState() {
    super.initState();
    widget.auth.refreshProfile();
  }

  @override
  Widget build(BuildContext context) {
    final role = widget.auth.user?.role.toLowerCase() ?? 'guest';
    if (role == 'student') return StudentHome(auth: widget.auth);
    if (role == 'teacher') return TeacherHome(auth: widget.auth);
    if (role == 'admin') return AdminHome(auth: widget.auth);
    return GuestHome(auth: widget.auth);
  }
}

class StudentHome extends StatefulWidget {
  const StudentHome({super.key, required this.auth});

  final AuthController auth;

  @override
  State<StudentHome> createState() => _StudentHomeState();
}

class _StudentHomeState extends State<StudentHome> {
  bool _loading = true;
  String _error = '';
  Map<String, dynamic> _profile = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final data = await widget.auth.api.get('/auth/profile');
      if (data is Map<String, dynamic>) _profile = data;
    } catch (error) {
      _error = '$error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final studentInfo = (_profile['studentInfo'] as Map?)?.cast<String, dynamic>() ?? {};
    final attendance = (studentInfo['attendance'] as Map?)?.cast<String, dynamic>() ?? {};
    final totalDays = (attendance['totalDays'] ?? 0) as num;
    final presentDays = (attendance['presentDays'] ?? 0) as num;
    final attendancePct = totalDays > 0 ? ((presentDays / totalDays) * 100).round() : 0;
    final gpa = (((studentInfo['performance'] as Map?)?['gpa']) ?? 0).toString();
    final balance = _asDouble((studentInfo['pocketMoney'] as Map?)?['balance']).toStringAsFixed(2);
    return DashboardShell(
      auth: widget.auth,
      accent: const Color(0xFF667EEA),
      title: 'Student',
      subtitle: _profile['fullName']?.toString() ?? widget.auth.user?.fullName ?? 'Welcome back',
      loading: _loading,
      error: _error,
      onRefresh: _load,
      onLogout: widget.auth.signOut,
      statItems: [
        StatItem(label: 'GPA', value: gpa, color: const Color(0xFF3B82F6)),
        StatItem(label: 'Balance', value: '\$$balance', color: const Color(0xFFEF4444)),
        StatItem(label: 'Attendance', value: '$attendancePct%', color: const Color(0xFF10B981)),
      ],
      quickItems: const [
        QuickItem(title: 'Homework', subtitle: 'View assignments', emoji: '📚', route: '/student/homework'),
        QuickItem(title: 'Results', subtitle: 'Check grades', emoji: '📈', route: '/student/results-list'),
        QuickItem(title: 'Messages', subtitle: 'Chat securely', emoji: '💬', route: '/student/messages'),
        QuickItem(title: 'Notices', subtitle: 'School updates', emoji: '📢', route: '/student/notices'),
        QuickItem(title: 'Exam Routine', subtitle: 'Exam schedule', emoji: '📅', route: '/student/exam-routine'),
        QuickItem(title: 'Ask Teacher', subtitle: 'Get help', emoji: '❓', route: '/student/ask'),
      ],
    );
  }
}

class TeacherHome extends StatefulWidget {
  const TeacherHome({super.key, required this.auth});

  final AuthController auth;

  @override
  State<TeacherHome> createState() => _TeacherHomeState();
}

class _TeacherHomeState extends State<TeacherHome> {
  bool _loading = true;
  String _error = '';
  int _students = 0;
  Map<String, dynamic> _profile = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final profile = await widget.auth.api.get('/auth/profile');
      if (profile is Map<String, dynamic>) {
        _profile = profile;
        final id = '${profile['id'] ?? ''}';
        if (id.isNotEmpty) {
          final students = await widget.auth.api.get('/teachers/$id/students');
          if (students is List) _students = students.length;
        }
      }
    } catch (error) {
      _error = '$error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DashboardShell(
      auth: widget.auth,
      accent: const Color(0xFF667EEA),
      title: 'Teacher',
      subtitle: _profile['fullName']?.toString() ?? widget.auth.user?.fullName ?? 'Welcome back',
      loading: _loading,
      error: _error,
      onRefresh: _load,
      onLogout: widget.auth.signOut,
      statItems: [
        StatItem(label: 'Students', value: '$_students', color: const Color(0xFF3B82F6)),
        const StatItem(label: 'Exams', value: '2', color: Color(0xFFEF4444)),
        const StatItem(label: 'Attendance', value: 'N/A', color: Color(0xFF10B981)),
      ],
      quickItems: const [
        QuickItem(title: 'Attendance', subtitle: 'Mark attendance', emoji: '📝', route: '/teacher/attendance'),
        QuickItem(title: 'Add Marks', subtitle: 'Upload scores', emoji: '📊', route: '/teacher/add-marks'),
        QuickItem(title: 'Messages', subtitle: 'Chat with parents/admin', emoji: '💬', route: '/teacher/messages'),
        QuickItem(title: 'Results', subtitle: 'Review results', emoji: '📈', route: '/teacher/results'),
        QuickItem(title: 'Homework', subtitle: 'Manage homework', emoji: '📚', route: '/teacher/homework'),
        QuickItem(title: 'Notices', subtitle: 'Post notices', emoji: '📢', route: '/teacher/notices'),
      ],
    );
  }
}

class AdminHome extends StatefulWidget {
  const AdminHome({super.key, required this.auth});

  final AuthController auth;

  @override
  State<AdminHome> createState() => _AdminHomeState();
}

class _AdminHomeState extends State<AdminHome> {
  bool _loading = true;
  String _error = '';
  Map<String, dynamic> _dashboard = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final response = await widget.auth.api.get('/admin/dashboard');
      if (response is Map<String, dynamic>) _dashboard = response;
    } catch (error) {
      _error = '$error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final byRole = (_dashboard['users'] as Map?)?['byRole'] as Map? ?? {};
    return DashboardShell(
      auth: widget.auth,
      accent: const Color(0xFF4F46E5),
      title: 'Headmaster Control Center',
      subtitle: 'Professional admin workspace',
      loading: _loading,
      error: _error,
      onRefresh: _load,
      onLogout: widget.auth.signOut,
      statItems: [
        StatItem(label: 'Users', value: '${(_dashboard['users'] as Map?)?['total'] ?? 0}', color: const Color(0xFF4F46E5)),
        StatItem(label: 'Teachers', value: '${byRole['teacher'] ?? 0}', color: const Color(0xFF2563EB)),
        StatItem(label: 'Students', value: '${(_dashboard['studentAssignments'] as Map?)?['totalStudents'] ?? 0}', color: const Color(0xFF7C3AED)),
      ],
      quickItems: const [
        QuickItem(title: 'Dashboard', subtitle: 'School-wide analytics', emoji: '📊', route: '/admin/dashboard'),
        QuickItem(title: 'Users', subtitle: 'Manage accounts', emoji: '👥', route: '/admin/users'),
        QuickItem(title: 'Requests', subtitle: 'Profile edit approvals', emoji: '🧾', route: '/admin/requests'),
        QuickItem(title: 'Classes', subtitle: 'Classroom and lessons', emoji: '🏫', route: '/admin/classes'),
        QuickItem(title: 'Timetable', subtitle: 'Generate schedules', emoji: '🗓️', route: '/admin/timetable'),
        QuickItem(title: 'Messages', subtitle: 'Cross-gateway hub', emoji: '✉️', route: '/admin/messages'),
      ],
    );
  }
}

class GuestHome extends StatefulWidget {
  const GuestHome({super.key, required this.auth});

  final AuthController auth;

  @override
  State<GuestHome> createState() => _GuestHomeState();
}

class _GuestHomeState extends State<GuestHome> {
  bool _loading = true;
  String _error = '';
  List<Map<String, dynamic>> _children = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final response = await widget.auth.api.get('/pocket-money/parent-summary');
      final rows = response is List ? response.cast<dynamic>() : <dynamic>[];
      _children = rows
          .map(
            (item) => {
              'name': '${item['name'] ?? 'Student'}',
              'studentId': '${item['studentId'] ?? ''}',
              'balance': _asDouble((item['pocketMoney'] as Map?)?['balance']),
            },
          )
          .toList();
    } catch (error) {
      _error = '$error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openTopUp(Map<String, dynamic> child) async {
    final amountController = TextEditingController();
    final descriptionController = TextEditingController(text: 'Parent top-up');
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Pocket Money'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Child: ${child['name']}'),
            const SizedBox(height: 10),
            TextField(
              controller: amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Amount'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: descriptionController,
              decoration: const InputDecoration(labelText: 'Description'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Add')),
        ],
      ),
    );
    if (saved != true) return;
    final amount = double.tryParse(amountController.text.trim());
    if (amount == null || amount <= 0) {
      _show('Invalid amount', 'Enter a value greater than 0');
      return;
    }
    try {
      await widget.auth.api.post(
        '/pocket-money/topup',
        body: {
          'studentId': '${child['studentId']}',
          'amount': amount,
          'description': descriptionController.text.trim().isEmpty
              ? 'Parent top-up'
              : descriptionController.text.trim(),
        },
      );
      await _load();
      if (!mounted) return;
      _show('Success', 'Added \$${amount.toStringAsFixed(2)} to ${child['name']}');
    } catch (error) {
      _show('Top-up failed', '$error');
    }
  }

  void _show(String title, String message) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DashboardShell(
      auth: widget.auth,
      accent: const Color(0xFF8B5CF6),
      title: 'Parents',
      subtitle: 'Data synced from school system',
      loading: _loading,
      error: _error,
      onRefresh: _load,
      onLogout: widget.auth.signOut,
      statItems: [
        StatItem(label: 'Children', value: '${_children.length}', color: const Color(0xFF2563EB)),
        StatItem(
          label: 'Total Balance',
          value: '\$${_children.fold<double>(0, (sum, c) => sum + ((c['balance'] as num?)?.toDouble() ?? 0)).toStringAsFixed(2)}',
          color: const Color(0xFF10B981),
        ),
        const StatItem(label: 'Alerts', value: 'On', color: Color(0xFFF59E0B)),
      ],
      quickItems: const [
        QuickItem(title: 'Manage Kids', subtitle: 'Link children', emoji: '👨‍👩‍👧‍👦', route: '/guest/manage-kids'),
        QuickItem(title: 'Calendar', subtitle: 'School events', emoji: '🗓️', route: '/guest/calendar'),
        QuickItem(title: 'Messages', subtitle: 'Talk with teachers', emoji: '💬', route: '/guest/messages'),
        QuickItem(title: 'Reports', subtitle: 'Academic progress', emoji: '📈', route: '/guest/reports'),
      ],
      extra: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: _children
            .map(
              (child) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${child['name']}',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                              ),
                              const SizedBox(height: 4),
                              Text('ID: ${child['studentId']}'),
                              const SizedBox(height: 4),
                              Text(
                                'Balance: \$${((child['balance'] as num?)?.toDouble() ?? 0).toStringAsFixed(2)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF16A34A),
                                ),
                              ),
                            ],
                          ),
                        ),
                        FilledButton(
                          onPressed: () => _openTopUp(child),
                          style: FilledButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                          child: const Text('Add Money'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

class DashboardShell extends StatelessWidget {
  const DashboardShell({
    super.key,
    required this.auth,
    required this.accent,
    required this.title,
    required this.subtitle,
    required this.loading,
    required this.error,
    required this.onRefresh,
    required this.onLogout,
    required this.statItems,
    required this.quickItems,
    this.extra,
  });

  final AuthController auth;
  final Color accent;
  final String title;
  final String subtitle;
  final bool loading;
  final String error;
  final Future<void> Function() onRefresh;
  final Future<void> Function() onLogout;
  final List<StatItem> statItems;
  final List<QuickItem> quickItems;
  final Widget? extra;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              Container(
                decoration: BoxDecoration(
                  color: accent,
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(30),
                    bottomRight: Radius.circular(30),
                  ),
                ),
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            subtitle,
                            style: const TextStyle(
                              color: Color(0xE6FFFFFF),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    FilledButton(
                      onPressed: () async {
                        await onLogout();
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0x33FFFFFF),
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Logout'),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (loading)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 30),
                          child: CircularProgressIndicator(),
                        ),
                      ),
                    if (!loading && error.isNotEmpty)
                      Card(
                        color: const Color(0xFFFEF2F2),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Text(error, style: const TextStyle(color: Color(0xFF991B1B))),
                        ),
                      ),
                    const Text(
                      'Quick Overview',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: statItems
                          .map(
                            (item) => Expanded(
                              child: Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: Card(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 10),
                                    child: Column(
                                      children: [
                                        Text(
                                          item.value,
                                          style: TextStyle(
                                            color: item.color,
                                            fontSize: 24,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(item.label, style: const TextStyle(color: Color(0xFF64748B))),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                    const SizedBox(height: 20),
                    const Text(
                      'Quick Access',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      runSpacing: 12,
                      spacing: 12,
                      children: quickItems
                          .map(
                            (item) => SizedBox(
                              width: (MediaQuery.of(context).size.width - 52) / 2,
                              child: Card(
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(12),
                                  onTap: () => ScreenFactory.open(context, auth, item.route),
                                  child: Padding(
                                    padding: const EdgeInsets.all(14),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(item.emoji, style: const TextStyle(fontSize: 24)),
                                        const SizedBox(height: 8),
                                        Text(
                                          item.title,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFF1E293B),
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          item.subtitle,
                                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                    if (extra != null) ...[
                      const SizedBox(height: 20),
                      const Text(
                        'Children',
                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 12),
                      extra!,
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class StatItem {
  final String label;
  final String value;
  final Color color;

  const StatItem({
    required this.label,
    required this.value,
    required this.color,
  });
}

class QuickItem {
  final String title;
  final String subtitle;
  final String emoji;
  final String route;

  const QuickItem({
    required this.title,
    required this.subtitle,
    required this.emoji,
    required this.route,
  });
}

double _asDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse('$value') ?? 0;
}
