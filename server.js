const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: './config.env' });

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/schoolapp'; 

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error.message);
  console.log('⚠️  Running in demo mode without database');
});

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const teacherRoutes = require('./routes/teachers');
const attendanceRoutes = require('./routes/attendance');
const performanceRoutes = require('./routes/performance');
const pocketMoneyRoutes = require('./routes/pocketMoney');
const notificationRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/pocket-money', pocketMoneyRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'School App API is running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    mode: mongoose.connection.readyState === 1 ? 'Full' : 'Demo (No Database)'
  });
});

app.get('/api', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    message: 'School App API',
    status: isConnected ? 'Full Mode' : 'Demo Mode',
    database: isConnected ? 'Connected' : 'Not Connected',
    availableEndpoints: {
      health: '/api/health',
      auth: '/api/auth',
      students: '/api/students',
      teachers: '/api/teachers',
      attendance: '/api/attendance',
      performance: '/api/performance',
      'pocket-money': '/api/pocket-money',
      notifications: '/api/notifications',
      demo: '/api/demo'
    },
    note: isConnected ? 'All endpoints are fully functional' : 'Use /api/demo/* endpoints for testing without database'
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 API available at http://localhost:${PORT}/api`);
});
