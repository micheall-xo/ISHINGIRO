import 'package:flutter/material.dart';

class ChooseRoleScreen extends StatelessWidget {
  const ChooseRoleScreen({
    super.key,
    required this.onRoleSelected,
  });

  final ValueChanged<String> onRoleSelected;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                'Choose your option',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _RoleCard(label: 'Student', onTap: () => onRoleSelected('student')),
                  const SizedBox(width: 16),
                  _RoleCard(label: 'Teacher', onTap: () => onRoleSelected('teacher')),
                ],
              ),
              const SizedBox(height: 16),
              _RoleCard(
                label: 'Admin',
                width: 150,
                onTap: () => onRoleSelected('admin'),
              ),
              const SizedBox(height: 16),
              _RoleCard(
                label: 'Guest',
                width: 320,
                onTap: () => onRoleSelected('guest'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.label,
    required this.onTap,
    this.width = 140,
  });

  final String label;
  final VoidCallback onTap;
  final double width;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: 90,
      child: FilledButton(
        style: FilledButton.styleFrom(
          backgroundColor: const Color(0xFF1D4ED8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        ),
        onPressed: onTap,
        child: Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white),
        ),
      ),
    );
  }
}
