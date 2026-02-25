import 'package:flutter/material.dart';

import 'core/app_theme.dart';
import 'screens/boot_screen.dart';
import 'screens/choose_role_screen.dart';
import 'screens/login_screen.dart';
import 'screens/role_home_screen.dart';
import 'state/auth_controller.dart';

class SchoolApp extends StatefulWidget {
  const SchoolApp({super.key});

  @override
  State<SchoolApp> createState() => _SchoolAppState();
}

class _SchoolAppState extends State<SchoolApp> {
  late final AuthController _auth;
  String? _selectedRole;

  @override
  void initState() {
    super.initState();
    _auth = AuthController();
    _auth.bootstrap();
  }

  @override
  void dispose() {
    _auth.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SchoolApp',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.build(),
      home: AnimatedBuilder(
        animation: _auth,
        builder: (context, _) {
          if (_auth.isBooting) return const BootScreen();
          if (_auth.isAuthenticated) return RoleHomeScreen(auth: _auth);
          if (_selectedRole == null) {
            return ChooseRoleScreen(
              onRoleSelected: (role) => setState(() => _selectedRole = role),
            );
          }
          return LoginScreen(
            role: _selectedRole!,
            auth: _auth,
            onBack: () => setState(() => _selectedRole = null),
          );
        },
      ),
    );
  }
}
