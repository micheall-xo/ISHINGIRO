const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { trackTraffic } = require('./middleware/traffic');
const { ensureDefaultAdmin } = require('./utils/seedAdmin');
const { startClassAlertService } = require('./services/classAlertService');


dotenv.config({ path: './config.env' });

const app = express();

app.use(cors());
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));
app.use(trackTraffic);

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://gihozomichelangelo_db_user:Alwayscool@schoolapp.yrcvvrc.mongodb.net/?retryWrites=true&w=majority&appName=schoolapp';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    ensureDefaultAdmin().catch((error) => {
      console.error('Failed to seed default admin:', error.message);
    });
    console.log('✅ Connected to MongoDB Atlas cluster successfully');
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
const messageRoutes = require('./routes/messages');
const pageDataRoutes = require('./routes/pageData');
const adminRoutes = require('./routes/admin');
const teacherContentRoutes = require('./routes/teacherContent');

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/pocket-money', pocketMoneyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/page-data', pageDataRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher-content', teacherContentRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'School App API is running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    mode: mongoose.connection.readyState === 1 ? 'Full Mode' : 'Database Disconnected',
  });
});

app.get('/api', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    message: 'School App API',
    status: isConnected ? 'Full Mode' : 'Database Disconnected',
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
      messages: '/api/messages',
      'page-data': '/api/page-data/:page',
      admin: '/api/admin',
    },
    note: isConnected
      ? 'All endpoints are fully functional'
      : 'Database connection required for full functionality',
  });
});

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload too large',
      message: 'Uploaded file is too large. Please upload a smaller file.',
    });
  }
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📱 API available at http://${HOST}:${PORT}/api`);

  console.log('ℹ️  Android Emulator URL: http://10.0.2.2:' + PORT + '/api');
  console.log('ℹ️  iOS Simulator URL:    http://localhost:' + PORT + '/api');
});


startClassAlertService();

