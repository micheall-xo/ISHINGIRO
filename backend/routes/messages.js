const express = require('express');
const jwt = require('jsonwebtoken');
const { EventEmitter } = require('events');
const Message = require('../models/Message');
const User = require('../models/User');
const Student = require('../models/Student');
const { generateUniqueStudentId } = require('../utils/studentId');

const router = express.Router();
const messageBus = new EventEmitter();
messageBus.setMaxListeners(200);

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

async function parentCanMessageStudent(parentId, studentUserId) {
  const student = await Student.findOne({
    user: studentUserId,
    $or: [{ parentUser: parentId }, { 'parents.parent': parentId }],
  });
  return Boolean(student);
}

async function validateReceiverAccess(sender, receiver) {
  if (sender.role !== 'parent') return true;
  if (['admin', 'teacher'].includes(receiver.role)) return true;
  if (receiver.role === 'student') {
    return parentCanMessageStudent(sender.userId, receiver._id);
  }
  return false;
}

async function canViewProfile(viewer, target) {
  if (!viewer || !target) return false;
  if (String(viewer._id) === String(target._id)) return true;
  if (viewer.role === 'admin') return true;

  if (viewer.role === 'parent') {
    if (['admin', 'teacher'].includes(target.role)) return true;
    if (target.role === 'student') {
      return parentCanMessageStudent(viewer._id, target._id);
    }
    return false;
  }

  if (viewer.role === 'teacher') {
    return ['admin', 'teacher', 'parent', 'student'].includes(target.role);
  }

  if (viewer.role === 'student') {
    return target.role === 'admin';
  }

  return false;
}

router.use(authenticateToken);

router.get('/contacts', async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId).select('_id role firstName lastName');
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    let contacts = [];

    if (currentUser.role === 'parent') {
      const [admins, teachers, myStudents] = await Promise.all([
        User.find({ role: 'admin', isActive: true }).select('_id role firstName lastName profilePicture'),
        User.find({ role: 'teacher', isActive: true }).select('_id role firstName lastName profilePicture'),
        Student.find({
          $or: [{ parentUser: currentUser._id }, { 'parents.parent': currentUser._id }],
        }).populate('user', '_id role firstName lastName profilePicture'),
      ]);

      contacts = [
        ...admins,
        ...teachers,
        ...myStudents.map((s) => s.user).filter(Boolean),
      ];
    } else if (currentUser.role === 'teacher') {
      const [admins, parents] = await Promise.all([
        User.find({ role: 'admin', isActive: true }).select('_id role firstName lastName profilePicture'),
        User.find({ role: 'parent', isActive: true }).select('_id role firstName lastName profilePicture'),
      ]);
      contacts = [...admins, ...parents];
    } else if (currentUser.role === 'student') {
      const admins = await User.find({ role: 'admin', isActive: true }).select(
        '_id role firstName lastName profilePicture'
      );
      contacts = admins;
    } else if (currentUser.role === 'admin') {
      contacts = await User.find({ isActive: true, _id: { $ne: currentUser._id } }).select(
        '_id role firstName lastName profilePicture'
      );
    }

    const unique = new Map();
    contacts.forEach((c) => {
      if (!c?._id) return;
      unique.set(String(c._id), c);
    });

    res.json(
      [...unique.values()].map((c) => ({
        id: c._id,
        role: c.role,
        fullName: `${c.firstName} ${c.lastName}`,
        profilePicture: c.profilePicture || '',
      }))
    );
  } catch (error) {
    console.error('List contacts error:', error);
    res.status(500).json({ error: 'Failed to list contacts', message: error.message });
  }
});

router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user.userId;
    const docs = await Message.find({ $or: [{ sender: userId }, { receiver: userId }] })
      .sort({ createdAt: -1 })
      .limit(500)
      .populate('sender', 'firstName lastName role profilePicture')
      .populate('receiver', 'firstName lastName role profilePicture');

    const map = new Map();
    for (const doc of docs) {
      const other = String(doc.sender._id) === String(userId) ? doc.receiver : doc.sender;
      const key = String(other._id);
      if (!map.has(key)) {
        map.set(key, {
          userId: other._id,
          fullName: `${other.firstName} ${other.lastName}`,
          role: other.role,
          profilePicture: other.profilePicture || '',
          lastMessage: doc.body,
          updatedAt: doc.createdAt,
          unreadCount: 0,
        });
      }
      if (String(doc.receiver?._id || doc.receiver) === String(userId) && !doc.readAt) {
        map.get(key).unreadCount += 1;
      }
    }

    res.json(Array.from(map.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json({ error: 'Failed to list conversations', message: error.message });
  }
});

router.get('/profile/:userId', async (req, res) => {
  try {
    const viewer = await User.findById(req.user.userId).select(
      '_id role firstName lastName username email phoneNumber profilePicture teacherProfile'
    );
    if (!viewer) return res.status(404).json({ error: 'Viewer not found' });

    const target = await User.findById(req.params.userId).select(
      '_id role firstName lastName username email phoneNumber profilePicture teacherProfile'
    );
    if (!target) return res.status(404).json({ error: 'User not found' });

    const allowed = await canViewProfile(viewer, target);
    if (!allowed) return res.status(403).json({ error: 'Not allowed to view this profile' });

    const result = {
      id: target._id,
      role: target.role,
      fullName: `${target.firstName} ${target.lastName}`,
      username: target.username,
      email: target.email,
      phoneNumber: target.phoneNumber || '',
      profilePicture: target.profilePicture || '',
    };

    if (target.role === 'teacher') {
      result.teacherInfo = {
        classes: Array.isArray(target.teacherProfile?.classes) ? target.teacherProfile.classes : [],
        subjects: Array.isArray(target.teacherProfile?.subjects) ? target.teacherProfile.subjects : [],
      };
    }

    if (target.role === 'parent') {
      const showChildren = viewer.role === 'admin' || String(viewer._id) === String(target._id);
      if (showChildren) {
        const kids = await Student.find({
          $or: [{ parentUser: target._id }, { 'parents.parent': target._id }],
        })
          .populate('user', '_id firstName lastName profilePicture')
          .select('studentId grade section user');

        result.children = kids.map((kid) => ({
          id: kid.user?._id || kid._id,
          studentId: kid.studentId || '',
          fullName: kid.user ? `${kid.user.firstName} ${kid.user.lastName}` : 'Student',
          profilePicture: kid.user?.profilePicture || '',
          grade: kid.grade || '',
          section: kid.section || '',
        }));
      }
    }

    if (target.role === 'student') {
      let student = await Student.findOne({ user: target._id })
        .populate('parents.parent', '_id firstName lastName phoneNumber email profilePicture')
        .select(
          'studentId grade section dateOfBirth gender bloodGroup academicYear attendance performance address emergencyContact parents'
        );
      if (!student) {
        const nowYear = new Date().getFullYear();
        const academicYear = `${nowYear}-${nowYear + 1}`;
        const studentId = await generateUniqueStudentId({
          academicYear,
          fallbackDate: new Date(),
          exists: async (candidate) => Boolean(await Student.exists({ studentId: candidate })),
        });
        const created = await Student.create({
          user: target._id,
          studentId,
          grade: 'Unassigned',
          section: 'A',
          dateOfBirth: new Date('2008-01-01'),
          gender: 'other',
          academicYear,
          isActive: true,
        });
        student = await Student.findById(created._id)
          .populate('parents.parent', '_id firstName lastName phoneNumber email profilePicture')
          .select(
            'studentId grade section dateOfBirth gender bloodGroup academicYear attendance performance address emergencyContact parents'
          );
      }

      if (student) {
        result.studentInfo = {
          studentId: student.studentId || '',
          grade: student.grade || '',
          section: student.section || '',
          dateOfBirth: student.dateOfBirth,
          gender: student.gender || '',
          bloodGroup: student.bloodGroup || '',
          academicYear: student.academicYear || '',
          attendance: student.attendance || {},
          performance: student.performance || {},
          address: student.address || {},
          emergencyContact: student.emergencyContact || {},
          parents: Array.isArray(student.parents)
            ? student.parents.map((entry) => ({
                relationship: entry.relationship || '',
                parent: entry.parent
                  ? {
                      id: entry.parent._id,
                      fullName: `${entry.parent.firstName} ${entry.parent.lastName}`,
                      email: entry.parent.email || '',
                      phoneNumber: entry.parent.phoneNumber || '',
                      profilePicture: entry.parent.profilePicture || '',
                    }
                  : null,
              }))
            : [],
        };
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Fetch profile from messages error:', error);
    res.status(500).json({ error: 'Failed to fetch profile', message: error.message });
  }
});

router.get('/with/:otherUserId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const otherUserId = req.params.otherUserId;
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(1000)
      .populate('sender', '_id firstName lastName role profilePicture')
      .populate('receiver', '_id firstName lastName role profilePicture');

    await Message.updateMany(
      { sender: otherUserId, receiver: userId, readAt: null },
      { $set: { readAt: new Date() } }
    );

    res.json(messages);
  } catch (error) {
    console.error('Fetch conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch messages', message: error.message });
  }
});

router.post('/send', async (req, res) => {
  try {
    const sender = req.user;
    const receiverId = String(req.body.receiverId || '');
    const body = String(req.body.body || '').trim();

    if (!receiverId || !body) {
      return res.status(400).json({ error: 'receiverId and body are required' });
    }

    const receiver = await User.findById(receiverId).select('_id role firstName lastName');
    if (!receiver) return res.status(404).json({ error: 'Receiver not found' });

    const allowed = await validateReceiverAccess(sender, receiver);
    if (!allowed) {
      return res.status(403).json({
        error: 'Parents can only message admins, teachers, and their own children',
      });
    }

    const message = await Message.create({
      sender: sender.userId,
      receiver: receiver._id,
      body,
    });

    messageBus.emit(`message:${String(receiver._id)}`, message);
    messageBus.emit(`message:${String(sender.userId)}`, message);

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message', message: error.message });
  }
});

router.get('/stream', (req, res) => {
  const userId = String(req.user.userId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const onMessage = (payload) => {
    res.write(`data: ${JSON.stringify({ type: 'message', payload })}\n\n`);
  };

  const onPing = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 15000);

  messageBus.on(`message:${userId}`, onMessage);
  req.on('close', () => {
    clearInterval(onPing);
    messageBus.off(`message:${userId}`, onMessage);
  });
});

module.exports = router;
