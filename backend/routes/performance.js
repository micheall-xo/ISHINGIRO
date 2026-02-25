const express = require('express');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Get student performance
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Check if user is authorized to view this student's performance
    if (req.user.role === 'student' && req.user.userId !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const student = await Student.findOne({ studentId })
      .populate('user', 'firstName lastName')
      .populate('subjects.subject', 'name')
      .populate('subjects.teacher', 'firstName lastName');

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Calculate GPA
    const gpa = student.calculateGPA();

    res.json({
      student: {
        id: student._id,
        studentId: student.studentId,
        name: `${student.user.firstName} ${student.user.lastName}`,
        grade: student.grade,
        section: student.section
      },
      performance: {
        overallGrade: student.performance.overallGrade,
        gpa: gpa,
        subjects: student.subjects.map(subject => ({
          subject: subject.subject ? subject.subject.name : 'Unknown',
          teacher: subject.teacher ? `${subject.teacher.firstName} ${subject.teacher.lastName}` : 'Unknown',
          grade: subject.grade || 'N/A',
          attendance: subject.attendance || 0
        }))
      }
    });

  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({
      error: 'Failed to fetch performance',
      message: error.message
    });
  }
});

// Update student grade for a subject
router.put('/student/:studentId/subject/:subjectId', authenticateToken, async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    const { grade, attendance } = req.body;
    
    // Only teachers and admins can update grades
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Find and update the subject
    const subjectIndex = student.subjects.findIndex(
      sub => sub.subject.toString() === subjectId
    );

    if (subjectIndex === -1) {
      return res.status(404).json({ error: 'Subject not found for this student' });
    }

    // Update grade and attendance
    if (grade !== undefined) {
      student.subjects[subjectIndex].grade = grade;
    }
    if (attendance !== undefined) {
      student.subjects[subjectIndex].attendance = attendance;
    }

    // Recalculate GPA
    const newGpa = student.calculateGPA();
    student.performance.gpa = newGpa;

    // Update overall grade based on GPA
    if (newGpa >= 3.7) {
      student.performance.overallGrade = 'A';
    } else if (newGpa >= 3.0) {
      student.performance.overallGrade = 'B';
    } else if (newGpa >= 2.0) {
      student.performance.overallGrade = 'C';
    } else if (newGpa >= 1.0) {
      student.performance.overallGrade = 'D';
    } else {
      student.performance.overallGrade = 'F';
    }

    await student.save();

    res.json({
      message: 'Grade updated successfully',
      performance: {
        overallGrade: student.performance.overallGrade,
        gpa: student.performance.gpa,
        updatedSubject: student.subjects[subjectIndex]
      }
    });

  } catch (error) {
    console.error('Update grade error:', error);
    res.status(500).json({
      error: 'Failed to update grade',
      message: error.message
    });
  }
});

// Get performance summary for a class/grade
router.get('/class/:grade', authenticateToken, async (req, res) => {
  try {
    const { grade } = req.params;
    const { subject } = req.query;
    
    // Only teachers and admins can view class performance
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = { grade, isActive: true };
    
    // If subject is specified, filter by subject
    if (subject) {
      query['subjects.subject'] = subject;
    }

    const students = await Student.find(query)
      .populate('user', 'firstName lastName')
      .populate('subjects.subject', 'name');

    const performanceSummary = students.map(student => {
      const gpa = student.calculateGPA();
      return {
        id: student._id,
        studentId: student.studentId,
        name: `${student.user.firstName} ${student.user.lastName}`,
        overallGrade: student.performance.overallGrade,
        gpa: gpa,
        attendance: student.attendance.attendancePercentage,
        subjects: student.subjects.map(sub => ({
          subject: sub.subject ? sub.subject.name : 'Unknown',
          grade: sub.grade || 'N/A',
          attendance: sub.attendance || 0
        }))
      };
    });

    // Sort by GPA (highest first)
    performanceSummary.sort((a, b) => b.gpa - a.gpa);

    // Calculate class statistics
    const totalStudents = performanceSummary.length;
    const averageGpa = totalStudents > 0 
      ? performanceSummary.reduce((sum, student) => sum + student.gpa, 0) / totalStudents 
      : 0;
    
    const gradeDistribution = {
      A: performanceSummary.filter(s => s.overallGrade === 'A').length,
      B: performanceSummary.filter(s => s.overallGrade === 'B').length,
      C: performanceSummary.filter(s => s.overallGrade === 'C').length,
      D: performanceSummary.filter(s => s.overallGrade === 'D').length,
      F: performanceSummary.filter(s => s.overallGrade === 'F').length
    };

    res.json({
      grade,
      totalStudents,
      averageGpa: Math.round(averageGpa * 100) / 100,
      gradeDistribution,
      students: performanceSummary
    });

  } catch (error) {
    console.error('Get class performance error:', error);
    res.status(500).json({
      error: 'Failed to fetch class performance',
      message: error.message
    });
  }
});

// Get performance trends for a student
router.get('/student/:studentId/trends', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { period = 'month' } = req.query;
    
    // Check if user is authorized to view this student's trends
    if (req.user.role === 'student' && req.user.userId !== studentId) {
      return res.status(404).json({ error: 'Access denied' });
    }

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // This would typically involve historical data
    // For now, return current performance with trend indicators
    const currentGpa = student.calculateGPA();
    
    // Mock trend data (in a real app, this would come from historical records)
    const trends = {
      gpa: {
        current: currentGpa,
        trend: 'stable', // stable, improving, declining
        change: 0
      },
      attendance: {
        current: student.attendance.attendancePercentage,
        trend: 'stable',
        change: 0
      },
      subjects: student.subjects.map(subject => ({
        subject: subject.subject ? subject.subject.name : 'Unknown',
        grade: subject.grade || 'N/A',
        attendance: subject.attendance || 0,
        trend: 'stable'
      }))
    };

    res.json({
      student: {
        id: student._id,
        studentId: student.studentId,
        name: `${student.user.firstName} ${student.user.lastName}`
      },
      trends,
      period
    });

  } catch (error) {
    console.error('Get performance trends error:', error);
    res.status(500).json({
      error: 'Failed to fetch performance trends',
      message: error.message
    });
  }
});

// Add subject to student
router.post('/student/:studentId/subjects', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { subjectId, teacherId, grade, attendance } = req.body;
    
    // Only teachers and admins can add subjects
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if subject already exists
    const existingSubject = student.subjects.find(
      sub => sub.subject.toString() === subjectId
    );

    if (existingSubject) {
      return res.status(400).json({ error: 'Subject already exists for this student' });
    }

    // Add new subject
    student.subjects.push({
      subject: subjectId,
      teacher: teacherId,
      grade: grade || null,
      attendance: attendance || 0
    });

    await student.save();

    res.json({
      message: 'Subject added successfully',
      subject: {
        subject: subjectId,
        teacher: teacherId,
        grade,
        attendance
      }
    });

  } catch (error) {
    console.error('Add subject error:', error);
    res.status(500).json({
      error: 'Failed to add subject',
      message: error.message
    });
  }
});

// Remove subject from student
router.delete('/student/:studentId/subjects/:subjectId', authenticateToken, async (req, res) => {
  try {
    const { studentId, subjectId } = req.params;
    
    // Only teachers and admins can remove subjects
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Remove subject
    student.subjects = student.subjects.filter(
      sub => sub.subject.toString() !== subjectId
    );

    // Recalculate GPA
    const newGpa = student.calculateGPA();
    student.performance.gpa = newGpa;

    await student.save();

    res.json({
      message: 'Subject removed successfully',
      newGpa
    });

  } catch (error) {
    console.error('Remove subject error:', error);
    res.status(500).json({
      error: 'Failed to remove subject',
      message: error.message
    });
  }
});

module.exports = router;
