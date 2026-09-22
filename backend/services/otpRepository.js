const db = require('../config/db');

// Lock the parent account so concurrent requests cannot create two active codes.
const withUserLock = async (userId, work, since = new Date(Date.now() - 3600000)) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[user]] = await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
    if (!user) throw new Error('OTP account no longer exists');
    const [rows] = await connection.execute(`SELECT * FROM applicant_otp_challenges
      WHERE user_id = ? ORDER BY created_at DESC, id DESC FOR UPDATE`, [userId]);
    const store = {
      insert: async state => {
        const [result] = await connection.execute(`INSERT INTO applicant_otp_challenges
          (user_id, email, otp_hash, expires_at, attempts, used_at, invalidated_at, created_at)
          VALUES (?, ?, ?, ?, 0, NULL, NULL, ?)`,
        [userId, state.email, state.otp_hash, state.expires_at, state.created_at]);
        return String(result.insertId);
      },
      save: state => connection.execute(`UPDATE applicant_otp_challenges
        SET email=?, otp_hash=?, expires_at=?, attempts=?, used_at=?, invalidated_at=?, created_at=?
        WHERE id=? AND user_id=?`,
      [state.email, state.otp_hash, state.expires_at, state.attempts, state.used_at, state.invalidated_at,
        state.created_at, state.id, userId]),
      invalidate: time => connection.execute(`UPDATE applicant_otp_challenges SET invalidated_at=?
        WHERE user_id=? AND used_at IS NULL AND invalidated_at IS NULL`, [time, userId]),
    };
    const result = await work(rows, store);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
};

module.exports = { withUserLock };
