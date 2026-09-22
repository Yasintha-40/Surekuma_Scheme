const nodemailer = require('nodemailer');

const isConfigured = () => {
  return [process.env.SMTP_HOST, process.env.SMTP_USER, process.env.SMTP_PASS].every(value => value?.trim());
};

const assertConfigured = () => {
  if (!isConfigured()) {
    const error = new Error('Email sending is not configured.');
    error.code = 'MAIL_NOT_CONFIGURED';
    throw error;
  }
};

let transport;
const sendEmail = async ({ email, subject, text, html }) => {
  assertConfigured();

  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      requireTLS: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  try {
    const result = await transport.sendMail({
      from: { name: 'Surekuma', address: process.env.SMTP_FROM || process.env.SMTP_USER },
      to: email,
      subject,
      text,
      html,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    if (!result.accepted?.length) throw new Error('Recipient was not accepted');
    return result;
  } catch (error) {
    // Never forward SMTP responses or credentials to clients
    const err = new Error('The email provider could not accept the email.');
    err.code = 'MAIL_SEND_FAILED';
    throw err;
  }
};

const sendOtp = ({ email, code, expiresInMinutes }) => sendEmail({
  email,
  subject: 'Your Surekuma sign-in code',
  text: `Your Surekuma verification code is ${code}.\n\nIt expires in ${expiresInMinutes} minutes and can only be used once. Do not share this code. If you did not request it, you can ignore this email.`,
  html: `<div style="font-family:Arial,sans-serif;background:#f6f5ee;padding:32px;color:#173e32"><h1 style="font-size:24px">SUREKUMA</h1><h2>Verify your email</h2><p>Use this one-time code to continue to your account.</p><p style="font-size:36px;letter-spacing:8px;font-weight:bold;padding:20px;background:#fff;border-radius:12px">${code}</p><p>This code expires in ${expiresInMinutes} minutes. Do not share it with anyone.</p><p>If you did not request this code, you can ignore this email.</p></div>`,
});

module.exports = { assertConfigured, sendOtp, sendEmail };
