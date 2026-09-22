const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { prepareImport } = require('../services/lrrsImport');
const registry = require('../services/lrrsRegistry');
const db = require('../config/db');
const execute = db.execute;
const source = process.env.LRRS_SOURCE;
after(() => {
  db.execute = execute;
  if (source === undefined) delete process.env.LRRS_SOURCE; else process.env.LRRS_SOURCE = source;
});

test('import trims source fields, deduplicates and excludes invalid rows without copying unrelated data', () => {
  const result = prepareImport([
    { email: ' MEMBER@example.com ', reg_no: ' A-1340  ', facebook: 'private NIC' },
    { email: 'member@example.com', reg_no: 'A-1340' },
    { email: '', reg_no: 'A-1' }, null,
    { email: 'invalid', reg_no: 'A-2' },
    { email: 'empty@example.com', reg_no: '' },
  ]);
  assert.deepEqual(result.records, [['member@example.com', 'A-1340']]);
  assert.equal(result.summary.skipped, 4);
  assert.equal(result.summary.duplicates, 1);
  assert.throws(() => prepareImport([]));
  assert.throws(() => prepareImport([{ email: 'invalid' }]));
});

test('import lookup binds normalized email and does not connect to SQL Server', async () => {
  process.env.LRRS_SOURCE = 'import';
  db.execute = async (sql, values) => {
    assert.match(sql, /WHERE email = \? LIMIT 2/);
    assert.deepEqual(values, ['member@example.com']);
    return [[{ RegistrationNumber: 'A-1340' }]];
  };
  assert.equal(await registry.findRegistration(' MEMBER@example.com '), 'A-1340');
  db.execute = async () => [[]];
  assert.equal(await registry.findRegistration('missing@example.com'), null);
});

test('multiple registrations remain ambiguous, never silently choosing one', async () => {
  const result = prepareImport([{ email: 'shared@example.com', reg_no: 'A-1' }, { email: 'SHARED@example.com', reg_no: 'A-2' }]);
  assert.equal(result.summary.ambiguousEmails, 1);
  process.env.LRRS_SOURCE = 'import';
  db.execute = async () => [result.records.map(([, RegistrationNumber]) => ({ RegistrationNumber }))];
  await assert.rejects(registry.findRegistration('shared@example.com'), { code: 'LRRS_AMBIGUOUS', status: 409 });
});

test('import table failures return a safe retryable error', async () => {
  process.env.LRRS_SOURCE = 'import';
  db.execute = async () => { throw Object.assign(new Error('private database details'), { code: 'ER_NO_SUCH_TABLE' }); };
  await assert.rejects(registry.findRegistration('member@example.com'), { code: 'LRRS_UNAVAILABLE', status: 503 });
});
