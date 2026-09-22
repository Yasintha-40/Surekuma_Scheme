const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../config/db');
const controller = require('../controllers/adminController');
const { authorize } = require('../middleware/authMiddleware');
const originalExecute = db.execute;
after(() => { db.execute = originalExecute; });

test('officer search always restricts results to approved applications', async () => {
  db.execute = async (sql, params) => {
    assert.match(sql, /AND a.status = 'approved'/);
    assert.deepEqual(params, ['submitted', '%member%', '%member%', '%member%']);
    return [[]];
  };
  await controller.listApplications({ user: { role: 'insurance_officer' }, query: { status: 'submitted', search: 'member' } }, { json: rows => assert.deepEqual(rows, []) }, error => { throw error; });
});

test('officer cannot fetch an unapproved application by ID', async () => {
  let calls = 0;
  db.execute = async (sql, params) => {
    calls++;
    assert.match(sql, /WHERE id = \? AND status = 'approved'/);
    assert.deepEqual(params, ['12']);
    return [[]];
  };
  const res = { status(code) { assert.equal(code, 404); return this; }, json(body) { assert.equal(body.message, 'Application not found'); } };
  await controller.getDetails({ user: { role: 'insurance_officer' }, params: { id: '12' } }, res, error => { throw error; });
  assert.equal(calls, 1);
});

test('officers cannot access admin actions and applicants cannot access officer routes', () => {
  for (const [role, allowed] of [['insurance_officer', 'admin'], ['applicant', 'insurance_officer']]) {
    const res = { status(code) { assert.equal(code, 403); return this; }, json() {} };
    authorize(allowed)({ user: { role } }, res, () => assert.fail('Access should be denied'));
  }
});
