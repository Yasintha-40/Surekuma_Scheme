const db = require('../config/db');

const applicationNumber = () => `SK-${new Date().getFullYear()}-${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 90 + 10)}`;
const safeDate = (value) => value || null;
const bool = (value) => value ? 1 : 0;
const upper = (value, fallback) => String(value || fallback).trim().toUpperCase();

const findApplication = async (id, userId) => {
  const [rows] = await db.execute(`SELECT a.*, a.application_id AS id, u.user_id AS user_id, u.full_name AS user_full_name,
    u.email, p.nic, p.date_of_birth, p.gender, p.nationality, p.permanent_address, p.contact_number
    FROM applications a
    JOIN applicants p ON p.applicant_id = a.applicant_id
    JOIN users u ON u.user_id = p.user_id
    WHERE a.application_id = ? AND u.user_id = ?`, [id, userId]);
  return rows[0];
};

const createApplication = async (req, res, next) => {
  try {
    const [[applicant]] = await db.execute('SELECT applicant_id FROM applicants WHERE user_id = ?', [req.user.id]);
    let applicantId = applicant?.applicant_id;
    if (!applicantId) {
      const [[defaults]] = await db.query(`SELECT
        (SELECT ds_id FROM divisional_secretariats ORDER BY ds_id LIMIT 1) AS ds_id,
        (SELECT scheme_id FROM pension_schemes WHERE is_active = TRUE ORDER BY scheme_id LIMIT 1) AS scheme_id`);
      if (!defaults?.ds_id || !defaults?.scheme_id) {
        return res.status(409).json({ message: 'Add at least one divisional secretariat and active pension scheme before creating an application' });
      }
      const [created] = await db.execute(`INSERT INTO applicants
        (user_id, nic, date_of_birth, gender, nationality, permanent_address, contact_number)
        VALUES (?, ?, '1900-01-01', 'OTHER', 'Sri Lankan', '', '')`,
      [req.user.id, `PENDING-${req.user.id}-${Date.now()}`]);
      applicantId = created.insertId;
      const [result] = await db.execute(`INSERT INTO applications
        (applicant_id, application_no, ds_id, scheme_id, monthly_contribution, start_month, duration_months)
        VALUES (?, ?, ?, ?, 0, CURDATE(), 1)`,
      [applicantId, applicationNumber(), defaults.ds_id, defaults.scheme_id]);
      const application = await findApplication(result.insertId, req.user.id);
      return res.status(201).json({ message: 'Application draft created', application });
    }
    const [[existing]] = await db.execute(`SELECT application_id AS id FROM applications
      WHERE applicant_id = ? AND status IN ('DRAFT', 'RETURNED') ORDER BY application_id DESC LIMIT 1`, [applicantId]);
    if (existing) return res.status(201).json({ message: 'Application draft loaded', application: await findApplication(existing.id, req.user.id) });
    const [[defaults]] = await db.query(`SELECT
      (SELECT ds_id FROM divisional_secretariats ORDER BY ds_id LIMIT 1) AS ds_id,
      (SELECT scheme_id FROM pension_schemes WHERE is_active = TRUE ORDER BY scheme_id LIMIT 1) AS scheme_id`);
    if (!defaults?.ds_id || !defaults?.scheme_id) return res.status(409).json({ message: 'Add at least one divisional secretariat and active pension scheme before creating an application' });
    const [result] = await db.execute(`INSERT INTO applications
      (applicant_id, application_no, ds_id, scheme_id, monthly_contribution, start_month, duration_months)
      VALUES (?, ?, ?, ?, 0, CURDATE(), 1)`, [applicantId, applicationNumber(), defaults.ds_id, defaults.scheme_id]);
    res.status(201).json({ message: 'Application draft created', application: await findApplication(result.insertId, req.user.id) });
  } catch (error) { next(error); }
};

const getMyApplications = async (req, res, next) => {
  try {
    const [applications] = await db.execute(`SELECT a.application_id AS id, a.application_no, LOWER(a.status) AS status,
      a.submitted_at, a.created_at, a.updated_at, u.full_name, u.email, ps.scheme_name,
      r.decision AS latest_review_action, r.remarks AS admin_comment
      FROM applications a JOIN applicants p ON p.applicant_id = a.applicant_id
      JOIN users u ON u.user_id = p.user_id JOIN pension_schemes ps ON ps.scheme_id = a.scheme_id
      LEFT JOIN application_reviews r ON r.review_id = (SELECT review_id FROM application_reviews
        WHERE application_id = a.application_id ORDER BY reviewed_at DESC, review_id DESC LIMIT 1)
      WHERE u.user_id = ? ORDER BY a.updated_at DESC`, [req.user.id]);
    res.json(applications);
  } catch (error) { next(error); }
};

const getApplication = async (req, res, next) => {
  try {
    const application = await findApplication(req.params.id, req.user.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    const [[profile]] = await db.execute(`SELECT p.*, u.full_name, u.email FROM applicants p
      JOIN users u ON u.user_id = p.user_id WHERE p.applicant_id = ?`, [application.applicant_id]);
    const [[employment]] = await db.execute('SELECT * FROM employment_details WHERE application_id = ?', [application.id]);
    const [securityRows] = await db.execute(`SELECT security_name, is_entitled, remarks FROM application_social_security ass
      JOIN social_security_types sst ON sst.security_type_id = ass.security_type_id WHERE ass.application_id = ?`, [application.id]);
    const selection = { scheme_id: application.scheme_id, start_month: application.start_month, monthly_contribution: application.monthly_contribution, duration_months: application.duration_months };
    const [family] = await db.execute(`SELECT family_member_id AS id, full_name AS name, relationship, id_no AS id_number, marital_status
      FROM family_members WHERE application_id = ?`, [application.id]);
    const [beneficiaries] = await db.execute(`SELECT beneficiary_id AS id, full_name, relationship,
      nic_or_birth_certificate_no AS id_number, contact_no AS contact_number FROM beneficiaries WHERE application_id = ?`, [application.id]);
    const [reviews] = await db.execute(`SELECT r.*, u.full_name AS admin_name FROM application_reviews r
      JOIN users u ON u.user_id = r.officer_id WHERE r.application_id = ? ORDER BY r.reviewed_at DESC`, [application.id]);
    res.json({ application: { ...application, status: application.status.toLowerCase() }, profile, employment, socialSecurity: securityRows, selection, family, beneficiaries, documents: [], reviews });
  } catch (error) { next(error); }
};

const saveApplication = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const application = await findApplication(req.params.id, req.user.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (!['DRAFT', 'RETURNED'].includes(application.status)) return res.status(409).json({ message: 'This application can no longer be edited' });
    const { profile = {}, employment = {}, socialSecurity = {}, selection = {}, family = [], beneficiaries = [] } = req.body;
    if (profile.full_name && !profile.nic) return res.status(400).json({ message: 'NIC number is required when saving applicant information' });
    await connection.beginTransaction();
    await connection.execute(`UPDATE users u JOIN applicants p ON p.user_id = u.user_id SET u.full_name = COALESCE(NULLIF(?, ''), u.full_name)
      WHERE p.applicant_id = ?`, [profile.full_name || '', application.applicant_id]);
    const gender = ['MALE', 'FEMALE', 'OTHER'].includes(upper(profile.gender, 'OTHER')) ? upper(profile.gender, 'OTHER') : 'OTHER';
    await connection.execute(`UPDATE applicants SET nic = COALESCE(NULLIF(?, ''), nic), date_of_birth = COALESCE(?, date_of_birth), gender = ?,
      nationality = COALESCE(NULLIF(?, ''), nationality), permanent_address = COALESCE(?, permanent_address), contact_number = COALESCE(?, contact_number)
      WHERE applicant_id = ?`, [profile.nic || '', safeDate(profile.date_of_birth), gender, profile.nationality || '', profile.permanent_address, profile.contact_number, application.applicant_id]);
    await connection.execute(`INSERT INTO employment_details (application_id, service_years, service_months, is_sltda_registered, sltda_registration_no)
      VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE service_years=VALUES(service_years), service_months=VALUES(service_months),
      is_sltda_registered=VALUES(is_sltda_registered), sltda_registration_no=VALUES(sltda_registration_no)`,
    [application.id, Number(employment.service_years) || 0, Number(employment.service_months) || 0, bool(employment.sltda_registered), employment.sltda_registration_no || null]);
    if (selection.scheme_id) await connection.execute(`UPDATE applications SET scheme_id = ?, start_month = COALESCE(?, start_month),
      monthly_contribution = COALESCE(?, monthly_contribution), duration_months = COALESCE(?, duration_months) WHERE application_id = ?`,
    [selection.scheme_id, safeDate(selection.start_month), selection.monthly_contribution || 0, selection.duration_months || 1, application.id]);
    await connection.execute('DELETE FROM family_members WHERE application_id = ?', [application.id]);
    for (const member of family.filter((item) => item.name)) {
      const relationship = ['SPOUSE', 'SON', 'DAUGHTER', 'FATHER', 'MOTHER', 'OTHER'].includes(upper(member.relationship, 'OTHER')) ? upper(member.relationship, 'OTHER') : 'OTHER';
      await connection.execute(`INSERT INTO family_members (application_id, full_name, relationship, id_no, marital_status) VALUES (?, ?, ?, ?, ?)`,
        [application.id, member.name, relationship, member.id_number || null, member.marital_status || null]);
    }
    await connection.execute('DELETE FROM beneficiaries WHERE application_id = ?', [application.id]);
    for (const beneficiary of beneficiaries.filter((item) => item.full_name)) await connection.execute(`INSERT INTO beneficiaries
      (application_id, full_name, relationship, nic_or_birth_certificate_no, contact_no) VALUES (?, ?, ?, ?, ?)`,
      [application.id, beneficiary.full_name, beneficiary.relationship || 'OTHER', beneficiary.id_number || 'NOT_PROVIDED', beneficiary.contact_number || null]);
    if (socialSecurity && Object.keys(socialSecurity).length) {
      const [types] = await connection.execute('SELECT security_type_id, security_name FROM social_security_types');
      await connection.execute('DELETE FROM application_social_security WHERE application_id = ?', [application.id]);
      for (const type of types) {
        const key = type.security_name.toLowerCase().replace(/\s+/g, '_');
        if (socialSecurity[key] !== undefined) await connection.execute(`INSERT INTO application_social_security
          (application_id, security_type_id, is_entitled, remarks) VALUES (?, ?, ?, ?)`, [application.id, type.security_type_id, bool(socialSecurity[key]), socialSecurity.other_details || null]);
      }
    }
    await connection.commit();
    res.json({ message: 'Application draft saved' });
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};

const submitApplication = async (req, res, next) => {
  try {
    const application = await findApplication(req.params.id, req.user.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (!['DRAFT', 'RETURNED'].includes(application.status)) return res.status(409).json({ message: 'This application has already been submitted' });
    if (!application.nic || application.nic.startsWith('PENDING-')) return res.status(400).json({ message: 'Complete applicant information and NIC number before submitting' });
    await db.execute("UPDATE applications SET status = 'SUBMITTED', submitted_at = CURDATE() WHERE application_id = ?", [application.id]);
    res.json({ message: 'Application submitted successfully' });
  } catch (error) { next(error); }
};

const getSchemes = async (req, res, next) => {
  try { const [schemes] = await db.execute('SELECT *, default_monthly_contribution AS monthly_contribution FROM pension_schemes WHERE is_active = TRUE ORDER BY scheme_id'); res.json(schemes); } catch (error) { next(error); }
};

module.exports = { createApplication, getMyApplications, getApplication, saveApplication, submitApplication, getSchemes };
