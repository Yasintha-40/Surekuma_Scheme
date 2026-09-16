const db = require('../config/db');

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
    if (status) { where += ' AND a.status = ?'; params.push(status); }
    if (search) { where += ' AND (a.application_no LIKE ? OR p.full_name LIKE ? OR p.nic LIKE ?)'; const match = `%${search}%`; params.push(match, match, match); }
    const [applications] = await db.execute(`SELECT a.id, a.application_no, a.status, a.submitted_at, a.created_at, a.updated_at, p.full_name, p.email, p.nic, ps.scheme_name
      FROM applications a LEFT JOIN applicant_profiles p ON p.application_id=a.id LEFT JOIN application_scheme aps ON aps.application_id=a.id LEFT JOIN pension_schemes ps ON ps.id=aps.scheme_id ${where} ORDER BY a.updated_at DESC`, params);
    res.json(applications);
  } catch (error) { next(error); }
};

const getDetails = async (req, res, next) => {
  try {
    const [[application]] = await db.execute('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    const [[profile]] = await db.execute('SELECT * FROM applicant_profiles WHERE application_id = ?', [application.id]);
    const [[employment]] = await db.execute('SELECT * FROM employment_details WHERE application_id = ?', [application.id]);
    const [[socialSecurity]] = await db.execute('SELECT * FROM social_security_entitlements WHERE application_id = ?', [application.id]);
    const [[selection]] = await db.execute('SELECT aps.*, ps.scheme_name FROM application_scheme aps LEFT JOIN pension_schemes ps ON ps.id=aps.scheme_id WHERE aps.application_id = ?', [application.id]);
    const [family] = await db.execute('SELECT * FROM family_members WHERE application_id = ?', [application.id]);
    const [beneficiaries] = await db.execute('SELECT * FROM beneficiaries WHERE application_id = ?', [application.id]);
    const [documents] = await db.execute('SELECT * FROM documents WHERE application_id = ?', [application.id]);
    const [reviews] = await db.execute(`SELECT r.*, u.full_name AS admin_name FROM application_reviews r JOIN users u ON u.id=r.admin_id WHERE r.application_id=? ORDER BY r.reviewed_at DESC`, [application.id]);
    res.json({ application, profile, employment, socialSecurity, selection, family, beneficiaries, documents, reviews });
  } catch (error) { next(error); }
};

const review = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { action, comment = '' } = req.body;
    if (!['approved', 'rejected', 'correction_required'].includes(action)) return res.status(400).json({ message: 'A valid review action is required' });
    if (!comment.trim()) return res.status(400).json({ message: 'Please enter a response comment for the applicant' });
    const [[application]] = await connection.execute('SELECT * FROM applications WHERE id = ?', [req.params.id]);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    await connection.beginTransaction();
    await connection.execute('INSERT INTO application_reviews (application_id, admin_id, action, comment) VALUES (?, ?, ?, ?)', [application.id, req.user.id, action, comment.trim()]);
    await connection.execute('UPDATE applications SET status = ? WHERE id = ?', [action, application.id]);
    const subject = action === 'approved' ? 'Application approved' : action === 'rejected' ? 'Application rejected' : 'Correction required';
    const message = action === 'approved' ? `Your application ${application.application_no} has been approved.` : action === 'rejected' ? `Your application ${application.application_no} was not approved. ${comment.trim()}` : `Please update your application ${application.application_no}. ${comment.trim()}`;
    await connection.execute('INSERT INTO notifications (user_id, application_id, title, message) VALUES (?, ?, ?, ?)', [application.user_id, application.id, subject, message]);
    await connection.commit();
    res.json({ message: 'Review saved and applicant notified' });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};

const resources = async (req, res, next) => {
  try {
    const { type } = req.params;
    const queries = {
      memberships: `SELECT m.*, a.application_no, p.full_name FROM memberships m JOIN applications a ON a.id=m.application_id LEFT JOIN applicant_profiles p ON p.application_id=a.id ORDER BY m.created_at DESC`,
      users: 'SELECT id, full_name, email, role, status, created_at FROM users ORDER BY created_at DESC',
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
