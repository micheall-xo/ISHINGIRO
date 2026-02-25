const mongoose = require('mongoose');

const timetableEntrySchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    period: { type: Number, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    className: { type: String, required: true },
    subject: { type: String, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const timetableSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, default: 'Timetable' },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    active: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    entries: { type: [timetableEntrySchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Timetable', timetableSchema);
