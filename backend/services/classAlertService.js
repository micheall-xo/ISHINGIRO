const Timetable = require('../models/Timetable');
const Notification = require('../models/Notification');
const User = require('../models/User');

function toMinutes(timeValue) {
  const [h, m] = String(timeValue || '00:00').split(':').map((x) => Number(x || 0));
  return h * 60 + m;
}

async function runClassAlertTick() {
  const timetable = await Timetable.findOne({ active: true }).sort({ createdAt: -1 });
  if (!timetable) return;

  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const keyDate = now.toISOString().slice(0, 10);

  const entries = timetable.entries.filter((entry) => entry.day === dayName);
  const groupedByTeacher = new Map();
  for (const entry of entries) {
    const key = String(entry.teacher);
    if (!groupedByTeacher.has(key)) groupedByTeacher.set(key, []);
    groupedByTeacher.get(key).push(entry);
  }

  for (const [teacherId, teacherEntries] of groupedByTeacher.entries()) {
    const nextClass = teacherEntries
      .sort((a, b) => a.period - b.period)
      .find((entry) => {
        const diff = toMinutes(entry.startTime) - nowMinutes;
        return diff >= 0 && diff <= 20;
      });

    if (!nextClass) continue;
    const teacher = await User.findById(teacherId).select('_id role isActive');
    if (!teacher || teacher.role !== 'teacher' || !teacher.isActive) continue;

    const notificationKey = `next-class:${teacherId}:${keyDate}:${nextClass.day}:${nextClass.period}`;
    const existing = await Notification.findOne({ notificationKey });
    if (existing) continue;

    await Notification.create({
      user: teacherId,
      type: 'next_class_alert',
      title: 'Upcoming Class Alert',
      body: `Next class: ${nextClass.subject} with ${nextClass.className} at ${nextClass.startTime}`,
      data: {
        className: nextClass.className,
        subject: nextClass.subject,
        startTime: nextClass.startTime,
      },
      notificationKey,
    });
  }
}

function startClassAlertService() {
  const intervalMs = Number(process.env.CLASS_ALERT_INTERVAL_MS || 60000);
  runClassAlertTick().catch((error) => {
    console.error('Class alert tick failed:', error.message);
  });
  return setInterval(() => {
    runClassAlertTick().catch((error) => {
      console.error('Class alert tick failed:', error.message);
    });
  }, intervalMs);
}

module.exports = { startClassAlertService };
