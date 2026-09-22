const db = require('../config/db');
const reviewEmail = require('../services/reviewEmail');
const { sendSms } = require('../services/sms');

const dashboard = async (req, res, next) => {
  try {
    const [[summary]] = await db.query(`SELECT COUNT(*) AS total, SUM(status='submitted') AS submitted, SUM(status='under_review') AS under_review, SUM(status='correction_required') AS correction_required, SUM(status='approved') AS approved, SUM(status='rejected') AS rejected FROM applications`);
    const [recent] = await db.query(`SELECT a.id, a.application_no, a.status, a.created_at, p.full_name, p.email FROM applications a LEFT JOIN applicant_profiles p ON p.application_id=a.id ORDER BY a.updated_at DESC LIMIT 8`);
    res.json({ summary, recent });
  } catch (error) { next(error); }
};

const listApplications = async (req, res, next) => {
  try {
    const { search = '', status = '' } = req.query;
    const params = []; let where = 'WHERE 1=1';
    if (req.user.role === 'insurance_officer') { where += " AND a.status = 'approved'"; }
    if (status) { where += ' AND a.status = ?'; params.push(status); }
    if (search) { where += ' AND (a.application_no LIKE ? OR p.full_name LIKE ? OR p.nic LIKE ?)'; const match = `%${search}%`; params.push(match, match, match); }
    const [applications] = await db.execute(`SELECT a.id, a.application_no, a.status, a.submitted_at, a.created_at, a.updated_at, p.full_name, p.email, p.nic, ps.scheme_name
      FROM applications a LEFT JOIN applicant_profiles p ON p.application_id=a.id LEFT JOIN pension_schemes ps ON ps.id=a.scheme_id ${where} ORDER BY a.updated_at DESC`, params);
    res.json(applications);
  } catch (error) { next(error); }
};

const getDetails = async (req, res, next) => {
  try {
    const scope = req.user.role === 'insurance_officer' ? " AND status = 'approved'" : '';
    const [[application]] = await db.execute(`SELECT * FROM applications WHERE id = ?${scope}`, [req.params.id]);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    const [[profile]] = await db.execute('SELECT * FROM applicant_profiles WHERE application_id = ?', [application.id]);
    const [[employment]] = await db.execute('SELECT * FROM employment_details WHERE application_id = ?', [application.id]);
    const [[socialSecurity]] = await db.execute('SELECT * FROM social_security_entitlements WHERE application_id = ?', [application.id]);
    const [[selection]] = await db.execute('SELECT a.scheme_id, a.start_month, a.monthly_contribution, ps.scheme_name, ps.duration_years, ps.description FROM applications a LEFT JOIN pension_schemes ps ON ps.id=a.scheme_id WHERE a.id = ?', [application.id]);
    const [family] = await db.execute('SELECT * FROM family_members WHERE application_id = ?', [application.id]);
    const [beneficiaries] = await db.execute('SELECT * FROM beneficiaries WHERE application_id = ?', [application.id]);
    const [documents] = await db.execute('SELECT * FROM documents WHERE application_id = ?', [application.id]);
    const [reviews] = await db.execute(`SELECT r.*, u.email AS admin_name FROM application_reviews r JOIN users u ON u.id=r.admin_id WHERE r.application_id=? ORDER BY r.reviewed_at DESC`, [application.id]);
    const [reviewOfficers] = await db.execute(`SELECT o.* FROM review_officer_details o
      JOIN application_reviews r ON r.id = o.review_id WHERE r.application_id = ?`, [application.id]);
    res.json({ application, profile, employment, socialSecurity, selection, family, beneficiaries, documents, reviews, reviewOfficers });
  } catch (error) { next(error); }
};

const review = async (req, res, next) => {
  const connection = await db.getConnection();
  let committed = false;
  try {
    const { action, comment = '' } = req.body;
    if (!['approved', 'rejected', 'correction_required'].includes(action)) return res.status(400).json({ message: 'A valid review action is required' });
    if (typeof comment !== 'string' || !comment.trim()) return res.status(400).json({ message: 'Please enter a response comment for the applicant' });
    const officerFields = ['recommending_officer_name', 'recommending_designation', 'approving_designation'];
    if (officerFields.some(key => req.body[key] !== undefined && (typeof req.body[key] !== 'string' || req.body[key].trim().length > 200))) {
      return res.status(400).json({ message: 'Officer names and designations must be text of 200 characters or fewer.' });
    }
    const officerValues = officerFields.map(key => req.body[key]?.trim() || null);
    await connection.beginTransaction();
    const [[application]] = await connection.execute('SELECT * FROM applications WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!application) {
      await connection.rollback();
      return res.status(404).json({ message: 'Application not found' });
    }
    if (!['submitted', 'under_review'].includes(application.status)) {
      await connection.rollback();
      return res.status(409).json({ message: 'Only submitted applications can be reviewed. This application may already have a decision.' });
    }
    const [[account]] = await connection.execute(`SELECT u.email, p.contact_number
      FROM users u LEFT JOIN applicant_profiles p ON p.application_id = ? WHERE u.id = ?`, [application.id, application.user_id]);
    const [savedReview] = await connection.execute('INSERT INTO application_reviews (application_id, admin_id, action, comment) VALUES (?, ?, ?, ?)', [application.id, req.user.id, action, comment.trim()]);
    if (officerValues.some(Boolean) || req.file) {
      const signature = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : null;
      await connection.execute(`INSERT INTO review_officer_details
        (review_id, recommending_officer_name, recommending_designation, approving_designation, signature_image)
        VALUES (?, ?, ?, ?, ?)`, [savedReview.insertId, ...officerValues, signature]);
    }
    await connection.execute('UPDATE applications SET status = ? WHERE id = ?', [action, application.id]);
    const subject = action === 'approved' ? 'Application approved' : action === 'rejected' ? 'Application rejected' : 'Correction required';
    const message = action === 'approved' ? `Your application ${application.application_no} has been approved.` : action === 'rejected' ? `Your application ${application.application_no} was not approved. ${comment.trim()}` : `Please update your application ${application.application_no}. ${comment.trim()}`;
    const emailId = await reviewEmail.queueReviewEmail(connection, {
      reviewId: savedReview.insertId, email: account.email,
      applicationNo: application.application_no, action, comment: comment.trim(),
    });
    await connection.commit();
    committed = true;
    let emailStatus = 'queued';
    try { emailStatus = await reviewEmail.deliverReviewEmail(emailId); } catch { /* The persisted queue retries delivery. */ }
    let smsStatus = account.contact_number ? 'queued' : 'not_configured';
    if (account.contact_number) {
      try {
        const smsMessage = action === 'approved' ? `Surekuma ${application.application_no}: Application approved. ${comment.trim()}`
          : action === 'rejected' ? `Surekuma ${application.application_no}: Application rejected. ${comment.trim()}`
            : `Surekuma ${application.application_no}: Corrections required. ${comment.trim()}`;
        smsStatus = await sendSms({ to: account.contact_number, body: smsMessage });
      } catch (error) { smsStatus = error.code === 'SMS_NOT_CONFIGURED' ? 'not_configured' : 'queued'; }
    }
    res.json({ emailStatus, smsStatus, message: 'Review saved. Applicant notification created; email and SMS delivery were queued/attempted.' });
  } catch (error) { if (!committed) await connection.rollback(); next(error); } finally { connection.release(); }
};

const resources = async (req, res, next) => {
  try {
    const { type } = req.params;
    const queries = {
      memberships: `SELECT m.*, a.application_no, p.full_name FROM memberships m JOIN applications a ON a.id=m.application_id LEFT JOIN applicant_profiles p ON p.application_id=a.id ORDER BY m.created_at DESC`,
      users: 'SELECT id, email, role, status, created_at FROM users ORDER BY created_at DESC',
      schemes: 'SELECT * FROM pension_schemes ORDER BY monthly_contribution',
      recommendations: `SELECT r.*, a.application_no, p.full_name FROM sltda_recommendations r JOIN applications a ON a.id=r.application_id LEFT JOIN applicant_profiles p ON p.application_id=a.id ORDER BY r.recommendation_date DESC`,
    };
    if (!queries[type]) return res.status(404).json({ message: 'Resource not found' });
    const [rows] = await db.query(queries[type]);
    res.json(rows);
  } catch (error) { next(error); }
};

const report = async (req, res, next) => {
  try {
    const [monthly] = await db.query(`SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS total FROM applications WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month`);
    res.json({ monthly });
  } catch (error) { next(error); }
};

module.exports = { dashboard, listApplications, getDetails, review, resources, report };
