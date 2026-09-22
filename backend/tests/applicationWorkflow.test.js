const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../config/db');
const mailer = require('../services/otpMailer');
const { getRegistration, saveApplication } = require('../controllers/applicationController');
const { review } = require('../controllers/adminController');
const { buildReviewEmail, deliverReviewEmail } = require('../services/reviewEmail');

const originals = { execute: db.execute, getConnection: db.getConnection, sendEmail: mailer.sendEmail };
let calls, sent, application, registration, failMail, failQueue, committed, rolledBack, claimed;
const connection = {
  beginTransaction: async () => calls.push(['BEGIN']),
  commit: async () => { committed = true; calls.push(['COMMIT']); },
  rollback: async () => { rolledBack = true; calls.push(['ROLLBACK']); },
  release: () => calls.push(['RELEASE']),
  execute: async (sql, values) => {
    calls.push([sql, values]);
    if (sql.includes('FROM applications')) return [[application]];
    if (sql.includes('FROM users u LEFT JOIN')) return [[{ sltda_registration_no: registration }]];
    if (sql.includes('SELECT email FROM users')) return [[{ email: 'account@example.com' }]];
    if (sql.includes('INSERT INTO review_email_outbox') && failQueue) throw new Error('Queue unavailable');
    return [{ insertId: 77 }];
  },
};
beforeEach(() => {
  calls = []; sent = []; committed = false; rolledBack = false;
  failMail = false; failQueue = false; claimed = false;
  application = { id: 9, user_id: 1, status: 'submitted', application_no: 'SK-TEST-9' };
  registration = 'SLTDA-TEST-100';
  db.getConnection = async () => connection;
  db.execute = async (sql, values) => {
    if (sql.includes('UPDATE review_email_outbox SET status = \'sending\'')) {
      calls.push([sql, values]);
      const affectedRows = claimed ? 0 : 1;
      claimed = true;
      return [{ affectedRows }];
    }
    if (sql.includes('SELECT * FROM review_email_outbox')) {
      const queued = calls.find(([query]) => query.includes('INSERT INTO review_email_outbox'));
      return [[{ recipient: queued?.[1][1] || 'account@example.com', subject: queued?.[1][2], text_body: queued?.[1][3], html_body: queued?.[1][4] }]];
    }
    return connection.execute(sql, values);
  };
  mailer.sendEmail = async email => {
    assert.equal(committed, true, 'SMTP must be called after the transaction commits');
    if (failMail) throw new Error('SMTP unavailable');
    sent.push(email);
  };
});
after(() => Object.assign(db, { execute: originals.execute, getConnection: originals.getConnection }) && (mailer.sendEmail = originals.sendEmail));

const invoke = async (handler, body = {}, user = { id: 2, email: 'admin@example.com' }) => {
  const result = { status: 200 };
  const response = { status: code => { result.status = code; return response; }, json: data => { result.data = data; return response; } };
  await handler({ params: { id: 9 }, body, user }, response, error => { result.error = error; });
  return result;
};

test('registration lookup is scoped to authenticated account ID and email', async () => {
  const result = await invoke(getRegistration, { email: 'attacker@example.com' }, { id: 1, email: 'account@example.com' });
  assert.deepEqual(result.data, { email: 'account@example.com', sltda_registration_no: registration });
  assert.deepEqual(calls[0][1], [1, 'account@example.com']);
});

test('missing registration is returned as null, not a fabricated number', async () => {
  registration = null;
  const result = await invoke(getRegistration);
  assert.equal(result.data.sltda_registration_no, null);
});

test('saving ignores forged registration numbers in both applicant and employment sections', async () => {
  application.status = 'draft';
  const result = await invoke(saveApplication, {
    profile: { full_name: 'Test Applicant', nic: 'TEST-NIC', sltda_registration_no: 'FORGED' },
    employment: { sltda_registration_no: 'FORGED' },
  }, { id: 1, email: 'account@example.com' });
  assert.equal(result.error, undefined);
  const profile = calls.find(([sql]) => sql.includes('INSERT INTO applicant_profiles'));
  const employment = calls.find(([sql]) => sql.includes('INSERT INTO employment_details'));
  assert.equal(profile[1][12], registration);
  assert.equal(employment[1][4], registration);
  assert.equal(committed, true);
});

for (const status of ['rejected', 'correction_required']) {
  test(`${status} application saves edited profile and commits before success`, async () => {
    application.status = status;
    const result = await invoke(saveApplication, {
      profile: { full_name: 'Updated Applicant', nic: 'TEST-NIC', date_of_birth: '1993-09-25', permanent_address: 'Updated address', district: 'Moneragala', divisional_secretariat: 'Sevanagala' },
    }, { id: 1, email: 'account@example.com' });
    assert.equal(result.error, undefined);
    assert.equal(committed, true);
    const saved = calls.find(([sql]) => sql.includes('INSERT INTO applicant_profiles'));
    assert.equal(saved[1][0], 9);
    assert.equal(saved[1][3], '1993-09-25');
    assert.equal(saved[1][7], 'Updated address');
    assert.equal(saved[1][10], 'Moneragala');
    assert.equal(result.data.status, status === 'rejected' ? 'draft' : status);
  });
}

test('previously rejected submitted application saves changes to the same record and reopens as draft', async () => {
  application.latest_review_action = 'rejected';
  const result = await invoke(saveApplication, {
    profile: { full_name: 'Corrected Applicant', nic: 'TEST-NIC', permanent_address: 'Corrected address' },
  }, { id: 1, email: 'account@example.com' });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 200);
  assert.equal(result.data.status, 'draft');
  assert.equal(committed, true);
  const saved = calls.find(([sql]) => sql.includes('INSERT INTO applicant_profiles'));
  assert.equal(saved[1][0], 9);
  assert.equal(saved[1][7], 'Corrected address');
});

test('approved application stays locked even with an older rejection', async () => {
  application.status = 'approved';
  application.latest_review_action = 'rejected';
  const result = await invoke(saveApplication, {});
  assert.equal(result.status, 409);
  assert.equal(committed, false);
});

test('submitted application cannot report a successful edit or write profile changes', async () => {
  const result = await invoke(saveApplication, { profile: { full_name: 'Changed' } });
  assert.equal(result.status, 409);
  assert.equal(committed, false);
  assert.equal(calls.filter(([sql]) => sql === 'RELEASE').length, 1);
  assert.equal(calls.some(([sql]) => sql.includes('INSERT INTO applicant_profiles')), false);
});

for (const action of ['approved', 'rejected', 'correction_required']) {
  test(`${action} review saves and emails the account address after commit`, async () => {
    const result = await invoke(review, { action, comment: 'Decision details', email: 'forged@example.com' });
    assert.equal(result.error, undefined);
    assert.equal(result.data.emailStatus, 'sent');
    assert.equal(sent.length, 1);
    assert.equal(sent[0].email, 'account@example.com');
    assert.match(sent[0].text, /SK-TEST-9/);
    assert.match(sent[0].text, /Decision details/);
    assert.ok(calls.some(([sql]) => sql.includes("status = 'sent'")));
  });
}

test('SMTP failure keeps the saved decision and queues an automatic retry', async () => {
  failMail = true;
  const result = await invoke(review, { action: 'approved', comment: 'Approved' });
  assert.equal(result.data.emailStatus, 'queued');
  assert.equal(committed, true);
  assert.equal(rolledBack, false);
  assert.ok(calls.some(([sql]) => sql.includes("status = 'pending'")));
});

test('queue persistence failure rolls the whole review back and sends no email', async () => {
  failQueue = true;
  const result = await invoke(review, { action: 'approved', comment: 'Approved' });
  assert.ok(result.error);
  assert.equal(committed, false);
  assert.equal(rolledBack, true);
  assert.equal(sent.length, 0);
});

test('already reviewed and draft applications cannot generate duplicate decision emails', async () => {
  for (const status of ['approved', 'rejected', 'draft', 'correction_required']) {
    application.status = status;
    const result = await invoke(review, { action: 'approved', comment: 'Approved' });
    assert.equal(result.status, 409);
  }
  assert.equal(sent.length, 0);
  assert.ok(!calls.some(([sql]) => sql.includes('INSERT INTO application_reviews')));
});

test('a queue item already claimed by a worker cannot be sent again concurrently', async () => {
  claimed = true;
  assert.equal(await deliverReviewEmail(77), 'queued');
  assert.equal(sent.length, 0);
});

test('email template escapes administrator comments and includes clear rejection status', () => {
  const email = buildReviewEmail({ applicationNo: 'SK-9', action: 'rejected', comment: '<script>alert("x")</script>' });
  assert.match(email.subject, /Application rejected/);
  assert.match(email.text, /has been rejected/);
  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /&lt;script&gt;/);
});

test('officer details and signature are saved with the review transaction', async () => {
  const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const handler = (req, res, next) => review({ ...req, file: { mimetype: 'image/png', buffer: image } }, res, next);
  const result = await invoke(handler, { action: 'approved', comment: 'Approved', recommending_officer_name: ' Officer A ', recommending_designation: ' Director ', approving_designation: ' Chairman ' });
  assert.equal(result.error, undefined);
  const index = calls.findIndex(([sql]) => sql.includes('INSERT INTO review_officer_details'));
  assert.ok(index > -1);
  assert.deepEqual(calls[index][1], [77, 'Officer A', 'Director', 'Chairman', `data:image/png;base64,${image.toString('base64')}`]);
  assert.ok(index < calls.findIndex(([sql]) => sql === 'COMMIT'));
});

test('oversized officer designation is rejected before writing a review', async () => {
  const result = await invoke(review, { action: 'approved', comment: 'Approved', approving_designation: 'x'.repeat(201) });
  assert.equal(result.status, 400);
  assert.equal(calls.some(([sql]) => sql.includes('INSERT INTO application_reviews')), false);
});
