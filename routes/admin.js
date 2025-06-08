const express = require('express');
const BookingSlot = require('../models/BookingSlot');
const Client = require('../models/Client');
const { Parser } = require('json2csv');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Middleware to verify admin
const adminOnly = async (req, res, next) => {
  const user = await Client.findById(req.userId);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
};

// Create slot
router.post('/admin/slot', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { date, time, maxClients } = req.body;
    const slot = new BookingSlot({
      date,
      time,
      maxClients,
      bookedClients: [],
      adminId: req.userId
    });
    await slot.save();
    res.json({ message: 'Slot created', slot });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create slot' });
  }
});

router.get('/admin/slots', authMiddleware, async (req, res) => {
  try {
    const user = await Client.findById(req.userId);

    // אם הלקוח שולח adminId כפרמטר, נשתמש בו
    let adminIdToQuery;

    if (user.role === 'admin') {
      adminIdToQuery = req.userId;
    } else if (user.role === 'client' && req.query.adminId) {
      adminIdToQuery = req.query.adminId;
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const slots = await BookingSlot.find({ adminId: adminIdToQuery });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// Edit slot
router.put('/admin/slot/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { maxClients } = req.body;
    const slot = await BookingSlot.findOneAndUpdate(
      { _id: req.params.id, adminId: req.userId },
      { maxClients },
      { new: true }
    );
    if (!slot) return res.status(404).json({ error: 'Slot not found or not yours' });
    res.json(slot);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update slot' });
  }
});

// Delete slot
router.delete('/admin/slot/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await BookingSlot.findOneAndDelete({ _id: req.params.id, adminId: req.userId });
    if (!result) return res.status(404).json({ error: 'Slot not found or not yours' });
    res.json({ message: 'Slot deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete slot' });
  }
});

// Clients CRUD
router.get('/admin/clients', authMiddleware, adminOnly, async (req, res) => {
  const clients = await Client.find({ adminId: req.userId, role: 'client' }, 'fullName email totalSessions usedSessions');
  res.json(clients);
});

router.get('/admin/client/:id', authMiddleware, adminOnly, async (req, res) => {
  const client = await Client.findOne({ _id: req.params.id, adminId: req.userId });
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
});

router.put('/admin/client/:id/renew', authMiddleware, adminOnly, async (req, res) => {
  const { subscriptionType, totalSessions, startDate, endDate } = req.body;
  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, adminId: req.userId },
    { subscriptionType, totalSessions, usedSessions: 0, startDate, endDate },
    { new: true }
  );
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json({ message: 'Membership renewed', client });
});

router.delete('/admin/client/:id', authMiddleware, adminOnly, async (req, res) => {
  const client = await Client.findOneAndDelete({ _id: req.params.id, adminId: req.userId });
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json({ message: 'Client deleted' });
});

// Usage report
router.get('/admin/report/usage', authMiddleware, adminOnly, async (req, res) => {
  const clients = await Client.find({ adminId: req.userId, role: 'client' });
  const report = clients.map(client => {
    const usageRate = client.totalSessions > 0
      ? Math.round((client.usedSessions / client.totalSessions) * 100)
      : 0;
    return {
      fullName: client.fullName,
      email: client.email,
      subscriptionType: client.subscriptionType || '',
      totalSessions: client.totalSessions,
      usedSessions: client.usedSessions,
      usageRate: `${usageRate}%`
    };
  });
  res.json(report);
});

router.get('/admin/report/usage/export', authMiddleware, adminOnly, async (req, res) => {
  const clients = await Client.find({ adminId: req.userId, role: 'client' });
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
});

// Overview
router.get('/admin/overview', authMiddleware, adminOnly, async (req, res) => {
  try {
    const clients = await Client.find({ adminId: req.userId, role: 'client' });
    const totalClients = clients.length;

    const slots = await BookingSlot.find({ adminId: req.userId }); // <-- עדכון כאן
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
