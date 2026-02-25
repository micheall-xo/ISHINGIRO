const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const ProfileEditRequest = require('../models/ProfileEditRequest');
const Notification = require('../models/Notification');
const { applyProfileUpdateForUser } = require('../utils/profileUpdate');
const { generateUniqueStudentId } = require('../utils/studentId');
const router = express.Router();

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSessionPayload(token) {
  const decoded = jwt.decode(token) || {};
  const expiresAt = decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null;
  return {
    expiresAt,
    issuedAt: new Date().toISOString(),
  };
}

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

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { password, firstName, lastName, role, phoneNumber } = req.body;
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!username || !email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({
        error: 'Missing required registration fields'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Username or email already exists'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      role,
      phoneNumber
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    const session = buildSessionPayload(token);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token,
      session
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const password = String(req.body.password || '');
    const rawIdentifier = String(
      req.body.username || req.body.email || req.body.identifier || ''
    ).trim();

    if (!rawIdentifier || !password) {
      return res.status(400).json({
        error: 'Username/email and password are required'
      });
    }

    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username: new RegExp(`^${escapeRegex(rawIdentifier)}$`, 'i') },
        { email: rawIdentifier.toLowerCase() }
      ]
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account is deactivated'
      });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    const session = buildSessionPayload(token);

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        fullName: user.getFullName()
      },
      token,
      session
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

// Get current session status
router.get('/session', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      '_id username email firstName lastName role isActive'
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    res.json({
      valid: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      session: {
        expiresAt: req.user?.exp ? new Date(req.user.exp * 1000).toISOString() : null,
        issuedAt: req.user?.iat ? new Date(req.user.iat * 1000).toISOString() : null,
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    res.status(500).json({
      error: 'Failed to validate session',
      message: error.message,
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const pendingEditRequest = await ProfileEditRequest.findOne({
      user: user._id,
      status: 'pending',
    }).sort({ createdAt: -1 });

    // If user is a student, get additional student info
    let profile = {
      id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      fullName: user.getFullName(),
      phoneNumber: user.phoneNumber,
      profilePicture: user.profilePicture,
      lastLogin: user.lastLogin,
      pendingProfileEditRequest: pendingEditRequest
        ? {
            id: pendingEditRequest._id,
            status: pendingEditRequest.status,
            createdAt: pendingEditRequest.createdAt,
          }
        : null,
    };

    if (user.role === 'student') {
      let student = await Student.findOne({ user: user._id }).populate('parents.parent', 'firstName lastName phoneNumber email');
      if (!student) {
        const nowYear = new Date().getFullYear();
        const academicYear = `${nowYear}-${nowYear + 1}`;
        const studentId = await generateUniqueStudentId({
          academicYear,
          fallbackDate: new Date(),
          exists: async (candidate) => Boolean(await Student.exists({ studentId: candidate })),
        });
        student = await Student.create({
          user: user._id,
          studentId,
          grade: 'Unassigned',
          section: 'A',
          dateOfBirth: new Date('2008-01-01'),
          gender: 'other',
          academicYear,
          isActive: true,
        });
        student = await Student.findById(student._id).populate('parents.parent', 'firstName lastName phoneNumber email');
      }

      profile.studentInfo = {
        studentId: student.studentId,
        grade: student.grade,
        section: student.section,
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        bloodGroup: student.bloodGroup,
        academicYear: student.academicYear,
        address: student.address,
        emergencyContact: student.emergencyContact,
        parents: student.parents,
        attendance: student.attendance,
        performance: student.performance,
        pocketMoney: student.pocketMoney,
        createdAt: student.createdAt
      };
    }

    res.json(profile);

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      message: error.message
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    const updatedProfile = await applyProfileUpdateForUser(user, req.body || {});

    res.json({
      message: 'Profile updated successfully',
      user: updatedProfile
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Profile update failed',
      message: error.message
    });
  }
});

router.post('/profile-edit-request', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'student') {
      return res.status(403).json({ error: 'Only students submit profile edit requests' });
    }

    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const hasMeaningfulData =
      Object.keys(payload).length > 0 &&
      Object.values(payload).some((value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return Boolean(value.trim());
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return true;
      });
    if (!hasMeaningfulData) return res.status(400).json({ error: 'Edit payload is required' });

    await ProfileEditRequest.updateMany(
      { user: user._id, status: 'pending' },
      {
        $set: {
          status: 'declined',
          reviewReason: 'Auto-closed by new edit request',
          reviewedAt: new Date(),
        },
      }
    );

    const request = await ProfileEditRequest.create({
      user: user._id,
      role: user.role,
      payload,
      status: 'pending',
    });

    const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
    if (admins.length) {
      await Notification.insertMany(
        admins.map((admin) => ({
          user: admin._id,
          type: 'profile_edit_review',
          title: 'New Student Profile Edit Request',
          body: `${user.getFullName()} submitted profile changes for approval.`,
          data: { requestId: request._id, studentId: user._id },
        }))
      );
    }

    res.status(201).json({
      message: 'Profile edit request submitted for admin review',
      request: {
        id: request._id,
        status: request.status,
        createdAt: request.createdAt,
      },
    });
  } catch (error) {
    console.error('Profile edit request error:', error);
    res.status(500).json({ error: 'Failed to submit profile edit request', message: error.message });
  }
});

router.get('/profile-edit-request', authenticateToken, async (req, res) => {
  try {
    const request = await ProfileEditRequest.findOne({ user: req.user.userId }).sort({ createdAt: -1 });
    if (!request) return res.json({ request: null });
    res.json({
      request: {
        id: request._id,
        status: request.status,
        reviewReason: request.reviewReason || '',
        reviewedAt: request.reviewedAt,
        createdAt: request.createdAt,
        payload: {
          profilePicture: request.payload?.profilePicture || '',
        },
      },
    });
  } catch (error) {
    console.error('Profile edit request status error:', error);
    res.status(500).json({ error: 'Failed to fetch request status', message: error.message });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      error: 'Password change failed',
      message: error.message
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    message: 'Logout successful'
  });
});

module.exports = router;
