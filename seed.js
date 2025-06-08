const mongoose = require('mongoose');
const dotenv = require('dotenv');
const BookingSlot = require('./models/BookingSlot');

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to DB');

  await BookingSlot.deleteMany(); // אופציונלי: איפוס

  await BookingSlot.create([
    {
      date: "2025-06-10",
      time: "10:00",
      maxClients: 5,
      bookedClients: []
    },
    {
      date: "2025-06-10",
      time: "11:00",
      maxClients: 5,
      bookedClients: []
    }
  ]);

  console.log('✅ Slots created');
  process.exit();
});