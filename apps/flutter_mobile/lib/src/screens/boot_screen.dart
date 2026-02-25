import 'package:flutter/material.dart';

class BootScreen extends StatelessWidget {
  const BootScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: SizedBox(
          width: 220,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.school_rounded, size: 92, color: Color(0xFF1D4ED8)),
              SizedBox(height: 16),
              Text(
                'ISHINGIRO',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
              SizedBox(height: 10),
              CircularProgressIndicator(strokeWidth: 2.4),
            ],
          ),
        ),
      ),
    );
  }
}
