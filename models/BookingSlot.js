const mongoose = require('mongoose');

const bookingSlotSchema = new mongoose.Schema({
  date: String, // ניתן גם Date אם נוח לך יותר
  time: String,
  maxClients: Number,
  bookedClients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  isFull: {
    type: Boolean,
    default: false
  },
  history: [
    {
      clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
      action: { type: String, enum: ['booked', 'canceled'], required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('BookingSlot', bookingSlotSchema);
