const db = require('../config/db');

// Resolve from the authenticated account, never from a form-supplied email or number.
const getApplicantRegistration = async (user, connection = db) => {
  const [[record]] = await connection.execute(`SELECT r.sltda_registration_no
    FROM users u LEFT JOIN applicant_lrrs_registrations r ON r.user_id = u.id
    WHERE u.id = ? AND u.email = ?`, [user.id, user.email]);
  return record?.sltda_registration_no?.trim() || null;
};

module.exports = { getApplicantRegistration };
