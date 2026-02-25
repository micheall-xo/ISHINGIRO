const express = require('express');
const router = express.Router();

// Demo data for testing without MongoDB
const demoData = {
  students: [
    {
      id: 'demo_student_1',
      studentId: 'ST001',
      name: 'Micheal angelo',
      grade: '5A',
      section: 'A',
      attendance: {
        totalDays: 20,
        presentDays: 18,
        absentDays: 2,
        lateDays: 0,
        attendancePercentage: 90
      },
      performance: {
        overallGrade: 'A',
        gpa: 3.8
      },
      pocketMoney: {
        balance: 150.00,
        transactions: [
          {
            type: 'topup',
            amount: 200.00,
            description: 'Monthly allowance',
            date: new Date('2024-01-01'),
            balance: 200.00
          },
          {
            type: 'spent',
            amount: 50.00,
            description: 'School supplies',
            date: new Date('2024-01-15'),
            balance: 150.00
          }
        ]
      }
    },
    {
      id: 'demo_student_2',
      studentId: 'ST002',
      name: 'Byiringiro dope',
      grade: '5A',
      section: 'A',
      attendance: {
        totalDays: 20,
        presentDays: 19,
        absentDays: 1,
        lateDays: 0,
        attendancePercentage: 95
      },
      performance: {
        overallGrade: 'A+',
        gpa: 4.0
      },
      pocketMoney: {
        balance: 75.00,
        transactions: [
          {
            type: 'topup',
            amount: 150.00,
            description: 'Monthly allowance',
            date: new Date('2024-01-01'),
            balance: 150.00
          },
          {
            type: 'spent',
            amount: 75.00,
            description: 'Library books',
            date: new Date('2024-01-10'),
            balance: 75.00
          }
        ]
      }
    }
  ],
  teachers: [
    {
      id: 'demo_teacher_1',
      name: 'Mr. alexadre',
      subject: 'Mathematics',
      grade: '5A'
    },
    {
      id: 'demo_teacher_2',
      name: 'Mr. idk',
      subject: 'Science',
      grade: '5A'
    }
  ]
};

// Demo routes that work without MongoDB
router.get('/students', (req, res) => {
  res.json({
    message: 'Demo mode - Sample student data',
    students: demoData.students,
    note: 'This is demo data. Connect MongoDB for real data.'
  });
});

router.get('/students/:id', (req, res) => {
  const student = demoData.students.find(s => s.id === req.params.id);
  if (student) {
    res.json({
      message: 'Demo mode - Sample student data',
      student,
      note: 'This is demo data. Connect MongoDB for real data.'
    });
  } else {
    res.status(404).json({ error: 'Student not found' });
  }
});

router.get('/teachers', (req, res) => {
  res.json({
    message: 'Demo mode - Sample teacher data',
    teachers: demoData.teachers,
    note: 'This is demo data. Connect MongoDB for real data.'
  });
});

router.get('/attendance/summary', (req, res) => {
  const summary = demoData.students.map(student => ({
    studentId: student.studentId,
    name: student.name,
    attendance: student.attendance
  }));

  res.json({
    message: 'Demo mode - Sample attendance data',
    summary,
    note: 'This is demo data. Connect MongoDB for real data.'
  });
});

router.get('/performance/class/5A', (req, res) => {
  const performance = demoData.students.map(student => ({
    studentId: student.studentId,
    name: student.name,
    performance: student.performance,
    attendance: student.attendance.attendancePercentage
  }));

  res.json({
    message: 'Demo mode - Sample performance data',
    grade: '5A',
    totalStudents: performance.length,
    averageGpa: 3.9,
    students: performance,
    note: 'This is demo data. Connect MongoDB for real data.'
  });
});

router.get('/pocket-money/parent-summary', (req, res) => {
  const summary = demoData.students.map(student => ({
    id: student.id,
    studentId: student.studentId,
    name: student.name,
    grade: student.grade,
    section: student.section,
    pocketMoney: student.pocketMoney
  }));

  res.json({
    message: 'Demo mode - Sample pocket money data',
    summary,
    note: 'This is demo data. Connect MongoDB for real data.'
  });
});

module.exports = router;
