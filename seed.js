const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Client = require('./models/Client');
const BookingSlot = require('./models/BookingSlot');

dotenv.config();

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  await Client.deleteMany();
  await BookingSlot.deleteMany();

  const passwordHash = await bcrypt.hash('123456', 10);

  // Create 3 admins
  const admins = await Client.insertMany([
    { fullName: 'Admin One', email: 'admin1@example.com', passwordHash, role: 'admin' },
    { fullName: 'Admin Two', email: 'admin2@example.com', passwordHash, role: 'admin' },
    { fullName: 'Admin Three', email: 'admin3@example.com', passwordHash, role: 'admin' }
  ]);

  // Create 3 clients per admin
  const clients = [];
  admins.forEach((admin, i) => {
    for (let j = 0; j < 3; j++) {
      clients.push({
        fullName: `Client ${i + 1}-${j + 1}`,
        email: `c${i * 3 + j + 1}@example.com`,
        passwordHash,
        role: 'client',
        totalSessions: 10,
        usedSessions: 0,
        adminId: admin._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      });
    }
  });
  await Client.insertMany(clients);

  // Create 3 slots per admin
  const slots = [];
  admins.forEach((admin, i) => {
    for (let j = 0; j < 3; j++) {
      slots.push({
        date: `2025-06-${11 + i}`,
        time: `${9 + j}:00`,
        maxClients: 5,
        bookedClients: [],
        adminId: admin._id
      });
    }
  });
  await BookingSlot.insertMany(slots);

  console.log('✅ Seed completed: 3 admins, 9 clients, 9 slots.');
  process.exit();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
