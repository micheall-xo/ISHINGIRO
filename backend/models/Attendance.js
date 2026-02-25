const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    required: true
  },
  timeIn: {
    type: Date
  },
  timeOut: {
    type: Date
  },
  reason: {
    type: String,
    trim: true
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  isExcused: {
    type: Boolean,
    default: false
  },
  excusedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  excusedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index to ensure one attendance record per student per day
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });

// Virtual for duration if both timeIn and timeOut are present
attendanceSchema.virtual('duration').get(function() {
  if (this.timeIn && this.timeOut) {
    return this.timeOut - this.timeIn;
  }
  return null;
});

// Method to mark time in
attendanceSchema.methods.markTimeIn = function() {
  this.timeIn = new Date();
  if (this.status === 'absent') {
    this.status = 'late';
  }
  return this.save();
};

// Method to mark time out
attendanceSchema.methods.markTimeOut = function() {
  this.timeOut = new Date();
  return this.save();
};

// Method to excuse absence
attendanceSchema.methods.excuseAbsence = function(reason, excusedBy) {
  this.isExcused = true;
  this.reason = reason;
  this.excusedBy = excusedBy;
  this.excusedAt = new Date();
  this.status = 'excused';
  return this.save();
};

// Static method to get attendance summary for a date range
attendanceSchema.statics.getSummary = async function(startDate, endDate, grade = null) {
  const matchStage = {
    date: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (grade) {
    matchStage['student.grade'] = grade;
  }
  
  return this.aggregate([
    {
      $lookup: {
        from: 'students',
        localField: 'student',
        foreignField: '_id',
        as: 'student'
      }
    },
    {
      $unwind: '$student'
    },
    {
      $match: matchStage
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Static method to get attendance for a student in date range
attendanceSchema.statics.getStudentAttendance = async function(studentId, startDate, endDate) {
  return this.find({
    student: studentId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: -1 });
};

module.exports = mongoose.model('Attendance', attendanceSchema);
