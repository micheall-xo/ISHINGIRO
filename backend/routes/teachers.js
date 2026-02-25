const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Timetable = require('../models/Timetable');
const Notification = require('../models/Notification');
const router = express.Router();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

function toMinutes(timeValue) {
  const [h, m] = String(timeValue || '00:00').split(':').map((x) => Number(x || 0));
  return h * 60 + m;
}

function teacherInitials(teacher) {
  if (!teacher) return '';
  return `${String(teacher.firstName || '').charAt(0)}${String(teacher.lastName || '').charAt(0)}`.toUpperCase();
}

async function createNextClassAlertIfNeeded(teacherId, entry) {
  if (!entry) return;
  const now = new Date();
  const keyDate = now.toISOString().slice(0, 10);
  const notificationKey = `next-class:${teacherId}:${keyDate}:${entry.day}:${entry.period}`;

  const exists = await Notification.findOne({ notificationKey });
  if (exists) return;

  await Notification.create({
    user: teacherId,
    type: 'next_class_alert',
    title: 'Upcoming Class Alert',
    body: `Next class: ${entry.subject} with ${entry.className} at ${entry.startTime}`,
    data: { className: entry.className, subject: entry.subject, startTime: entry.startTime },
    notificationKey,
  });
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    const teachers = await User.find({ role: 'teacher', isActive: true }).select('-password');
    res.json(teachers);
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ error: 'Failed to fetch teachers', message: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'teacher' && req.user.userId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const teacher = await User.findById(id).select('-password');
    if (!teacher || teacher.role !== 'teacher') return res.status(404).json({ error: 'Teacher not found' });
    res.json(teacher);
  } catch (error) {
    console.error('Get teacher error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher', message: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can create teachers' });

    const { username, email, password, firstName, lastName, phoneNumber, classes = [], subjects = [] } = req.body;
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) return res.status(400).json({ error: 'Username or email already exists' });

    const teacher = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      role: 'teacher',
      teacherProfile: {
        classes: Array.isArray(classes) ? classes : [],
        subjects: Array.isArray(subjects) ? subjects : [],
      },
    });

    await teacher.save();
    res.status(201).json({ message: 'Teacher created successfully', teacher });
  } catch (error) {
    console.error('Create teacher error:', error);
    res.status(500).json({ error: 'Failed to create teacher', message: error.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'teacher' && req.user.userId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const teacher = await User.findById(id);
    if (!teacher || teacher.role !== 'teacher') return res.status(404).json({ error: 'Teacher not found' });

    ['firstName', 'lastName', 'phoneNumber', 'profilePicture'].forEach((field) => {
      if (req.body[field] !== undefined) teacher[field] = req.body[field];
    });

    if (req.user.role === 'admin') {
      if (Array.isArray(req.body.classes)) {
        teacher.teacherProfile.classes = [...new Set(req.body.classes.map(String))];
      }
      if (Array.isArray(req.body.subjects)) {
        teacher.teacherProfile.subjects = [...new Set(req.body.subjects.map(String))];
      }
    }

    await teacher.save();
    res.json({ message: 'Teacher updated successfully', teacher });
  } catch (error) {
    console.error('Update teacher error:', error);
    res.status(500).json({ error: 'Failed to update teacher', message: error.message });
  }
});

router.get('/:id/students', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'teacher' && req.user.userId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const students = await Student.find({ 'subjects.teacher': id, isActive: true }).populate(
      'user',
      'firstName lastName'
    );
    res.json(students);
  } catch (error) {
    console.error('Get teacher students error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher students', message: error.message });
  }
});

router.get('/:id/timetable', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'teacher' && req.user.userId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const timetable = await Timetable.findOne({ active: true })
      .sort({ createdAt: -1 })
      .populate('entries.teacher', 'firstName lastName');
    if (!timetable) return res.json({ timetable: null, entries: [] });

    const entries = timetable.entries
      .filter((entry) => String(entry.teacher?._id || entry.teacher) === String(id))
      .map((entry) => ({
        ...(entry?.toObject ? entry.toObject() : entry),
        teacherInitials: teacherInitials(entry.teacher),
      }));
    res.json({
      timetable: { id: timetable._id, version: timetable.version, title: timetable.title },
      entries,
    });
  } catch (error) {
    console.error('Get teacher timetable error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher timetable', message: error.message });
  }
});

router.get('/:id/next-class', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'teacher' && req.user.userId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const timetable = await Timetable.findOne({ active: true }).sort({ createdAt: -1 });
    if (!timetable) return res.json({ nextClass: null });

    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const todaysEntries = timetable.entries
      .filter((entry) => String(entry.teacher) === String(id) && entry.day === dayName)
      .sort((a, b) => a.period - b.period);

    const nextClass = todaysEntries.find((entry) => toMinutes(entry.startTime) >= nowMinutes) || null;

    if (nextClass) {
      const diff = toMinutes(nextClass.startTime) - nowMinutes;
      if (diff >= 0 && diff <= 20) {
        await createNextClassAlertIfNeeded(id, nextClass);
      }
    }

    res.json({ nextClass });
  } catch (error) {
    console.error('Get next class error:', error);
    res.status(500).json({ error: 'Failed to fetch next class', message: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can deactivate teachers' });
    const teacher = await User.findById(req.params.id);
    if (!teacher || teacher.role !== 'teacher') return res.status(404).json({ error: 'Teacher not found' });
    teacher.isActive = false;
    await teacher.save();
    res.json({ message: 'Teacher deactivated successfully' });
  } catch (error) {
    console.error('Deactivate teacher error:', error);
    res.status(500).json({ error: 'Failed to deactivate teacher', message: error.message });
  }
});

module.exports = router;
