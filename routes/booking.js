const express = require('express');
const router = express.Router();
const BookingSlot = require('../models/BookingSlot');
const Client = require('../models/Client');
const authMiddleware = require('../middleware/authMiddleware');

// BOOK slot
router.post('/slots/:id/book', authMiddleware, async (req, res) => {
  try {
    const user = await Client.findById(req.userId);
    if (!user || user.role !== 'client') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const slot = await BookingSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    // Already booked this slot?
    if (slot.bookedClients.includes(user._id)) {
      return res.status(400).json({ error: 'Already booked' });
    }

    // Full slot?
    if (slot.bookedClients.length >= slot.maxClients) {
      return res.status(400).json({ error: 'Slot is full' });
    }

    // Used all sessions?
    if (user.usedSessions >= user.totalSessions) {
      return res.status(400).json({ error: 'No remaining sessions' });
    }

    // Check if user already booked a slot on the same date
    const sameDaySlot = await BookingSlot.findOne({
      date: slot.date,
      bookedClients: user._id
    });

    if (sameDaySlot) {
      return res.status(400).json({ error: '! יש לך תור ביום הזה' });
    }

    // Book slot
    slot.bookedClients.push(user._id);
    slot.history = slot.history || [];
    slot.history.push({
      clientId: user._id,
      action: 'booked',
      timestamp: new Date()
    });

    await slot.save();

    user.usedSessions += 1;
    await user.save();

    res.json({ message: 'Slot booked successfully' });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// CANCEL slot
router.post('/slots/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const user = await Client.findById(req.userId);
    if (!user || user.role !== 'client') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const slot = await BookingSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    if (!slot.bookedClients.includes(user._id)) {
      return res.status(400).json({ error: 'You have not booked this slot' });
    }

    slot.bookedClients = slot.bookedClients.filter(
      id => id.toString() !== user._id.toString()
    );

    slot.history = slot.history || [];
    slot.history.push({
      clientId: user._id,
      action: 'canceled',
      timestamp: new Date()
    });

    await slot.save();

    user.usedSessions = Math.max(user.usedSessions - 1, 0);
    await user.save();

    res.json({ message: 'Slot canceled successfully' });
  } catch (err) {
    console.error('Cancelation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
