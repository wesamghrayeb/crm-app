const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables from .env file
dotenv.config();

const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/booking');
const adminRoutes = require('./routes/admin');
const notifyRoutes = require('./routes/notify');
require('./cron/membershipCheck');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Debug log for the database URI (remove in production)
console.log("📦 MONGO_URI:", process.env.MONGO_URI);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 20000,
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use('/api', authRoutes);
app.use('/api', bookingRoutes);
app.use('/api', adminRoutes);
app.use('/api', notifyRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('API is working ✅');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
