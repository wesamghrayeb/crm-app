const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/booking');
const adminRoutes = require('./routes/admin');
require('./cron/membershipCheck');
const notifyRoutes = require('./routes/notify');

const cors = require('cors');
dotenv.config();

const app = express();
app.use(cors());

app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

app.use('/api', authRoutes);
app.use('/api', bookingRoutes);
app.use('/api', adminRoutes);
app.use('/api', notifyRoutes);

app.get('/', (req, res) => {
  res.send('API is working ✅');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));