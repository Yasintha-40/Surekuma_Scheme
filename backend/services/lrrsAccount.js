const db = require('../config/db');
const registry = require('./lrrsRegistry');

const syncApplicant = async (email, existingUser) => {
  // Never reactivate blocked accounts or change staff roles through public login.
  if (existingUser && (existingUser.status !== 'active' || existingUser.role !== 'applicant')) return existingUser;
  if (!registry.enabled()) return existingUser;
  // Explicit temporary test access still requires an existing active applicant and OTP.
  const testEmails = (process.env.LRRS_TEST_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  if (existingUser && testEmails.includes(email.trim().toLowerCase())) return existingUser;
  const registration = await registry.findRegistration(email);
  if (!registration) return null;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(`INSERT INTO users (email, role, status) VALUES (?, 'applicant', 'active')
      ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`, [email]);
    const [[user]] = await connection.execute('SELECT id, email, role, status FROM users WHERE email = ? FOR UPDATE', [email]);
    if (user.status !== 'active' || user.role !== 'applicant') {
      await connection.rollback();
      return user;
    }
    // This stores the source registration only. Email ownership still requires OTP.
    // Do not infer insurance/pension eligibility or expiry from the TDL query.
    await connection.execute(`INSERT INTO applicant_lrrs_registrations
      (user_id, lrrs_registration_no, sltda_registration_no)
      VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE
      lrrs_registration_no = VALUES(lrrs_registration_no), sltda_registration_no = VALUES(sltda_registration_no)`,
    [user.id, registration, registration]);
    await connection.commit();
    return user;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
};

module.exports = { syncApplicant };
