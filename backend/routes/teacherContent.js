const express = require('express');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const User = require('../models/User');
const Notification = require('../models/Notification');
const PageData = require('../models/PageData');
const Timetable = require('../models/Timetable');
const ClassRoom = require('../models/ClassRoom');

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

function requireTeacherOrAdmin(req, res, next) {
  if (!['teacher', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Teacher or admin access required' });
  }
  return next();
}

function requireStudentOrTeacher(req, res, next) {
  if (!['student', 'teacher'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Student or teacher access required' });
  }
  return next();
}

function requireTeacherOnly(req, res, next) {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Teacher access required' });
  }
  return next();
}

function buildId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function normalizeClassName(student) {
  return `${student.grade || ''}${student.section || ''}`;
}

function normalizeScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function scoreToGrade(score) {
  if (score === null) return 'N/A';
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C+';
  if (score >= 40) return 'C';
  return 'F';
}

function computeOverallFromAverage(avg) {
  if (!Number.isFinite(avg)) return 'N/A';
  if (avg >= 90) return 'A';
  if (avg >= 80) return 'B';
  if (avg >= 70) return 'C';
  if (avg >= 60) return 'D';
  return 'F';
}

function resolveTerm(examName) {
  const raw = String(examName || '').trim().toLowerCase();
  if (!raw) return 'Unknown';
  if (raw.includes('first') || raw.includes('term 1') || raw.includes('term1') || raw.includes('t1')) return 'First';
  if (raw.includes('second') || raw.includes('term 2') || raw.includes('term2') || raw.includes('t2')) return 'Second';
  if (raw.includes('third') || raw.includes('term 3') || raw.includes('term3') || raw.includes('t3')) return 'Third';
  return 'Unknown';
}

function classifyAssessment(examName, subjectName) {
  const source = `${String(examName || '')} ${String(subjectName || '')}`.toLowerCase();
  if (source.includes('formative') || source.includes('fa')) return 'formative';
  return 'exam';
}

function toSubjectIcon(subject) {
  const s = String(subject || '').toLowerCase();
  if (s.includes('math')) return '📐';
  if (s.includes('phy')) return '🧲';
  if (s.includes('chem')) return '🧪';
  if (s.includes('bio')) return '🧬';
  if (s.includes('eng')) return '📖';
  if (s.includes('geo')) return '🌍';
  if (s.includes('hist')) return '🏛️';
  if (s.includes('ict') || s.includes('comp')) return '💻';
  return '📘';
}

function teacherInitials(teacher) {
  if (!teacher) return '';
  return `${String(teacher.firstName || '').charAt(0)}${String(teacher.lastName || '').charAt(0)}`.toUpperCase();
}

function normalizeAttachmentInput(attachment) {
  if (!attachment || typeof attachment !== 'object') return null;
  const name = String(attachment.name || '').trim();
  const mimeType = String(attachment.mimeType || '').trim();
  const dataUrl = String(attachment.dataUrl || '').trim();
  if (!name || !dataUrl) return null;
  return {
    id: buildId('file'),
    name,
    mimeType,
    dataUrl,
    size: Number(attachment.size || 0) || 0,
  };
}

function uniqueStrings(items) {
  return [...new Set((Array.isArray(items) ? items : []).map((x) => String(x || '').trim()).filter(Boolean))];
}

function normalizeQaItem(item) {
  if (!item || typeof item !== 'object') return null;
  const tags = Array.isArray(item.tags)
    ? item.tags.map((tag) => String(tag || '').trim()).filter(Boolean)
    : String(item.tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
  const attachments = Array.isArray(item.attachments)
    ? item.attachments.map(normalizeAttachmentInput).filter(Boolean)
    : [];
  const replies = Array.isArray(item.replies)
    ? item.replies
        .map((reply) => {
          if (!reply || typeof reply !== 'object') return null;
          return {
            id: String(reply.id || buildId('reply')),
            content: String(reply.content || '').trim(),
            attachment: normalizeAttachmentInput(reply.attachment),
            createdAt: reply.createdAt || new Date().toISOString(),
            author: {
              id: String(reply.author?.id || ''),
              name: String(reply.author?.name || 'Unknown'),
              role: String(reply.author?.role || 'student'),
            },
          };
        })
        .filter(Boolean)
    : [];

  return {
    ...item,
    id: String(item.id || buildId('qa')),
    type: String(item.type || 'question').toLowerCase() === 'blog' ? 'blog' : 'question',
    title: String(item.title || '').trim(),
    content: String(item.content || '').trim(),
    subject: String(item.subject || '').trim(),
    category: String(item.category || '').trim(),
    tags,
    attachments,
    replies,
    status: String(item.status || 'pending').toLowerCase(),
    views: Number(item.views || 0) || 0,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    author: {
      id: String(item.author?.id || ''),
      name: String(item.author?.name || 'Unknown'),
      role: String(item.author?.role || 'student'),
    },
  };
}

async function getPagePayload(page, fallback) {
  const doc = await PageData.findOne({ page });
  if (!doc || typeof doc.payload !== 'object' || !doc.payload) return fallback;
  return doc.payload;
}

async function setPagePayload(page, payload) {
  const updated = await PageData.findOneAndUpdate(
    { page },
    { page, payload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return updated.payload;
}

async function createParentNotification(student, title, body, data) {
  const parentId =
    student?.parentUser || (Array.isArray(student?.parents) ? student.parents[0]?.parent : null);
  if (!parentId) return false;

  await Notification.create({
    user: parentId,
    type: data?.type || 'student_update',
    title,
    body,
    data: data || {},
  });
  return true;
}

router.get('/exam-routine', authenticateToken, async (req, res) => {
  try {
    const timetable = await Timetable.findOne({ active: true })
      .sort({ createdAt: -1 })
      .populate('entries.teacher', 'firstName lastName teacherProfile');
    const classes = await ClassRoom.find({ isActive: true }).sort({ name: 1 });

    const allEntries = Array.isArray(timetable?.entries) ? timetable.entries : [];

    let selectedClassName = String(req.query.className || '').trim();
    if (!selectedClassName && req.user.role === 'student') {
      const currentStudent = await Student.findOne({ user: req.user.userId });
      if (currentStudent) {
        selectedClassName = `${currentStudent.grade || ''}${currentStudent.section || ''}`;
      }
    }

    const entries = (selectedClassName
      ? allEntries.filter((entry) => String(entry.className) === selectedClassName)
      : allEntries
    ).map((entry) => ({
      ...(entry?.toObject ? entry.toObject() : entry),
      teacherName: entry.teacher ? `${entry.teacher.firstName || ''} ${entry.teacher.lastName || ''}`.trim() : '',
      teacherInitials: teacherInitials(entry.teacher),
    }));

    const classLessons = classes.flatMap((classDoc) => classDoc.lessons || []);
    const teacherLessons = allEntries.map((entry) => String(entry.subject || '').trim()).filter(Boolean);
    const lessonsCatalog = [...new Set([...classLessons, ...teacherLessons])].sort();

    const classesCatalog = [...new Set(classes.map((classDoc) => String(classDoc.name)).filter(Boolean))].sort();

    res.json({
      timetable: timetable
        ? {
            id: timetable._id,
            title: timetable.title,
            version: timetable.version,
            updatedAt: timetable.updatedAt,
          }
        : null,
      entries,
      allEntries,
      classes: classesCatalog,
      lessons: lessonsCatalog,
      selectedClassName: selectedClassName || '',
    });
  } catch (error) {
    console.error('Exam routine fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch exam routine', message: error.message });
  }
});

router.get('/exam-strategies', authenticateToken, async (req, res) => {
  try {
    const payload = await getPagePayload('exam-study-strategies', { items: [] });
    const allItems = Array.isArray(payload.items) ? payload.items : [];

    const className = String(req.query.className || '').trim();
    const studentObjectId = String(req.query.studentObjectId || '').trim();
    const search = String(req.query.search || '').trim().toLowerCase();

    let items = [...allItems];
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user.userId });
      const sid = String(student?._id || '');
      items = items.filter((item) => String(item.studentObjectId) === sid);
    } else if (studentObjectId) {
      items = items.filter((item) => String(item.studentObjectId) === studentObjectId);
    }

    if (className) {
      items = items.filter((item) => String(item.className || '') === className);
    }
    if (search) {
      items = items.filter(
        (item) =>
          String(item.studentName || '').toLowerCase().includes(search) ||
          String(item.strategyTitle || '').toLowerCase().includes(search) ||
          String(item.subject || '').toLowerCase().includes(search)
      );
    }

    items.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
    res.json({ items });
  } catch (error) {
    console.error('Exam strategies fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch exam strategies', message: error.message });
  }
});

router.get('/qa-posts', authenticateToken, requireStudentOrTeacher, async (req, res) => {
  try {
    const payload = await getPagePayload('student-qa-posts', { items: [] });
    const allItems = Array.isArray(payload.items) ? payload.items.map(normalizeQaItem).filter(Boolean) : [];
    const type = String(req.query.type || '').trim().toLowerCase();
    const subject = String(req.query.subject || '').trim();
    const search = String(req.query.search || '').trim().toLowerCase();
    const status = String(req.query.status || '').trim().toLowerCase();

    const items = allItems
      .filter((item) => {
        if (type && String(item.type || '').toLowerCase() !== type) return false;
        if (subject && String(item.subject || '') !== subject) return false;
        if (status && String(item.status || '').toLowerCase() !== status) return false;
        if (search) {
          const haystack = `${item.title || ''} ${item.content || ''} ${(item.tags || []).join(' ')} ${item.subject || ''}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

    res.json({
      items,
      subjects: [...new Set(items.map((item) => String(item.subject || '').trim()).filter(Boolean))].sort(),
      categories: [...new Set(items.map((item) => String(item.category || '').trim()).filter(Boolean))].sort(),
    });
  } catch (error) {
    console.error('QA posts fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch posts', message: error.message });
  }
});

router.post('/qa-posts', authenticateToken, requireStudentOrTeacher, async (req, res) => {
  try {
    const type = String(req.body.type || 'question').trim().toLowerCase();
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    const subject = String(req.body.subject || '').trim();
    const category = String(req.body.category || '').trim();
    const tags = Array.isArray(req.body.tags)
      ? [...new Set(req.body.tags.map((tag) => String(tag || '').trim()).filter(Boolean))]
      : [];
    const attachmentsInput = Array.isArray(req.body.attachments) ? req.body.attachments : [];
    const attachments = attachmentsInput.map(normalizeAttachmentInput).filter(Boolean);

    if (!['question', 'blog'].includes(type)) {
      return res.status(400).json({ error: 'type must be question or blog' });
    }
    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    const user = await User.findById(req.user.userId).select('firstName lastName role');
    if (!user || !['student', 'teacher'].includes(user.role)) {
      return res.status(403).json({ error: 'Only students and teachers can post' });
    }

    const payload = await getPagePayload('student-qa-posts', { items: [] });
    const items = Array.isArray(payload.items) ? payload.items : [];
    const nowIso = new Date().toISOString();
    const item = {
      id: buildId('qa'),
      type,
      title,
      content,
      subject,
      category,
      tags,
      status: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
      askedDate: nowIso.slice(0, 10),
      views: 0,
      replies: [],
      attachments,
      author: {
        id: String(user._id),
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
        role: user.role,
      },
    };
    items.unshift(item);
    await setPagePayload('student-qa-posts', { ...payload, items });
    res.status(201).json({ message: 'Post created', item });
  } catch (error) {
    console.error('QA post create error:', error);
    res.status(500).json({ error: 'Failed to create post', message: error.message });
  }
});

router.get('/qa-subject-options', authenticateToken, requireStudentOrTeacher, async (req, res) => {
  try {
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user.userId });
      if (!student) return res.json({ className: '', subjects: [] });
      const className = `${student.grade || ''}${student.section || ''}`;
      const classDoc = await ClassRoom.findOne({ name: className, isActive: true }).select('name lessons');
      return res.json({
        className,
        subjects: uniqueStrings(classDoc?.lessons || []),
      });
    }

    const classes = await ClassRoom.find({ isActive: true }).select('name lessons').sort({ name: 1 });
    const subjects = uniqueStrings(classes.flatMap((c) => c.lessons || []));
    res.json({
      className: '',
      subjects,
      classes: classes.map((c) => ({ name: c.name, lessons: uniqueStrings(c.lessons || []) })),
    });
  } catch (error) {
    console.error('QA subject options error:', error);
    res.status(500).json({ error: 'Failed to load subject options', message: error.message });
  }
});

router.put('/qa-posts/:id', authenticateToken, requireStudentOrTeacher, async (req, res) => {
  try {
    const payload = await getPagePayload('student-qa-posts', { items: [] });
    const items = Array.isArray(payload.items) ? payload.items.map(normalizeQaItem).filter(Boolean) : [];
    const index = items.findIndex((item) => String(item.id) === String(req.params.id));
    if (index < 0) return res.status(404).json({ error: 'Post not found' });

    const current = items[index];
    const isAuthor = String(current.author?.id || '') === String(req.user.userId || '');
    if (!isAuthor) {
      return res.status(403).json({ error: 'Only the post author can edit this post' });
    }

    const title = req.body.title !== undefined ? String(req.body.title || '').trim() : current.title;
    const content = req.body.content !== undefined ? String(req.body.content || '').trim() : current.content;
    const subject = req.body.subject !== undefined ? String(req.body.subject || '').trim() : current.subject;
    const category = req.body.category !== undefined ? String(req.body.category || '').trim() : current.category;
    const tags =
      req.body.tags !== undefined
        ? uniqueStrings(Array.isArray(req.body.tags) ? req.body.tags : String(req.body.tags || '').split(','))
        : current.tags || [];
    const attachments =
      req.body.attachments !== undefined
        ? (Array.isArray(req.body.attachments) ? req.body.attachments : [])
            .map(normalizeAttachmentInput)
            .filter(Boolean)
        : current.attachments || [];

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    items[index] = {
      ...current,
      title,
      content,
      subject,
      category,
      tags,
      attachments,
      updatedAt: new Date().toISOString(),
      editedAt: new Date().toISOString(),
    };

    await setPagePayload('student-qa-posts', { ...payload, items });
    res.json({ message: 'Post updated', item: items[index] });
  } catch (error) {
    console.error('QA post update error:', error);
    res.status(500).json({ error: 'Failed to update post', message: error.message });
  }
});

router.post('/qa-posts/:id/replies', authenticateToken, requireStudentOrTeacher, async (req, res) => {
  try {
    const content = String(req.body.content || '').trim();
    const attachment = normalizeAttachmentInput(req.body.attachment);
    if (!content && !attachment) {
      return res.status(400).json({ error: 'Reply content or attachment is required' });
    }

    const user = await User.findById(req.user.userId).select('firstName lastName role');
    if (!user || !['student', 'teacher'].includes(user.role)) {
      return res.status(403).json({ error: 'Only students and teachers can reply' });
    }

    const payload = await getPagePayload('student-qa-posts', { items: [] });
    const items = Array.isArray(payload.items) ? payload.items.map(normalizeQaItem).filter(Boolean) : [];
    const index = items.findIndex((item) => String(item.id) === String(req.params.id));
    if (index < 0) return res.status(404).json({ error: 'Post not found' });

    const nowIso = new Date().toISOString();
    const reply = {
      id: buildId('reply'),
      content,
      attachment: attachment || null,
      createdAt: nowIso,
      author: {
        id: String(user._id),
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
        role: user.role,
      },
    };

    const next = {
      ...items[index],
      replies: [...(Array.isArray(items[index].replies) ? items[index].replies : []), reply],
      status: 'answered',
      updatedAt: nowIso,
    };
    items[index] = next;
    await setPagePayload('student-qa-posts', { ...payload, items });

    if (next.author?.id && String(next.author.id) !== String(user._id)) {
      await Notification.create({
        user: next.author.id,
        type: 'qa_reply',
        title: 'New reply to your post',
        body: `${reply.author.name} replied to "${next.title}".`,
        data: { postId: next.id, replyId: reply.id },
      });
    }

    res.status(201).json({ message: 'Reply added', post: next, reply });
  } catch (error) {
    console.error('QA reply error:', error);
    res.status(500).json({ error: 'Failed to add reply', message: error.message });
  }
});

router.post('/qa-posts/:id/view', authenticateToken, requireStudentOrTeacher, async (req, res) => {
  try {
    const payload = await getPagePayload('student-qa-posts', { items: [] });
    const items = Array.isArray(payload.items) ? payload.items.map(normalizeQaItem).filter(Boolean) : [];
    const index = items.findIndex((item) => String(item.id) === String(req.params.id));
    if (index < 0) return res.status(404).json({ error: 'Post not found' });
    items[index] = {
      ...items[index],
      views: Number(items[index].views || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    await setPagePayload('student-qa-posts', { ...payload, items });
    res.json({ message: 'View count updated', views: items[index].views });
  } catch (error) {
    console.error('QA view update error:', error);
    res.status(500).json({ error: 'Failed to update view count', message: error.message });
  }
});

router.get('/student/notices', authenticateToken, async (req, res) => {
  try {
    const payload = await getPagePayload('school-notices', { notices: [] });
    const notices = Array.isArray(payload.notices) ? payload.notices : [];
    const now = new Date();

    const published = notices.filter((notice) => {
      const status = String(notice.status || '').toLowerCase();
      if (status && status !== 'active') return false;
      const expiryDate = String(notice.expiryDate || '').trim();
      if (expiryDate) {
        const expiry = new Date(`${expiryDate}T23:59:59`);
        if (!Number.isNaN(expiry.getTime()) && expiry < now) return false;
      }
      return true;
    });

    const userNoticeNotifications = await Notification.find({
      user: req.user.userId,
      type: 'notice',
      'data.noticeId': { $exists: true },
    })
      .select('_id isRead createdAt data.noticeId')
      .sort({ createdAt: -1 });

    const noticeNotificationMap = new Map();
    for (const item of userNoticeNotifications) {
      const noticeId = String(item?.data?.noticeId || '').trim();
      if (!noticeId) continue;
      if (!noticeNotificationMap.has(noticeId)) {
        noticeNotificationMap.set(noticeId, {
          id: String(item._id),
          isRead: Boolean(item.isRead),
        });
      } else if (!item.isRead) {
        noticeNotificationMap.set(noticeId, {
          id: String(item._id),
          isRead: false,
        });
      }
    }

    const categoryMeta = {
      announcement: { label: 'Announcement', icon: '📢' },
      academic: { label: 'Academic', icon: '📘' },
      sports: { label: 'Sports', icon: '🏅' },
      facility: { label: 'Facility', icon: '🏫' },
      meeting: { label: 'Meeting', icon: '🗓️' },
      event: { label: 'Event', icon: '🎉' },
      exam: { label: 'Exam', icon: '📝' },
      fee: { label: 'Fees', icon: '💳' },
      discipline: { label: 'Discipline', icon: '⚖️' },
      transport: { label: 'Transport', icon: '🚌' },
    };

    const normalized = published
      .map((notice) => {
        const id = String(notice.id || '');
        const createdAt = notice.createdAt ? new Date(notice.createdAt) : new Date();
        const notificationState = noticeNotificationMap.get(id);
        const categoryKey = String(notice.category || 'announcement').toLowerCase();
        return {
          id,
          title: String(notice.title || ''),
          content: String(notice.content || ''),
          category: categoryKey,
          priority: String(notice.priority || 'medium').toLowerCase(),
          author: String(notice.author || 'School'),
          date: createdAt.toLocaleDateString(),
          time: createdAt.toLocaleTimeString(),
          icon: categoryMeta[categoryKey]?.icon || '📢',
          isRead: notificationState ? Boolean(notificationState.isRead) : false,
          notificationId: notificationState ? notificationState.id : null,
          createdAt: createdAt.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const uniqueCategories = [...new Set(normalized.map((n) => String(n.category || '').trim()).filter(Boolean))];
    const categories = [
      { id: 'all', label: 'All', icon: '📰' },
      ...uniqueCategories.map((id) => ({
        id,
        label: categoryMeta[id]?.label || id,
        icon: categoryMeta[id]?.icon || '📌',
      })),
    ];

    res.json({ notices: normalized, categories });
  } catch (error) {
    console.error('Student notices fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch student notices', message: error.message });
  }
});

router.get('/student/homework', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Student access required' });
    }

    const student = await Student.findOne({ user: req.user.userId });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const className = `${student.grade || ''}${student.section || ''}`;
    const payload = await getPagePayload('teacher-homework', { items: [] });
    const rawItems = Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.homeworkList)
      ? payload.homeworkList
      : [];

    const normalized = rawItems
      .filter((item) => {
        const itemClass = String(item.className || item.class || '').trim();
        if (!itemClass) return true;
        return itemClass === className;
      })
      .map((item) => {
        const dueRaw = String(item.dueDate || '').trim();
        const due = dueRaw ? new Date(dueRaw) : null;
        const dueDate = due && !Number.isNaN(due.getTime()) ? due.toLocaleDateString() : dueRaw;
        const dueTime = due && !Number.isNaN(due.getTime()) ? due.toLocaleTimeString() : '--';
        const subject = String(item.subject || 'General').trim() || 'General';
        const status = String(item.status || 'pending').trim().toLowerCase();
        const priority = String(item.priority || 'medium').trim().toLowerCase();
        const submissions = Number(item.submissions || 0);
        const totalStudents = Number(item.totalStudents || 0);
        return {
          id: String(item.id || buildId('hw')),
          title: String(item.title || 'Homework').trim(),
          subject,
          subjectIcon: toSubjectIcon(subject),
          description: String(item.description || '').trim() || 'No description provided.',
          dueDate,
          dueTime,
          dueDateRaw: dueRaw,
          status,
          priority,
          fileSize:
            submissions && totalStudents
              ? `${submissions}/${totalStudents} submitted`
              : `${submissions || 0} submitted`,
        };
      })
      .sort((a, b) => new Date(a.dueDateRaw || 0) - new Date(b.dueDateRaw || 0));

    res.json({ homeworkList: normalized, className });
  } catch (error) {
    console.error('Student homework fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch student homework', message: error.message });
  }
});

router.get('/student/report-card', authenticateToken, async (req, res) => {
  try {
    let student = null;
    if (req.user.role === 'student') {
      student = await Student.findOne({ user: req.user.userId }).populate('user', 'firstName lastName');
    } else if (['teacher', 'admin'].includes(req.user.role) && req.query.studentObjectId) {
      student = await Student.findById(String(req.query.studentObjectId)).populate('user', 'firstName lastName');
    } else {
      return res.status(403).json({ error: 'Student access required' });
    }

    if (!student) return res.status(404).json({ error: 'Student not found' });

    const payload = await getPagePayload('teacher-results-records', { records: [] });
    const records = Array.isArray(payload.records) ? payload.records : [];
    const studentRecords = records
      .filter((record) => String(record.studentObjectId) === String(student._id))
      .sort((a, b) => new Date(a.createdAt || a.updatedAt || 0) - new Date(b.createdAt || b.updatedAt || 0));

    const grouped = {};
    for (const record of studentRecords) {
      const term = resolveTerm(record.exam);
      const subject = String(record.subject || '').trim() || 'General';
      const score = Number(record.score);
      if (!Number.isFinite(score)) continue;
      if (!grouped[term]) grouped[term] = {};
      if (!grouped[term][subject]) grouped[term][subject] = [];
      grouped[term][subject].push({
        score,
        exam: String(record.exam || '').trim(),
        grade: String(record.grade || scoreToGrade(score)),
        type: classifyAssessment(record.exam, record.subject),
      });
    }

    const termOrder = ['First', 'Second', 'Third', 'Unknown'];
    const termResults = termOrder
      .filter((term) => grouped[term])
      .map((term, idx) => {
        const subjectEntries = Object.entries(grouped[term]).map(([name, marks]) => {
          const formative = marks.filter((m) => m.type === 'formative').map((m) => Number(m.score));
          const exams = marks.filter((m) => m.type === 'exam').map((m) => Number(m.score));
          const avg =
            marks.length > 0
              ? Math.round((marks.reduce((sum, m) => sum + Number(m.score || 0), 0) / marks.length) * 100) / 100
              : 0;
          return {
            name,
            icon: toSubjectIcon(name),
            formativeScore: formative.length
              ? Math.round((formative.reduce((sum, n) => sum + n, 0) / formative.length) * 100) / 100
              : null,
            examScore: exams.length
              ? Math.round((exams.reduce((sum, n) => sum + n, 0) / exams.length) * 100) / 100
              : null,
            score: avg,
            grade: scoreToGrade(avg),
            records: marks,
          };
        });

        const overallScore = subjectEntries.length
          ? Math.round((subjectEntries.reduce((sum, s) => sum + Number(s.score || 0), 0) / subjectEntries.length) * 100) /
            100
          : 0;

        return {
          id: idx + 1,
          term,
          title: `${term} Term`,
          date: new Date().toLocaleDateString(),
          overallScore,
          overallGrade: scoreToGrade(overallScore),
          rank: '-',
          totalStudents: '-',
          subjects: subjectEntries.sort((a, b) => a.name.localeCompare(b.name)),
        };
      });

    const allTermScores = termResults.map((t) => Number(t.overallScore || 0)).filter(Number.isFinite);
    const yearlyAverage = allTermScores.length
      ? Math.round((allTermScores.reduce((sum, n) => sum + n, 0) / allTermScores.length) * 100) / 100
      : 0;
    const yearlyGpa = Math.round((yearlyAverage / 25) * 100) / 100;
    const promoted = yearlyAverage >= 50;

    res.json({
      student: {
        id: String(student._id),
        studentId: student.studentId,
        fullName: `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || student.studentId,
        className: normalizeClassName(student),
      },
      terms: termResults,
      yearly: {
        average: yearlyAverage,
        grade: computeOverallFromAverage(yearlyAverage),
        gpa: yearlyGpa,
        status: promoted ? 'Promoted' : 'Repeated',
      },
      performance: {
        gpa: Number(student.performance?.gpa || yearlyGpa || 0),
        overallGrade: student.performance?.overallGrade || computeOverallFromAverage(yearlyAverage),
      },
    });
  } catch (error) {
    console.error('Student report card error:', error);
    res.status(500).json({ error: 'Failed to fetch student report card', message: error.message });
  }
});

router.patch('/qa-posts/:id/status', authenticateToken, requireTeacherOnly, async (req, res) => {
  try {
    const status = String(req.body.status || '').trim().toLowerCase();
    if (!['closed', 'pending', 'answered'].includes(status)) {
      return res.status(400).json({ error: 'status must be closed, pending, or answered' });
    }

    const payload = await getPagePayload('student-qa-posts', { items: [] });
    const items = Array.isArray(payload.items) ? payload.items.map(normalizeQaItem).filter(Boolean) : [];
    const index = items.findIndex((item) => String(item.id) === String(req.params.id));
    if (index < 0) return res.status(404).json({ error: 'Post not found' });

    const current = items[index];
    const next = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
      moderatedBy: req.user.userId,
    };
    items[index] = next;
    await setPagePayload('student-qa-posts', { ...payload, items });

    if (current.author?.id) {
      await Notification.create({
        user: current.author.id,
        type: 'qa_moderation',
        title: `Post ${status === 'closed' ? 'Closed' : 'Reopened'}`,
        body: `Your post "${current.title}" status is now ${status}.`,
        data: { postId: current.id, status },
      });
    }

    res.json({ message: 'Post status updated', post: next });
  } catch (error) {
    console.error('QA moderation error:', error);
    res.status(500).json({ error: 'Failed to moderate post', message: error.message });
  }
});

router.use(authenticateToken, requireTeacherOrAdmin);

router.get('/results', async (req, res) => {
  try {
    const className = String(req.query.className || '').trim();
    const search = String(req.query.search || '').trim().toLowerCase();
    const exam = String(req.query.exam || '').trim();
    const subject = String(req.query.subject || '').trim();

    const students = await Student.find({
      $or: [{ isActive: true }, { isActive: { $exists: false } }],
    }).populate('user', 'firstName lastName');

    const payload = await getPagePayload('teacher-results-records', { records: [] });
    const records = Array.isArray(payload.records) ? payload.records : [];

    const list = students
      .map((student) => {
        const studentClass = normalizeClassName(student);
        const fullName = `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || student.studentId;

        if (className && className !== studentClass) return null;
        if (
          search &&
          !fullName.toLowerCase().includes(search) &&
          !String(student.studentId || '').toLowerCase().includes(search)
        ) {
          return null;
        }

        const studentRecords = records.filter(
          (record) =>
            String(record.studentObjectId) === String(student._id) &&
            (!exam || String(record.exam) === exam) &&
            (!subject || String(record.subject) === subject)
        );
        const latest = studentRecords.sort(
          (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
        )[0];

        return {
          id: String(student._id),
          studentId: student.studentId,
          name: fullName,
          className: studentClass,
          attendance: Number(student.attendance?.totalDays || 0)
            ? Math.round(((student.attendance?.presentDays || 0) / (student.attendance?.totalDays || 1)) * 100)
            : 0,
          report: latest || null,
          performance: {
            overallGrade: student.performance?.overallGrade || 'N/A',
            gpa: student.performance?.gpa || 0,
          },
        };
      })
      .filter(Boolean);

    const availableClasses = [...new Set(list.map((x) => x.className).filter(Boolean))].sort();
    const exams = [...new Set(records.map((x) => String(x.exam || '').trim()).filter(Boolean))].sort();
    const subjects = [...new Set(records.map((x) => String(x.subject || '').trim()).filter(Boolean))].sort();

    res.json({
      students: list,
      classes: availableClasses,
      exams,
      subjects,
    });
  } catch (error) {
    console.error('Teacher results fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch results', message: error.message });
  }
});

router.put('/results/student/:studentObjectId', async (req, res) => {
  try {
    const { studentObjectId } = req.params;
    const exam = String(req.body.exam || '').trim();
    const subject = String(req.body.subject || '').trim();
    const remarks = String(req.body.remarks || '').trim();
    const score = normalizeScore(req.body.score);

    if (!exam || !subject || score === null) {
      return res.status(400).json({ error: 'exam, subject, and numeric score are required' });
    }

    const student = await Student.findById(studentObjectId).populate('user', 'firstName lastName');
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const payload = await getPagePayload('teacher-results-records', { records: [] });
    const records = Array.isArray(payload.records) ? payload.records : [];
    const nowIso = new Date().toISOString();
    const grade = scoreToGrade(score);

    const index = records.findIndex(
      (record) =>
        String(record.studentObjectId) === String(student._id) &&
        String(record.exam) === exam &&
        String(record.subject) === subject
    );

    const nextRecord = {
      id: index >= 0 ? records[index].id : buildId('report'),
      studentObjectId: String(student._id),
      studentId: student.studentId,
      studentName: `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || student.studentId,
      className: normalizeClassName(student),
      exam,
      subject,
      score,
      grade,
      remarks,
      updatedBy: req.user.userId,
      updatedAt: nowIso,
      createdAt: index >= 0 ? records[index].createdAt : nowIso,
    };

    if (index >= 0) {
      records[index] = nextRecord;
    } else {
      records.push(nextRecord);
    }

    await setPagePayload('teacher-results-records', { records });

    const studentScores = records
      .filter((record) => String(record.studentObjectId) === String(student._id))
      .map((record) => Number(record.score))
      .filter(Number.isFinite);
    const avg = studentScores.length
      ? Math.round((studentScores.reduce((sum, n) => sum + n, 0) / studentScores.length) * 100) / 100
      : 0;

    student.performance.gpa = Math.round((avg / 25) * 100) / 100;
    student.performance.overallGrade = computeOverallFromAverage(avg);
    await student.save();

    res.json({
      message: 'Student report updated',
      record: nextRecord,
      performance: student.performance,
    });
  } catch (error) {
    console.error('Teacher results update error:', error);
    res.status(500).json({ error: 'Failed to update report', message: error.message });
  }
});

router.post('/results/send-to-parents', async (req, res) => {
  try {
    const className = String(req.body.className || '').trim();
    const exam = String(req.body.exam || '').trim();
    const subject = String(req.body.subject || '').trim();

    if (!exam || !subject) {
      return res.status(400).json({ error: 'exam and subject are required' });
    }

    const payload = await getPagePayload('teacher-results-records', { records: [] });
    const records = Array.isArray(payload.records) ? payload.records : [];
    const selected = records.filter(
      (record) => record.exam === exam && record.subject === subject && (!className || record.className === className)
    );
    if (!selected.length) return res.status(400).json({ error: 'No reports found for this filter' });

    const students = await Student.find({ _id: { $in: selected.map((x) => x.studentObjectId) } })
      .populate('user', 'firstName lastName')
      .populate('parentUser', 'firstName lastName');

    let sent = 0;
    for (const student of students) {
      const report = selected.find((x) => String(x.studentObjectId) === String(student._id));
      if (!report) continue;
      const body = `${student.user?.firstName || 'Student'} scored ${report.score}% (${report.grade}) in ${subject} - ${exam}.`;
      const ok = await createParentNotification(student, 'Result Update', body, {
        type: 'result_update',
        studentObjectId: student._id,
        exam,
        subject,
        score: report.score,
        grade: report.grade,
      });
      if (ok) sent += 1;
    }

    res.json({ message: 'Results shared with parents', sent });
  } catch (error) {
    console.error('Teacher results notify error:', error);
    res.status(500).json({ error: 'Failed to notify parents', message: error.message });
  }
});

router.get('/homework', async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    const className = String(req.query.className || '').trim();
    const payload = await getPagePayload('teacher-homework', { items: [] });
    const items = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.homeworkList) ? payload.homeworkList : [];

    const filtered = items.filter((item) => {
      if (status && String(item.status) !== status) return false;
      if (className && String(item.className || item.class) !== className) return false;
      return true;
    });

    res.json({ items: filtered });
  } catch (error) {
    console.error('Homework fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch homework', message: error.message });
  }
});

router.post('/homework', async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    const className = String(req.body.className || '').trim();
    const subject = String(req.body.subject || '').trim();
    const dueDate = String(req.body.dueDate || '').trim();
    const description = String(req.body.description || '').trim();
    if (!title || !className || !subject || !dueDate) {
      return res.status(400).json({ error: 'title, className, subject, and dueDate are required' });
    }

    const payload = await getPagePayload('teacher-homework', { items: [] });
    const items = Array.isArray(payload.items) ? payload.items : [];
    const nowIso = new Date().toISOString();
    const item = {
      id: buildId('hw'),
      title,
      className,
      subject,
      dueDate,
      description,
      status: 'active',
      priority: String(req.body.priority || 'medium').trim(),
      submissions: Number(req.body.submissions || 0),
      totalStudents: Number(req.body.totalStudents || 0),
      createdBy: req.user.userId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    items.unshift(item);

    await setPagePayload('teacher-homework', { ...payload, items });
    res.status(201).json({ message: 'Homework created', item });
  } catch (error) {
    console.error('Homework create error:', error);
    res.status(500).json({ error: 'Failed to create homework', message: error.message });
  }
});

router.put('/homework/:id', async (req, res) => {
  try {
    const payload = await getPagePayload('teacher-homework', { items: [] });
    const items = Array.isArray(payload.items) ? payload.items : [];
    const index = items.findIndex((item) => String(item.id) === String(req.params.id));
    if (index < 0) return res.status(404).json({ error: 'Homework item not found' });

    const current = items[index];
    const next = {
      ...current,
      title: req.body.title !== undefined ? String(req.body.title || '').trim() : current.title,
      className: req.body.className !== undefined ? String(req.body.className || '').trim() : current.className,
      subject: req.body.subject !== undefined ? String(req.body.subject || '').trim() : current.subject,
      dueDate: req.body.dueDate !== undefined ? String(req.body.dueDate || '').trim() : current.dueDate,
      description: req.body.description !== undefined ? String(req.body.description || '').trim() : current.description,
      status: req.body.status !== undefined ? String(req.body.status || '').trim() : current.status,
      priority: req.body.priority !== undefined ? String(req.body.priority || '').trim() : current.priority,
      submissions:
        req.body.submissions !== undefined ? Number(req.body.submissions || 0) : Number(current.submissions || 0),
      totalStudents:
        req.body.totalStudents !== undefined
          ? Number(req.body.totalStudents || 0)
          : Number(current.totalStudents || 0),
      updatedAt: new Date().toISOString(),
    };

    items[index] = next;
    await setPagePayload('teacher-homework', { ...payload, items });
    res.json({ message: 'Homework updated', item: next });
  } catch (error) {
    console.error('Homework update error:', error);
    res.status(500).json({ error: 'Failed to update homework', message: error.message });
  }
});

router.get('/notices', async (req, res) => {
  try {
    const category = String(req.query.category || '').trim();
    const priority = String(req.query.priority || '').trim();
    const payload = await getPagePayload('school-notices', { notices: [] });
    const notices = Array.isArray(payload.notices) ? payload.notices : [];

    const filtered = notices.filter((notice) => {
      if (category && String(notice.category || '') !== category) return false;
      if (priority && String(notice.priority || '') !== priority) return false;
      return true;
    });

    res.json({ notices: filtered });
  } catch (error) {
    console.error('Notices fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch notices', message: error.message });
  }
});

router.post('/notices', async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    const category = String(req.body.category || 'announcement').trim();
    const priority = String(req.body.priority || 'medium').trim();
    const expiryDate = String(req.body.expiryDate || '').trim();
    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    const author = await User.findById(req.user.userId).select('firstName lastName');
    const payload = await getPagePayload('school-notices', { notices: [] });
    const notices = Array.isArray(payload.notices) ? payload.notices : [];
    const nowIso = new Date().toISOString();

    const notice = {
      id: buildId('notice'),
      title,
      content,
      category,
      priority,
      status: 'draft',
      views: 0,
      authorId: req.user.userId,
      author: author ? `${author.firstName} ${author.lastName}` : 'Staff',
      createdDate: nowIso.slice(0, 10),
      expiryDate,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    notices.unshift(notice);
    await setPagePayload('school-notices', { ...payload, notices });
    res.status(201).json({ message: 'Notice created', notice });
  } catch (error) {
    console.error('Notice create error:', error);
    res.status(500).json({ error: 'Failed to create notice', message: error.message });
  }
});

router.put('/notices/:id', async (req, res) => {
  try {
    const payload = await getPagePayload('school-notices', { notices: [] });
    const notices = Array.isArray(payload.notices) ? payload.notices : [];
    const index = notices.findIndex((item) => String(item.id) === String(req.params.id));
    if (index < 0) return res.status(404).json({ error: 'Notice not found' });

    const current = notices[index];
    const next = {
      ...current,
      title: req.body.title !== undefined ? String(req.body.title || '').trim() : current.title,
      content: req.body.content !== undefined ? String(req.body.content || '').trim() : current.content,
      category: req.body.category !== undefined ? String(req.body.category || '').trim() : current.category,
      priority: req.body.priority !== undefined ? String(req.body.priority || '').trim() : current.priority,
      expiryDate: req.body.expiryDate !== undefined ? String(req.body.expiryDate || '').trim() : current.expiryDate,
      status: req.body.status !== undefined ? String(req.body.status || '').trim() : current.status,
      updatedAt: new Date().toISOString(),
    };
    notices[index] = next;
    await setPagePayload('school-notices', { ...payload, notices });
    res.json({ message: 'Notice updated', notice: next });
  } catch (error) {
    console.error('Notice update error:', error);
    res.status(500).json({ error: 'Failed to update notice', message: error.message });
  }
});

router.post('/notices/:id/publish', async (req, res) => {
  try {
    const payload = await getPagePayload('school-notices', { notices: [] });
    const notices = Array.isArray(payload.notices) ? payload.notices : [];
    const index = notices.findIndex((item) => String(item.id) === String(req.params.id));
    if (index < 0) return res.status(404).json({ error: 'Notice not found' });

    notices[index] = {
      ...notices[index],
      status: 'active',
      updatedAt: new Date().toISOString(),
    };
    await setPagePayload('school-notices', { ...payload, notices });

    const targetRole = String(req.body.targetRole || 'all').trim();
    const query =
      targetRole === 'all'
        ? { isActive: true }
        : {
            role: targetRole,
            isActive: true,
          };
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
    console.error('Notice publish error:', error);
    res.status(500).json({ error: 'Failed to publish notice', message: error.message });
  }
});

router.post('/exam-strategies', async (req, res) => {
  try {
    const studentObjectId = String(req.body.studentObjectId || '').trim();
    const strategyTitle = String(req.body.strategyTitle || '').trim();
    const strategyDetails = String(req.body.strategyDetails || '').trim();
    const subject = String(req.body.subject || '').trim();
    const targetExamDate = String(req.body.targetExamDate || '').trim();
    const className = String(req.body.className || '').trim();
    const attachment = req.body.attachment && typeof req.body.attachment === 'object' ? req.body.attachment : null;

    if (!studentObjectId || !strategyTitle || !strategyDetails || !subject || !targetExamDate) {
      return res.status(400).json({
        error: 'studentObjectId, strategyTitle, strategyDetails, subject, and targetExamDate are required',
      });
    }

    const student = await Student.findById(studentObjectId).populate('user', 'firstName lastName');
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const payload = await getPagePayload('exam-study-strategies', { items: [] });
    const items = Array.isArray(payload.items) ? payload.items : [];
    const nowIso = new Date().toISOString();

    const strategy = {
      id: buildId('strategy'),
      studentObjectId: String(student._id),
      studentId: student.studentId,
      studentName: `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || student.studentId,
      className: className || normalizeClassName(student),
      subject,
      strategyTitle,
      strategyDetails,
      targetExamDate,
      attachment: attachment
        ? {
            name: String(attachment.name || '').trim(),
            mimeType: String(attachment.mimeType || '').trim(),
            dataUrl: String(attachment.dataUrl || '').trim(),
          }
        : null,
      createdBy: req.user.userId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    items.unshift(strategy);
    await setPagePayload('exam-study-strategies', { ...payload, items });

    if (student.user) {
      await Notification.create({
        user: student.user,
        type: 'exam_strategy',
        title: 'New Exam Strategy',
        body: `${strategy.strategyTitle} was added for ${strategy.subject}.`,
        data: { strategyId: strategy.id, subject: strategy.subject, examDate: strategy.targetExamDate },
      });
    }

    res.status(201).json({ message: 'Study strategy added', strategy });
  } catch (error) {
    console.error('Create exam strategy error:', error);
    res.status(500).json({ error: 'Failed to create exam strategy', message: error.message });
  }
});

router.put('/exam-strategies/:id', async (req, res) => {
  try {
    const payload = await getPagePayload('exam-study-strategies', { items: [] });
    const items = Array.isArray(payload.items) ? payload.items : [];
    const index = items.findIndex((item) => String(item.id) === String(req.params.id));
    if (index < 0) return res.status(404).json({ error: 'Study strategy not found' });

    const current = items[index];
    const attachment = req.body.attachment && typeof req.body.attachment === 'object' ? req.body.attachment : undefined;
    const next = {
      ...current,
      subject: req.body.subject !== undefined ? String(req.body.subject || '').trim() : current.subject,
      strategyTitle:
        req.body.strategyTitle !== undefined ? String(req.body.strategyTitle || '').trim() : current.strategyTitle,
      strategyDetails:
        req.body.strategyDetails !== undefined
          ? String(req.body.strategyDetails || '').trim()
          : current.strategyDetails,
      targetExamDate:
        req.body.targetExamDate !== undefined
          ? String(req.body.targetExamDate || '').trim()
          : current.targetExamDate,
      className: req.body.className !== undefined ? String(req.body.className || '').trim() : current.className,
      attachment:
        attachment !== undefined
          ? {
              name: String(attachment.name || '').trim(),
              mimeType: String(attachment.mimeType || '').trim(),
              dataUrl: String(attachment.dataUrl || '').trim(),
            }
          : current.attachment || null,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.userId,
    };
    items[index] = next;
    await setPagePayload('exam-study-strategies', { ...payload, items });
    res.json({ message: 'Study strategy updated', strategy: next });
  } catch (error) {
    console.error('Update exam strategy error:', error);
    res.status(500).json({ error: 'Failed to update exam strategy', message: error.message });
  }
});

module.exports = router;
