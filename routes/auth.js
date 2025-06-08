const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const authMiddleware = require('../middleware/authMiddleware');

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
      endDate
    } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);

    const client = new Client({
      fullName,
      email,
      passwordHash,
      subscriptionType,
      totalSessions,
      usedSessions: 0,
      startDate: startDate || new Date(),
      endDate: endDate || null
    });

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
router.get('/me', authMiddleware, async (req, res) => {
  const client = await Client.findById(req.userId).select('-passwordHash');
  res.json(client);
});

module.exports = router;
