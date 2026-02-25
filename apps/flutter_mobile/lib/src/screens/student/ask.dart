import 'package:flutter/material.dart';

import '../../state/auth_controller.dart';
 
class StudentAskScreen extends StatefulWidget {
  const StudentAskScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<StudentAskScreen> createState() => _StudentAskScreenState();
}

class _StudentAskScreenState extends State<StudentAskScreen> {
  bool _loading = true;
  bool _saving = false;
  bool _showForm = false;
  String _error = '';
  String _search = '';
  String _category = 'all';
  String _currentUserId = '';
  List<Map<String, dynamic>> _posts = [];
  List<String> _subjects = [];
  List<String> _categories = ['all'];
  final Set<String> _openReply = {};
  final Set<String> _openDetails = {};
  final Map<String, TextEditingController> _replyCtrls = {};

  final _titleCtrl = TextEditingController();
  final _contentCtrl = TextEditingController();
  final _tagsCtrl = TextEditingController();
  String _formSubject = '';
  String _editingPostId = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _contentCtrl.dispose();
    _tagsCtrl.dispose();
    for (final ctrl in _replyCtrls.values) {
      ctrl.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final data = await Future.wait([
        widget.auth.api.get('/teacher-content/qa-posts'),
        widget.auth.api.get('/teacher-content/qa-subject-options'),
        widget.auth.api.get('/auth/profile'),
      ]);
      final postsRaw = data[0] is Map && (data[0] as Map)['items'] is List ? (data[0] as Map)['items'] as List : const [];
      final optionsRaw =
          data[1] is Map && (data[1] as Map)['subjects'] is List ? (data[1] as Map)['subjects'] as List : const [];
      final profile = data[2] is Map ? data[2] as Map : <dynamic, dynamic>{};

      _posts = postsRaw.map((item) => (item as Map).cast<String, dynamic>()).toList();
      _subjects = optionsRaw.map((item) => '$item').where((item) => item.isNotEmpty).toList();
      _currentUserId = '${profile['id'] ?? profile['_id'] ?? ''}';

      final dynamicCategories =
          _posts.map((item) => '${item['category'] ?? ''}').where((item) => item.isNotEmpty).toSet().toList();
      _categories = ['all', ...dynamicCategories];
    } catch (error) {
      _error = '$error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  TextEditingController _replyControllerFor(String postId) {
    return _replyCtrls.putIfAbsent(postId, () => TextEditingController());
  }

  Future<void> _submitPost() async {
    if (_titleCtrl.text.trim().isEmpty || _contentCtrl.text.trim().isEmpty) {
      _message('Missing fields', 'Title and content are required.');
      return;
    }
    if (_formSubject.trim().isEmpty) {
      _message('Missing subject', 'Please choose a subject.');
      return;
    }

    setState(() => _saving = true);
    try {
      final tags = _tagsCtrl.text.split(',').map((tag) => tag.trim()).where((tag) => tag.isNotEmpty).toList();
      if (_editingPostId.isEmpty) {
        await widget.auth.api.post('/teacher-content/qa-posts', body: {
          'type': 'question',
          'title': _titleCtrl.text.trim(),
          'subject': _formSubject,
          'category': _formSubject,
          'content': _contentCtrl.text.trim(),
          'tags': tags,
          'attachments': [],
        });
      } else {
        await widget.auth.api.put('/teacher-content/qa-posts/$_editingPostId', body: {
          'type': 'question',
          'title': _titleCtrl.text.trim(),
          'subject': _formSubject,
          'category': _formSubject,
          'content': _contentCtrl.text.trim(),
          'tags': tags,
          'attachments': [],
        });
      }
      _titleCtrl.clear();
      _contentCtrl.clear();
      _tagsCtrl.clear();
      _formSubject = '';
      _editingPostId = '';
      _showForm = false;
      await _load();
      _message('Success', 'Post submitted.');
    } catch (error) {
      _message('Post failed', '$error');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _submitReply(String postId) async {
    final ctrl = _replyControllerFor(postId);
    final content = ctrl.text.trim();
    if (content.isEmpty) {
      _message('Reply', 'Add reply text.');
      return;
    }
    try {
      await widget.auth.api.post('/teacher-content/qa-posts/$postId/replies', body: {
        'content': content,
        'attachment': null,
      });
      ctrl.clear();
      await _load();
    } catch (error) {
      _message('Reply failed', '$error');
    }
  }

  Future<void> _incrementView(String postId) async {
    try {
      await widget.auth.api.post('/teacher-content/qa-posts/$postId/view', body: {});
    } catch (_) {}
  }

  void _edit(Map<String, dynamic> post) {
    _editingPostId = '${post['id'] ?? ''}';
    _titleCtrl.text = '${post['title'] ?? ''}';
    _contentCtrl.text = '${post['content'] ?? ''}';
    _tagsCtrl.text = (post['tags'] is List) ? (post['tags'] as List).join(',') : '';
    _formSubject = '${post['subject'] ?? ''}';
    setState(() => _showForm = true);
  }

  void _message(String title, String message) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _posts.where((item) {
      final title = '${item['title'] ?? ''}'.toLowerCase();
      final content = '${item['content'] ?? ''}'.toLowerCase();
      final query = _search.toLowerCase();
      final matchesSearch = title.contains(query) || content.contains(query);
      final matchesCategory = _category == 'all' || '${item['category'] ?? ''}' == _category;
      return matchesSearch && matchesCategory;
    }).toList();

    final answered = _posts.where((item) => '${item['status']}' == 'answered').length;
    final pending = _posts.length - answered;

    return Scaffold(
      appBar: AppBar(title: const Text('Ask Questions')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                Expanded(child: _MiniStat(label: 'Answered', value: '$answered', color: const Color(0xFF10B981))),
                const SizedBox(width: 8),
                Expanded(child: _MiniStat(label: 'Pending', value: '$pending', color: const Color(0xFFF59E0B))),
              ],
            ),
            const SizedBox(height: 10),
            FilledButton(
              onPressed: () => setState(() => _showForm = !_showForm),
              child: Text(_showForm ? 'Close Form' : 'Ask a New Question'),
            ),
            if (_showForm) ...[
              const SizedBox(height: 10),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      TextField(controller: _titleCtrl, decoration: const InputDecoration(labelText: 'Title')),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        value: _formSubject.isEmpty ? null : _formSubject,
                        items: _subjects.map((item) => DropdownMenuItem(value: item, child: Text(item))).toList(),
                        onChanged: (value) => setState(() => _formSubject = value ?? ''),
                        decoration: const InputDecoration(labelText: 'Subject'),
                      ),
                      const SizedBox(height: 8),
                      TextField(controller: _tagsCtrl, decoration: const InputDecoration(labelText: 'Tags (csv)')),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _contentCtrl,
                        minLines: 3,
                        maxLines: 5,
                        decoration: const InputDecoration(labelText: 'Question'),
                      ),
                      const SizedBox(height: 10),
                      FilledButton(
                        onPressed: _saving ? null : _submitPost,
                        child: Text(_saving ? 'Saving...' : (_editingPostId.isEmpty ? 'Post' : 'Update')),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 10),
            TextField(
              decoration: const InputDecoration(labelText: 'Search questions'),
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
                          selected: _category == cat,
                          label: Text(cat == 'all' ? 'All' : cat),
                          onSelected: (_) => setState(() => _category = cat),
                        ),
                      ),
                    )
                    .toList(),
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
            ...filtered.map(
              (post) {
                final postId = '${post['id'] ?? ''}';
                final replies = post['replies'] is List ? post['replies'] as List : const [];
                final isOwner = '${(post['author'] is Map ? (post['author'] as Map)['id'] : '')}' == _currentUserId;
                return Padding(
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
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('${post['title'] ?? ''}',
                                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                                    const SizedBox(height: 3),
                                    Text('${post['subject'] ?? 'General'}',
                                        style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w700)),
                                  ],
                                ),
                              ),
                              _StatusPill(status: '${post['status'] ?? 'pending'}'),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text('${post['content'] ?? ''}'),
                          const SizedBox(height: 8),
                          Text(
                            'Asked by ${(post['author'] is Map ? (post['author'] as Map)['name'] : 'User') ?? 'User'}'
                            ' | ${(post['createdAt'] ?? '').toString().substring(0, ((post['createdAt'] ?? '').toString().length >= 10) ? 10 : (post['createdAt'] ?? '').toString().length)}'
                            ' | Replies ${replies.length} | Views ${post['views'] ?? 0}',
                            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              OutlinedButton(
                                onPressed: () async {
                                  await _incrementView(postId);
                                  setState(() {
                                    if (_openDetails.contains(postId)) {
                                      _openDetails.remove(postId);
                                    } else {
                                      _openDetails.add(postId);
                                    }
                                  });
                                },
                                child: const Text('View Details'),
                              ),
                              const SizedBox(width: 8),
                              FilledButton(
                                onPressed: () {
                                  setState(() {
                                    if (_openReply.contains(postId)) {
                                      _openReply.remove(postId);
                                    } else {
                                      _openReply.add(postId);
                                    }
                                  });
                                },
                                child: Text('${post['status'] == 'answered' ? 'View Answers' : 'Answer'}'),
                              ),
                              if (isOwner) ...[
                                const SizedBox(width: 8),
                                OutlinedButton(onPressed: () => _edit(post), child: const Text('Edit')),
                              ]
                            ],
                          ),
                          if (_openDetails.contains(postId)) ...[
                            const SizedBox(height: 8),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Text(
                                'Category: ${post['category'] ?? '-'}\n'
                                'Status: ${post['status'] ?? '-'}\n'
                                'Updated: ${post['updatedAt'] ?? post['createdAt'] ?? '-'}',
                              ),
                            ),
                          ],
                          if (_openReply.contains(postId)) ...[
                            const SizedBox(height: 8),
                            ...replies.map(
                              (reply) => Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF0FDF4),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: const Color(0xFFBBF7D0)),
                                  ),
                                  child: Text(
                                    '${(reply is Map && reply['author'] is Map ? (reply['author'] as Map)['name'] : 'User') ?? 'User'}: '
                                    '${reply is Map ? (reply['content'] ?? 'File response') : ''}',
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 6),
                            TextField(
                              controller: _replyControllerFor(postId),
                              minLines: 2,
                              maxLines: 4,
                              decoration: const InputDecoration(labelText: 'Write your reply'),
                            ),
                            const SizedBox(height: 8),
                            FilledButton(onPressed: () => _submitReply(postId), child: const Text('Send Reply')),
                          ],
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

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value, required this.color});
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
            Text(value, style: TextStyle(fontSize: 22, color: color, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
          ],
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'answered' => const Color(0xFF10B981),
      'pending' => const Color(0xFFF59E0B),
      'closed' => const Color(0xFF64748B),
      _ => const Color(0xFF64748B)
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(999)),
      child: Text(status.toUpperCase(), style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700)),
    );
  }
}
