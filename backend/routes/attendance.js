const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const StudentLeave = require('../models/StudentLeave');

const router = express.Router();

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function startOfDay(inputDate) {
  const date = inputDate ? new Date(inputDate) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(start) {
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

function normalizeStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  return ['present', 'absent', 'late', 'excused'].includes(value) ? value : null;
}

function normalizeLeaveCategory(category) {
  const value = String(category || '').trim().toLowerCase();
  return ['sickness', 'family', 'emergency', 'other'].includes(value) ? value : 'other';
}

function incrementStatusCounter(student, status) {
  if (status === 'present') student.attendance.presentDays += 1;
  if (status === 'absent') student.attendance.absentDays += 1;
  if (status === 'late') {
    student.attendance.lateDays += 1;
    student.attendance.presentDays += 1;
  }
}

function decrementStatusCounter(student, status) {
  if (status === 'present') student.attendance.presentDays = Math.max(0, student.attendance.presentDays - 1);
  if (status === 'absent') student.attendance.absentDays = Math.max(0, student.attendance.absentDays - 1);
  if (status === 'late') {
    student.attendance.lateDays = Math.max(0, student.attendance.lateDays - 1);
    student.attendance.presentDays = Math.max(0, student.attendance.presentDays - 1);
  }
}

function applyAttendanceCounters(student, previousStatus, nextStatus, isNew) {
  if (isNew) {
    student.attendance.totalDays += 1;
    incrementStatusCounter(student, nextStatus);
    return;
  }
  if (previousStatus === nextStatus) return;
  decrementStatusCounter(student, previousStatus);
  incrementStatusCounter(student, nextStatus);
}

function mapLeaveRecord(leave) {
  if (!leave) return null;
  const approvedByName = leave.approvedBy
    ? `${leave.approvedBy.firstName || ''} ${leave.approvedBy.lastName || ''}`.trim()
    : '';
  return {
    id: String(leave._id),
    category: leave.category,
    reason: leave.reason || '',
    notes: leave.notes || '',
    status: leave.status,
    startDate: leave.startDate,
    endDate: leave.endDate,
    approvedByName,
    createdAt: leave.createdAt,
  };
}

async function notifyParentForAbsence(student, markedByRole, reason) {
  const parentId =
    student?.parentUser || (Array.isArray(student?.parents) ? student.parents[0]?.parent : null);
  if (!parentId) return false;

  const studentName =
    `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || student.studentId;
  const className = `${student.grade || ''}${student.section || ''}`;
  await Notification.create({
    user: parentId,
    type: 'attendance_absent',
    title: 'Student Absence Alert',
    body: `${studentName} was marked absent today in class ${className}.`,
    data: {
      studentObjectId: student._id,
      studentId: student.studentId,
      className,
      reason: reason || '',
      markedByRole,
    },
  });
  return true;
}

router.post('/', authenticateToken, async (req, res) => {
  try {
    const status = normalizeStatus(req.body.status);
    const studentId = String(req.body.studentId || '').trim();
    const studentObjectId = String(req.body.studentObjectId || '').trim();
    const notes = String(req.body.notes || '').trim();
    const reason = String(req.body.reason || '').trim();
    const effectiveDate = startOfDay(req.body.date);

    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only teachers and admins can mark attendance' });
    }
    if (!studentId || !status) {
      return res.status(400).json({ error: 'studentId and valid status are required' });
    }

    const student = await Student.findOne({ studentId }).populate('user', 'firstName lastName');
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const existing = await Attendance.findOne({
      student: student._id,
      date: { $gte: effectiveDate, $lt: endOfDay(effectiveDate) },
    });

    const previousStatus = existing?.status || null;
    const attendance = existing
      ? existing
      : new Attendance({
          student: student._id,
          date: effectiveDate,
          markedBy: req.user.userId,
          status,
        });

    attendance.status = status;
    attendance.notes = notes;
    attendance.reason = reason;
    attendance.markedBy = req.user.userId;
    attendance.date = effectiveDate;
    await attendance.save();

    applyAttendanceCounters(student, previousStatus, status, !existing);
    await student.save();

    const autoNotified = status === 'absent' ? await notifyParentForAbsence(student, req.user.role, reason) : false;

    res.json({
      message: 'Attendance saved',
      attendance: {
        id: attendance._id,
        studentId: student.studentId,
        studentName: `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim(),
        status: attendance.status,
        date: attendance.date,
        notes: attendance.notes,
        reason: attendance.reason,
      },
      autoNotifiedParent: autoNotified,
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance', message: error.message });
  }
});

router.get('/teacher/records', authenticateToken, async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const className = String(req.query.className || '').trim();
    const search = String(req.query.search || '').trim().toLowerCase();
    const effectiveDate = startOfDay(req.query.date);

    const students = await Student.find({
      $or: [{ isActive: true }, { isActive: { $exists: false } }],
    })
      .populate('user', 'firstName lastName')
      .populate('parentUser', 'firstName lastName');

    const filteredStudents = students.filter((student) => {
      const currentClass = `${student.grade || ''}${student.section || ''}`;
      const fullName = `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || student.studentId;
      if (className && className !== currentClass) return false;
      if (
        search &&
        !fullName.toLowerCase().includes(search) &&
        !String(student.studentId || '').toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });

    const attendanceDocs = await Attendance.find({
      student: { $in: filteredStudents.map((student) => student._id) },
      date: { $gte: effectiveDate, $lt: endOfDay(effectiveDate) },
    });
    const attendanceMap = new Map(attendanceDocs.map((doc) => [String(doc.student), doc]));
    const leaveDocs = await StudentLeave.find({
      status: 'approved',
      student: { $in: filteredStudents.map((student) => student._id) },
      startDate: { $lte: effectiveDate },
      endDate: { $gte: effectiveDate },
    }).populate('approvedBy', 'firstName lastName');
    const leaveMap = new Map();
    for (const leave of leaveDocs) {
      const key = String(leave.student);
      const current = leaveMap.get(key);
      if (!current || new Date(current.createdAt).getTime() < new Date(leave.createdAt).getTime()) {
        leaveMap.set(key, leave);
      }
    }

    const studentRows = filteredStudents.map((student) => {
      const fullName = `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || student.studentId;
      const currentClass = `${student.grade || ''}${student.section || ''}`;
      const parentName = student.parentUser
        ? `${student.parentUser.firstName || ''} ${student.parentUser.lastName || ''}`.trim()
        : 'Unassigned';
      const record = attendanceMap.get(String(student._id));
      const leave = leaveMap.get(String(student._id));

      return {
        id: String(student._id),
        studentId: student.studentId,
        name: fullName,
        className: currentClass,
        parentName,
        attendanceId: record ? String(record._id) : null,
        status: record?.status || 'unmarked',
        notes: record?.notes || '',
        reason: record?.reason || '',
        hasActiveLeave: Boolean(leave),
        leave: mapLeaveRecord(leave),
      };
    });

    const summary = {
      total: studentRows.length,
      present: studentRows.filter((row) => row.status === 'present').length,
      absent: studentRows.filter((row) => row.status === 'absent').length,
      late: studentRows.filter((row) => row.status === 'late').length,
      excused: studentRows.filter((row) => row.status === 'excused').length,
      unmarked: studentRows.filter((row) => row.status === 'unmarked').length,
      onLeave: studentRows.filter((row) => row.hasActiveLeave).length,
    };

    res.json({
      date: effectiveDate.toISOString().slice(0, 10),
      summary,
      students: studentRows,
      classes: [...new Set(studentRows.map((row) => row.className).filter(Boolean))].sort(),
    });
  } catch (error) {
    console.error('Teacher records fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records', message: error.message });
  }
});

router.post('/leaves', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can grant leave' });
    }

    const studentId = String(req.body.studentId || '').trim();
    const reason = String(req.body.reason || '').trim();
    const notes = String(req.body.notes || '').trim();
    const category = normalizeLeaveCategory(req.body.category);
    const startDate = startOfDay(req.body.startDate);
    const endDate = startOfDay(req.body.endDate || req.body.startDate);

    if ((!studentId && !studentObjectId) || !reason) {
      return res.status(400).json({ error: 'studentId or studentObjectId, and reason are required' });
    }
    if (!studentId && !mongoose.isValidObjectId(studentObjectId)) {
      return res.status(400).json({ error: 'studentObjectId is invalid' });
    }
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Valid startDate and endDate are required' });
    }
    if (endDate.getTime() < startDate.getTime()) {
      return res.status(400).json({ error: 'endDate cannot be before startDate' });
    }

    const student = await Student.findOne(
      studentId ? { studentId } : { _id: studentObjectId }
    ).populate('user', 'firstName lastName');
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const leave = await StudentLeave.create({
      student: student._id,
      startDate,
      endDate,
      category,
      reason,
      notes,
      approvedBy: req.user.userId,
      status: 'approved',
    });

    const saved = await StudentLeave.findById(leave._id).populate('approvedBy', 'firstName lastName');
    const studentName =
      `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || student.studentId;

    res.status(201).json({
      message: 'Leave granted successfully',
      leave: {
        ...mapLeaveRecord(saved),
        studentObjectId: String(student._id),
        studentId: student.studentId,
        studentName,
        className: `${student.grade || ''}${student.section || ''}`,
      },
    });
  } catch (error) {
    console.error('Grant leave error:', error);
    res.status(500).json({ error: 'Failed to grant leave', message: error.message });
  }
});

router.get('/leaves', authenticateToken, async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const className = String(req.query.className || '').trim();
    const search = String(req.query.search || '').trim().toLowerCase();
    const effectiveDate = startOfDay(req.query.date);
    const status = String(req.query.status || 'approved').trim().toLowerCase();
    const normalizedStatus = ['approved', 'cancelled'].includes(status) ? status : 'approved';

    const students = await Student.find({
      $or: [{ isActive: true }, { isActive: { $exists: false } }],
    }).populate('user', 'firstName lastName');

    const filteredStudents = students.filter((student) => {
      const currentClass = `${student.grade || ''}${student.section || ''}`;
      const fullName = `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || student.studentId;
      if (className && className !== currentClass) return false;
      if (
        search &&
        !fullName.toLowerCase().includes(search) &&
        !String(student.studentId || '').toLowerCase().includes(search)
      ) {
        return false;
      }
      return true;
    });

    const leaves = await StudentLeave.find({
      student: { $in: filteredStudents.map((student) => student._id) },
      status: normalizedStatus,
      startDate: { $lte: effectiveDate },
      endDate: { $gte: effectiveDate },
    })
      .populate('student')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    const studentMap = new Map(filteredStudents.map((student) => [String(student._id), student]));
    const rows = leaves
      .map((leave) => {
        const student = studentMap.get(String(leave.student?._id || leave.student));
        if (!student) return null;
        const fullName = `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || student.studentId;
        return {
          ...mapLeaveRecord(leave),
          studentObjectId: String(student._id),
          studentId: student.studentId,
          studentName: fullName,
          className: `${student.grade || ''}${student.section || ''}`,
        };
      })
      .filter(Boolean);

    res.json({
      date: effectiveDate.toISOString().slice(0, 10),
      total: rows.length,
      leaves: rows,
    });
  } catch (error) {
    console.error('List leaves error:', error);
    res.status(500).json({ error: 'Failed to fetch leave records', message: error.message });
  }
});

router.post('/notify-absent-parents', authenticateToken, async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const className = String(req.body.className || '').trim();
    const effectiveDate = startOfDay(req.body.date);

    const records = await Attendance.find({
      status: 'absent',
      date: { $gte: effectiveDate, $lt: endOfDay(effectiveDate) },
    }).populate({
      path: 'student',
      populate: [
        { path: 'user', select: 'firstName lastName' },
        { path: 'parentUser', select: 'firstName lastName' },
      ],
    });

    let sent = 0;
    for (const record of records) {
      const student = record.student;
      if (!student) continue;
      const studentClass = `${student.grade || ''}${student.section || ''}`;
      if (className && className !== studentClass) continue;
      const ok = await notifyParentForAbsence(student, req.user.role, record.reason);
      if (ok) sent += 1;
    }

    res.json({ message: 'Parent notifications sent for absent students', sent });
  } catch (error) {
    console.error('Notify absent parents error:', error);
    res.status(500).json({ error: 'Failed to notify parents', message: error.message });
  }
});

router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, page = 1, limit = 30 } = req.query;

    if (req.user.role === 'student' && req.user.userId !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const student = await Student.findOne({ studentId });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const dateFilter =
      startDate && endDate
        ? {
            date: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          }
        : {};

    const attendanceRecords = await Attendance.find({
      student: student._id,
      ...dateFilter,
    })
      .populate('markedBy', 'firstName lastName')
      .sort({ date: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const totalRecords = await Attendance.countDocuments({
      student: student._id,
      ...dateFilter,
    });

    res.json({
      attendance: attendanceRecords,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalRecords / Number(limit)),
        totalRecords,
        hasNextPage: Number(page) * Number(limit) < totalRecords,
        hasPrevPage: Number(page) > 1,
      },
    });
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records', message: error.message });
  }
});

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, grade } = req.query;

    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const summary = await Attendance.getSummary(new Date(startDate), new Date(endDate), grade);
    res.json({
      summary,
      dateRange: { startDate, endDate },
      grade: grade || 'All Grades',
    });
  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance summary', message: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ error: 'Attendance record not found' });

    const student = await Student.findById(attendance.student).populate('user', 'firstName lastName');
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const previousStatus = attendance.status;
    const nextStatus = req.body.status ? normalizeStatus(req.body.status) : previousStatus;
    if (!nextStatus) return res.status(400).json({ error: 'Invalid status value' });

    attendance.status = nextStatus;
    if (req.body.notes !== undefined) attendance.notes = String(req.body.notes || '').trim();
    if (req.body.reason !== undefined) attendance.reason = String(req.body.reason || '').trim();
    await attendance.save();

    applyAttendanceCounters(student, previousStatus, nextStatus, false);
    await student.save();

    const autoNotified =
      nextStatus === 'absent' && previousStatus !== 'absent'
        ? await notifyParentForAbsence(student, req.user.role, attendance.reason)
        : false;

    res.json({
      message: 'Attendance updated successfully',
      attendance,
      autoNotifiedParent: autoNotified,
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ error: 'Failed to update attendance', message: error.message });
  }
});

router.post('/:id/timein', authenticateToken, async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ error: 'Attendance record not found' });

    await attendance.markTimeIn();
    res.json({
      message: 'Time in marked successfully',
      attendance: {
        id: attendance._id,
        timeIn: attendance.timeIn,
        status: attendance.status,
      },
    });
  } catch (error) {
    console.error('Mark time in error:', error);
    res.status(500).json({ error: 'Failed to mark time in', message: error.message });
  }
});

router.post('/:id/timeout', authenticateToken, async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ error: 'Attendance record not found' });

    await attendance.markTimeOut();
    res.json({
      message: 'Time out marked successfully',
      attendance: {
        id: attendance._id,
        timeOut: attendance.timeOut,
        duration: attendance.duration,
      },
    });
  } catch (error) {
    console.error('Mark time out error:', error);
    res.status(500).json({ error: 'Failed to mark time out', message: error.message });
  }
});

router.post('/:id/excuse', authenticateToken, async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const reason = String(req.body.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'Reason is required for excusing absence' });

    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ error: 'Attendance record not found' });

    await attendance.excuseAbsence(reason, req.user.userId);
    res.json({
      message: 'Absence excused successfully',
      attendance: {
        id: attendance._id,
        status: attendance.status,
        isExcused: attendance.isExcused,
        reason: attendance.reason,
        excusedBy: attendance.excusedBy,
        excusedAt: attendance.excusedAt,
      },
    });
  } catch (error) {
    console.error('Excuse absence error:', error);
    res.status(500).json({ error: 'Failed to excuse absence', message: error.message });
  }
});

module.exports = router;
