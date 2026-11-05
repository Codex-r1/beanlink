// api-gateway/utils/otp.js (or wherever you send email)
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.sendOTPEmail = async (email, otp) => {
  try {
    await resend.emails.send({
      // Use the domain you just verified in Step 1
      from: 'BeanLink <noreply@beanlinkapp.site', 
      to: email,
      subject: 'Your BeanLink Login Code',
      html: `<h1>${otp}</h1>`,
    });
    console.log("OTP sent to", email);
  } catch (error) {
    console.error("Resend error:", error);
    throw new Error("Failed to send OTP email");
  }
};