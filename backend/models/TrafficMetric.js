const mongoose = require('mongoose');

const trafficMetricSchema = new mongoose.Schema(
  {
    bucketStart: {
      type: Date,
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      index: true,
    },
    method: {
      type: String,
      required: true,
      index: true,
    },
    statusCode: {
      type: Number,
      required: true,
      index: true,
    },
    role: {
      type: String,
      default: 'anonymous',
      index: true,
    },
    count: {
      type: Number,
      default: 1,
    },
    lastHitAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

trafficMetricSchema.index(
  { bucketStart: 1, endpoint: 1, method: 1, statusCode: 1, role: 1 },
  { unique: true }
);

module.exports = mongoose.model('TrafficMetric', trafficMetricSchema);
