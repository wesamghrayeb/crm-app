const express = require('express');
const nodemailer = require('nodemailer');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/notify', auth, async (req, res) => {
  const { subject, message } = req.body;

  try {
    // הגדרת תחנת שליחה
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,     // מייל השולח
        pass: process.env.MAIL_PASS      // סיסמה או App Password
      }
    });

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: process.env.ADMIN_EMAIL, // כתובת מייל של המנהל
      subject,
      text: message
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Mail sent successfully' });
  } catch (err) {
    console.error('Mail send failed:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

module.exports = router;
