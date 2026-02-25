const jwt = require('jsonwebtoken');
const TrafficMetric = require('../models/TrafficMetric');

function getRoleFromToken(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return 'anonymous';

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.role || 'authenticated';
  } catch (error) {
    return 'anonymous';
  }
}

function getMinuteBucket(date = new Date()) {
  const bucket = new Date(date);
  bucket.setSeconds(0, 0);
  return bucket;
}

function trackTraffic(req, res, next) {
  const startedAt = new Date();
  const endpoint = (req.originalUrl || req.url || '').split('?')[0];
  const method = req.method;
  const role = getRoleFromToken(req);

  res.on('finish', async () => {
    // Ignore very noisy health checks.
    if (endpoint === '/api/health') return;

    const bucketStart = getMinuteBucket(startedAt);
    const statusCode = res.statusCode;

    try {
      await TrafficMetric.updateOne(
        { bucketStart, endpoint, method, statusCode, role },
        { $inc: { count: 1 }, $set: { lastHitAt: new Date() } },
        { upsert: true }
      );
    } catch (error) {
      console.error('Traffic metric update failed:', error.message);
    }
  });

  next();
}

module.exports = { trackTraffic };
