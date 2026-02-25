const express = require('express');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const User = require('../models/User');
const { generateUniqueStudentId, isStudentIdStrictFormat } = require('../utils/studentId');
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

function isParentLikeRole(role) {
  return ['parent', 'guest'].includes(String(role || '').toLowerCase());
}

function isStudentLinkedToParent(student, parentUserId) {
  if (!student) return false;
  if (student.parentUser && String(student.parentUser) === String(parentUserId)) return true;
  if (Array.isArray(student.parents)) {
    return student.parents.some((entry) => String(entry?.parent) === String(parentUserId));
  }
  return false;
}

// Get all students (for teachers/admins)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const students = await Student.find({ isActive: true })
      .populate('user', 'firstName lastName email')
      .populate('parents.parent', 'firstName lastName');

    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      error: 'Failed to fetch students',
      message: error.message
    });
  }
});

// Get student by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is authorized to view this student
    if (req.user.role === 'student' && req.user.userId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const student = await Student.findById(id)
      .populate('user', 'firstName lastName email phoneNumber')
      .populate('parents.parent', 'firstName lastName phoneNumber');

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({
      error: 'Failed to fetch student',
      message: error.message
    });
  }
});

// Create new student (for admins)
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create students' });
    }

    const {
      username,
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      studentId: rawStudentId,
      grade,
      section,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      parents,
      academicYear,
    } = req.body;

    // Create user account first
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      role: 'student'
    });

    await user.save();

    const providedStudentId = String(rawStudentId || '').trim().toUpperCase();
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
      studentId = await generateUniqueStudentId({
        academicYear,
        fallbackDate: new Date(),
        exists: async (candidate) => Boolean(await Student.exists({ studentId: candidate })),
      });
    }

    // Create student profile
    const student = new Student({
      user: user._id,
      studentId,
      grade,
      section,
      dateOfBirth,
      gender,
      academicYear,
      address,
      emergencyContact,
      parents: parents || []
    });

    await student.save();

    res.status(201).json({
      message: 'Student created successfully',
      student: {
        id: student._id,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        studentId: student.studentId,
        grade: student.grade,
        section: student.section
      }
    });

  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({
      error: 'Failed to create student',
      message: error.message
    });
  }
});

// Update student
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is authorized to update this student
    if (req.user.role === 'student' && req.user.userId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Update student fields
    const allowedFields = ['grade', 'section', 'address', 'emergencyContact', 'parents'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        student[field] = req.body[field];
      }
    });

    await student.save();

    res.json({
      message: 'Student updated successfully',
      student
    });

  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({
      error: 'Failed to update student',
      message: error.message
    });
  }
});

// Delete student (for admins)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete students' });
    }

    const { id } = req.params;
    const student = await Student.findById(id);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Soft delete - mark as inactive
    student.isActive = false;
    await student.save();

    res.json({
      message: 'Student deleted successfully'
    });

  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      error: 'Failed to delete student',
      message: error.message
    });
  }
});

// Get students by grade
router.get('/grade/:grade', authenticateToken, async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { grade } = req.params;
    const students = await Student.find({ 
      grade, 
      isActive: true 
    }).populate('user', 'firstName lastName');

    res.json(students);
  } catch (error) {
    console.error('Get students by grade error:', error);
    res.status(500).json({
      error: 'Failed to fetch students by grade',
      message: error.message
    });
  }
});

// Parent: list assigned children
router.get('/parent/children', authenticateToken, async (req, res) => {
  try {
    if (!isParentLikeRole(req.user.role)) {
      return res.status(403).json({ error: 'Only parents/guests can access children list' });
    }

    const students = await Student.find({
      $and: [
        { $or: [{ parentUser: req.user.userId }, { 'parents.parent': req.user.userId }] },
        { $or: [{ isActive: true }, { isActive: { $exists: false } }] },
      ],
    }).populate('user', 'firstName lastName email');

    res.json(
      students.map((student) => ({
        id: student._id,
        studentId: student.studentId,
        grade: student.grade,
        section: student.section,
        user: student.user,
      }))
    );
  } catch (error) {
    console.error('Parent children list error:', error);
    res.status(500).json({
      error: 'Failed to fetch parent children',
      message: error.message,
    });
  }
});

// Parent: search student by id or name (for linking)
router.get('/parent/search', authenticateToken, async (req, res) => {
  try {
    if (!isParentLikeRole(req.user.role)) {
      return res.status(403).json({ error: 'Only parents/guests can search students' });
    }

    const query = String(req.query.q || '').trim();
    if (!query) return res.json([]);
    const objectIdLike = /^[a-f\d]{24}$/i.test(query);

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const usersByName = await User.find({
      role: 'student',
      isActive: true,
      $or: [{ firstName: regex }, { lastName: regex }],
    }).select('_id');

    const userIds = usersByName.map((u) => u._id);

    const students = await Student.find({
      $and: [
        { $or: [{ isActive: true }, { isActive: { $exists: false } }] },
        {
          $or: [
            { studentId: regex },
            { user: { $in: userIds } },
            ...(objectIdLike ? [{ _id: query }, { user: query }] : []),
          ],
        },
      ],
    })
      .populate('user', 'firstName lastName')
      .limit(50);

    res.json(
      students.map((student) => ({
        id: student._id,
        studentId: student.studentId,
        fullName: `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || 'Student',
        className: `${student.grade}${student.section || ''}`,
        isAssignedToMe: isStudentLinkedToParent(student, req.user.userId),
        hasParent: Boolean(student.parentUser),
      }))
    );
  } catch (error) {
    console.error('Parent search students error:', error);
    res.status(500).json({
      error: 'Failed to search students',
      message: error.message,
    });
  }
});

// Parent: link student to self using studentId or student _id
router.post('/parent/link', authenticateToken, async (req, res) => {
  try {
    if (!isParentLikeRole(req.user.role)) {
      return res.status(403).json({ error: 'Only parents/guests can link students' });
    }

    const studentIdentifier = String(req.body.studentId || req.body.studentObjectId || '').trim();
    if (!studentIdentifier) {
      return res.status(400).json({ error: 'studentId or studentObjectId is required' });
    }

    const student = await Student.findOne({
      $and: [
        { $or: [{ studentId: studentIdentifier }, { _id: studentIdentifier.match(/^[a-f\d]{24}$/i) ? studentIdentifier : null }] },
        { $or: [{ isActive: true }, { isActive: { $exists: false } }] },
      ],
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (isStudentLinkedToParent(student, req.user.userId)) {
      return res.json({ message: 'Student already linked to this parent', studentId: student.studentId });
    }

    if (student.parentUser && String(student.parentUser) !== String(req.user.userId)) {
      return res.status(400).json({ error: 'This student is already assigned to another parent' });
    }

    student.parentUser = req.user.userId;
    student.parents = [{ parent: req.user.userId, relationship: 'guardian' }];
    await student.save();

    res.status(201).json({
      message: 'Student linked successfully',
      studentId: student.studentId,
      studentObjectId: student._id,
    });
  } catch (error) {
    console.error('Parent link student error:', error);
    res.status(500).json({
      error: 'Failed to link student',
      message: error.message,
    });
  }
});

module.exports = router;
