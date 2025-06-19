const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const authMiddleware = require('../middleware/authMiddleware');
const BookingSlot = require('../models/BookingSlot');
const router = express.Router();
//checking
router.get('/auth/test', (req, res) => {
  res.send('auth route works ✅');
});


// Register
router.post('/auth/register', async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      subscriptionType,
      totalSessions,
      startDate,
      endDate,
      adminId // 👈 הוסף כאן
    } = req.body;

    if (!adminId) return res.status(400).json({ error: 'adminId is required' });

    const passwordHash = await bcrypt.hash(password, 10);

    const client = new Client({
      fullName,
      email,
      passwordHash,
      subscriptionType,
      totalSessions,
      usedSessions: 0,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      adminId // 👈 שמירה בפועל
    });
    const existingClient = await Client.findOne({ email });
      if (existingClient) {
        return res.status(400).json({ error: 'אימייל זה כבר רשום במערכת' });
      }
    await client.save();
    res.status(201).json({ message: 'Client registered successfully', client });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});




// Login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const client = await Client.findOne({ email });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const match = await bcrypt.compare(password, client.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: client._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, client });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Protected: Get profile
router.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const client = await Client.findById(req.userId).select('-passwordHash');
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// בקובץ routes/admin.js
router.get('/admin/clients', authMiddleware, async (req, res) => {
  try {
    const clients = await Client.find({ adminId: req.userId });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /client/me — full profile + bookings
router.get('/client/me', authMiddleware, async (req, res) => {
  try {
    const client = await Client.findById(req.userId).select('-passwordHash');
    if (!client || client.role !== 'client') {
      return res.status(403).json({ error: 'גישה נדחתה' });
    }

    const bookings = await BookingSlot.find({ bookedClients: client._id }).sort({ date: -1, time: -1 });

    res.json({ client, bookings });
  } catch (err) {
    console.error('שגיאה בטעינת פרופיל:', err);
    res.status(500).json({ error: 'שגיאה בשרת' });
  }
});

// PUT /client/change-password
router.put('/client/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const client = await Client.findById(req.userId);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const isMatch = await bcrypt.compare(currentPassword, client.passwordHash);
    if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });

    client.passwordHash = await bcrypt.hash(newPassword, 10);
    await client.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /client/change-email
router.put('/client/change-email', authMiddleware, async (req, res) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail) {
      return res.status(400).json({ error: 'New email is required' });
    }

    const existing = await Client.findOne({ email: newEmail });
    if (existing) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const client = await Client.findById(req.userId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    client.email = newEmail;
    await client.save();
    res.json({ message: 'Email updated successfully' });
  } catch (err) {
    console.error('Email change error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
