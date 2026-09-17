const { randomInt } = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const emailService = require('../services/emailService');

const normaliseEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const validEmail = email => email.length <= 150 && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email);
const sentMessage = 'If an active account exists for this email, a verification code has been sent. Check your inbox and spam folder.';
const invalidMessage = 'The verification code is incorrect or expired. Request a new code if needed.';

function createAuthController({ database = db, mailer = emailService, secret = () => process.env.JWT_SECRET } = {}) {
  const register = async (req, res, next) => {
    try {
      const fullName = typeof req.body.full_name === 'string' ? req.body.full_name.trim() : '';
      const email = normaliseEmail(req.body.email);
      if (!fullName || fullName.length > 150 || !validEmail(email)) return res.status(400).json({ message: 'Enter your full name and a valid email address.' });
      await database.execute("INSERT INTO users (full_name, email, role) VALUES (?, ?, 'APPLICANT')", [fullName, email]);
      return res.status(201).json({ message: 'Account created. Request an email verification code to sign in.' });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'An account with this email already exists. Please sign in.' });
      next(error);
    }
  };

  const sendOtp = async (req, res, next) => {
    const email = normaliseEmail(req.body.email);
    if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    try { mailer.assertConfigured(); } catch {
      return res.status(503).json({ message: 'Email sign-in is not configured yet. Please contact the administrator.' });
    }
    let connection;
    let hash;
    let code;
    try {
      connection = await database.getConnection();
      await connection.beginTransaction();
      const [[user]] = await connection.execute('SELECT *, NOW() AS db_now FROM users WHERE email = ? FOR UPDATE', [email]);
      if (!user || user.status !== 'ACTIVE') {
        await connection.commit();
        return res.json({ message: sentMessage, retryAfter: 60 });
      }
      const time = new Date(user.db_now).getTime();
      const elapsed = time - new Date(user.otp_last_sent_at || 0).getTime();
      const inWindow = user.otp_window_started_at && time - new Date(user.otp_window_started_at).getTime() < 3600000;
      if (elapsed < 60000 || (inWindow && user.otp_send_count >= 5)) {
        const retryAfter = Math.max(1, Math.ceil((elapsed < 60000 ? 60000 - elapsed : 3600000 - (time - new Date(user.otp_window_started_at).getTime())) / 1000));
        await connection.commit();
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({ message: 'Please wait before requesting another code.', retryAfter });
      }
      code = String(randomInt(0, 1000000)).padStart(6, '0');
      hash = await bcrypt.hash(code, 12);
      await connection.execute(`UPDATE users SET otp = ?, otp_expires_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE),
        otp_attempts = 0, otp_last_sent_at = NOW(), otp_send_count = ?,
        otp_window_started_at = ? WHERE user_id = ?`,
      [hash, inWindow ? user.otp_send_count + 1 : 1, inWindow ? user.otp_window_started_at : user.db_now, user.user_id]);
      await connection.commit();
    } catch (error) {
      if (connection) await connection.rollback();
      return next(error);
    } finally { if (connection) connection.release(); }
    try {
      await mailer.sendOtp(email, code);
      return res.json({ message: sentMessage, retryAfter: 60 });
    } catch {
      // Provider errors may include message contents or credentials: never log them.
      try {
        await database.execute('UPDATE users SET otp = NULL, otp_expires_at = NULL, otp_attempts = 0 WHERE email = ? AND otp = ?', [email, hash]);
      } catch { return res.status(503).json({ message: 'Email delivery failed. Please try again later.' }); }
      return res.status(503).json({ message: 'Email delivery failed. Please wait a minute and try again.' });
    }
  };

  const verifyOtp = async (req, res, next) => {
    const email = normaliseEmail(req.body.email);
    const otp = req.body.otp;
    if (!validEmail(email) || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) return res.status(400).json({ message: 'Enter a valid email address and a 6-digit verification code.' });
    let connection;
    try {
      connection = await database.getConnection();
      await connection.beginTransaction();
      // Serialize verification and resend so a code can be consumed only once.
      const [[user]] = await connection.execute('SELECT *, NOW() AS db_now FROM users WHERE email = ? FOR UPDATE', [email]);
      if (!user || user.status !== 'ACTIVE' || !user.otp || !user.otp_expires_at ||
          new Date(user.otp_expires_at) <= new Date(user.db_now) || user.otp_attempts >= 5) {
        await connection.commit();
        return res.status(401).json({ message: invalidMessage });
      }
      if (!(await bcrypt.compare(otp, user.otp))) {
        const attempts = user.otp_attempts + 1;
        await connection.execute('UPDATE users SET otp_attempts = ?, otp = ?, otp_expires_at = ? WHERE user_id = ?',
          [attempts, attempts >= 5 ? null : user.otp, attempts >= 5 ? null : user.otp_expires_at, user.user_id]);
        await connection.commit();
        return res.status(401).json({ message: attempts >= 5 ? 'Too many incorrect codes. Request a new code.' : invalidMessage });
      }
      const role = user.role.toLowerCase();
      const token = jwt.sign({ id: user.user_id, role }, secret(), { expiresIn: '1d' });
      await connection.execute('UPDATE users SET otp = NULL, otp_expires_at = NULL, otp_attempts = 0 WHERE user_id = ?', [user.user_id]);
      await connection.commit();
      return res.json({ message: 'Login successful', token, user: { id: user.user_id, full_name: user.full_name, email: user.email, role } });
    } catch (error) {
      if (connection) await connection.rollback();
      next(error);
    } finally { if (connection) connection.release(); }
  };
  return { register, sendOtp, verifyOtp };
}
module.exports = { ...createAuthController(), createAuthController };
