import 'package:flutter/material.dart';

import '../../navigation/screen_factory.dart';
import '../../state/auth_controller.dart';
 
class StudentProfileScreen extends StatefulWidget {
  const StudentProfileScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<StudentProfileScreen> createState() => _StudentProfileScreenState();
}

class _StudentProfileScreenState extends State<StudentProfileScreen> {
  bool _loading = true;
  String _error = '';
  Map<String, dynamic> _student = {};

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
        widget.auth.api.get('/auth/profile'),
        widget.auth.api.get('/auth/profile-edit-request'),
      ]);
      final profile = responses[0] is Map ? (responses[0] as Map).cast<String, dynamic>() : <String, dynamic>{};
      final latestRequest = responses[1] is Map ? (responses[1] as Map).cast<String, dynamic>() : <String, dynamic>{};

      final studentInfo = profile['studentInfo'] is Map ? (profile['studentInfo'] as Map).cast<String, dynamic>() : {};
      final attendance = studentInfo['attendance'] is Map ? (studentInfo['attendance'] as Map).cast<String, dynamic>() : {};
      final totalDays = (attendance['totalDays'] as num?)?.toDouble() ?? 0;
      final presentDays = (attendance['presentDays'] as num?)?.toDouble() ?? 0;
      final attendancePct = totalDays > 0 ? '${((presentDays / totalDays) * 100).round()}%' : '0%';

      final parents = studentInfo['parents'] is List ? studentInfo['parents'] as List : const [];
      final primaryParent = (parents.isNotEmpty && parents.first is Map && (parents.first as Map)['parent'] is Map)
          ? ((parents.first as Map)['parent'] as Map).cast<String, dynamic>()
          : <String, dynamic>{};

      String formatDate(dynamic value) {
        final dt = DateTime.tryParse('$value');
        if (dt == null) return '$value'.isEmpty ? '-' : '$value';
        return dt.toIso8601String().substring(0, 10);
      }

      final address = studentInfo['address'] is Map ? (studentInfo['address'] as Map).cast<String, dynamic>() : {};
      final formattedAddress = [
        '${address['street'] ?? ''}',
        '${address['city'] ?? ''}',
        '${address['state'] ?? ''}',
        '${address['zipCode'] ?? ''}',
        '${address['country'] ?? ''}',
      ].where((item) => item.trim().isNotEmpty).join(', ');

      final request = latestRequest['request'] is Map ? (latestRequest['request'] as Map).cast<String, dynamic>() : {};
      final requestPayload = request['payload'] is Map ? (request['payload'] as Map).cast<String, dynamic>() : {};

      _student = {
        'id': profile['id'] ?? profile['_id'] ?? '',
        'fullName': profile['fullName'] ?? '${profile['firstName'] ?? ''} ${profile['lastName'] ?? ''}',
        'grade': '${studentInfo['grade'] ?? 'Unassigned'} ${studentInfo['section'] ?? ''}'.trim(),
        'rollNo': studentInfo['studentId'] ?? '-',
        'address': formattedAddress.isEmpty ? '-' : formattedAddress,
        'guardianName': '${primaryParent['firstName'] ?? ''} ${primaryParent['lastName'] ?? ''}'.trim(),
        'guardianContact': primaryParent['phoneNumber'] ?? '-',
        'email': profile['email'] ?? '-',
        'phone': profile['phoneNumber'] ?? '-',
        'dateOfBirth': formatDate(studentInfo['dateOfBirth']),
        'bloodGroup': studentInfo['bloodGroup'] ?? '-',
        'emergencyContact':
            '${(studentInfo['emergencyContact'] is Map ? (studentInfo['emergencyContact'] as Map)['name'] : '') ?? ''}'
            ' - '
            '${(studentInfo['emergencyContact'] is Map ? (studentInfo['emergencyContact'] as Map)['phone'] : '') ?? ''}',
        'academicYear': studentInfo['academicYear'] ?? '-',
        'enrollmentDate': formatDate(studentInfo['createdAt']),
        'attendance': attendancePct,
        'overallGrade': (studentInfo['performance'] is Map ? (studentInfo['performance'] as Map)['overallGrade'] : null) ?? 'N/A',
        'gpa': '${(studentInfo['performance'] is Map ? (studentInfo['performance'] as Map)['gpa'] : 0) ?? 0}',
        'profilePicture': profile['profilePicture'] ?? requestPayload['profilePicture'] ?? '',
        'pendingEditStatus': (profile['pendingProfileEditRequest'] is Map
            ? (profile['pendingProfileEditRequest'] as Map)['status']
            : ''),
      };
    } catch (error) {
      _error = '$error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Student Profile')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_loading) const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator())),
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
                color: const Color(0xFF8B5CF6),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      CircleAvatar(
                        radius: 44,
                        backgroundColor: Colors.white24,
                        backgroundImage: ('${_student['profilePicture']}'.trim().isNotEmpty)
                            ? NetworkImage('${_student['profilePicture']}')
                            : null,
                        child: ('${_student['profilePicture']}'.trim().isNotEmpty)
                            ? null
                            : const Text('ST',
                                style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                      ),
                      const SizedBox(height: 10),
                      Text('${_student['fullName'] ?? ''}',
                          style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      Text('${_student['grade'] ?? ''}',
                          style: const TextStyle(color: Color(0xFFEDE9FE), fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text('ID: ${_student['id'] ?? ''}',
                          style: const TextStyle(color: Color(0xFFD1D5DB), fontWeight: FontWeight.w500)),
                    ],
                  ),
                ),
              ),
              if ('${_student['pendingEditStatus']}'.trim().isNotEmpty)
                Card(
                  color: const Color(0xFFEFF6FF),
                  child: Padding(
                    padding: const EdgeInsets.all(10),
                    child: Text(
                      'Profile edit request: ${'${_student['pendingEditStatus']}'.toUpperCase()}',
                      style: const TextStyle(color: Color(0xFF1E3A8A), fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: _Stat(label: 'Attendance', value: '${_student['attendance']}', color: const Color(0xFF10B981))),
                  const SizedBox(width: 8),
                  Expanded(child: _Stat(label: 'Overall Grade', value: '${_student['overallGrade']}', color: const Color(0xFF3B82F6))),
                  const SizedBox(width: 8),
                  Expanded(child: _Stat(label: 'GPA', value: '${_student['gpa']}', color: const Color(0xFFF59E0B))),
                ],
              ),
              const SizedBox(height: 12),
              _InfoSection(
                title: 'Personal Information',
                rows: [
                  ['Full Name', '${_student['fullName'] ?? '-'}'],
                  ['Date of Birth', '${_student['dateOfBirth'] ?? '-'}'],
                  ['Blood Group', '${_student['bloodGroup'] ?? '-'}'],
                  ['Address', '${_student['address'] ?? '-'}'],
                  ['Email', '${_student['email'] ?? '-'}'],
                  ['Phone', '${_student['phone'] ?? '-'}'],
                ],
              ),
              const SizedBox(height: 10),
              _InfoSection(
                title: 'Academic Information',
                rows: [
                  ['Grade', '${_student['grade'] ?? '-'}'],
                  ['Roll Number', '${_student['rollNo'] ?? '-'}'],
                  ['Academic Year', '${_student['academicYear'] ?? '-'}'],
                  ['Enrollment Date', '${_student['enrollmentDate'] ?? '-'}'],
                ],
              ),
              const SizedBox(height: 10),
              _InfoSection(
                title: 'Guardian Information',
                rows: [
                  ['Guardian Name', '${_student['guardianName'] ?? '-'}'],
                  ['Guardian Contact', '${_student['guardianContact'] ?? '-'}'],
                  ['Emergency Contact', '${_student['emergencyContact'] ?? '-'}'],
                ],
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => ScreenFactory.open(context, widget.auth, '/profile-edit'),
                child: const Text('Request Profile Edit'),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () => ScreenFactory.open(context, widget.auth, '/notifications'),
                child: const Text('Notifications'),
              ),
            ]
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: color)),
            const SizedBox(height: 4),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
          ],
        ),
      ),
    );
  }
}

class _InfoSection extends StatelessWidget {
  const _InfoSection({required this.title, required this.rows});
  final String title;
  final List<List<String>> rows;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            ...rows.map(
              (row) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(row.first, style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w700)),
                    ),
                    Expanded(
                      child: Text(
                        row.last,
                        textAlign: TextAlign.right,
                        style: const TextStyle(color: Color(0xFF1E293B), fontWeight: FontWeight.w600),
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
