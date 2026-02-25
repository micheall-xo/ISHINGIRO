import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
 
class StudentExamRoutineScreen extends StatefulWidget {
  const StudentExamRoutineScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<StudentExamRoutineScreen> createState() => _StudentExamRoutineScreenState();
}

class _StudentExamRoutineScreenState extends State<StudentExamRoutineScreen> {
  bool _loading = true;
  String _error = '';
  Map<String, dynamic> _routine = {'entries': [], 'lessons': []};
  List<Map<String, dynamic>> _strategies = [];

  static const _dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
      final responses = await Future.wait([
        widget.auth.api.get('/teacher-content/exam-routine'),
        widget.auth.api.get('/teacher-content/exam-strategies'),
      ]);
      final routine = responses[0] is Map ? (responses[0] as Map).cast<String, dynamic>() : <String, dynamic>{};
      final strategiesRaw = responses[1] is Map && (responses[1] as Map)['items'] is List
          ? (responses[1] as Map)['items'] as List
          : const [];

      _routine = {
        'timetable': routine['timetable'],
        'selectedClassName': routine['selectedClassName'] ?? '',
        'entries': routine['entries'] is List ? routine['entries'] : const [],
        'lessons': routine['lessons'] is List ? routine['lessons'] : const [],
      };
      _strategies = strategiesRaw.map((e) => (e as Map).cast<String, dynamic>()).toList();
    } catch (error) {
      _error = '$error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final entries = (_routine['entries'] as List).map((e) => (e as Map).cast<String, dynamic>()).toList();
    final foundDays = entries.map((e) => '${e['day']}').where((d) => d.isNotEmpty).toSet();
    final days = _dayOrder.where(foundDays.contains).toList();
    final periods = entries.map((e) => int.tryParse('${e['period']}') ?? -1).where((p) => p >= 0).toSet().toList()
      ..sort();
    final cellMap = <String, Map<String, dynamic>>{};
    for (final e in entries) {
      cellMap['${e['day']}:${e['period']}'] = e;
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Exam Routine')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              color: const Color(0xFFB91C1C),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Exam Routine',
                        style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 4),
                    Text('Class: ${_routine['selectedClassName'] ?? 'N/A'}',
                        style: const TextStyle(color: Color(0xFFEFF6FF), fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text(
                      _routine['timetable'] is Map
                          ? 'Timetable v${((_routine['timetable'] as Map)['version'] ?? '-')}'
                          : 'No active timetable',
                      style: const TextStyle(color: Color(0xFFE5E7EB), fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            if (_loading) const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator())),
            if (!_loading && _error.isNotEmpty)
              Card(
                color: const Color(0xFFFEF2F2),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(_error, style: const TextStyle(color: Color(0xFF991B1B))),
                ),
              ),
            if (!_loading && _error.isEmpty)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Timetable Table', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 8),
                      if (days.isEmpty || periods.isEmpty)
                        const Text('No timetable entries available.')
                      else
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Table(
                            border: TableBorder.all(color: const Color(0xFFCBD5E1)),
                            defaultVerticalAlignment: TableCellVerticalAlignment.middle,
                            columnWidths: const {0: FixedColumnWidth(80)},
                            children: [
                              TableRow(
                                decoration: const BoxDecoration(color: Color(0xFFE2E8F0)),
                                children: [
                                  const Padding(
                                    padding: EdgeInsets.all(8),
                                    child: Text('Period',
                                        textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w800)),
                                  ),
                                  ...days.map(
                                    (day) => Padding(
                                      padding: const EdgeInsets.all(8),
                                      child: Text(day,
                                          textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800)),
                                    ),
                                  ),
                                ],
                              ),
                              ...periods.map(
                                (p) => TableRow(
                                  children: [
                                    Padding(
                                      padding: const EdgeInsets.all(8),
                                      child: Text('P$p', textAlign: TextAlign.center),
                                    ),
                                    ...days.map((day) {
                                      final e = cellMap['$day:$p'];
                                      return Padding(
                                        padding: const EdgeInsets.all(8),
                                        child: e == null
                                            ? const Text('-', textAlign: TextAlign.center)
                                            : Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text('${e['subject'] ?? ''}',
                                                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                                                  Text('${e['startTime'] ?? ''} - ${e['endTime'] ?? ''}',
                                                      style: const TextStyle(fontSize: 11, color: Color(0xFF475569))),
                                                ],
                                              ),
                                      );
                                    }),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 10),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Lessons From Admin + Teachers',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: ((_routine['lessons'] as List?) ?? const [])
                          .map((item) => Chip(label: Text('$item')))
                          .toList(),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('My Study Strategy', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 10),
                    if (_strategies.isEmpty) const Text('No strategy added yet by your teacher.'),
                    ..._strategies.map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            border: Border.all(color: const Color(0xFFDBE3F0)),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          padding: const EdgeInsets.all(10),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${item['strategyTitle'] ?? ''}',
                                  style: const TextStyle(fontWeight: FontWeight.w800)),
                              const SizedBox(height: 4),
                              Text('${item['subject'] ?? ''} | Exam: ${item['targetExamDate'] ?? ''}',
                                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                              const SizedBox(height: 4),
                              Text('${item['strategyDetails'] ?? ''}'),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
