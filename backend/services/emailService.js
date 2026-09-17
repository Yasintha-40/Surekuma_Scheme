const nodemailer = require('nodemailer');

function configuration() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) throw new Error('Email delivery is not configured');
  const port = Number(SMTP_PORT);
  if (![465, 587].includes(port)) throw new Error('Use SMTP port 465 or 587');
  return { host: SMTP_HOST, port, secure: port === 465, requireTLS: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    logger: false, debug: false };
}

function assertConfigured() { configuration(); }
async function sendOtp(email, otp) {
  const transport = nodemailer.createTransport(configuration());
  const result = await transport.sendMail({
    from: process.env.SMTP_FROM, to: email, subject: 'Your Surekuma verification code',
    text: `Your Surekuma verification code is ${otp}.\nThis code expires in 5 minutes.\nIf you did not request this code, you can ignore this email.`,
    disableFileAccess: true, disableUrlAccess: true,
  });
  if (!result.accepted?.length) throw new Error('Email was not accepted');
}
module.exports = { assertConfigured, sendOtp };
