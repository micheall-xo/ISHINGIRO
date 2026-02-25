import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
 
class StudentHomeworkScreen extends StatefulWidget {
  const StudentHomeworkScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<StudentHomeworkScreen> createState() => _StudentHomeworkScreenState();
}

class _StudentHomeworkScreenState extends State<StudentHomeworkScreen> {
  bool _loading = true;
  String _error = '';
  List<Map<String, dynamic>> _homework = [];

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
      final response = await widget.auth.api.get('/teacher-content/student/homework');
      final list = response is Map && response['homeworkList'] is List ? response['homeworkList'] as List : const [];
      _homework = list.map((item) => (item as Map).cast<String, dynamic>()).toList();
    } catch (error) {
      _error = '$error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'completed':
        return const Color(0xFF10B981);
      case 'in-progress':
        return const Color(0xFFF59E0B);
      case 'pending':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFF64748B);
    }
  }

  int _daysRemaining(dynamic rawDate) {
    final date = DateTime.tryParse('$rawDate');
    if (date == null) return 0;
    return date.difference(DateTime.now()).inDays;
  }

  @override
  Widget build(BuildContext context) {
    final pending = _homework.where((h) => '${h['status']}' == 'pending').length;
    final done = _homework.where((h) => '${h['status']}' == 'completed').length;

    return Scaffold(
      appBar: AppBar(title: const Text('Homework')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                Expanded(child: _StatCard(label: 'Pending', value: '$pending', color: const Color(0xFFEF4444))),
                const SizedBox(width: 10),
                Expanded(child: _StatCard(label: 'Completed', value: '$done', color: const Color(0xFF10B981))),
              ],
            ),
            const SizedBox(height: 14),
            if (_loading) const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())),
            if (!_loading && _error.isNotEmpty)
              Card(
                color: const Color(0xFFFEF2F2),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(_error, style: const TextStyle(color: Color(0xFF991B1B))),
                ),
              ),
            if (!_loading && _error.isEmpty && _homework.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(12),
                  child: Text('No assignments found.'),
                ),
              ),
            ..._homework.map(
              (hw) {
                final status = '${hw['status'] ?? ''}';
                final priority = '${hw['priority'] ?? ''}';
                final days = _daysRemaining(hw['dueDateRaw'] ?? hw['dueDate']);
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('${hw['subject'] ?? 'Subject'}',
                                        style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w700)),
                                    const SizedBox(height: 3),
                                    Text('${hw['title'] ?? 'Assignment'}',
                                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                                  ],
                                ),
                              ),
                              _Badge(text: status, color: _statusColor(status)),
                              const SizedBox(width: 6),
                              _Badge(text: priority, color: const Color(0xFF2563EB)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text('${hw['description'] ?? ''}', style: const TextStyle(color: Color(0xFF64748B))),
                          const SizedBox(height: 8),
                          Text('Due: ${hw['dueDate'] ?? '-'} ${hw['dueTime'] ?? ''}',
                              style: const TextStyle(fontWeight: FontWeight.w600)),
                          const SizedBox(height: 6),
                          Text(
                            days > 0 ? '$days days remaining' : (days == 0 ? 'Due today' : 'Overdue'),
                            style: TextStyle(
                              color: days < 1 ? const Color(0xFFEF4444) : const Color(0xFF475569),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, required this.color});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color)),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(999)),
      child: Text(text.toUpperCase(), style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700)),
    );
  }
}
