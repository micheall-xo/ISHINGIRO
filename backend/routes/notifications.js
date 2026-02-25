const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
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

router.put('/push-token', authenticateToken, async (req, res) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) return res.status(400).json({ error: 'Push token is required' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.pushToken = pushToken;
    await user.save();
    res.json({ message: 'Push token updated successfully', pushToken: user.pushToken });
  } catch (error) {
    console.error('Update push token error:', error);
    res.status(500).json({ error: 'Failed to update push token', message: error.message });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const type = String(req.query.type || '').trim();

    const query = { user: req.user.userId };
    if (type) query.type = type;

    const totalNotifications = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(totalNotifications / limit)),
        totalNotifications,
        hasNextPage: page * limit < totalNotifications,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications', message: error.message });
  }
});

router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read', message: error.message });
  }
});

router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const updateResult = await Notification.updateMany(
      { user: req.user.userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: 'All notifications marked as read', updated: updateResult.modifiedCount || 0 });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read', message: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.userId });
    if (!deleted) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification deleted successfully', notificationId: req.params.id });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification', message: error.message });
  }
});

router.post('/send', authenticateToken, async (req, res) => {
  try {
    if (!['admin', 'teacher'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });

    const { userIds, title, body, data, type } = req.body;
    if (!Array.isArray(userIds) || !title || !body) {
      return res.status(400).json({ error: 'userIds, title, and body are required' });
    }

    const docs = userIds.map((userId) => ({
      user: userId,
      title,
      body,
      data: data || {},
      type: type || 'general',
    }));

    const inserted = await Notification.insertMany(docs);
    res.json({ message: 'Notification sent successfully', sentTo: inserted.length });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification', message: error.message });
  }
});

router.get('/settings', authenticateToken, async (req, res) => {
  try {
    res.json({
      userId: req.user.userId,
      settings: {
        pushNotifications: true,
        emailNotifications: false,
        inAppNotifications: true,
      },
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings', message: error.message });
  }
});

router.put('/settings', authenticateToken, async (req, res) => {
  try {
    res.json({ message: 'Notification settings updated successfully', settings: req.body.settings || {} });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ error: 'Failed to update notification settings', message: error.message });
  }
});

router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ user: req.user.userId, isRead: false });
    res.json({ unreadCount, userId: req.user.userId });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count', message: error.message });
  }
});

module.exports = router;
