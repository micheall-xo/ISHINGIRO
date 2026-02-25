import 'package:flutter/material.dart';


import '../core/api_client.dart';
import '../navigation/screen_factory.dart';
import '../state/auth_controller.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    required this.role,
    required this.auth,
    required this.onBack,
  });

  final String role;
  final AuthController auth;
  final VoidCallback onBack;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _onLogin() async {
    final identifier = _identifierController.text.trim();
    final password = _passwordController.text;
    if (identifier.isEmpty || password.isEmpty) {
      _show('Missing info', 'Enter username/email and password');
      return;
    }
    setState(() => _loading = true);
    try {
      await widget.auth.signIn(identifier: identifier, password: password);
    } on ApiException catch (error) {
      _show('Login failed', error.message);
    } catch (error) {
      _show('Login failed', '$error');
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
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final roleLabel = widget.role.toUpperCase();
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          onPressed: _loading ? null : widget.onBack,
          icon: const Icon(Icons.arrow_back),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Login as $roleLabel',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 18),
            TextField(
              controller: _identifierController,
              enabled: !_loading,
              decoration: const InputDecoration(labelText: 'Username or Email'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _passwordController,
              enabled: !_loading,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Password'),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _loading ? null : _onLogin,
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF1D4ED8),
                minimumSize: const Size.fromHeight(50),
              ),
              child: _loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Login'),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: _loading ? null : () => ScreenFactory.open(context, widget.auth, '/register'),
              child: const Text('Register'),
            ),
          ],
        ),
      ),
    );
  }
}
