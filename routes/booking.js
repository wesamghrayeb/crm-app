const express = require('express');
const BookingSlot = require('../models/BookingSlot');
const Client = require('../models/Client');
const auth = require('../middleware/authMiddleware');
// const { sendEmail } = require('../utils/mailer'); // השבתה זמנית עד הגדרת SMTP

const router = express.Router();

// Get all booking slots (filtered by available only)
router.get('/slots', auth, async (req, res) => {
  const slots = await BookingSlot.find();
  const available = slots.filter(slot => slot.bookedClients.length < slot.maxClients);
  res.json(available);
});

// Book a slot
router.post('/slots/:id/book', auth, async (req, res) => {
  try {
    const slot = await BookingSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    if (slot.bookedClients.includes(req.userId))
      return res.status(400).json({ error: 'Already booked' });

    if (slot.bookedClients.length >= slot.maxClients)
      return res.status(400).json({ error: 'Slot is full' });

    // Update slot
    slot.bookedClients.push(req.userId);
    await slot.save();

    // Update client usage
    const client = await Client.findById(req.userId);
    client.usedSessions += 1;
    await client.save();

    // Send confirmation email (disabled)
    /*
    await sendEmail(
      client.email,
      'Booking Confirmed',
      `You booked: ${slot.date} ${slot.time}`
    );
    */

    res.json({ message: 'Booked successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Cancel booking
router.post('/slots/:id/cancel', auth, async (req, res) => {
  try {
    const slot = await BookingSlot.findById(req.params.id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    slot.bookedClients = slot.bookedClients.filter(id => id.toString() !== req.userId);
    await slot.save();

    const client = await Client.findById(req.userId);

    // Optional: decrease usedSessions if needed
    if (client.usedSessions > 0) {
      client.usedSessions -= 1;
      await client.save();
    }

    // Send cancellation email (disabled)
    /*
    await sendEmail(client.email, 'Booking Canceled', `Canceled: ${slot.date} ${slot.time}`);
    await sendEmail('admin@example.com', 'Client Canceled Booking', `${client.fullName} canceled ${slot.date} ${slot.time}`);
    */

    res.json({ message: 'Booking canceled' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
