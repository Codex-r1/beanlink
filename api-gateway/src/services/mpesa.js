const { Daraja } = require('@lumierelabs/daraja');
require('dotenv').config();

if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_CONSUMER_SECRET) {
  console.warn('M-Pesa credentials missing. Payments will fail.');
}

const daraja = Daraja({
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  shortcode: process.env.MPESA_SHORTCODE,
  passkey: process.env.MPESA_PASSKEY,
  callbackUrl: process.env.MPESA_CALLBACK_URL,
  environment: 'sandbox', // 'production' when you go live
});

module.exports = daraja;