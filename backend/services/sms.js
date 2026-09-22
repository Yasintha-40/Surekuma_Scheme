const https = require('https');

const sendSms = ({ to, body }) => new Promise((resolve, reject) => {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM_NUMBER: from } = process.env;
  if (!sid || !token || !from || !to) {
    const error = new Error('SMS provider is not configured');
    error.code = 'SMS_NOT_CONFIGURED';
    return reject(error);
  }
  const payload = new URLSearchParams({ To: to, From: from, Body: body }).toString();
  const request = https.request({
    hostname: 'api.twilio.com', path: `/2010-04-01/Accounts/${sid}/Messages.json`, method: 'POST',
    auth: `${sid}:${token}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(payload) },
  }, response => {
    let result = '';
    response.on('data', chunk => { result += chunk; });
    response.on('end', () => response.statusCode >= 200 && response.statusCode < 300
      ? resolve('sent') : reject(new Error(`SMS provider returned ${response.statusCode}: ${result}`)));
  });
  request.on('error', reject);
  request.write(payload);
  request.end();
});

module.exports = { sendSms };
