require('dotenv').config({ path: require('node:path').join(__dirname, '../.env'), quiet: true });
const db = require('../config/db');

async function migrate() {
  const [columns] = await db.query('SHOW COLUMNS FROM users');
  const names = new Set(columns.map(column => column.Field));
  const definitions = {
    otp: 'VARCHAR(255) NULL', otp_expires_at: 'DATETIME NULL',
    otp_attempts: 'INT NOT NULL DEFAULT 0', otp_last_sent_at: 'DATETIME NULL',
    otp_send_count: 'INT NOT NULL DEFAULT 0', otp_window_started_at: 'DATETIME NULL',
  };
  const changes = Object.entries(definitions).filter(([name]) => !names.has(name))
    .map(([name, definition]) => `ADD COLUMN ${name} ${definition}`);
  if (columns.find(column => column.Field === 'password_hash')?.Null === 'NO') changes.push('MODIFY COLUMN password_hash VARCHAR(255) NULL');
  if (changes.length) await db.query(`ALTER TABLE users ${changes.join(', ')}`);
  console.log(changes.length ? 'Email OTP migration applied; existing data preserved.' : 'Email OTP schema is already up to date.');
}
migrate().catch(() => { console.error('Email OTP migration failed. Check database access and the users schema.'); process.exitCode = 1; }).finally(() => db.end());
