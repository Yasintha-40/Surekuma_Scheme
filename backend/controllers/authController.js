const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { createOtpService } = require('../services/otpService');
const otpRepository = require('../services/otpRepository');
const otpMailer = require('../services/otpMailer');
const { syncApplicant } = require('../services/lrrsAccount');

let activeOtpService = createOtpService({
  repository: otpRepository,
  sendOtp: otpMailer.sendOtp,
});

const setOtpService = (service) => {
  activeOtpService = service;
};

const normaliseEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const requestOtp = async (req, res, next) => {
  try {
    const email = normaliseEmail(req.body?.email);
    if (!email || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }

    const [users] = await db.execute('SELECT id, email, role, status FROM users WHERE email = ?', [email]);
    const user = await syncApplicant(email, users[0]);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'No active account or matching LRRS registration is available for this email. Please contact SLTDA.' });
    }
    if (!['applicant', 'admin', 'insurance_officer'].includes(user.role)) {
      return res.status(403).json({ message: 'Your account role does not have access to this portal.' });
    }

    try {
      const result = await activeOtpService.request(user);
      if (result.limited) {
        return res.status(429).json({
          message: `Please wait ${result.retryAfter} seconds before requesting another code.`,
          retryAfter: result.retryAfter,
        });
      }
      return res.json({
        message: 'Verification code sent to your email.',
        challengeId: result.challengeId,
        expiresIn: result.expiresIn,
        retryAfter: result.retryAfter,
      });
    } catch (mailError) {
      if (mailError.code === 'MAIL_NOT_CONFIGURED') {
        return res.status(503).json({
          message: 'Email service is not configured. Please add your Gmail credentials (SMTP_USER and SMTP_PASS) to backend/.env.',
        });
      }
      if (mailError.code === 'MAIL_SEND_FAILED') {
        return res.status(502).json({
          message: 'The email provider could not deliver the verification email. Please check your SMTP settings and try again.',
        });
      }
      throw mailError;
    }
  } catch (error) {
    if (error.code?.startsWith('LRRS_')) return res.status(error.status || 503).json({ message: error.message });
    next(error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const email = normaliseEmail(req.body?.email);
    const challengeId = typeof req.body?.challengeId === 'string' ? req.body.challengeId.trim() : '';
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';

    if (!email || email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }
    if (!/^[1-9]\d{0,18}$/.test(challengeId) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'Enter a valid 6-digit verification code' });
    }

    const [users] = await db.execute('SELECT id, email, role, status FROM users WHERE email = ?', [email]);
    const user = users[0];
    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'No active account is available for this email. Please contact your administrator.' });
    }
    if (!['applicant', 'admin', 'insurance_officer'].includes(user.role)) {
      return res.status(403).json({ message: 'Your account role does not have access to this portal.' });
    }

    const result = await activeOtpService.verify(user.id, challengeId, code, email);
    if (result.locked) {
      return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new verification code.' });
    }
    if (!result.verified) {
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res) => {
  return res.status(403).json({
    message: 'Direct email-only sign-in has been disabled. Please use the two-step verification code flow.',
  });
};

const getSession = (req, res) => res.json({ user: { id: req.user.id, email: req.user.email, role: req.user.role } });

module.exports = {
  requestOtp,
  verifyOtp,
  login,
  getSession,
  setOtpService,
};
