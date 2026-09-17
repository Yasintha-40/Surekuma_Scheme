const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env'), quiet: true });
const db = require('../config/db');
const { createAuthController } = require('../controllers/authController');
const { rateLimit } = require('../middleware/authRateLimit');

function response() {
  return { statusCode: 200, headers: {}, status(code) { this.statusCode = code; return this; },
    set(key, value) { this.headers[key] = value; return this; }, json(body) { this.body = body; return this; } };
}

test('email OTP with MySQL temporary users table (no real email or user changes)', async t => {
  const connection = await db.getConnection();
  try {
    const [[schema]] = await connection.query('SHOW CREATE TABLE users');
    await connection.query(schema['Create Table'].replace('CREATE TABLE', 'CREATE TEMPORARY TABLE'));
    const database = { execute: (...args) => connection.execute(...args), getConnection: async () => ({
      execute: (...args) => connection.execute(...args), beginTransaction: () => connection.beginTransaction(),
      commit: () => connection.commit(), rollback: () => connection.rollback(), release() {},
    }) };
    let delivery;
    let failDelivery = false;
    let configured = true;
    const mailer = { assertConfigured() { if (!configured) throw new Error('Missing configuration'); },
      async sendOtp(email, otp) { if (failDelivery) throw new Error('Provider failed'); delivery = { email, otp }; } };
    const secret = 'test-only-secret';
    const controller = createAuthController({ database, mailer, secret: () => secret });
    const email = 'member@example.test';
    const call = async (action, body) => {
      const res = response();
      await controller[action]({ body }, res, error => { throw error; });
      return res;
    };
    const user = async () => (await connection.execute('SELECT * FROM users WHERE email = ?', [email]))[0][0];
    const reset = async () => {
      await connection.query('DELETE FROM users');
      await connection.execute("INSERT INTO users (full_name,email,role) VALUES ('Test',?,'APPLICANT')", [email]);
      delivery = null; failDelivery = false; configured = true;
    };

    await t.test('passwordless registration validates email and preserves unique accounts', async () => {
      assert.equal((await call('register', { full_name: 'Test', email: 'bad' })).statusCode, 400);
      assert.equal((await call('register', { full_name: 'Test', email: ' MEMBER@example.test ' })).statusCode, 201);
      assert.equal((await user()).password_hash, null);
      assert.equal((await call('register', { full_name: 'Test', email })).statusCode, 409);
    });
    await t.test('sends to entered email, stores hash, returns JWT, clears code and prevents reuse', async () => {
      await reset();
      const sent = await call('sendOtp', { email: ' MEMBER@example.test ' });
      assert.equal(sent.statusCode, 200);
      assert.equal(delivery.email, email);
      assert.match(delivery.otp, /^\d{6}$/);
      const row = await user();
      assert.notEqual(row.otp, delivery.otp);
      assert.ok(await bcrypt.compare(delivery.otp, row.otp));
      assert.equal(new Date(row.otp_expires_at) - new Date(row.otp_last_sent_at), 300000);
      assert.equal(JSON.stringify(sent.body).includes(delivery.otp), false);
      const login = await call('verifyOtp', { email, otp: delivery.otp });
      assert.equal(login.statusCode, 200);
      assert.equal(jwt.verify(login.body.token, secret).role, 'applicant');
      assert.equal(login.body.user.id, row.user_id);
      const cleared = await user();
      assert.equal(cleared.otp, null); assert.equal(cleared.otp_expires_at, null); assert.equal(cleared.otp_attempts, 0);
      assert.equal((await call('verifyOtp', { email, otp: delivery.otp })).statusCode, 401);
    });
    await t.test('expires codes, limits five incorrect attempts and rejects malformed codes', async () => {
      await reset(); await call('sendOtp', { email });
      assert.equal((await call('verifyOtp', { email, otp: '123' })).statusCode, 400);
      const wrong = delivery.otp === '000000' ? '111111' : '000000';
      for (let i = 0; i < 5; i++) assert.equal((await call('verifyOtp', { email, otp: wrong })).statusCode, 401);
      assert.equal((await user()).otp_attempts, 5);
      assert.equal((await call('verifyOtp', { email, otp: delivery.otp })).statusCode, 401);
      await reset(); await call('sendOtp', { email });
      await connection.query('UPDATE users SET otp_expires_at = DATE_SUB(NOW(), INTERVAL 1 SECOND)');
      assert.equal((await call('verifyOtp', { email, otp: delivery.otp })).statusCode, 401);
    });
    await t.test('resend cooldown, five-per-hour budget and replacement of old codes', async () => {
      await reset(); await call('sendOtp', { email });
      assert.equal((await call('sendOtp', { email })).statusCode, 429);
      const oldHash = (await user()).otp;
      await connection.query('UPDATE users SET otp_last_sent_at = DATE_SUB(NOW(), INTERVAL 61 SECOND)');
      assert.equal((await call('sendOtp', { email })).statusCode, 200);
      assert.notEqual((await user()).otp, oldHash);
      await connection.query('UPDATE users SET otp_last_sent_at = DATE_SUB(NOW(), INTERVAL 61 SECOND), otp_send_count = 5');
      assert.equal((await call('sendOtp', { email })).statusCode, 429);
      await connection.query('UPDATE users SET otp_window_started_at = DATE_SUB(NOW(), INTERVAL 61 MINUTE)');
      assert.equal((await call('sendOtp', { email })).statusCode, 200);
      assert.equal((await user()).otp_send_count, 1);
    });
    await t.test('unknown and inactive users get no email or token', async () => {
      await reset();
      assert.equal((await call('sendOtp', { email: 'unknown@example.test' })).statusCode, 200);
      assert.equal(delivery, null);
      await connection.query("UPDATE users SET status = 'SUSPENDED'");
      assert.equal((await call('sendOtp', { email })).statusCode, 200);
      assert.equal(delivery, null);
      assert.equal((await call('verifyOtp', { email, otp: '123456' })).statusCode, 401);
    });
    await t.test('admin JWT role is preserved', async () => {
      await reset(); await connection.query("UPDATE users SET role = 'ADMIN'");
      await call('sendOtp', { email });
      const result = await call('verifyOtp', { email, otp: delivery.otp });
      assert.equal(jwt.verify(result.body.token, secret).role, 'admin');
    });
    await t.test('missing SMTP config and delivery failure fail closed', async () => {
      await reset(); configured = false;
      assert.equal((await call('sendOtp', { email })).statusCode, 503);
      assert.equal((await user()).otp, null);
      configured = true; failDelivery = true;
      assert.equal((await call('sendOtp', { email })).statusCode, 503);
      assert.equal((await user()).otp, null);
      assert.equal((await user()).otp_send_count, 1);
    });
  } finally {
    await connection.query('DROP TEMPORARY TABLE IF EXISTS users');
    connection.release();
    await db.end();
  }
});

test('IP request limits reject abuse and expire', () => {
  let time = 0;
  const limit = rateLimit({ limit: 2, windowMs: 60000, now: () => time });
  let allowed = 0;
  const req = { ip: '127.0.0.1' };
  limit(req, response(), () => allowed++); limit(req, response(), () => allowed++);
  const blocked = response(); limit(req, blocked, () => allowed++);
  assert.equal(allowed, 2); assert.equal(blocked.statusCode, 429); assert.equal(blocked.headers['Retry-After'], '60');
  time = 60001; limit(req, response(), () => allowed++); assert.equal(allowed, 3);
});
