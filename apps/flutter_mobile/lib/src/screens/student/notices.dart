import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../state/auth_controller.dart';
 
class StudentNoticesScreen extends StatefulWidget {
  const StudentNoticesScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<StudentNoticesScreen> createState() => _StudentNoticesScreenState();
}

class _StudentNoticesScreenState extends State<StudentNoticesScreen> {
  bool _loading = true;
  String _error = '';
  String _search = '';
  String _category = 'all';
  List<Map<String, dynamic>> _notices = [];
  List<Map<String, dynamic>> _categories = [
    {'id': 'all', 'label': 'All'}
  ];

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
      final response = await widget.auth.api.get('/teacher-content/student/notices');
      final noticesRaw = response is Map && response['notices'] is List ? response['notices'] as List : const [];
      final categoriesRaw =
          response is Map && response['categories'] is List ? response['categories'] as List : const [];
      _notices = noticesRaw.map((item) => (item as Map).cast<String, dynamic>()).toList();
      _categories = categoriesRaw.isEmpty
          ? [
              {'id': 'all', 'label': 'All'}
            ]
          : categoriesRaw.map((item) => (item as Map).cast<String, dynamic>()).toList();
    } catch (error) {
      _error = '$error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markRead(Map<String, dynamic> notice) async {
    final id = '${notice['notificationId'] ?? ''}';
    final isRead = notice['isRead'] == true;
    if (id.isEmpty || isRead) return;
    try {
      await widget.auth.api.put('/notifications/$id/read');
      setState(() {
        _notices = _notices
            .map((item) => '${item['id']}' == '${notice['id']}' ? {...item, 'isRead': true} : item)
            .toList();
      });
    } catch (_) {}
  }

  Future<void> _share(Map<String, dynamic> notice) async {
    final content = '${notice['title'] ?? ''}\n\n${notice['content'] ?? ''}';
    await Clipboard.setData(ClipboardData(text: content));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Notice copied to clipboard')));
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _notices.where((notice) {
      final title = '${notice['title'] ?? ''}'.toLowerCase();
      final content = '${notice['content'] ?? ''}'.toLowerCase();
      final query = _search.toLowerCase();
      final matchesSearch = title.contains(query) || content.contains(query);
      final matchesCategory = _category == 'all' || '${notice['category'] ?? ''}' == _category;
      return matchesSearch && matchesCategory;
    }).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('School Notices')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextField(
              decoration: const InputDecoration(labelText: 'Search notices'),
              onChanged: (value) => setState(() => _search = value),
            ),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _categories
                    .map(
                      (cat) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          selected: _category == '${cat['id']}',
                          label: Text('${cat['label'] ?? cat['id']}'),
                          onSelected: (_) => setState(() => _category = '${cat['id']}'),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
            const SizedBox(height: 10),
            if (_loading) const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())),
            if (!_loading && _error.isNotEmpty)
              Card(
                color: const Color(0xFFFEF2F2),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(_error, style: const TextStyle(color: Color(0xFF991B1B))),
                ),
              ),
            if (!_loading && _error.isEmpty && filtered.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(12),
                  child: Text('No notices available.'),
                ),
              ),
            ...filtered.map(
              (notice) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${notice['title'] ?? 'Notice'}',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
                              ),
                            ),
                            if (!(notice['isRead'] == true))
                              const CircleAvatar(radius: 5, backgroundColor: Color(0xFFF59E0B)),
                          ],
                        ),
                        const SizedBox(height: 5),
                        Text('${notice['content'] ?? ''}', style: const TextStyle(color: Color(0xFF475569))),
                        const SizedBox(height: 8),
                        Text('By ${notice['author'] ?? 'School'} | ${notice['date'] ?? '-'} ${notice['time'] ?? ''}',
                            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            FilledButton(
                              onPressed: () => _markRead(notice),
                              child: const Text('Read More'),
                            ),
                            const SizedBox(width: 8),
                            OutlinedButton(
                              onPressed: () => _share(notice),
                              child: const Text('Share'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            )
          ],
        ),
      ),
    );
  }
}
