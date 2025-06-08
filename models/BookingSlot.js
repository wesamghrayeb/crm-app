const mongoose = require('mongoose');

const bookingSlotSchema = new mongoose.Schema({
  date: String, // או Date אם אתה מעדיף
  time: String,
  maxClients: Number,
  bookedClients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
  isFull: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('BookingSlot', bookingSlotSchema);