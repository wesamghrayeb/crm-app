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
  const clients = await Client.find({ adminId: req.userId, role: 'client' }, 'fullName email totalSessions usedSessions startDate endDate');
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

// GET /api/admin/client/:id/slots
router.get('/admin/client/:id/slots', authMiddleware, adminOnly, async (req, res) => {
  try {
    const slots = await BookingSlot.find({ bookedClients: req.params.id, adminId: req.userId });
    res.json(slots);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch client appointments' });
  }
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

    const slots = await BookingSlot.find({ adminId: req.userId });

    const totalSlots = slots.length;

    // Safe booking count (avoid undefined/null issues)
    const totalBookings = slots.reduce((acc, slot) => {
      const count = Array.isArray(slot.bookedClients) ? slot.bookedClients.length : 0;
      return acc + count;
    }, 0);

    const totalSessions = clients.reduce((acc, client) => acc + (client.totalSessions || 0), 0);
    const usedSessions = clients.reduce((acc, client) => acc + (client.usedSessions || 0), 0);

    const usageData = [
      { name: 'שומשו', value: usedSessions },
      { name: 'טרם שומשו', value: totalSessions - usedSessions }
    ];

    console.log('--- DASHBOARD OVERVIEW ---');
    console.log('Admin ID:', req.userId);
    console.log('Total Clients:', totalClients);
    console.log('Total Slots:', totalSlots);
    console.log('Total Bookings:', totalBookings);
    console.log('Used Sessions:', usedSessions);

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

// Recent Activity Log
router.get('/admin/recent-activity', authMiddleware, adminOnly, async (req, res) => {
  try {
    const slots = await BookingSlot.find({ adminId: req.userId }).sort({ updatedAt: -1 }).limit(50).lean();
    const clientsMap = {};

    // Get all involved client IDs
    const clientIds = new Set();
    slots.forEach(slot => {
      slot.bookedClients.forEach(id => clientIds.add(id));
    });

    // Fetch their names
    const clients = await Client.find({ _id: { $in: Array.from(clientIds) } }, '_id fullName');
    clients.forEach(client => {
      clientsMap[client._id.toString()] = client.fullName;
    });

    // Generate activity log from slot bookings
    const activityLog = [];

    slots.forEach(slot => {
      if (!slot.history || !Array.isArray(slot.history)) return;

      slot.history.forEach(entry => {
        if (!entry.clientId || !entry.action || !entry.timestamp) return;

        activityLog.push({
          _id: `${slot._id}-${entry.clientId}-${entry.timestamp}`,
          clientName: clientsMap[entry.clientId] || 'לא ידוע',
          action: entry.action,
          slotDate: slot.date,
          slotTime: slot.time,
          timestamp: entry.timestamp
        });
      });
    });

    // Sort by newest first
    activityLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activityLog.slice(0, 20)); // return latest 20 actions
  } catch (err) {
    console.error('Failed to fetch activity log', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add client to a slot
router.put('/admin/slot/:id/add-client', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { clientId } = req.body;
    const slot = await BookingSlot.findOne({ _id: req.params.id, adminId: req.userId });
    if (!slot) return res.status(404).json({ error: 'Slot not found or not yours' });

    // בדיקה אם הלקוח כבר רשום
    if (slot.bookedClients.includes(clientId)) {
      return res.status(400).json({ error: 'Client already booked in this slot' });
    }

    // בדיקה אם התור מלא
    if (slot.bookedClients.length >= slot.maxClients) {
      return res.status(400).json({ error: 'Slot is already full' });
    }

    slot.bookedClients.push(clientId);
    await slot.save();

    res.json({ message: 'Client added to slot', slot });
  } catch (err) {
    console.error('Failed to add client to slot:', err);
    res.status(500).json({ error: 'Failed to add client to slot' });
  }
});

module.exports = router;
