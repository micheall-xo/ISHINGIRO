const mongoose = require('mongoose');

const studentLeaveSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['sickness', 'family', 'emergency', 'other'],
      default: 'other',
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['approved', 'cancelled'],
      default: 'approved',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

studentLeaveSchema.index({ student: 1, startDate: 1, endDate: 1, status: 1 });

module.exports = mongoose.model('StudentLeave', studentLeaveSchema);
