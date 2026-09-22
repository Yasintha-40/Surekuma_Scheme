const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const registry = require('../services/lrrsRegistry');
const { syncApplicant } = require('../services/lrrsAccount');
const auth = require('../controllers/authController');
const { createOtpService } = require('../services/otpService');
const { getRegistration, saveApplication } = require('../controllers/applicationController');

const originals = { execute: db.execute, getConnection: db.getConnection, find: registry.findRegistration, enabled: process.env.LRRS_ENABLED, testEmails: process.env.LRRS_TEST_EMAILS };
let users, mappings, calls, challenges, sent, match, committed, rollback, failMapping;
const connection = {
  beginTransaction: async () => { committed = false; },
  commit: async () => { committed = true; },
  rollback: async () => { rollback = true; },
  release: () => {},
  execute: async (sql, values) => {
    calls.push([sql, values]);
    if (sql.includes('INSERT INTO users')) {
      if (!users.some(user => user.email === values[0])) users.push({ id: users.length + 1, email: values[0], role: 'applicant', status: 'active' });
      return [{ insertId: users.length }];
    }
    if (sql.includes('SELECT id, email, role, status FROM users')) return [users.filter(user => user.email === values[0])];
    if (sql.includes('INSERT INTO applicant_lrrs_registrations')) {
      if (failMapping) throw new Error('Mapping write failed');
      mappings.set(values[0], values[1]); return [{}];
    }
    if (sql.includes('FROM users u LEFT JOIN')) return [[{ sltda_registration_no: mappings.get(values[0]) }]];
    if (sql.includes('FROM applications')) return [[{ id: 9, user_id: 1, status: 'draft' }]];
    return [{ insertId: 1 }];
  },
};
beforeEach(() => {
  process.env.LRRS_ENABLED = 'true';
  delete process.env.LRRS_TEST_EMAILS;
  users = []; mappings = new Map(); calls = []; challenges = []; sent = []; match = 'TDL-123'; committed = false; rollback = false; failMapping = false;
  db.execute = connection.execute;
  db.getConnection = async () => connection;
  registry.findRegistration = async () => match;
  auth.setOtpService(createOtpService({
    repository: { withUserLock: async (id, work) => work(challenges.filter(row => row.user_id === id), {
      insert: async () => '1',
      save: async state => { challenges = [{ ...state, user_id: id }]; },
    }) },
    sendOtp: async payload => { assert.equal(committed, true); sent.push(payload); },
    secret: () => 'isolated-lrrs-test-secret',
  }));
});
after(() => {
  db.execute = originals.execute; db.getConnection = originals.getConnection; registry.findRegistration = originals.find;
  if (originals.enabled === undefined) delete process.env.LRRS_ENABLED; else process.env.LRRS_ENABLED = originals.enabled;
  if (originals.testEmails === undefined) delete process.env.LRRS_TEST_EMAILS; else process.env.LRRS_TEST_EMAILS = originals.testEmails;
});
const invoke = async (handler, req) => {
  const result = { status: 200 };
  const res = { status(code) { result.status = code; return this; }, json(data) { result.data = data; } };
  await handler(req, res, error => { result.error = error; });
  return result;
};

test('new LRRS member receives OTP, verifies, and auto-fills registration on save', async () => {
  process.env.JWT_SECRET = 'test-lrrs-jwt-secret';
  const requested = await invoke(auth.requestOtp, { body: { email: ' NEW@example.com ' } });
  assert.equal(requested.error, undefined);
  assert.equal(requested.status, 200);
  assert.equal(requested.data.token, undefined);
  assert.equal(users[0].role, 'applicant');
  assert.equal(sent[0].email, 'new@example.com');
  const challengeId = requested.data.challengeId;
  const bad = await invoke(auth.verifyOtp, { body: { email: 'new@example.com', challengeId, code: 'abcdef' } });
  assert.equal(bad.status, 400);
  const verified = await invoke(auth.verifyOtp, { body: { email: 'new@example.com', challengeId, code: sent[0].code } });
  assert.equal(verified.status, 200);
  assert.equal(jwt.verify(verified.data.token, process.env.JWT_SECRET).role, 'applicant');
  const registration = await invoke(getRegistration, { user: users[0] });
  assert.equal(registration.data.sltda_registration_no, 'TDL-123');
  await invoke(saveApplication, { user: users[0], params: { id: 9 }, body: { profile: { sltda_registration_no: 'FORGED' }, employment: { sltda_registration_no: 'FORGED' } } });
  assert.equal(calls.find(([sql]) => sql.includes('INSERT INTO applicant_profiles'))[1][12], 'TDL-123');
  assert.equal(calls.find(([sql]) => sql.includes('INSERT INTO employment_details'))[1][4], 'TDL-123');
});

test('unknown registry email creates no account or OTP', async () => {
  match = null;
  const result = await invoke(auth.requestOtp, { body: { email: 'unknown@example.com' } });
  assert.equal(result.status, 401); assert.equal(users.length, 0); assert.equal(sent.length, 0);
});

test('LRRS failure fails closed with a retryable message', async () => {
  registry.findRegistration = async () => { throw Object.assign(new Error('LRRS temporarily unavailable'), { code: 'LRRS_UNAVAILABLE', status: 503 }); };
  const result = await invoke(auth.requestOtp, { body: { email: 'member@example.com' } });
  assert.equal(result.status, 503); assert.equal(sent.length, 0); assert.equal(users.length, 0);
});

test('staff and inactive users never trigger registry provisioning', async () => {
  registry.findRegistration = async () => assert.fail('Must not query LRRS');
  for (const role of ['admin', 'insurance_officer']) {
    const user = { id: 1, email: 'staff@example.com', role, status: 'active' };
    assert.equal(await syncApplicant(user.email, user), user);
  }
  const inactive = { id: 2, email: 'inactive@example.com', role: 'applicant', status: 'inactive' };
  assert.equal(await syncApplicant(inactive.email, inactive), inactive);
  assert.equal(calls.length, 0);
});

test('existing applicants sync changed registration without creating duplicates', async () => {
  users.push({ id: 1, email: 'member@example.com', role: 'applicant', status: 'active' });
  mappings.set(1, 'OLD');
  await syncApplicant(users[0].email, users[0]);
  assert.equal(users.length, 1); assert.equal(mappings.get(1), 'TDL-123');
});

test('mapping failure rolls back and prevents OTP delivery', async () => {
  failMapping = true;
  const result = await invoke(auth.requestOtp, { body: { email: 'member@example.com' } });
  assert.ok(result.error); assert.equal(rollback, true); assert.equal(sent.length, 0);
});

test('registry disabled retains existing local behavior', async () => {
  process.env.LRRS_ENABLED = 'false';
  registry.findRegistration = async () => assert.fail('Must not query LRRS');
  assert.equal(await syncApplicant('unknown@example.com'), undefined);
});

test('temporary test access skips LRRS only for the configured existing active applicant', async () => {
  process.env.LRRS_TEST_EMAILS = ' TEST@example.com ';
  registry.findRegistration = async () => assert.fail('Test account must not query LRRS');
  const user = { id: 1, email: 'test@example.com', role: 'applicant', status: 'active' };
  assert.equal(await syncApplicant(user.email, user), user);
  assert.equal(calls.length, 0);
  const result = await invoke(auth.verifyOtp, { body: { email: user.email, challengeId: '1', code: '123456' } });
  assert.equal(result.status, 401);
  assert.equal(result.data.token, undefined);
});

test('test allowlist cannot provision unknown accounts or bypass LRRS for other applicants', async () => {
  process.env.LRRS_TEST_EMAILS = 'test@example.com';
  let queried = 0;
  registry.findRegistration = async () => { queried++; return null; };
  assert.equal(await syncApplicant('test@example.com'), null);
  assert.equal(await syncApplicant('other@example.com', { id: 2, role: 'applicant', status: 'active' }), null);
  assert.equal(queried, 2);
});

test('duplicate history collapses to one registration but multiple numbers are rejected', () => {
  assert.equal(registry.selectRegistration([{ RegistrationNumber: ' ABC ' }, { RegistrationNumber: 'ABC' }]), 'ABC');
  assert.equal(registry.selectRegistration([]), null);
  assert.throws(() => registry.selectRegistration([{ RegistrationNumber: 'ABC' }, { RegistrationNumber: 'XYZ' }]), { code: 'LRRS_AMBIGUOUS' });
});

test('lookup uses bound email, TDL filter, all years and the composite source keys', () => {
  assert.match(registry.MEMBER_QUERY, /= @email/);
  assert.match(registry.MEMBER_QUERY, /a.IsTDL = 1/);
  assert.doesNotMatch(registry.MEMBER_QUERY, /BETWEEN|a.year/);
  assert.equal((registry.MEMBER_QUERY.match(/a.SubModuleCode =/g) || []).length, 3);
});
