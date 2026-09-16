const db = require('../config/db');

const statusForDatabase = (value) => ({
  draft: 'DRAFT', submitted: 'SUBMITTED', under_review: 'UNDER_REVIEW',
  correction_required: 'RETURNED', returned: 'RETURNED', recommended: 'RECOMMENDED',
  approved: 'APPROVED', rejected: 'REJECTED',
}[String(value || '').toLowerCase()] || String(value || '').toUpperCase());

const applicationDetails = async (id) => {
  const [[application]] = await db.execute(`SELECT a.*, a.application_id AS id, u.user_id, u.full_name AS user_full_name,
    u.email, p.nic, p.date_of_birth, p.gender, p.nationality, p.permanent_address, p.contact_number
    FROM applications a JOIN applicants p ON p.applicant_id = a.applicant_id JOIN users u ON u.user_id = p.user_id
    WHERE a.application_id = ?`, [id]);
  return application;
};

const dashboard = async (req, res, next) => {
  try {
    const [[summary]] = await db.query(`SELECT COUNT(*) AS total,
      SUM(status = 'SUBMITTED') AS submitted, SUM(status = 'UNDER_REVIEW') AS under_review,
      SUM(status = 'RETURNED') AS returned, SUM(status = 'APPROVED') AS approved,
      SUM(status = 'REJECTED') AS rejected FROM applications`);
    const [recent] = await db.query(`SELECT a.application_id AS id, a.application_no, LOWER(a.status) AS status, a.created_at,
      u.full_name, u.email FROM applications a JOIN applicants p ON p.applicant_id = a.applicant_id
      JOIN users u ON u.user_id = p.user_id ORDER BY a.updated_at DESC LIMIT 8`);
    res.json({ summary, recent });
  } catch (error) { next(error); }
};

const listApplications = async (req, res, next) => {
  try {
    const { search = '', status = '' } = req.query;
    const params = []; const where = [];
    if (status) { where.push('a.status = ?'); params.push(statusForDatabase(status)); }
    if (search) { where.push('(a.application_no LIKE ? OR u.full_name LIKE ? OR p.nic LIKE ?)'); const match = `%${search}%`; params.push(match, match, match); }
    const [applications] = await db.execute(`SELECT a.application_id AS id, a.application_no, LOWER(a.status) AS status,
      a.submitted_at, a.created_at, a.updated_at, u.full_name, u.email, p.nic, ps.scheme_name
      FROM applications a JOIN applicants p ON p.applicant_id = a.applicant_id JOIN users u ON u.user_id = p.user_id
      JOIN pension_schemes ps ON ps.scheme_id = a.scheme_id ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY a.updated_at DESC`, params);
    res.json(applications);
  } catch (error) { next(error); }
};

const getDetails = async (req, res, next) => {
  try {
    const application = await applicationDetails(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    const [[profile]] = await db.execute(`SELECT p.*, u.full_name, u.email FROM applicants p JOIN users u ON u.user_id = p.user_id WHERE p.applicant_id = ?`, [application.applicant_id]);
    const [[employment]] = await db.execute('SELECT * FROM employment_details WHERE application_id = ?', [application.id]);
    const [socialSecurity] = await db.execute(`SELECT sst.security_name, ass.is_entitled, ass.remarks
      FROM application_social_security ass JOIN social_security_types sst ON sst.security_type_id = ass.security_type_id WHERE ass.application_id = ?`, [application.id]);
    const [[selection]] = await db.execute(`SELECT a.scheme_id, a.start_month, a.monthly_contribution, a.duration_months, ps.scheme_name
      FROM applications a JOIN pension_schemes ps ON ps.scheme_id = a.scheme_id WHERE a.application_id = ?`, [application.id]);
    const [family] = await db.execute('SELECT family_member_id AS id, full_name AS name, relationship, id_no AS id_number, marital_status FROM family_members WHERE application_id = ?', [application.id]);
    const [beneficiaries] = await db.execute('SELECT beneficiary_id AS id, full_name, relationship, nic_or_birth_certificate_no AS id_number, contact_no AS contact_number FROM beneficiaries WHERE application_id = ?', [application.id]);
    const [reviews] = await db.execute(`SELECT r.*, u.full_name AS admin_name FROM application_reviews r JOIN users u ON u.user_id = r.officer_id WHERE r.application_id = ? ORDER BY r.reviewed_at DESC`, [application.id]);
    res.json({ application: { ...application, status: application.status.toLowerCase() }, profile, employment, socialSecurity, selection, family, beneficiaries, documents: [], reviews });
  } catch (error) { next(error); }
};

const review = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { action, comment = '' } = req.body;
    if (!['approved', 'rejected', 'correction_required'].includes(action)) return res.status(400).json({ message: 'A valid review action is required' });
    if (!comment.trim()) return res.status(400).json({ message: 'Please enter a response comment for the applicant' });
    const application = await applicationDetails(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    const decision = action === 'correction_required' ? 'RETURNED' : action.toUpperCase();
    await connection.beginTransaction();
    await connection.execute(`INSERT INTO application_reviews (application_id, officer_id, decision, remarks) VALUES (?, ?, ?, ?)`, [application.id, req.user.id, decision, comment.trim()]);
    await connection.execute('UPDATE applications SET status = ?, reviewed_at = CURDATE(), rejection_reason = ? WHERE application_id = ?', [decision, action === 'rejected' ? comment.trim() : null, application.id]);
    await connection.execute(`INSERT INTO application_status_history (application_id, old_status, new_status, changed_by, remarks) VALUES (?, ?, ?, ?, ?)`, [application.id, application.status, decision, req.user.id, comment.trim()]);
    await connection.commit();
    res.json({ message: 'Review saved' });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};

const resources = async (req, res, next) => {
  try {
    const queries = {
      memberships: `SELECT m.*, a.application_no, u.full_name FROM memberships m JOIN applications a ON a.application_id = m.application_id JOIN applicants p ON p.applicant_id = a.applicant_id JOIN users u ON u.user_id = p.user_id ORDER BY m.registered_at DESC`,
      users: 'SELECT user_id AS id, full_name, email, LOWER(role) AS role, LOWER(status) AS status, created_at FROM users ORDER BY created_at DESC',
      schemes: 'SELECT *, default_monthly_contribution AS monthly_contribution FROM pension_schemes ORDER BY scheme_id',
      recommendations: `SELECT r.*, a.application_no, u.full_name FROM sltda_recommendations r JOIN applications a ON a.application_id = r.application_id JOIN applicants p ON p.applicant_id = a.applicant_id JOIN users u ON u.user_id = p.user_id ORDER BY r.recommendation_date DESC`,
    };
    if (!queries[req.params.type]) return res.status(404).json({ message: 'Resource not found' });
    const [rows] = await db.query(queries[req.params.type]);
    res.json(rows);
  } catch (error) { next(error); }
};

const report = async (req, res, next) => {
  try {
    const [monthly] = await db.query(`SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS total FROM applications
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month`);
    res.json({ monthly });
  } catch (error) { next(error); }
};

module.exports = { dashboard, listApplications, getDetails, review, resources, report };
