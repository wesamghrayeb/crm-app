const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  passwordHash: String,
  programType: String,
  startDate: Date,
  endDate: Date,
  totalSessions: Number,
  usedSessions: { type: Number, default: 0 },
  role: { type: String, enum: ['client', 'admin'], default: 'client' },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client', // מכיוון שהadmin גם ממודל Client
    required: function () {
      return this.role === 'client';
    }
  }
});

module.exports = mongoose.model('Client', clientSchema);