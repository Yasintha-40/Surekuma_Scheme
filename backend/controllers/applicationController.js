const db = require('../config/db');

const applicationNumber = () => `SK-${new Date().getFullYear()}-${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 90 + 10)}`;
const bool = (value) => value ? 1 : 0;
const safeDate = (value) => value || null;

const findApplication = async (id, userId) => {
  const [rows] = await db.execute('SELECT * FROM applications WHERE id = ? AND user_id = ?', [id, userId]);
  return rows[0];
};

const createApplication = async (req, res, next) => {
  try {
    const [result] = await db.execute("INSERT INTO applications (application_no, user_id, status) VALUES (?, ?, 'draft')", [applicationNumber(), req.user.id]);
    const application = await findApplication(result.insertId, req.user.id);
    res.status(201).json({ message: 'Application draft created', application });
  } catch (error) { next(error); }
};

const getMyApplications = async (req, res, next) => {
  try {
    const [applications] = await db.execute(`SELECT a.id, a.application_no, a.status, a.submitted_at, a.created_at, a.updated_at,
      p.full_name, ps.scheme_name, r.action AS latest_review_action, r.comment AS admin_comment
      FROM applications a
      LEFT JOIN applicant_profiles p ON p.application_id = a.id
      LEFT JOIN application_scheme aps ON aps.application_id = a.id
      LEFT JOIN pension_schemes ps ON ps.id = aps.scheme_id
      LEFT JOIN application_reviews r ON r.id = (SELECT id FROM application_reviews WHERE application_id = a.id ORDER BY reviewed_at DESC LIMIT 1)
      WHERE a.user_id = ? ORDER BY a.updated_at DESC`, [req.user.id]);
    res.json(applications);
  } catch (error) { next(error); }
};

const getApplication = async (req, res, next) => {
  try {
    const application = await findApplication(req.params.id, req.user.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    const [[profile]] = await db.execute('SELECT * FROM applicant_profiles WHERE application_id = ?', [application.id]);
    const [[employment]] = await db.execute('SELECT * FROM employment_details WHERE application_id = ?', [application.id]);
    const [[socialSecurity]] = await db.execute('SELECT * FROM social_security_entitlements WHERE application_id = ?', [application.id]);
    const [[selection]] = await db.execute('SELECT aps.*, ps.scheme_name FROM application_scheme aps LEFT JOIN pension_schemes ps ON ps.id = aps.scheme_id WHERE aps.application_id = ?', [application.id]);
    const [family] = await db.execute('SELECT * FROM family_members WHERE application_id = ?', [application.id]);
    const [beneficiaries] = await db.execute('SELECT * FROM beneficiaries WHERE application_id = ?', [application.id]);
    const [documents] = await db.execute('SELECT * FROM documents WHERE application_id = ? ORDER BY uploaded_at DESC', [application.id]);
    const [reviews] = await db.execute(`SELECT r.*, u.full_name AS admin_name FROM application_reviews r JOIN users u ON u.id = r.admin_id WHERE r.application_id = ? ORDER BY r.reviewed_at DESC`, [application.id]);
    res.json({ application, profile, employment, socialSecurity, selection, family, beneficiaries, documents, reviews });
  } catch (error) { next(error); }
};

const saveApplication = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const application = await findApplication(req.params.id, req.user.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (!['draft', 'correction_required'].includes(application.status)) return res.status(409).json({ message: 'This application can no longer be edited' });
    const { profile = {}, employment = {}, socialSecurity = {}, selection = {}, family = [], beneficiaries = [] } = req.body;
    if (profile.full_name && !profile.nic) return res.status(400).json({ message: 'NIC number is required when saving applicant information' });
    await connection.beginTransaction();
    await connection.execute(`INSERT INTO applicant_profiles (application_id, full_name, nic, date_of_birth, age, gender, nationality, permanent_address, contact_number, email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), nic=VALUES(nic), date_of_birth=VALUES(date_of_birth), age=VALUES(age), gender=VALUES(gender), nationality=VALUES(nationality), permanent_address=VALUES(permanent_address), contact_number=VALUES(contact_number), email=VALUES(email)`,
      [application.id, profile.full_name || '', profile.nic || '', safeDate(profile.date_of_birth), profile.age || null, profile.gender || null, profile.nationality || null, profile.permanent_address || null, profile.contact_number || null, profile.email || null]);
    await connection.execute(`INSERT INTO employment_details (application_id, service_years, service_months, sltda_registered, sltda_registration_no, registration_category, other_category)
      VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE service_years=VALUES(service_years), service_months=VALUES(service_months), sltda_registered=VALUES(sltda_registered), sltda_registration_no=VALUES(sltda_registration_no), registration_category=VALUES(registration_category), other_category=VALUES(other_category)`,
      [application.id, employment.service_years || 0, employment.service_months || 0, bool(employment.sltda_registered), employment.sltda_registration_no || null, employment.registration_category || null, employment.other_category || null]);
    await connection.execute(`INSERT INTO social_security_entitlements (application_id, epf, etf, government_pension, other_social_security, other_details)
      VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE epf=VALUES(epf), etf=VALUES(etf), government_pension=VALUES(government_pension), other_social_security=VALUES(other_social_security), other_details=VALUES(other_details)`,
      [application.id, bool(socialSecurity.epf), bool(socialSecurity.etf), bool(socialSecurity.government_pension), bool(socialSecurity.other_social_security), socialSecurity.other_details || null]);
    if (selection.scheme_id) await connection.execute(`INSERT INTO application_scheme (application_id, scheme_id, start_month, monthly_contribution) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE scheme_id=VALUES(scheme_id), start_month=VALUES(start_month), monthly_contribution=VALUES(monthly_contribution)`, [application.id, selection.scheme_id, safeDate(selection.start_month), selection.monthly_contribution || null]);
    await connection.execute('DELETE FROM family_members WHERE application_id = ?', [application.id]);
    for (const member of family.filter((item) => item.name)) await connection.execute('INSERT INTO family_members (application_id, name, relationship, id_number, marital_status) VALUES (?, ?, ?, ?, ?)', [application.id, member.name, member.relationship || null, member.id_number || null, member.marital_status || null]);
    await connection.execute('DELETE FROM beneficiaries WHERE application_id = ?', [application.id]);
    for (const beneficiary of beneficiaries.filter((item) => item.full_name)) await connection.execute('INSERT INTO beneficiaries (application_id, full_name, relationship, id_number, contact_number) VALUES (?, ?, ?, ?, ?)', [application.id, beneficiary.full_name, beneficiary.relationship || null, beneficiary.id_number || null, beneficiary.contact_number || null]);
    await connection.commit();
    res.json({ message: 'Application draft saved' });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};

const submitApplication = async (req, res, next) => {
  try {
    const application = await findApplication(req.params.id, req.user.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (!['draft', 'correction_required'].includes(application.status)) return res.status(409).json({ message: 'This application has already been submitted' });
    const [[profile]] = await db.execute('SELECT id, full_name, nic FROM applicant_profiles WHERE application_id = ?', [application.id]);
    const [[scheme]] = await db.execute('SELECT id FROM application_scheme WHERE application_id = ?', [application.id]);
    if (!profile?.full_name || !profile?.nic || !scheme) return res.status(400).json({ message: 'Complete applicant information, NIC number and pension scheme selection before submitting' });
    await db.execute("UPDATE applications SET status = 'submitted', submitted_at = NOW() WHERE id = ?", [application.id]);
    await db.execute('INSERT INTO notifications (user_id, application_id, title, message) VALUES (?, ?, ?, ?)', [req.user.id, application.id, 'Application submitted', 'Your application has been submitted and will be reviewed by our team.']);
    res.json({ message: 'Application submitted successfully' });
  } catch (error) { next(error); }
};

const getSchemes = async (req, res, next) => { try { const [schemes] = await db.execute("SELECT * FROM pension_schemes WHERE status = 'active' ORDER BY monthly_contribution"); res.json(schemes); } catch (error) { next(error); } };
module.exports = { createApplication, getMyApplications, getApplication, saveApplication, submitApplication, getSchemes };
