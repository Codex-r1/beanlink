const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: 'stevie45@ethereal.email', 
    pass: 'ssESRf7ZM5AxCjfHHe' 
  }
});

exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: '"BeanLink Security" <security@beanlink.com>',
    to: email,
    subject: 'Your BeanLink Login Code',
    text: `Your one-time login code is: ${otp}`,
    html: `<h1>${otp}</h1>`
  };
  
  const info = await transporter.sendMail(mailOptions);
  console.log("OTP Email sent! Preview URL:", nodemailer.getTestMessageUrl(info));
};