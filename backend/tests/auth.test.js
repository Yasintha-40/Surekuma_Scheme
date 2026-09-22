const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { createOtpService, OTP_TTL_SECONDS } = require('../services/otpService');
const { setOtpService } = require('../controllers/authController');

process.env.JWT_SECRET = 'surekuma-auth-test-secret-not-for-deployment';

const accounts = [
  { id: 1, email: 'member@example.com', role: 'applicant', status: 'active' },
  { id: 2, email: 'admin@example.com', role: 'admin', status: 'active' },
  { id: 3, email: 'inactive@example.com', role: 'applicant', status: 'inactive' },
  { id: 4, email: 'officer@example.com', role: 'insurance_officer', status: 'active' },
];

const originalExecute = db.execute;
db.execute = async (sql, values) => {
  assert.doesNotMatch(sql, /password|full_name|INSERT|UPDATE|DELETE/i);
  const key = sql.includes('WHERE email = ?') ? 'email' : 'id';
  return [accounts.filter(account => account[key] === values[0]).map(account => ({ ...account }))];
};

let mockChallenges = new Map();
let sentEmails = [];
let mockCurrentTime = 1700000000000;

const mockRepository = {
  withUserLock: async (userId, work, since) => {
    const rows = [...mockChallenges.values()].filter(row => row.user_id === userId && row.created_at >= since)
      .sort((a, b) => b.id - a.id);
    return work(rows, {
      insert: async state => {
        const id = String(mockChallenges.size + 1);
        mockChallenges.set(id, { ...state, id, user_id: userId });
        return id;
      },
      save: async state => mockChallenges.set(String(state.id), { ...state, user_id: userId }),
      invalidate: async time => {
        for (const row of mockChallenges.values()) {
          if (row.user_id === userId && !row.used_at && !row.invalidated_at) row.invalidated_at = time;
        }
      },
    });
  },
};

const mockSendOtp = async ({ email, code, expiresInMinutes }) => {
  const stored = [...mockChallenges.values()].find(row => row.email === email && !row.invalidated_at && !row.used_at);
  assert.ok(stored, 'Challenge must be persisted before email is sent');
  assert.match(stored.otp_hash, /^[a-f0-9]{64}$/);
  sentEmails.push({ email, code, expiresInMinutes });
};

const testOtpService = createOtpService({
  repository: mockRepository,
  sendOtp: mockSendOtp,
  now: () => mockCurrentTime,
  secret: () => process.env.JWT_SECRET,
});

setOtpService(testOtpService);

const { authenticate, authorize } = require('../middleware/authMiddleware');
const app = express();
app.use(express.json());
app.use('/api/auth', require('../routes/authRoutes'));
app.get('/admin', authenticate, authorize('admin'), (req, res) => res.json({ role: req.user.role }));
app.use((error, req, res, next) => res.status(500).json({ message: error.message }));

let server;
let origin;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  db.execute = originalExecute;
  await new Promise(resolve => server.close(resolve));
  await db.end();
});

beforeEach(() => {
  mockChallenges.clear();
  sentEmails = [];
  mockCurrentTime = 1700000000000;
});

const requestOtp = body => fetch(`${origin}/api/auth/otp/request`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const verifyOtp = body => fetch(`${origin}/api/auth/otp/verify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const legacyLogin = body => fetch(`${origin}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

test('requesting OTP normalizes email and sends 6-digit code with 10-minute expiry', async () => {
  const response = await requestOtp({ email: '  MEMBER@example.com ' });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.challengeId);
  assert.equal(body.expiresIn, 600);
  assert.equal(body.retryAfter, 60);

  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].email, 'member@example.com');
  assert.match(sentEmails[0].code, /^\d{6}$/);
  assert.equal(sentEmails[0].expiresInMinutes, 10);
});

test('successful two-step OTP verification signs in applicant with JWT', async () => {
  const reqRes = await requestOtp({ email: 'member@example.com' });
  const { challengeId } = await reqRes.json();
  const code = sentEmails[0].code;

  const verRes = await verifyOtp({ email: 'member@example.com', challengeId, code });
  assert.equal(verRes.status, 200);
  const body = await verRes.json();
  assert.deepEqual(body.user, { id: 1, email: 'member@example.com', role: 'applicant' });
  assert.equal(jwt.verify(body.token, process.env.JWT_SECRET).id, 1);
});

test('OTP is stored as a hash and cannot verify a different email account', async () => {
  const response = await requestOtp({ email: 'member@example.com' });
  const { challengeId } = await response.json();
  const code = sentEmails[0].code;
  assert.match(mockChallenges.get(challengeId).otp_hash, /^[a-f0-9]{64}$/);
  assert.notEqual(mockChallenges.get(challengeId).otp_hash, code);
  const mismatch = await verifyOtp({ email: 'admin@example.com', challengeId, code });
  assert.equal(mismatch.status, 400);
  assert.equal((await verifyOtp({ email: 'member@example.com', challengeId, code })).status, 200);
});

test('resending replaces the previous challenge', async () => {
  const first = await (await requestOtp({ email: 'member@example.com' })).json();
  const oldCode = sentEmails[0].code;
  mockCurrentTime += 61000;
  const second = await (await requestOtp({ email: 'member@example.com' })).json();
  assert.equal(second.challengeId, first.challengeId);
  assert.equal(mockChallenges.size, 1);
  assert.equal((await verifyOtp({ email: 'member@example.com', challengeId: first.challengeId, code: oldCode })).status, 400);
  assert.equal((await verifyOtp({ email: 'member@example.com', challengeId: second.challengeId, code: sentEmails[1].code })).status, 200);
});

test('changing an account email cannot verify a code sent to the old address', async () => {
  const { challengeId } = await testOtpService.request(accounts[0]);
  const result = await testOtpService.verify(1, challengeId, sentEmails[0].code, 'changed@example.com');
  assert.equal(result.verified, false);
});

test('SMTP failure leaves a persisted but invalidated challenge', async () => {
  const service = createOtpService({ repository: mockRepository, now: () => mockCurrentTime,
    sendOtp: async () => { throw Object.assign(new Error('Delivery failed'), { code: 'MAIL_SEND_FAILED' }); } });
  await assert.rejects(service.request(accounts[0]), { code: 'MAIL_SEND_FAILED' });
  const row = [...mockChallenges.values()][0];
  assert.ok(row.otp_hash);
  assert.ok(row.invalidated_at);
  mockCurrentTime += 61000;
  const next = await testOtpService.request(accounts[0]);
  assert.equal(next.challengeId, row.id);
  assert.equal((await testOtpService.verify(1, next.challengeId, sentEmails[0].code, accounts[0].email)).verified, true);
});

test('admin can complete OTP sign-in and open protected admin routes', async () => {
  const reqRes = await requestOtp({ email: 'admin@example.com' });
  const { challengeId } = await reqRes.json();
  const code = sentEmails[0].code;

  const verRes = await verifyOtp({ email: 'admin@example.com', challengeId, code });
  const body = await verRes.json();
  assert.equal(body.user.role, 'admin');

  const admin = await fetch(`${origin}/admin`, { headers: { Authorization: `Bearer ${body.token}` } });
  assert.equal(admin.status, 200);
});

test('applicant cannot open admin endpoints with valid applicant token', async () => {
  const reqRes = await requestOtp({ email: 'member@example.com' });
  const { challengeId } = await reqRes.json();
  const verRes = await verifyOtp({ email: 'member@example.com', challengeId, code: sentEmails[0].code });
  const { token } = await verRes.json();

  const admin = await fetch(`${origin}/admin`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(admin.status, 403);
});

test('resend cooldown limits requests within 60 seconds', async () => {
  const first = await requestOtp({ email: 'member@example.com' });
  assert.equal(first.status, 200);

  // Advance time by 30 seconds (still within 60s cooldown)
  mockCurrentTime += 30 * 1000;
  const second = await requestOtp({ email: 'member@example.com' });
  assert.equal(second.status, 429);
  const body = await second.json();
  assert.equal(body.retryAfter, 30);

  // Advance time by another 31 seconds (past 60s)
  mockCurrentTime += 31 * 1000;
  const third = await requestOtp({ email: 'member@example.com' });
  assert.equal(third.status, 200);
});

test('repeated sends keep one challenge row', async () => {
  for (let i = 0; i < 5; i++) {
    const res = await requestOtp({ email: 'member@example.com' });
    assert.equal(res.status, 200);
    mockCurrentTime += 61 * 1000; // wait out resend cooldown
  }

  // The same database row is updated instead of creating another row.
  const res = await requestOtp({ email: 'member@example.com' });
  assert.equal(res.status, 200);
  assert.equal(mockChallenges.size, 1);
});

test('invalid code fails verification and locks after 5 attempts', async () => {
  const reqRes = await requestOtp({ email: 'member@example.com' });
  const { challengeId } = await reqRes.json();

  const wrongCode = sentEmails[0].code === '000000' ? '000001' : '000000';
  for (let i = 0; i < 4; i++) {
    const res = await verifyOtp({ email: 'member@example.com', challengeId, code: wrongCode });
    assert.equal(res.status, 400);
  }

  // 5th attempt locks the challenge
  const fifth = await verifyOtp({ email: 'member@example.com', challengeId, code: wrongCode });
  assert.equal(fifth.status, 429);

  // Even the correct code is now rejected
  const locked = await verifyOtp({ email: 'member@example.com', challengeId, code: sentEmails[0].code });
  assert.equal(locked.status, 429);
});

test('expired code cannot be verified after 10 minutes', async () => {
  const reqRes = await requestOtp({ email: 'member@example.com' });
  const { challengeId } = await reqRes.json();
  const code = sentEmails[0].code;

  // Advance time past 10 minutes (601 seconds)
  mockCurrentTime += 601 * 1000;

  const verRes = await verifyOtp({ email: 'member@example.com', challengeId, code });
  assert.equal(verRes.status, 400);
});

test('code can only be used once', async () => {
  const reqRes = await requestOtp({ email: 'member@example.com' });
  const { challengeId } = await reqRes.json();
  const code = sentEmails[0].code;

  const firstUse = await verifyOtp({ email: 'member@example.com', challengeId, code });
  assert.equal(firstUse.status, 200);
  assert.ok(mockChallenges.get(challengeId).used_at);

  const secondUse = await verifyOtp({ email: 'member@example.com', challengeId, code });
  assert.equal(secondUse.status, 400);
});

test('legacy direct email-only sign-in is rejected', async () => {
  const response = await legacyLogin({ email: 'member@example.com' });
  assert.equal(response.status, 403);
});

test('missing, invalid, and oversized emails are rejected on OTP request', async () => {
  for (const email of [undefined, '', 'bad-email', [], {}, 'a'.repeat(151) + '@example.com']) {
    assert.equal((await requestOtp({ email })).status, 400);
  }
});

test('unknown and inactive accounts cannot request OTP', async () => {
  for (const email of ['unknown@example.com', 'inactive@example.com']) {
    assert.equal((await requestOtp({ email })).status, 401);
  }
});

test('officer role can request OTP', async () => {
  assert.equal((await requestOtp({ email: 'officer@example.com' })).status, 200);
});

test('account creation route remains removed', async () => {
  assert.equal((await fetch(`${origin}/api/auth/register`, { method: 'POST' })).status, 404);
});

test('session endpoint restores current account', async () => {
  const token = jwt.sign({ id: 1, role: 'applicant' }, process.env.JWT_SECRET);
  const response = await fetch(`${origin}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { user: { id: 1, email: 'member@example.com', role: 'applicant' } });
});

test('protected endpoints reject missing, expired, and invalid tokens', async () => {
  const expired = jwt.sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: -1 });
  for (const token of ['', 'invalid-token', expired]) {
    const response = await fetch(`${origin}/api/auth/me`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    assert.equal(response.status, 401);
  }
});

test('inactive or deleted accounts cannot reuse tokens', async () => {
  for (const id of [3, 999]) {
    const token = jwt.sign({ id, role: 'admin' }, process.env.JWT_SECRET);
    assert.equal((await fetch(`${origin}/admin`, { headers: { Authorization: `Bearer ${token}` } })).status, 401);
  }
});
