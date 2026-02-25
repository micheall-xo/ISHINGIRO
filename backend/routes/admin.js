const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const TrafficMetric = require('../models/TrafficMetric');
const Timetable = require('../models/Timetable');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const ClassRoom = require('../models/ClassRoom');
const Lesson = require('../models/Lesson');
const PageData = require('../models/PageData');
const ProfileEditRequest = require('../models/ProfileEditRequest');
const { applyProfileUpdateForUser } = require('../utils/profileUpdate');
const { generateUniqueStudentId, isStudentIdStrictFormat } = require('../utils/studentId');

const router = express.Router();

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function uniqStringList(input) {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map((x) => String(x || '').trim()).filter(Boolean))];
}

function uniqObjectIdList(input) {
  if (!Array.isArray(input)) return [];
  return [
    ...new Set(
      input
        .map((x) => String(x || '').trim())
        .filter((x) => mongoose.isValidObjectId(x))
    ),
  ];
}

function teacherInitials(teacher) {
  if (!teacher) return '';
  const first = String(teacher.firstName || '').trim();
  const last = String(teacher.lastName || '').trim();
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function pickRandom(items) {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function buildId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

async function resolveStudentForParentAssignment(studentParam) {
  const raw = String(studentParam || '').trim();
  if (!raw) {
    const error = new Error('Student identifier is required');
    error.statusCode = 400;
    throw error;
  }

  if (raw.startsWith('user:')) {
    const userId = raw.slice(5).trim();
    if (!mongoose.isValidObjectId(userId)) {
      const error = new Error('Invalid student user id');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findById(userId).select('_id role');
    if (!user || user.role !== 'student') {
      const error = new Error('Student user not found');
      error.statusCode = 404;
      throw error;
    }

    const existingProfile = await Student.findOne({ user: user._id });
    if (existingProfile) return existingProfile;

    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;
    const studentId = await buildStudentIdForRecord(academicYear, new Date());

    return Student.create({
      user: user._id,
      studentId,
      grade: 'Unassigned',
      section: 'A',
      dateOfBirth: new Date('2008-01-01'),
      gender: 'other',
      academicYear,
      isActive: true,
    });
  }

  if (!mongoose.isValidObjectId(raw)) {
    const error = new Error('Invalid student id');
    error.statusCode = 400;
    throw error;
  }

  const byId = await Student.findById(raw);
  if (byId) return byId;

  const byUser = await Student.findOne({ user: raw });
  if (byUser) return byUser;

  const error = new Error('Student not found');
  error.statusCode = 404;
  throw error;
}

function splitClassName(className, fallbackSection = 'A') {
  const raw = String(className || '').trim();
  if (!raw) {
    const error = new Error('className is required');
    error.statusCode = 400;
    throw error;
  }

  const letterMatch = raw.match(/^(.+?)([A-Za-z])$/);
  if (letterMatch) {
    return {
      grade: String(letterMatch[1] || '').trim(),
      section: String(letterMatch[2] || '').toUpperCase(),
    };
  }

  return {
    grade: raw,
    section: String(fallbackSection || 'A').trim().toUpperCase() || 'A',
  };
}

async function buildStudentIdForRecord(academicYear = '', fallbackDate = new Date()) {
  return generateUniqueStudentId({
    academicYear,
    fallbackDate,
    exists: async (candidate) => Boolean(await Student.exists({ studentId: candidate })),
  });
}

async function ensureStudentProfileForUser(userDoc) {
  if (!userDoc || String(userDoc.role) !== 'student') return null;
  const existing = await Student.findOne({ user: userDoc._id });
  if (existing) return existing;

  const currentYear = new Date().getFullYear();
  const academicYear = `${currentYear}-${currentYear + 1}`;
  const studentId = await buildStudentIdForRecord(academicYear, new Date());
  return Student.create({
    user: userDoc._id,
    studentId,
    grade: 'Unassigned',
    section: 'A',
    dateOfBirth: new Date('2008-01-01'),
    gender: 'other',
    academicYear,
    isActive: true,
  });
}

async function syncLessonCatalogForClass(className, lessonNames, userId) {
  const normalizedClass = String(className || '').trim();
  if (!normalizedClass) return;

  const uniqueLessons = uniqStringList(lessonNames);
  for (const lessonName of uniqueLessons) {
    const existing = await Lesson.findOne({ name: lessonName });
    if (!existing) {
      await Lesson.create({
        name: lessonName,
        classNames: [normalizedClass],
        teacherIds: [],
        createdBy: userId,
        isActive: true,
      });
      continue;
    }

    if (!existing.classNames.includes(normalizedClass)) {
      existing.classNames = [...existing.classNames, normalizedClass];
      await existing.save();
    }
  }
}

async function syncTeacherLessonLinks(teacher, subjects, actorUserId) {
  const teacherId = String(teacher._id);
  const selectedSubjects = uniqStringList(subjects);

  await Lesson.updateMany(
    { teacherIds: teacher._id, name: { $nin: selectedSubjects } },
    { $pull: { teacherIds: teacher._id } }
  );

  for (const subject of selectedSubjects) {
    const lesson = await Lesson.findOne({ name: subject });
    if (!lesson) {
      await Lesson.create({
        name: subject,
        classNames: uniqStringList(teacher.teacherProfile?.classes || []),
        teacherIds: [teacher._id],
        createdBy: actorUserId,
        isActive: true,
      });
      continue;
    }
    const nextTeacherIds = new Set((lesson.teacherIds || []).map((id) => String(id)));
    nextTeacherIds.add(teacherId);
    lesson.teacherIds = [...nextTeacherIds];
    await lesson.save();
  }
}

router.use(authenticateToken, requireAdmin);

router.get('/dashboard', async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      userRoleStats,
      studentCount,
      assignedParentCount,
      trafficTotals,
      topEndpoints,
      statusBreakdown,
      roleBreakdown,
      activeTimetable,
      unreadMessagesForAdmin,
      totalClasses,
    ] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Student.countDocuments(),
      Student.countDocuments({ parentUser: { $ne: null } }),
      TrafficMetric.aggregate([
        { $match: { bucketStart: { $gte: since } } },
        { $group: { _id: null, totalRequests: { $sum: '$count' } } },
      ]),
      TrafficMetric.aggregate([
        { $match: { bucketStart: { $gte: since } } },
        { $group: { _id: { endpoint: '$endpoint', method: '$method' }, count: { $sum: '$count' } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      TrafficMetric.aggregate([
        { $match: { bucketStart: { $gte: since } } },
        { $group: { _id: '$statusCode', count: { $sum: '$count' } } },
        { $sort: { _id: 1 } },
      ]),
      TrafficMetric.aggregate([
        { $match: { bucketStart: { $gte: since } } },
        { $group: { _id: '$role', count: { $sum: '$count' } } },
        { $sort: { count: -1 } },
      ]),
      Timetable.findOne({ active: true }).sort({ createdAt: -1 }),
      Message.countDocuments({ readAt: null }),
      ClassRoom.countDocuments({ isActive: true }),
    ]);

    const usersByRole = userRoleStats.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.json({
      users: {
        total: Object.values(usersByRole).reduce((sum, n) => sum + n, 0),
        byRole: usersByRole,
      },
      studentAssignments: {
        totalStudents: studentCount,
        assignedToParent: assignedParentCount,
        unassigned: studentCount - assignedParentCount,
      },
      traffic: {
        window: '24h',
        totalRequests: trafficTotals[0]?.totalRequests || 0,
        topEndpoints: topEndpoints.map((item) => ({
          endpoint: item._id.endpoint,
          method: item._id.method,
          count: item.count,
        })),
        statusBreakdown: statusBreakdown.map((item) => ({ statusCode: item._id, count: item.count })),
        roleBreakdown: roleBreakdown.map((item) => ({ role: item._id, count: item.count })),
      },
      timetable: activeTimetable
        ? {
            id: activeTimetable._id,
            title: activeTimetable.title,
            version: activeTimetable.version,
            entries: activeTimetable.entries.length,
            updatedAt: activeTimetable.updatedAt,
          }
        : null,
      unreadMessageCount: unreadMessagesForAdmin,
      classes: {
        total: totalClasses,
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard', message: error.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const role = String(req.query.role || '').trim();
    const query = role ? { role } : {};
    const users = await User.find(query).sort({ createdAt: -1 }).limit(300).select('-password');
    res.json(users);
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ error: 'Failed to list users', message: error.message });
  }
});

router.get('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const payload = {
      user,
      teacherDetails: null,
      parentDetails: null,
      studentDetails: null,
    };

    if (user.role === 'teacher') {
      const [linkedLessons, activeTimetable] = await Promise.all([
        Lesson.find({ isActive: true, teacherIds: user._id }).select('_id name classNames').sort({ name: 1 }),
        Timetable.findOne({ active: true }).select('entries'),
      ]);

      const now = new Date();
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const nowTime = `${hh}:${mm}`;

      const currentEntry = Array.isArray(activeTimetable?.entries)
        ? activeTimetable.entries.find((entry) => {
            if (!entry) return false;
            const sameTeacher = String(entry.teacher || '') === String(user._id);
            const sameDay = String(entry.day || '') === dayName;
            const start = String(entry.startTime || '');
            const end = String(entry.endTime || '');
            return sameTeacher && sameDay && start && end && nowTime >= start && nowTime < end;
          })
        : null;

      payload.teacherDetails = {
        classes: uniqStringList(user.teacherProfile?.classes || []),
        subjects: uniqStringList(user.teacherProfile?.subjects || []),
        lessons: linkedLessons.map((lesson) => ({
          id: lesson._id,
          name: lesson.name,
          classNames: uniqStringList(lesson.classNames || []),
        })),
        currentClass: currentEntry
          ? {
              className: currentEntry.className,
              subject: currentEntry.subject,
              period: currentEntry.period,
              startTime: currentEntry.startTime,
              endTime: currentEntry.endTime,
              day: currentEntry.day,
            }
          : null,
      };
    }

    if (user.role === 'parent') {
      const assignedStudents = await Student.find({ parentUser: user._id })
        .populate('user', 'firstName lastName profilePicture')
        .sort({ createdAt: -1 });

      payload.parentDetails = {
        children: assignedStudents.map((student) => ({
          id: student._id,
          userId: student.user?._id || null,
          studentId: student.studentId,
          fullName: student.user
            ? `${student.user.firstName || ''} ${student.user.lastName || ''}`.trim()
            : 'Unknown Student',
          className: `${student.grade || ''}${student.section || ''}`.trim(),
          profilePicture: student.user?.profilePicture || '',
        })),
      };
    }

    if (user.role === 'student') {
      let student = await Student.findOne({ user: user._id }).populate('parentUser', 'firstName lastName email');
      if (!student) {
        student = await ensureStudentProfileForUser(user);
        student = await Student.findById(student._id).populate('parentUser', 'firstName lastName email');
      }
      payload.studentDetails = student
        ? {
            id: student._id,
            studentId: student.studentId,
            grade: student.grade,
            section: student.section,
            className: `${student.grade || ''}${student.section || ''}`.trim(),
            gender: student.gender,
            dateOfBirth: student.dateOfBirth,
            parent: student.parentUser
              ? {
                  id: student.parentUser._id,
                  fullName: `${student.parentUser.firstName || ''} ${student.parentUser.lastName || ''}`.trim(),
                  email: student.parentUser.email || '',
                }
              : null,
          }
        : null;
    }

    res.json(payload);
  } catch (error) {
    console.error('Admin user details error:', error);
    res.status(500).json({ error: 'Failed to fetch user details', message: error.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { username: rawUsername, email: rawEmail, password, firstName, lastName, phoneNumber, role } = req.body;
    const username = String(rawUsername || '').trim();
    const email = String(rawEmail || '').trim().toLowerCase();
    const allowedRoles = ['teacher', 'parent', 'admin', 'student'];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Role must be teacher, parent, admin, or student' });
    }
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) return res.status(400).json({ error: 'Username or email already exists' });

    const teacherClasses = uniqStringList(req.body.teacherClasses);
    const teacherSubjects = uniqStringList(req.body.teacherSubjects);
    const profilePicture = String(req.body.profilePicture || '').trim();

    const created = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      profilePicture,
      role,
      isActive: true,
      teacherProfile:
        role === 'teacher'
          ? {
              classes: teacherClasses,
              subjects: teacherSubjects,
            }
          : undefined,
    });

    if (role === 'student') {
      const className = String(req.body.className || '').trim();
      let grade = String(req.body.grade || '').trim();
      let section = String(req.body.section || '').trim().toUpperCase();
      if (className) {
        const parsed = splitClassName(className, section || 'A');
        grade = parsed.grade || grade;
        section = parsed.section || section;
      }
      if (!grade) grade = 'Unassigned';
      if (!section) section = 'A';

      const currentYear = new Date().getFullYear();
      const academicYear = String(req.body.academicYear || `${currentYear}-${currentYear + 1}`).trim();
      const providedStudentId = String(req.body.studentId || '').trim().toUpperCase();
      let studentId = providedStudentId;
      if (studentId) {
        if (!isStudentIdStrictFormat(studentId)) {
          return res.status(400).json({ error: 'studentId format must be STU<YYYY><6 digits>' });
        }
        const existingStudentId = await Student.findOne({ studentId }).select('_id');
        if (existingStudentId) {
          return res.status(400).json({ error: 'studentId already exists' });
        }
      } else {
        studentId = await buildStudentIdForRecord(academicYear, new Date());
      }

      const dobInput = String(req.body.dateOfBirth || '').trim();
      const dob = dobInput ? new Date(dobInput) : new Date('2008-01-01');
      const gender = ['male', 'female', 'other'].includes(String(req.body.gender || '').toLowerCase())
        ? String(req.body.gender || '').toLowerCase()
        : 'other';

      await Student.create({
        user: created._id,
        studentId,
        grade,
        section,
        dateOfBirth: Number.isNaN(dob.getTime()) ? new Date('2008-01-01') : dob,
        gender,
        academicYear,
        isActive: true,
      });
    }

    res.status(201).json({
      message: `${role} created`,
      user: created,
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ error: 'Failed to create user', message: error.message });
  }
});

router.get('/options', async (req, res) => {
  try {
    const activeStudentQuery = { $or: [{ isActive: true }, { isActive: { $exists: false } }] };

    const activeUserQuery = { $or: [{ isActive: true }, { isActive: { $exists: false } }] };

    const [classes, teachers, parents, students, studentUsers, lessons] = await Promise.all([
      ClassRoom.find({ isActive: true }).sort({ name: 1 }),
      User.find({ role: 'teacher', ...activeUserQuery }).select('_id firstName lastName teacherProfile'),
      User.find({ role: 'parent', ...activeUserQuery }).select('_id firstName lastName'),
      Student.find(activeStudentQuery).populate('user', 'firstName lastName'),
      User.find({ role: 'student', ...activeUserQuery }).select('_id firstName lastName'),
      Lesson.find({ isActive: true }).sort({ name: 1 }).select('_id name classNames teacherIds'),
    ]);

    const profiledUserIds = new Set(students.map((item) => String(item.user?._id || item.user || '')));
    const missingUsers = studentUsers.filter((u) => !profiledUserIds.has(String(u._id)));
    if (missingUsers.length) {
      for (const studentUser of missingUsers) {
        // eslint-disable-next-line no-await-in-loop
        await ensureStudentProfileForUser(studentUser);
      }
    }

    const normalizedStudents =
      missingUsers.length > 0
        ? await Student.find(activeStudentQuery).populate('user', 'firstName lastName')
        : students;

    const lessonSet = new Set();
    classes.forEach((c) => (c.lessons || []).forEach((l) => lessonSet.add(String(l))));
    lessons.forEach((l) => lessonSet.add(String(l.name || '').trim()));

    const studentsFromProfiles = normalizedStudents.map((s) => ({
      id: s._id,
      userId: s.user?._id || null,
      name: s.user ? `${s.user.firstName} ${s.user.lastName}` : s.studentId,
      className: `${s.grade}${s.section || ''}`,
      hasStudentProfile: true,
    }));

    res.json({
      classes: classes.map((c) => ({
        id: c._id,
        name: c.name,
        lessons: c.lessons || [],
      })),
      lessons: [...lessonSet].sort(),
      lessonDetails: lessons.map((lesson) => ({
        id: lesson._id,
        name: lesson.name,
        classNames: lesson.classNames || [],
        teacherIds: (lesson.teacherIds || []).map((id) => String(id)),
      })),
      teachers: teachers.map((t) => ({
        id: t._id,
        fullName: `${t.firstName} ${t.lastName}`,
        classes: t.teacherProfile?.classes || [],
        subjects: t.teacherProfile?.subjects || [],
      })),
      parents: parents.map((p) => ({
        id: p._id,
        fullName: `${p.firstName} ${p.lastName}`,
      })),
      students: studentsFromProfiles,
    });
  } catch (error) {
    console.error('Admin options error:', error);
    res.status(500).json({ error: 'Failed to fetch admin options', message: error.message });
  }
});

router.get('/classes', async (req, res) => {
  try {
    const classes = await ClassRoom.find({ isActive: true }).sort({ name: 1 });
    res.json(classes);
  } catch (error) {
    console.error('Class list error:', error);
    res.status(500).json({ error: 'Failed to fetch classes', message: error.message });
  }
});

router.post('/classes', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const lessons = uniqStringList(req.body.lessons || []);
    if (!name) return res.status(400).json({ error: 'Class name is required' });

    const existing = await ClassRoom.findOne({ name });
    if (existing) return res.status(400).json({ error: 'Class already exists' });

    const created = await ClassRoom.create({
      name,
      lessons,
      createdBy: req.user.userId,
    });
    await syncLessonCatalogForClass(name, lessons, req.user.userId);

    res.status(201).json(created);
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Failed to create class', message: error.message });
  }
});

router.put('/classes/:classId', async (req, res) => {
  try {
    const classDoc = await ClassRoom.findById(req.params.classId);
    if (!classDoc) return res.status(404).json({ error: 'Class not found' });

    const nextName = String(req.body.name || '').trim();
    if (nextName) classDoc.name = nextName;
    if (req.body.lessons) classDoc.lessons = uniqStringList(req.body.lessons);
    await classDoc.save();
    await syncLessonCatalogForClass(classDoc.name, classDoc.lessons || [], req.user.userId);

    res.json(classDoc);
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Failed to update class', message: error.message });
  }
});

router.put('/teachers/:teacherId/assignment', async (req, res) => {
  try {
    const teacher = await User.findById(req.params.teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    teacher.teacherProfile = {
      classes: uniqStringList(req.body.classes),
      subjects: uniqStringList(req.body.subjects),
    };
    await teacher.save();
    await syncTeacherLessonLinks(teacher, teacher.teacherProfile.subjects, req.user.userId);

    res.json({
      message: 'Teacher assignment updated',
      teacher: {
        id: teacher._id,
        fullName: teacher.getFullName(),
        teacherProfile: teacher.teacherProfile,
      },
    });
  } catch (error) {
    console.error('Teacher assignment update error:', error);
    res.status(500).json({ error: 'Failed to update teacher assignment', message: error.message });
  }
});

router.get('/students/assignments', async (req, res) => {
  try {
    const studentUsers = await User.find({ role: 'student' }).select('_id firstName lastName email isActive');
    const profileRows = await Student.find({}).select('user');
    const profileUserIds = new Set(profileRows.map((row) => String(row.user || '')));
    const missingUsers = studentUsers.filter((u) => !profileUserIds.has(String(u._id)));
    if (missingUsers.length) {
      for (const studentUser of missingUsers) {
        // eslint-disable-next-line no-await-in-loop
        await ensureStudentProfileForUser(studentUser);
      }
    }

    const students = await Student.find({})
      .populate('user', 'firstName lastName')
      .populate('parentUser', 'firstName lastName email');

    const studentRows = students.map((s) => ({
      kind: 'student_profile',
      hasStudentProfile: true,
        id: s._id,
        userId: s.user?._id || null,
        studentId: s.studentId,
        name: s.user ? `${s.user.firstName} ${s.user.lastName}` : 'Unknown',
        className: `${s.grade}${s.section || ''}`,
        isActive: s.isActive !== false,
        parent: s.parentUser
          ? {
              id: s.parentUser._id,
              name: `${s.parentUser.firstName} ${s.parentUser.lastName}`,
              email: s.parentUser.email,
            }
          : null,
      }));

    res.json(studentRows);
  } catch (error) {
    console.error('Student assignments fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch student assignments', message: error.message });
  }
});

router.put('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const username = String(req.body.username || user.username || '').trim();
    const email = String(req.body.email || user.email || '').trim().toLowerCase();
    const firstName = String(req.body.firstName || user.firstName || '').trim();
    const lastName = String(req.body.lastName || user.lastName || '').trim();
    const phoneNumber = String(req.body.phoneNumber || '').trim();
    const profilePicture = String(req.body.profilePicture || '').trim();

    if (!username || !email || !firstName || !lastName) {
      return res.status(400).json({ error: 'username, email, firstName, lastName are required' });
    }

    const duplicate = await User.findOne({
      _id: { $ne: user._id },
      $or: [{ username }, { email }],
    }).select('_id');
    if (duplicate) return res.status(400).json({ error: 'Username or email already in use' });

    user.username = username;
    user.email = email;
    user.firstName = firstName;
    user.lastName = lastName;
    user.phoneNumber = phoneNumber;
    user.profilePicture = profilePicture;

    if (String(req.body.password || '').trim()) {
      user.password = String(req.body.password);
    }

    if (user.role === 'teacher') {
      user.teacherProfile = {
        classes: uniqStringList(req.body.teacherClasses || user.teacherProfile?.classes || []),
        subjects: uniqStringList(req.body.teacherSubjects || user.teacherProfile?.subjects || []),
      };
    }

    await user.save();

    if (user.role === 'teacher') {
      await syncTeacherLessonLinks(user, user.teacherProfile?.subjects || [], req.user.userId);
    }

    if (user.role === 'student') {
      const student = await Student.findOne({ user: user._id });
      if (student) {
        const className = String(req.body.className || '').trim();
        const nextGrade = String(req.body.grade || '').trim();
        const nextSection = String(req.body.section || '').trim().toUpperCase();
        if (className) {
          const parsed = splitClassName(className, nextSection || student.section || 'A');
          student.grade = parsed.grade || student.grade;
          student.section = parsed.section || student.section;
        } else {
          if (nextGrade) student.grade = nextGrade;
          if (nextSection) student.section = nextSection;
        }

        const nextGender = String(req.body.gender || '').trim().toLowerCase();
        if (['male', 'female', 'other'].includes(nextGender)) {
          student.gender = nextGender;
        }

        const nextDob = String(req.body.dateOfBirth || '').trim();
        if (nextDob) {
          const parsedDob = new Date(nextDob);
          if (!Number.isNaN(parsedDob.getTime())) student.dateOfBirth = parsedDob;
        }

        const nextStudentId = String(req.body.studentId || '').trim();
        if (nextStudentId && nextStudentId !== student.studentId) {
          const normalizedId = nextStudentId.toUpperCase();
          if (!isStudentIdStrictFormat(normalizedId)) {
            return res.status(400).json({ error: 'studentId format must be STU<YYYY><6 digits>' });
          }
          const existingId = await Student.findOne({ _id: { $ne: student._id }, studentId: normalizedId }).select('_id');
          if (existingId) return res.status(400).json({ error: 'studentId already exists' });
          student.studentId = normalizedId;
        }

        await student.save();
      }
    }

    const responseUser = await User.findById(user._id).select('-password');
    res.json({ message: 'User updated', user: responseUser });
  } catch (error) {
    console.error('Admin user update error:', error);
    res.status(500).json({ error: 'Failed to update user', message: error.message });
  }
});

router.get('/lessons', async (req, res) => {
  try {
    const lessons = await Lesson.find({ isActive: true })
      .sort({ name: 1 })
      .populate('teacherIds', 'firstName lastName');

    res.json(
      lessons.map((lesson) => ({
        id: lesson._id,
        name: lesson.name,
        classNames: lesson.classNames || [],
        teachers: (lesson.teacherIds || []).map((teacher) => ({
          id: teacher._id,
          fullName: `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim(),
          initials: teacherInitials(teacher),
        })),
      }))
    );
  } catch (error) {
    console.error('Lesson list error:', error);
    res.status(500).json({ error: 'Failed to fetch lessons', message: error.message });
  }
});

router.post('/lessons', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const classNames = uniqStringList(req.body.classNames || []);
    const teacherIds = uniqObjectIdList(req.body.teacherIds || []);
    if (!name) return res.status(400).json({ error: 'Lesson name is required' });

    const existing = await Lesson.findOne({ name });
    if (existing) return res.status(400).json({ error: 'Lesson already exists' });

    const lesson = await Lesson.create({
      name,
      classNames,
      teacherIds,
      createdBy: req.user.userId,
      isActive: true,
    });

    if (classNames.length) {
      await ClassRoom.updateMany({ name: { $in: classNames } }, { $addToSet: { lessons: name } });
    }
    if (teacherIds.length) {
      await User.updateMany(
        { _id: { $in: teacherIds }, role: 'teacher' },
        { $addToSet: { 'teacherProfile.subjects': name } }
      );
    }

    res.status(201).json({ message: 'Lesson created', lesson });
  } catch (error) {
    console.error('Lesson create error:', error);
    res.status(500).json({ error: 'Failed to create lesson', message: error.message });
  }
});

router.put('/lessons/:lessonId', async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const oldName = lesson.name;
    const nextName = String(req.body.name || '').trim();
    if (nextName) lesson.name = nextName;
    if (req.body.classNames) lesson.classNames = uniqStringList(req.body.classNames);
    if (req.body.teacherIds) lesson.teacherIds = uniqObjectIdList(req.body.teacherIds);
    await lesson.save();

    if (oldName !== lesson.name) {
      await ClassRoom.updateMany({ lessons: oldName }, { $set: { 'lessons.$[item]': lesson.name } }, { arrayFilters: [{ item: oldName }] });
      await User.updateMany(
        { role: 'teacher', 'teacherProfile.subjects': oldName },
        { $set: { 'teacherProfile.subjects.$[item]': lesson.name } },
        { arrayFilters: [{ item: oldName }] }
      );
    }

    await ClassRoom.updateMany({}, { $pull: { lessons: lesson.name } });
    if (lesson.classNames.length) {
      await ClassRoom.updateMany({ name: { $in: lesson.classNames } }, { $addToSet: { lessons: lesson.name } });
    }

    await User.updateMany({ role: 'teacher' }, { $pull: { 'teacherProfile.subjects': lesson.name } });
    if (lesson.teacherIds.length) {
      await User.updateMany(
        { _id: { $in: lesson.teacherIds }, role: 'teacher' },
        { $addToSet: { 'teacherProfile.subjects': lesson.name } }
      );
    }

    res.json({ message: 'Lesson updated', lesson });
  } catch (error) {
    console.error('Lesson update error:', error);
    res.status(500).json({ error: 'Failed to update lesson', message: error.message });
  }
});

router.post('/students/:studentId/assign-parent', async (req, res) => {
  try {
    const { parentUserId, relationship = 'guardian' } = req.body;
    const student = await resolveStudentForParentAssignment(req.params.studentId);

    const parent = await User.findById(parentUserId);
    if (!parent || parent.role !== 'parent') {
      return res.status(400).json({ error: 'parentUserId must belong to a parent account' });
    }

    if (student.parentUser && String(student.parentUser) !== String(parentUserId)) {
      return res.status(400).json({ error: 'This student already has a parent assigned' });
    }

    student.parentUser = parentUserId;
    student.parents = [{ parent: parentUserId, relationship }];
    await student.save();

    res.json({ message: 'Parent assigned to student', studentId: student._id, parentUserId });
  } catch (error) {
    console.error('Assign parent error:', error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.statusCode ? error.message : 'Failed to assign parent', message: error.message });
  }
});

router.post('/students/:studentId/assign-class', async (req, res) => {
  try {
    const className = String(req.body.className || '').trim();
    if (!className) {
      return res.status(400).json({ error: 'className is required' });
    }

    const classDoc = await ClassRoom.findOne({ name: className, isActive: true });
    if (!classDoc) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const student = await resolveStudentForParentAssignment(req.params.studentId);
    const parts = splitClassName(className, student.section || 'A');
    student.grade = parts.grade;
    student.section = parts.section;
    await student.save();

    res.json({
      message: 'Student assigned to class',
      studentId: student._id,
      className: `${student.grade}${student.section || ''}`,
    });
  } catch (error) {
    console.error('Assign class error:', error);
    res
      .status(error.statusCode || 500)
      .json({ error: error.statusCode ? error.message : 'Failed to assign class', message: error.message });
  }
});

router.post('/parents/:parentId/assign-students', async (req, res) => {
  try {
    const parent = await User.findById(req.params.parentId);
    if (!parent || parent.role !== 'parent') {
      return res.status(404).json({ error: 'Parent not found' });
    }

    const studentIds = uniqStringList(req.body.studentIds || []);
    if (!studentIds.length) {
      return res.status(400).json({ error: 'studentIds is required' });
    }

    const students = await Student.find({ _id: { $in: studentIds } });
    const conflicts = students.filter(
      (s) => s.parentUser && String(s.parentUser) !== String(parent._id)
    );
    if (conflicts.length) {
      return res.status(400).json({
        error: 'Some students already have a different parent assigned',
        conflicts: conflicts.map((c) => ({ id: c._id, studentId: c.studentId })),
      });
    }

    for (const student of students) {
      student.parentUser = parent._id;
      student.parents = [{ parent: parent._id, relationship: 'guardian' }];
      await student.save();
    }

    res.json({
      message: 'Students assigned to parent',
      parentId: parent._id,
      assignedCount: students.length,
    });
  } catch (error) {
    console.error('Bulk assign students error:', error);
    res.status(500).json({ error: 'Failed to assign students', message: error.message });
  }
});

router.post('/timetable/generate', async (req, res) => {
  try {
    const days = uniqStringList(req.body.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    const classes = uniqStringList(req.body.classes || []);
    const periodsPerDay = Number(req.body.periodsPerDay || 6);
    const startHour = Number(req.body.startHour || 8);

    const activeTeachers = await User.find({ role: 'teacher', isActive: true }).select(
      '_id firstName lastName teacherProfile'
    );
    if (!activeTeachers.length) {
      return res.status(400).json({ error: 'No teachers available for timetable generation' });
    }

    const [activeClassDocs, activeLessons] = await Promise.all([
      ClassRoom.find({ isActive: true }).select('name lessons'),
      Lesson.find({ isActive: true }).select('name classNames teacherIds'),
    ]);
    const classLessonMap = new Map();
    activeClassDocs.forEach((doc) => {
      classLessonMap.set(String(doc.name), uniqStringList(doc.lessons || []));
    });
    activeLessons.forEach((lesson) => {
      const targets = uniqStringList(lesson.classNames || []);
      for (const className of targets) {
        const current = classLessonMap.get(className) || [];
        if (!current.includes(lesson.name)) classLessonMap.set(className, [...current, lesson.name]);
      }
    });

    const classPool =
      classes.length > 0
        ? classes
        : activeClassDocs.length > 0
        ? activeClassDocs.map((doc) => String(doc.name))
        : uniqStringList(
            (
              await Student.aggregate([
                { $project: { className: { $concat: ['$grade', '$section'] } } },
              ])
            ).map((x) => x.className)
          );

    if (!classPool.length) return res.status(400).json({ error: 'No classes available' });

    const teacherBusySlot = new Set();
    const entries = [];

    for (const className of classPool) {
      const classLessons = classLessonMap.get(className) || [];
      if (!classLessons.length) continue;

      for (const day of days) {
        const lessonRotation = [...classLessons].sort(() => Math.random() - 0.5);
        for (let period = 1; period <= periodsPerDay; period += 1) {
          const subject = lessonRotation[(period - 1) % lessonRotation.length] || 'General Studies';
          const subjectTeachers = activeTeachers.filter((teacher) => {
            const classesMatch =
              !teacher.teacherProfile?.classes?.length || teacher.teacherProfile.classes.includes(className);
            const subjects = uniqStringList(teacher.teacherProfile?.subjects || []);
            const subjectMatch = subjects.length ? subjects.includes(subject) : false;
            return classesMatch && subjectMatch;
          });
          const fallbackTeachers = activeTeachers.filter((teacher) => {
            const classesMatch =
              !teacher.teacherProfile?.classes?.length || teacher.teacherProfile.classes.includes(className);
            return classesMatch;
          });
          const teacherPool = subjectTeachers.length ? subjectTeachers : fallbackTeachers;
          const pickedTeacher = pickRandom(teacherPool);
          if (!pickedTeacher) continue;

          const slotKey = `${day}-${period}-${pickedTeacher._id}`;
          if (teacherBusySlot.has(slotKey)) continue;
          teacherBusySlot.add(slotKey);

          const shiftByClass = classPool.indexOf(className) % 3;
          const slotStart = `${String(startHour + (period - 1) + shiftByClass).padStart(2, '0')}:00`;
          const slotEnd = `${String(startHour + period + shiftByClass).padStart(2, '0')}:00`;
          entries.push({
            day,
            period,
            startTime: slotStart,
            endTime: slotEnd,
            className,
            subject,
            teacher: pickedTeacher._id,
          });
        }
      }
    }

    await Timetable.updateMany({ active: true }, { $set: { active: false } });
    const latest = await Timetable.findOne().sort({ version: -1 });
    const nextVersion = (latest?.version || 0) + 1;
    const timetable = await Timetable.create({
      title: 'AI Generated Timetable',
      generatedBy: req.user.userId,
      active: true,
      version: nextVersion,
      entries,
    });

    const teacherIds = [...new Set(entries.map((e) => String(e.teacher)))];
    if (teacherIds.length) {
      await Notification.insertMany(
        teacherIds.map((teacherId) => ({
          user: teacherId,
          type: 'timetable_published',
          title: 'New AI Timetable Published',
          body: `A new timetable (version ${nextVersion}) is now active.`,
          data: { timetableId: timetable._id, version: nextVersion },
        }))
      );
    }

    res.status(201).json({
      message: 'AI timetable generated and shared',
      timetable: {
        id: timetable._id,
        version: timetable.version,
        entries: timetable.entries.length,
      },
    });
  } catch (error) {
    console.error('Generate timetable error:', error);
    res.status(500).json({ error: 'Failed to generate timetable', message: error.message });
  }
});

router.post('/timetable/manual', async (req, res) => {
  try {
    const title = String(req.body.title || 'Manual Timetable').trim();
    const incoming = Array.isArray(req.body.entries) ? req.body.entries : [];
    if (!incoming.length) {
      return res.status(400).json({ error: 'entries is required' });
    }

    const entries = incoming
      .map((entry) => ({
        day: String(entry.day || '').trim(),
        period: Number(entry.period || 0),
        startTime: String(entry.startTime || '').trim(),
        endTime: String(entry.endTime || '').trim(),
        className: String(entry.className || '').trim(),
        subject: String(entry.subject || '').trim(),
        teacher: String(entry.teacher || entry.teacherId || '').trim(),
      }))
      .filter(
        (entry) =>
          entry.day &&
          entry.period > 0 &&
          entry.startTime &&
          entry.endTime &&
          entry.className &&
          entry.subject &&
          mongoose.isValidObjectId(entry.teacher)
      );

    if (!entries.length) {
      return res.status(400).json({ error: 'No valid entries to save' });
    }

    await Timetable.updateMany({ active: true }, { $set: { active: false } });
    const latest = await Timetable.findOne().sort({ version: -1 });
    const nextVersion = (latest?.version || 0) + 1;
    const timetable = await Timetable.create({
      title,
      generatedBy: req.user.userId,
      active: true,
      version: nextVersion,
      entries,
    });

    const teacherIds = [...new Set(entries.map((e) => String(e.teacher)))];
    if (teacherIds.length) {
      await Notification.insertMany(
        teacherIds.map((teacherId) => ({
          user: teacherId,
          type: 'timetable_published',
          title: 'New Timetable Published',
          body: `A manual timetable (version ${nextVersion}) is now active.`,
          data: { timetableId: timetable._id, version: nextVersion },
        }))
      );
    }

    res.status(201).json({
      message: 'Manual timetable published',
      timetable: { id: timetable._id, version: timetable.version, entries: timetable.entries.length },
    });
  } catch (error) {
    console.error('Manual timetable save error:', error);
    res.status(500).json({ error: 'Failed to save manual timetable', message: error.message });
  }
});

router.get('/timetable/current', async (req, res) => {
  try {
    const timetable = await Timetable.findOne({ active: true }).sort({ createdAt: -1 }).populate(
      'entries.teacher',
      'firstName lastName'
    );
    if (!timetable) return res.json(null);

    const payload = timetable.toObject();
    payload.entries = (payload.entries || []).map((entry) => ({
      ...entry,
      teacherName: entry.teacher ? `${entry.teacher.firstName || ''} ${entry.teacher.lastName || ''}`.trim() : '',
      teacherInitials: teacherInitials(entry.teacher),
    }));
    res.json(payload);
  } catch (error) {
    console.error('Current timetable fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch timetable', message: error.message });
  }
});

router.get('/notices', async (req, res) => {
  try {
    const payload = await PageData.findOne({ page: 'school-notices' });
    const notices = Array.isArray(payload?.payload?.notices) ? payload.payload.notices : [];
    res.json({ notices });
  } catch (error) {
    console.error('Admin notices fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch notices', message: error.message });
  }
});

router.post('/notices', async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    const category = String(req.body.category || 'announcement').trim();
    const priority = String(req.body.priority || 'medium').trim();
    const expiryDate = String(req.body.expiryDate || '').trim();
    const payload = (await PageData.findOne({ page: 'school-notices' }))?.payload || {};
    const notices = Array.isArray(payload.notices) ? payload.notices : [];
    const nowIso = new Date().toISOString();

    const author = await User.findById(req.user.userId).select('firstName lastName');
    const notice = {
      id: buildId('notice'),
      title,
      content,
      category,
      priority,
      status: 'draft',
      views: 0,
      createdDate: nowIso.slice(0, 10),
      expiryDate,
      authorId: req.user.userId,
      author: author ? `${author.firstName} ${author.lastName}` : 'Admin',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    notices.unshift(notice);
    await PageData.findOneAndUpdate(
      { page: 'school-notices' },
      { page: 'school-notices', payload: { ...payload, notices } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ message: 'Notice created', notice });
  } catch (error) {
    console.error('Admin notice create error:', error);
    res.status(500).json({ error: 'Failed to create notice', message: error.message });
  }
});

router.put('/notices/:noticeId', async (req, res) => {
  try {
    const payload = (await PageData.findOne({ page: 'school-notices' }))?.payload || {};
    const notices = Array.isArray(payload.notices) ? payload.notices : [];
    const index = notices.findIndex((item) => String(item.id) === String(req.params.noticeId));
    if (index < 0) return res.status(404).json({ error: 'Notice not found' });

    notices[index] = {
      ...notices[index],
      title: req.body.title !== undefined ? String(req.body.title || '').trim() : notices[index].title,
      content: req.body.content !== undefined ? String(req.body.content || '').trim() : notices[index].content,
      category: req.body.category !== undefined ? String(req.body.category || '').trim() : notices[index].category,
      priority: req.body.priority !== undefined ? String(req.body.priority || '').trim() : notices[index].priority,
      expiryDate:
        req.body.expiryDate !== undefined ? String(req.body.expiryDate || '').trim() : notices[index].expiryDate,
      status: req.body.status !== undefined ? String(req.body.status || '').trim() : notices[index].status,
      updatedAt: new Date().toISOString(),
    };

    await PageData.findOneAndUpdate(
      { page: 'school-notices' },
      { page: 'school-notices', payload: { ...payload, notices } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ message: 'Notice updated', notice: notices[index] });
  } catch (error) {
    console.error('Admin notice update error:', error);
    res.status(500).json({ error: 'Failed to update notice', message: error.message });
  }
});

router.post('/notices/:noticeId/publish', async (req, res) => {
  try {
    const payload = (await PageData.findOne({ page: 'school-notices' }))?.payload || {};
    const notices = Array.isArray(payload.notices) ? payload.notices : [];
    const index = notices.findIndex((item) => String(item.id) === String(req.params.noticeId));
    if (index < 0) return res.status(404).json({ error: 'Notice not found' });

    notices[index] = {
      ...notices[index],
      status: 'active',
      updatedAt: new Date().toISOString(),
    };

    await PageData.findOneAndUpdate(
      { page: 'school-notices' },
      { page: 'school-notices', payload: { ...payload, notices } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const targetRole = String(req.body.targetRole || 'all').trim();
    const query = targetRole === 'all' ? { isActive: true } : { role: targetRole, isActive: true };
    const users = await User.find(query).select('_id');
    if (users.length) {
      await Notification.insertMany(
        users.map((user) => ({
          user: user._id,
          type: 'notice',
          title: notices[index].title,
          body: notices[index].content.slice(0, 160),
          data: { noticeId: notices[index].id, category: notices[index].category },
        }))
      );
    }

    res.json({ message: 'Notice published', notice: notices[index], notified: users.length });
  } catch (error) {
    console.error('Admin notice publish error:', error);
    res.status(500).json({ error: 'Failed to publish notice', message: error.message });
  }
});

router.get('/profile-edit-requests', async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    const query = {};
    if (status) query.status = status;

    const requests = await ProfileEditRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('user', 'firstName lastName username role email')
      .populate('reviewedBy', 'firstName lastName username');

    res.json(
      requests.map((item) => ({
        id: item._id,
        status: item.status,
        createdAt: item.createdAt,
        reviewedAt: item.reviewedAt,
        reviewReason: item.reviewReason || '',
        payload: item.payload || {},
        user: item.user
          ? {
              id: item.user._id,
              fullName: `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim(),
              username: item.user.username,
              email: item.user.email,
              role: item.user.role,
            }
          : null,
        reviewedBy: item.reviewedBy
          ? {
              id: item.reviewedBy._id,
              fullName: `${item.reviewedBy.firstName || ''} ${item.reviewedBy.lastName || ''}`.trim(),
            }
          : null,
      }))
    );
  } catch (error) {
    console.error('Profile edit requests fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile edit requests', message: error.message });
  }
});

router.post('/profile-edit-requests/:requestId/review', async (req, res) => {
  try {
    const action = String(req.body.action || '').trim().toLowerCase();
    const reviewReason = String(req.body.reviewReason || '').trim();
    if (!['approve', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'action must be approve or decline' });
    }

    const request = await ProfileEditRequest.findById(req.params.requestId).populate('user');
    if (!request) return res.status(404).json({ error: 'Profile edit request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already reviewed' });
    }
    if (!request.user) return res.status(404).json({ error: 'Request user not found' });

    if (action === 'approve') {
      await applyProfileUpdateForUser(request.user, request.payload || {});
      request.status = 'approved';
      request.reviewReason = reviewReason;
      request.reviewedBy = req.user.userId;
      request.reviewedAt = new Date();
      await request.save();

      await Notification.create({
        user: request.user._id,
        type: 'profile_edit_approved',
        title: 'Profile Edit Approved',
        body: 'Your profile changes were approved and are now live.',
        data: { requestId: request._id },
      });

      return res.json({ message: 'Profile edit request approved and applied', requestId: request._id });
    }

    request.status = 'declined';
    request.reviewReason = reviewReason || 'Request declined by admin';
    request.reviewedBy = req.user.userId;
    request.reviewedAt = new Date();
    await request.save();

    await Notification.create({
      user: request.user._id,
      type: 'profile_edit_declined',
      title: 'Profile Edit Declined',
      body: request.reviewReason,
      data: { requestId: request._id },
    });

    res.json({ message: 'Profile edit request declined', requestId: request._id });
  } catch (error) {
    console.error('Profile edit request review error:', error);
    res.status(500).json({ error: 'Failed to review profile edit request', message: error.message });
  }
});

module.exports = router;
