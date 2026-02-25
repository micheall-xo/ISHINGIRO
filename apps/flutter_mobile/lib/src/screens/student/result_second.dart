import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
 
class StudentResultSecondScreen extends StatefulWidget {
  const StudentResultSecondScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<StudentResultSecondScreen> createState() => _StudentResultSecondScreenState();
}

class _StudentResultSecondScreenState extends State<StudentResultSecondScreen> {
  bool _loading = true;
  String _error = '';
  Map<String, dynamic>? _term;
  Map<String, dynamic> _yearly = {};

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
      final terms = response is Map && response['terms'] is List ? response['terms'] as List : const [];
      final second = terms
          .cast<dynamic>()
          .map((t) => (t as Map).cast<String, dynamic>())
          .firstWhere(
            (t) => '${t['term']}'.toLowerCase().contains('second'),
            orElse: () => terms.length > 1 ? (terms[1] as Map).cast<String, dynamic>() : <String, dynamic>{},
          );
      _term = second.isEmpty ? null : second;
      _yearly = response is Map && response['yearly'] is Map ? (response['yearly'] as Map).cast<String, dynamic>() : {};
    } catch (error) {
      _error = '$error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final term = _term;
    final desc = term == null
        ? 'No second-term report found in the database.'
        : 'Overall ${term['overallGrade'] ?? 'N/A'} (${((term['overallScore'] as num?) ?? 0).toStringAsFixed(2)}%). '
            'Yearly status: ${_yearly['status'] ?? 'N/A'}, GPA: ${((_yearly['gpa'] as num?) ?? 0).toStringAsFixed(2)}.';
    return Scaffold(
      appBar: AppBar(title: const Text('Second Term Result')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              color: const Color(0xFF0B5EFF),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('RESULT', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 6),
                    Text('Term: Second', style: const TextStyle(color: Color(0xFFEFF6FF))),
                    Text('Date: ${term?['date'] ?? DateTime.now().toString().substring(0, 10)}',
                        style: const TextStyle(color: Color(0xFFEFF6FF))),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            if (_loading) const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator())),
            if (!_loading && _error.isNotEmpty)
              Card(
                color: const Color(0xFFFEF2F2),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(_error, style: const TextStyle(color: Color(0xFF991B1B))),
                ),
              ),
            if (!_loading && _error.isEmpty) ...[
              const Text('Description', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              Text(desc, style: const TextStyle(color: Color(0xFF6B7280))),
              const SizedBox(height: 10),
              Card(
                color: const Color(0xFFE5E7EB),
                child: Padding(
                  padding: const EdgeInsets.all(10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: ((term?['subjects'] as List?) ?? const [])
                        .take(6)
                        .map(
                          (s) => Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Text(
                              '${(s is Map ? s['name'] : '')}: '
                              'Formative ${(s is Map ? s['formativeScore'] : '-') ?? '-'} | '
                              'Exam ${(s is Map ? s['examScore'] : '-') ?? '-'} | '
                              'Final ${((s is Map ? s['score'] : 0) as num?)?.toStringAsFixed(1) ?? '0.0'}%',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF374151)),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              FilledButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Download export will be added in next step.')),
                  );
                },
                child: const Text('Download your result'),
              )
            ]
          ],
        ),
      ),
    );
  }
}
