const express = require('express');
const BookingSlot = require('../models/BookingSlot');
const auth = require('../middleware/authMiddleware');
const Client = require('../models/Client');
const { Parser } = require('json2csv'); // ודא שהחבילה מותקנת
const fs = require('fs');
const path = require('path');
const router = express.Router();


// Middleware to verify admin
const adminOnly = async (req, res, next) => {
  const user = await Client.findById(req.userId);
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
};

// Create a booking slot
router.post('/admin/slot', auth, adminOnly, async (req, res) => {
  const { date, time, maxClients } = req.body;
  const slot = new BookingSlot({ date, time, maxClients, bookedClients: [] });
  await slot.save();
  res.json({ message: 'Slot created', slot });
});

// Edit slot (e.g., change maxClients)
router.put('/admin/slot/:id', auth, adminOnly, async (req, res) => {
  const { maxClients } = req.body;
  const slot = await BookingSlot.findByIdAndUpdate(req.params.id, { maxClients }, { new: true });
  if (!slot) return res.status(404).json({ error: 'Slot not found' });
  res.json(slot);
});

// Get all clients (Admin only)
router.get('/admin/clients', auth, adminOnly, async (req, res) => {
  try {
    const clients = await Client.find({}, 'fullName email totalSessions usedSessions');
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load clients' });
  }
});

// Get single client by ID (for profile page)
router.get('/admin/client/:id', auth, adminOnly, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    res.json(client);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Renew or update client membership
router.put('/admin/client/:id/renew', auth, adminOnly, async (req, res) => {
  try {
    const { subscriptionType, totalSessions, startDate, endDate } = req.body;

    const client = await Client.findByIdAndUpdate(
      req.params.id,
      {
        subscriptionType,
        totalSessions,
        usedSessions: 0,
        startDate,
        endDate
      },
      { new: true }
    );

    if (!client) return res.status(404).json({ error: 'Client not found' });

    res.json({ message: 'Membership renewed successfully', client });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get booking usage report for all clients
router.get('/admin/report/usage', auth, adminOnly, async (req, res) => {
  try {
    const clients = await Client.find().select('fullName email subscriptionType totalSessions usedSessions');

    // הוספת אחוזי שימוש לכל לקוח
    const report = clients.map(client => {
      const usageRate = client.totalSessions > 0
        ? Math.round((client.usedSessions / client.totalSessions) * 100)
        : 0;

      return {
        fullName: client.fullName,
        email: client.email,
        subscriptionType: client.subscriptionType,
        totalSessions: client.totalSessions,
        usedSessions: client.usedSessions,
        usageRate: `${usageRate}%`
      };
    });

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

router.get('/admin/report/usage/export', auth, adminOnly, async (req, res) => {
  try {
    const clients = await Client.find().select('fullName email subscriptionType totalSessions usedSessions');

    const report = clients.map(client => {
      const usageRate = client.totalSessions > 0
        ? Math.round((client.usedSessions / client.totalSessions) * 100)
        : 0;

      return {
        Name: client.fullName,
        Email: client.email,
        Subscription: client.subscriptionType || '',
        TotalSessions: client.totalSessions,
        UsedSessions: client.usedSessions,
        UsageRate: `${usageRate}%`
      };
    });

    const fields = ['Name', 'Email', 'Subscription', 'TotalSessions', 'UsedSessions', 'UsageRate'];
    const json2csv = new Parser({ fields });
    const csv = json2csv.parse(report);

    res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).end(csv);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// ב־routes/admin.js
router.get('/admin/overview', auth, adminOnly, async (req, res) => {
  try {
    const clients = await Client.find();
    const totalClients = clients.length;

    const slots = await BookingSlot.find();
    const totalSlots = slots.length;

    const totalBookings = slots.reduce((acc, slot) => acc + slot.bookedClients.length, 0);
    const totalSessions = clients.reduce((acc, client) => acc + client.totalSessions, 0);
    const usedSessions = clients.reduce((acc, client) => acc + client.usedSessions, 0);

    const usageData = [
      { name: 'שומשו', value: usedSessions },
      { name: 'טרם שומשו', value: totalSessions - usedSessions }
    ];

    res.json({
      totalClients,
      totalSlots,
      totalBookings,
      usageData
    });
  } catch (err) {
    console.error('Overview error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



module.exports = router;
