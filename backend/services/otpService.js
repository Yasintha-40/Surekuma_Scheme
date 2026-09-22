const { randomInt, createHmac, timingSafeEqual } = require('node:crypto');

const OTP_TTL_SECONDS = 10 * 60;
const RESEND_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const normaliseEmail = email => email.trim().toLowerCase();

function createOtpService({ repository, sendOtp, now = Date.now, secret = () => process.env.JWT_SECRET }) {
  const hash = (userId, email, id, code) => createHmac('sha256', secret())
    .update(`${userId}:${normaliseEmail(email)}:${id}:${code}`).digest('hex');
  const locked = (userId, work) => repository.withUserLock(userId, work, new Date(now() - 3600000));

  const request = async user => {
    const code = randomInt(0, 1000000).toString().padStart(6, '0');
    const email = normaliseEmail(user.email);
    const result = await locked(user.id, async (rows, store) => {
      const time = now();
      const latest = rows[0];
      const sinceLast = latest ? time - new Date(latest.created_at).getTime() : Infinity;
      if (sinceLast < RESEND_SECONDS * 1000) return { limited: true, retryAfter: Math.ceil((RESEND_SECONDS * 1000 - sinceLast) / 1000) };
      const row = { email, otp_hash: '', expires_at: new Date(time + OTP_TTL_SECONDS * 1000),
        attempts: 0, used_at: null, invalidated_at: null, created_at: new Date(time) };
      if (latest) {
        row.id = latest.id;
      } else {
        row.id = await store.insert(row);
      }
      row.otp_hash = hash(user.id, email, row.id, code);
      await store.save(row);
      return { challengeId: String(row.id), expiresIn: OTP_TTL_SECONDS, retryAfter: RESEND_SECONDS };
    });
    if (result.limited) return result;
    // The transaction has committed before contacting the mail provider.
    try {
      await sendOtp({ email, code, expiresInMinutes: OTP_TTL_SECONDS / 60 });
    } catch (error) {
      await locked(user.id, async (rows, store) => {
        const row = rows.find(row => String(row.id) === result.challengeId);
        if (row) await store.save({ ...row, invalidated_at: new Date(now()) });
      });
      throw error;
    }
    return result;
  };

  const verify = (userId, challengeId, code, email) => locked(userId, async (rows, store) => {
    const row = rows.find(row => String(row.id) === challengeId);
    if (!row || normaliseEmail(row.email) !== normaliseEmail(email) || row.used_at) return { verified: false };
    if (row.attempts >= MAX_ATTEMPTS) return { verified: false, locked: true };
    if (row.invalidated_at || new Date(row.expires_at).getTime() <= now()) return { verified: false };
    const expected = Buffer.from(row.otp_hash, 'hex');
    const actual = Buffer.from(hash(userId, email, challengeId, code), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      const attempts = row.attempts + 1;
      await store.save({ ...row, attempts, invalidated_at: attempts >= MAX_ATTEMPTS ? new Date(now()) : null });
      return { verified: false, locked: attempts >= MAX_ATTEMPTS };
    }
    await store.save({ ...row, used_at: new Date(now()) });
    return { verified: true };
  });
  return { request, verify };
}

module.exports = { createOtpService, OTP_TTL_SECONDS, RESEND_SECONDS };
