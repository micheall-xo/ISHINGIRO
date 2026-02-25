import 'package:flutter/material.dart';

import '../../navigation/screen_factory.dart';
import '../../state/auth_controller.dart';
 
class StudentResultsListScreen extends StatefulWidget {
  const StudentResultsListScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<StudentResultsListScreen> createState() => _StudentResultsListScreenState();
}

class _StudentResultsListScreenState extends State<StudentResultsListScreen> {
  bool _loading = true;
  String _error = '';
  Map<String, dynamic> _report = {
    'terms': [],
    'yearly': {},
    'performance': {},
    'student': {},
  };

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
      final response = await widget.auth.api.get('/teacher-content/student/report-card');
      _report = {
        'terms': response is Map && response['terms'] is List ? response['terms'] : const [],
        'yearly': response is Map && response['yearly'] is Map ? response['yearly'] : const {},
        'performance': response is Map && response['performance'] is Map ? response['performance'] : const {},
        'student': response is Map && response['student'] is Map ? response['student'] : const {},
      };
    } catch (error) {
      _error = '$error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _routeForTerm(dynamic term) {
    final t = '$term'.toLowerCase();
    if (t.contains('second')) return '/student/result-second';
    return '/student/result-first';
  }

  Color _gradeColor(String grade) {
    switch (grade) {
      case 'A+':
        return const Color(0xFF10B981);
      case 'A':
        return const Color(0xFF059669);
      case 'B+':
        return const Color(0xFF3B82F6);
      case 'B':
        return const Color(0xFF2563EB);
      case 'C+':
        return const Color(0xFFF59E0B);
      case 'C':
        return const Color(0xFFD97706);
      default:
        return const Color(0xFF6B7280);
    }
  }

  @override
  Widget build(BuildContext context) {
    final terms = (_report['terms'] as List).map((e) => (e as Map).cast<String, dynamic>()).toList();
    final yearly = (_report['yearly'] as Map).cast<String, dynamic>();

    return Scaffold(
      appBar: AppBar(title: const Text('Academic Results')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_loading) const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())),
            if (!_loading && _error.isNotEmpty)
              Card(
                color: const Color(0xFFFEF2F2),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(_error, style: const TextStyle(color: Color(0xFF991B1B))),
                ),
              ),
            if (!_loading && _error.isEmpty) ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _InfoStat(label: 'Current GPA', value: '${((yearly['gpa'] as num?) ?? 0).toStringAsFixed(2)}'),
                      _InfoStat(label: 'Yearly Grade', value: '${yearly['grade'] ?? 'N/A'}'),
                      _InfoStat(
                        label: 'Promotion',
                        value: '${yearly['status'] ?? 'N/A'}',
                        color: '${yearly['status']}' == 'Promoted' ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 10),
              if (terms.isEmpty) const Text('No report records found yet.'),
              ...terms.map(
                (term) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('${term['title'] ?? term['term'] ?? 'Term'}',
                                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                                    const SizedBox(height: 4),
                                    Text('${term['date'] ?? ''}',
                                        style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ),
                              Column(
                                children: [
                                  Text('${term['overallGrade'] ?? 'N/A'}',
                                      style: TextStyle(
                                          color: _gradeColor('${term['overallGrade'] ?? ''}'),
                                          fontWeight: FontWeight.w900,
                                          fontSize: 28)),
                                  Text('${((term['overallScore'] as num?) ?? 0).toStringAsFixed(2)}%',
                                      style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Yearly status: ${yearly['status'] ?? 'N/A'} | GPA: ${((yearly['gpa'] as num?) ?? 0).toStringAsFixed(2)}',
                            style: const TextStyle(color: Color(0xFFD97706), fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 10),
                          ...(term['subjects'] is List
                              ? (term['subjects'] as List).map(
                                  (s) => Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 4),
                                    child: Row(
                                      children: [
                                        Expanded(
                                            child: Text('${(s is Map ? s['name'] : '') ?? ''}',
                                                style: const TextStyle(fontWeight: FontWeight.w600))),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: _gradeColor('${(s is Map ? s['grade'] : '') ?? ''}').withValues(alpha: 0.15),
                                            borderRadius: BorderRadius.circular(999),
                                          ),
                                          child: Text('${(s is Map ? s['grade'] : '') ?? ''}',
                                              style: TextStyle(
                                                  color: _gradeColor('${(s is Map ? s['grade'] : '') ?? ''}'),
                                                  fontWeight: FontWeight.w700)),
                                        ),
                                        const SizedBox(width: 8),
                                        Text('${((s is Map ? s['score'] : 0) as num?)?.toStringAsFixed(1) ?? '0.0'}%',
                                            style: const TextStyle(fontWeight: FontWeight.w700)),
                                      ],
                                    ),
                                  ),
                                )
                              : []),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              FilledButton(
                                onPressed: () => ScreenFactory.open(context, widget.auth, _routeForTerm(term['term'])),
                                child: const Text('View Details'),
                              ),
                              const SizedBox(width: 8),
                              OutlinedButton(
                                onPressed: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Download export will be added in next step.')),
                                  );
                                },
                                child: const Text('Download'),
                              ),
                            ],
                          )
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _InfoStat extends StatelessWidget {
  const _InfoStat({required this.label, required this.value, this.color});
  final String label;
  final String value;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(color: color ?? const Color(0xFF1E293B), fontWeight: FontWeight.w800, fontSize: 18)),
      ],
    );
  }
}
