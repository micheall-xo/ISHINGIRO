import 'dart:convert';

import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../../state/auth_controller.dart';

class EndpointViewScreen extends StatefulWidget {
  const EndpointViewScreen({
    super.key,
    required this.title,
    required this.auth,
    this.endpoints = const [],
    this.description = '',
  });

  final String title;
  final AuthController auth;
  final List<String> endpoints;
  final String description;

  @override
  State<EndpointViewScreen> createState() => _EndpointViewScreenState();
}

class _EndpointViewScreenState extends State<EndpointViewScreen> {
  bool _loading = true;
  String _error = '';
  final Map<String, dynamic> _data = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
      _data.clear();
    });
    try {
      for (final endpoint in widget.endpoints) {
        final response = await widget.auth.api.get(endpoint);
        _data[endpoint] = response;
      }
    } catch (error) {
      _error = '$error';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (widget.description.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(widget.description),
              ),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(20),
                child: Center(child: CircularProgressIndicator()),
              ),
            if (!_loading && _error.isNotEmpty)
              Card(
                color: const Color(0xFFFEF2F2),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(_error, style: const TextStyle(color: Color(0xFF991B1B))),
                ),
              ),
            if (!_loading && _error.isEmpty && widget.endpoints.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(14),
                  child: Text('Screen created. No data endpoint configured for this page yet.'),
                ),
              ),
            ..._data.entries.map(
              (entry) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          entry.key,
                          style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF1D4ED8)),
                        ),
                        const SizedBox(height: 8),
                        SelectableText(
                          _pretty(entry.value),
                          style: const TextStyle(fontSize: 12, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _pretty(dynamic value) {
    if (value == null) return '';
    try {
      return const JsonEncoder.withIndent('  ').convert(value);
    } catch (_) {
      return '$value';
    }
  }
}

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _username = TextEditingController();
  final _email = TextEditingController();
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  String _role = 'student';
  bool _loading = false;

  @override
  void dispose() {
    _username.dispose();
    _email.dispose();
    _firstName.dispose();
    _lastName.dispose();
    _phone.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_username.text.trim().isEmpty ||
        _email.text.trim().isEmpty ||
        _firstName.text.trim().isEmpty ||
        _lastName.text.trim().isEmpty ||
        _password.text.isEmpty) {
      _show('Missing fields', 'Please complete all required fields.');
      return;
    }

    setState(() => _loading = true);
    try {
      await widget.auth.api.post(
        '/auth/register',
        auth: false,
        body: {
          'username': _username.text.trim(),
          'email': _email.text.trim(),
          'password': _password.text,
          'firstName': _firstName.text.trim(),
          'lastName': _lastName.text.trim(),
          'role': _role,
          'phoneNumber': _phone.text.trim(),
        },
      );
      if (!mounted) return;
      _show('Success', 'Registration submitted. You can log in now.');
    } on ApiException catch (error) {
      _show('Registration failed', error.message);
    } catch (error) {
      _show('Registration failed', '$error');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _show(String title, String message) {
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
    return Scaffold(
      appBar: AppBar(title: const Text('Register')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(controller: _username, decoration: const InputDecoration(labelText: 'Username *')),
          const SizedBox(height: 10),
          TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email *')),
          const SizedBox(height: 10),
          TextField(controller: _firstName, decoration: const InputDecoration(labelText: 'First Name *')),
          const SizedBox(height: 10),
          TextField(controller: _lastName, decoration: const InputDecoration(labelText: 'Last Name *')),
          const SizedBox(height: 10),
          TextField(controller: _phone, decoration: const InputDecoration(labelText: 'Phone Number')),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            value: _role,
            items: const ['student', 'teacher', 'guest', 'admin']
                .map((r) => DropdownMenuItem(value: r, child: Text(r.toUpperCase())))
                .toList(),
            onChanged: (value) => setState(() => _role = value ?? 'student'),
            decoration: const InputDecoration(labelText: 'Role *'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Password *'),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _loading ? null : _submit,
            child: _loading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Register'),
          ),
        ],
      ),
    );
  }
}
