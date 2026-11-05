const nodemailer = require('nodemailer');
require('dotenv').config(); // Ensure env vars are loaded

const transporter = nodemailer.createTransport({
  service: 'gmail', // Use Gmail's built-in settings
  auth: {
    user: process.env.SMTP_USER, // Your Gmail address
    pass: process.env.SMTP_PASS, // The 16-letter App Password
  }
});

exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: `"BeanLink Security" <${process.env.SMTP_USER}>`, 
    to: email, // The dynamic recipient (farmer, buyer, etc.)
    subject: 'Your BeanLink Login Code',
    text: `Your one-time login code is: ${otp}`,
    html: `<h1>${otp}</h1>`
  };
  
  await transporter.sendMail(mailOptions);

};