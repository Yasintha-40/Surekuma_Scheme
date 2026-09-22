const db = require('../config/db');
const mailer = require('./otpMailer');

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const buildReviewEmail = ({ applicationNo, action, comment }) => {
  const title = { approved: 'Application approved', rejected: 'Application rejected', correction_required: 'Corrections requested' }[action];
  if (!title) throw new Error('Unsupported review action');
  const outcome = action === 'correction_required' ? 'requires corrections' : `has been ${action}`;
  const message = `Your Surekuma application ${applicationNo} ${outcome}.`;
  return {
    subject: `${title} - ${applicationNo}`,
    text: `${message}\n\nAdministrator comment:\n${comment}\n\nSign in to Surekuma to view your application and notifications.`,
    html: `<div style="font-family:Arial,sans-serif;color:#173e32;padding:32px;background:#f6f5ee"><h1>SUREKUMA</h1><h2>${title}</h2><p>${escapeHtml(message)}</p><h3>Administrator comment</h3><p style="white-space:pre-wrap">${escapeHtml(comment)}</p><p>Sign in to Surekuma to view your application and notifications.</p></div>`,
  };
};

const queueReviewEmail = async (connection, { reviewId, email, ...details }) => {
  const content = buildReviewEmail(details);
  const [result] = await connection.execute(`INSERT INTO review_email_outbox
    (review_id, recipient, subject, text_body, html_body) VALUES (?, ?, ?, ?, ?)`,
  [reviewId, email, content.subject, content.text, content.html]);
  return result.insertId;
};

const deliverReviewEmail = async id => {
  // Claim atomically so the request and retry worker cannot send the same row together.
  const [claim] = await db.execute(`UPDATE review_email_outbox SET status = 'sending', attempts = attempts + 1,
    next_attempt_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE)
    WHERE id = ? AND status IN ('pending', 'sending') AND next_attempt_at <= NOW()`, [id]);
  if (!claim.affectedRows) return 'queued';
  const [[email]] = await db.execute('SELECT * FROM review_email_outbox WHERE id = ?', [id]);
  try {
    await mailer.sendEmail({ email: email.recipient, subject: email.subject, text: email.text_body, html: email.html_body });
  } catch {
    await db.execute(`UPDATE review_email_outbox SET status = 'pending',
      next_attempt_at = DATE_ADD(NOW(), INTERVAL 1 MINUTE) WHERE id = ?`, [id]);
    return 'queued';
  }
  await db.execute("UPDATE review_email_outbox SET status = 'sent', sent_at = NOW() WHERE id = ?", [id]);
  return 'sent';
};

const startReviewEmailWorker = () => {
  let running = false;
  const flush = async () => {
    if (running) return;
    running = true;
    try {
      const [rows] = await db.execute(`SELECT id FROM review_email_outbox
        WHERE status IN ('pending', 'sending') AND next_attempt_at <= NOW() ORDER BY id LIMIT 10`);
      for (const row of rows) await deliverReviewEmail(row.id);
    } catch (error) {
      console.error('Review email queue could not be processed:', error.code || 'QUEUE_ERROR');
    } finally { running = false; }
  };
  const timer = setInterval(flush, 60000);
  timer.unref();
  void flush();
  return timer;
};

module.exports = { buildReviewEmail, queueReviewEmail, deliverReviewEmail, startReviewEmailWorker };
