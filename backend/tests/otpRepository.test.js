const { test } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../config/db');
const repository = require('../services/otpRepository');
const { createOtpService } = require('../services/otpService');

test('repository commits the hashed applicant challenge before SMTP is invoked', async () => {
  const original = db.getConnection;
  const events = [];
  let savedHash;
  db.getConnection = async () => ({
    beginTransaction: async () => events.push('begin'),
    execute: async (sql, values) => {
      if (sql.startsWith('SELECT id FROM users')) return [[{ id: 1 }]];
      if (sql.startsWith('SELECT *')) return [[]];
      if (sql.startsWith('INSERT')) {
        assert.match(sql, /applicant_otp_challenges/);
        assert.equal(values[1], 'member@example.com');
        events.push('insert');
        return [{ insertId: 42 }];
      }
      if (sql.includes('SET email=')) { savedHash = values[1]; events.push('hash'); }
      return [{ affectedRows: 1 }];
    },
    commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'),
    release: () => events.push('release'),
  });
  try {
    const service = createOtpService({ repository, secret: () => 'test-secret', sendOtp: async ({ code }) => {
      assert.deepEqual(events, ['begin', 'insert', 'hash', 'commit', 'release']);
      assert.match(savedHash, /^[a-f0-9]{64}$/);
      assert.notEqual(savedHash, code);
      events.push('send');
    } });
    const result = await service.request({ id: 1, email: 'member@example.com' });
    assert.equal(result.challengeId, '42');
    assert.equal(events.at(-1), 'send');
  } finally { db.getConnection = original; await db.end(); }
});

test('repository updates the existing applicant challenge instead of inserting a duplicate', async () => {
  const original = db.getConnection;
  const events = [];
  db.getConnection = async () => ({
    beginTransaction: async () => {},
    execute: async (sql, values) => {
      if (sql.startsWith('SELECT id FROM users')) return [[{ id: 1 }]];
      if (sql.startsWith('SELECT *')) return [[{
        id: 42, user_id: 1, email: 'member@example.com', otp_hash: 'old',
        expires_at: new Date(), attempts: 1, used_at: null, invalidated_at: null,
        created_at: new Date(Date.now() - 120000),
      }]];
      assert.doesNotMatch(sql, /INSERT INTO applicant_otp_challenges/);
      if (sql.startsWith('UPDATE applicant_otp_challenges')) events.push(values[7] === 42 ? 'save' : 'other');
      return [{ affectedRows: 1 }];
    },
    commit: async () => events.push('commit'),
    rollback: async () => events.push('rollback'),
    release: () => events.push('release'),
  });
  try {
    const service = createOtpService({ repository, secret: () => 'test-secret', sendOtp: async () => {} });
    const result = await service.request({ id: 1, email: 'member@example.com' });
    assert.equal(result.challengeId, '42');
    assert.deepEqual(events, ['save', 'commit', 'release']);
  } finally { db.getConnection = original; await db.end(); }
});
