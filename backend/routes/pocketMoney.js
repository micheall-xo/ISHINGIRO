const express = require('express');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const User = require('../models/User');
const router = express.Router();

function getPeriodStart(period) {
  const now = new Date();
  switch (String(period || '').toLowerCase()) {
    case 'weekly': {
      const d = new Date(now);
      d.setDate(now.getDate() - 7);
      return d;
    }
    case 'quarterly': {
      const d = new Date(now);
      d.setMonth(now.getMonth() - 3);
      return d;
    }
    case 'yearly': {
      const d = new Date(now);
      d.setFullYear(now.getFullYear() - 1);
      return d;
    }
    case 'monthly':
    default: {
      const d = new Date(now);
      d.setMonth(now.getMonth() - 1);
      return d;
    }
  }
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

function isParentLikeRole(role) {
  return ['parent', 'guest'].includes(String(role || '').toLowerCase());
}

// Get student pocket money balance and transactions
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Check if user is authorized to view this student's info
    if (req.user.role === 'student' && req.user.userId !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const student = await Student.findOne({ studentId }).populate('user', 'firstName lastName');
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({
      student: {
        id: student._id,
        studentId: student.studentId,
        name: student.user ? `${student.user.firstName} ${student.user.lastName}` : 'Unknown',
        grade: student.grade,
        section: student.section
      },
      pocketMoney: {
        balance: student.pocketMoney.balance,
        transactions: student.pocketMoney.transactions
      }
    });

  } catch (error) {
    console.error('Pocket money fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch pocket money info',
      message: error.message
    });
  }
});

// Top up pocket money (for parents/admins)
router.post('/topup', authenticateToken, async (req, res) => {
  try {
    const { studentId, amount, description } = req.body;
    
    // Only parents and admins can top up
    if (!isParentLikeRole(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only parents/guests and admins can top up pocket money' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const student = await Student.findOne({ studentId }).populate('user', 'firstName lastName');
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if user is parent of this student
    if (isParentLikeRole(req.user.role)) {
      const isParent =
        String(student.parentUser || '') === String(req.user.userId) ||
        student.parents.some(parent => parent.parent.toString() === req.user.userId);
      if (!isParent) {
        return res.status(403).json({ error: 'You can only top up your own child\'s account' });
      }
    }

    // Add transaction
    await student.addTransaction('topup', amount, description || 'Top up');

    res.json({
      message: 'Pocket money topped up successfully',
      newBalance: student.pocketMoney.balance,
      transaction: {
        type: 'topup',
        amount,
        description: description || 'Top up',
        date: new Date(),
        balance: student.pocketMoney.balance
      }
    });

  } catch (error) {
    console.error('Top up error:', error);
    res.status(500).json({
      error: 'Top up failed',
      message: error.message
    });
  }
});

// Spend pocket money (for students)
router.post('/spend', authenticateToken, async (req, res) => {
  try {
    const { amount, description } = req.body;
    
    // Only students can spend their own pocket money
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can spend pocket money' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const student = await Student.findOne({ user: req.user.userId });
    
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Check if student has enough balance
    if (student.pocketMoney.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Add transaction
    await student.addTransaction('spent', amount, description || 'Purchase');

    res.json({
      message: 'Transaction completed successfully',
      newBalance: student.pocketMoney.balance,
      transaction: {
        type: 'spent',
        amount,
        description: description || 'Purchase',
        date: new Date(),
        balance: student.pocketMoney.balance
      }
    });

  } catch (error) {
    console.error('Spend error:', error);
    res.status(500).json({
      error: 'Transaction failed',
      message: error.message
    });
  }
});

// Get transaction history
router.get('/transactions/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 20, type } = req.query;
    
    // Check if user is authorized to view this student's transactions
    if (req.user.role === 'student' && req.user.userId !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const student = await Student.findOne({ studentId });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    let transactions = student.pocketMoney.transactions;

    // Filter by type if specified
    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }

    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedTransactions = transactions.slice(startIndex, endIndex);

    res.json({
      transactions: paginatedTransactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(transactions.length / limit),
        totalTransactions: transactions.length,
        hasNextPage: endIndex < transactions.length,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({
      error: 'Failed to fetch transaction history',
      message: error.message
    });
  }
});

// Get pocket money summary for parents
router.get('/parent-summary', authenticateToken, async (req, res) => {
  try {
    // Only parents can access this endpoint
    if (!isParentLikeRole(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Find all students where this user is a parent
    const students = await Student.find({
      $or: [
        { parentUser: req.user.userId },
        { 'parents.parent': req.user.userId },
      ],
    }).populate('user', 'firstName lastName');

    const summary = students.map(student => ({
      id: student._id,
      studentId: student.studentId,
      name: `${student.user.firstName} ${student.user.lastName}`,
      grade: student.grade,
      section: student.section,
      pocketMoney: {
        balance: student.pocketMoney.balance,
        totalTopUps: student.pocketMoney.transactions
          .filter(t => t.type === 'topup')
          .reduce((sum, t) => sum + t.amount, 0),
        totalSpent: student.pocketMoney.transactions
          .filter(t => t.type === 'spent')
          .reduce((sum, t) => sum + t.amount, 0),
        recentTransactions: student.pocketMoney.transactions
          .slice(0, 5) // Last 5 transactions
      }
    }));

    res.json(summary);

  } catch (error) {
    console.error('Parent summary error:', error);
    res.status(500).json({
      error: 'Failed to fetch parent summary',
      message: error.message
    });
  }
});

// Parent reports by period (weekly/monthly/quarterly/yearly)
router.get('/parent-reports', authenticateToken, async (req, res) => {
  try {
    if (!isParentLikeRole(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const period = String(req.query.period || 'monthly').toLowerCase();
    const studentIdFilter = String(req.query.studentId || '').trim();
    const periodStart = getPeriodStart(period);

    const baseQuery = {
      $or: [
        { parentUser: req.user.userId },
        { 'parents.parent': req.user.userId },
      ],
      isActive: true,
    };

    if (studentIdFilter) {
      baseQuery.studentId = studentIdFilter;
    }

    const students = await Student.find(baseQuery).populate('user', 'firstName lastName');

    const reports = students.map((student) => {
      const txns = Array.isArray(student.pocketMoney?.transactions) ? student.pocketMoney.transactions : [];
      const inPeriod = txns.filter((tx) => new Date(tx.date) >= periodStart);

      const topUps = inPeriod
        .filter((tx) => tx.type === 'topup' || tx.type === 'refund')
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const spent = inPeriod
        .filter((tx) => tx.type === 'spent')
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

      const attendance = student.attendance || {};
      const totalDays = Number(attendance.totalDays || 0);
      const presentDays = Number(attendance.presentDays || 0);

      return {
        student: {
          id: student._id,
          studentId: student.studentId,
          name: `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || 'Student',
          className: `${student.grade || ''}${student.section || ''}`,
        },
        period,
        periodStart,
        financial: {
          currentBalance: Number(student.pocketMoney?.balance || 0),
          topUps,
          spent,
          net: topUps - spent,
          transactions: inPeriod
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 40),
        },
        academic: {
          gpa: Number(student.performance?.gpa || 0),
          overallGrade: student.performance?.overallGrade || 'N/A',
          attendancePct: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
          totalDays,
          presentDays,
          absentDays: Number(attendance.absentDays || 0),
          lateDays: Number(attendance.lateDays || 0),
        },
        generatedAt: new Date(),
      };
    });

    res.json({
      period,
      generatedAt: new Date(),
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error('Parent reports error:', error);
    res.status(500).json({
      error: 'Failed to fetch parent reports',
      message: error.message,
    });
  }
});

// Refund pocket money (for admins/teachers)
router.post('/refund', authenticateToken, async (req, res) => {
  try {
    const { studentId, amount, description, reason } = req.body;
    
    // Only admins and teachers can issue refunds
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only admins and teachers can issue refunds' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const student = await Student.findOne({ studentId });
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Add refund transaction
    await student.addTransaction('refund', amount, description || `Refund: ${reason}`);

    res.json({
      message: 'Refund issued successfully',
      newBalance: student.pocketMoney.balance,
      transaction: {
        type: 'refund',
        amount,
        description: description || `Refund: ${reason}`,
        date: new Date(),
        balance: student.pocketMoney.balance
      }
    });

  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({
      error: 'Refund failed',
      message: error.message
    });
  }
});

module.exports = router;
