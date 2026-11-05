const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendOTPEmail = async (email, otp) => {
  try {
    await resend.emails.send({
      from: 'BeanLink <noreply@beanlinkapp.site>',
      to: email,
      subject: 'Your BeanLink Login Code',
      html: `<h1>${otp}</h1>`,
    });
    console.log("OTP sent successfully");
  } catch (error) {
    console.error("Resend error:", error);
    throw new Error("Failed to send OTP email");
  }
};