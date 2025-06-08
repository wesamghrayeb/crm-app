const cron = require('node-cron');
const Client = require('../models/Client');
const { sendEmail } = require('../utils/mailer');

const checkExpiringMemberships = async () => {
  const today = new Date();
  const in3Days = new Date(today);
  in3Days.setDate(today.getDate() + 3);

  const expiring = await Client.find({
    endDate: { $lte: in3Days }
  });

  for (const client of expiring) {
    await sendEmail(
      client.email,
      'המנוי שלך יסתיים בעוד 3 ימים',
      'שלום ' + client.fullName + ', תוקף המנוי שלך עומד להסתיים. נשמח לחדש אותו!'
    );
  }
};

cron.schedule('0 8 * * *', checkExpiringMemberships); // כל יום ב-08:00
