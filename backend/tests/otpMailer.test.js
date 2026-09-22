const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sendOtp } = require('../services/otpMailer');

test('missing SMTP credentials rejects instead of pretending to email an OTP', async () => {
  const previous = process.env.SMTP_PASS;
  process.env.SMTP_PASS = '';
  try {
    await assert.rejects(sendOtp({ email: 'member@example.com', code: '123456', expiresInMinutes: 10 }), { code: 'MAIL_NOT_CONFIGURED' });
  } finally {
    if (previous === undefined) delete process.env.SMTP_PASS;
    else process.env.SMTP_PASS = previous;
  }
});
