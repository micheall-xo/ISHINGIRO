const mongoose = require('mongoose');
const { generateUniqueStudentId, isStudentIdFormat } = require('../utils/studentId');

const studentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentId: {
    type: String,
    required: true,
    unique: true
  },
  grade: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  bloodGroup: {
    type: String,
    default: ''
  },
  academicYear: {
    type: String,
    default: ''
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String
  },
  parents: [{
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    relationship: {
      type: String,
      enum: ['father', 'mother', 'guardian'],
      required: true
    }
  }],
  parentUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  subjects: [{
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject'
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    grade: String,
    attendance: {
      type: Number,
      default: 0
    }
  }],
  attendance: {
    totalDays: {
      type: Number,
      default: 0
    },
    presentDays: {
      type: Number,
      default: 0
    },
    absentDays: {
      type: Number,
      default: 0
    },
    lateDays: {
      type: Number,
      default: 0
    }
  },
  performance: {
    overallGrade: {
      type: String,
      default: 'N/A'
    },
    gpa: {
      type: Number,
      default: 0
    }
  },
  pocketMoney: {
    balance: {
      type: Number,
      default: 0
    },
    transactions: [{
      type: {
        type: String,
        enum: ['topup', 'spent', 'refund'],
        required: true
      },
      amount: {
        type: Number,
        required: true
      },
      description: String,
      date: {
        type: Date,
        default: Date.now
      },
      balance: Number
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

studentSchema.pre('validate', async function(next) {
  const normalizedStudentId = String(this.studentId || '').trim().toUpperCase();
  if (!normalizedStudentId) {
    this.studentId = await generateUniqueStudentId({
      academicYear: this.academicYear,
      fallbackDate: this.createdAt || new Date(),
      exists: async (candidate) => Boolean(await this.constructor.exists({ _id: { $ne: this._id }, studentId: candidate })),
    });
  } else {
    this.studentId = normalizedStudentId;
  }

  if (Array.isArray(this.parents) && this.parents.length > 1) {
    return next(new Error('A student cannot have more than one parent'));
  }

  if (Array.isArray(this.parents) && this.parents.length === 1 && !this.parentUser) {
    this.parentUser = this.parents[0].parent || null;
  }

  if (this.parentUser) {
    this.parents = [{
      parent: this.parentUser,
      relationship: (this.parents && this.parents[0] && this.parents[0].relationship) || 'guardian'
    }];
  } else {
    this.parents = [];
  }

  if (!isStudentIdFormat(this.studentId)) {
    return next(new Error('studentId format must be STU<YYYY><6 digits>'));
  }

  next();
});

// Calculate attendance percentage
studentSchema.virtual('attendancePercentage').get(function() {
  if (this.attendance.totalDays === 0) return 0;
  return Math.round((this.attendance.presentDays / this.attendance.totalDays) * 100);
});

// Calculate GPA
studentSchema.methods.calculateGPA = function() {
  if (!this.subjects || this.subjects.length === 0) return 0;
  
  const gradePoints = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'F': 0.0
  };
  
  let totalPoints = 0;
  let validGrades = 0;
  
  this.subjects.forEach(subject => {
    if (subject.grade && gradePoints[subject.grade] !== undefined) {
      totalPoints += gradePoints[subject.grade];
      validGrades++;
    }
  });
  
  return validGrades > 0 ? Math.round((totalPoints / validGrades) * 100) / 100 : 0;
};

// Add pocket money transaction
studentSchema.methods.addTransaction = function(type, amount, description) {
  const oldBalance = this.pocketMoney.balance;
  let newBalance = oldBalance;
  
  if (type === 'topup' || type === 'refund') {
    newBalance += amount;
  } else if (type === 'spent') {
    newBalance -= amount;
  }
  
  this.pocketMoney.balance = newBalance;
  this.pocketMoney.transactions.push({
    type,
    amount,
    description,
    balance: newBalance
  });
  
  return this.save();
};

// Mark attendance
studentSchema.methods.markAttendance = function(status) {
  this.attendance.totalDays += 1;
  
  switch (status) {
    case 'present':
      this.attendance.presentDays += 1;
      break;
    case 'absent':
      this.attendance.absentDays += 1;
      break;
    case 'late':
      this.attendance.lateDays += 1;
      this.attendance.presentDays += 1;
      break;
  }
  
  return this.save();
};

module.exports = mongoose.model('Student', studentSchema);
