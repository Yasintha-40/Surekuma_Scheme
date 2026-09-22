const db = require('../config/db');
const { getApplicantRegistration } = require('../services/applicantRegistration');

const getRegistration = async (req, res, next) => {
  try {
    res.json({ email: req.user.email, sltda_registration_no: await getApplicantRegistration(req.user) });
  } catch (error) { next(error); }
};

const applicationNumber = () => `SK-${new Date().getFullYear()}-${Date.now().toString().slice(-9)}${Math.floor(Math.random() * 90 + 10)}`;
const bool = (value) => value ? 1 : 0;
const safeDate = (value) => value || null;
const canEditApplication = application => ['draft', 'correction_required', 'rejected'].includes(application.status)
  || (application.status === 'submitted' && application.latest_review_action === 'rejected');

const findApplication = async (id, userId) => {
  const [rows] = await db.execute(`SELECT a.*,
    (SELECT action FROM application_reviews WHERE application_id = a.id ORDER BY reviewed_at DESC, id DESC LIMIT 1) AS latest_review_action
    FROM applications a WHERE a.id = ? AND a.user_id = ?`, [id, userId]);
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
      LEFT JOIN pension_schemes ps ON ps.id = a.scheme_id
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
    if (employment) {
      const [categories] = await db.execute(`SELECT ec.tourism_category_id, ec.other_category_name
        FROM employment_categories ec WHERE ec.employment_id = ? ORDER BY ec.tourism_category_id`, [employment.id]);
      employment.tourism_category_ids = categories.map(category => category.tourism_category_id);
      employment.other_category_name = categories.find(category => category.other_category_name)?.other_category_name || '';
    }
    const [[socialSecurity]] = await db.execute('SELECT * FROM social_security_entitlements WHERE application_id = ?', [application.id]);
    const [[selection]] = await db.execute(`SELECT a.scheme_id, a.start_month, a.monthly_contribution,
      ps.scheme_name, ps.duration_years, ps.description
      FROM applications a
      LEFT JOIN pension_schemes ps ON ps.id = a.scheme_id
      WHERE a.id = ?`, [application.id]);
    const [family] = await db.execute('SELECT * FROM family_members WHERE application_id = ?', [application.id]);
    const [beneficiaries] = await db.execute('SELECT * FROM beneficiaries WHERE application_id = ?', [application.id]);
    const [documents] = await db.execute('SELECT * FROM documents WHERE application_id = ? ORDER BY uploaded_at DESC', [application.id]);
    const [reviews] = await db.execute(`SELECT r.*, u.email AS admin_name FROM application_reviews r JOIN users u ON u.id = r.admin_id WHERE r.application_id = ? ORDER BY r.reviewed_at DESC`, [application.id]);
    res.json({ application, profile, employment, socialSecurity, selection, family, beneficiaries, documents, reviews });
  } catch (error) { next(error); }
};

const saveApplication = async (req, res, next) => {
  const connection = await db.getConnection();
  let transactionStarted = false;
  try {
    const application = await findApplication(req.params.id, req.user.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (!canEditApplication(application)) return res.status(409).json({ message: 'This application can no longer be edited' });
    const { profile = {}, employment = {}, socialSecurity = {}, selection = {}, family = [], beneficiaries = [] } = req.body;
    const familyMembers = Array.isArray(family) ? family : [];
    const beneficiaryRows = Array.isArray(beneficiaries) ? beneficiaries : [];
    const registrationNumber = await getApplicantRegistration(req.user, connection);
    const tourismCategoryIds = [...new Set((Array.isArray(employment.tourism_category_ids) ? employment.tourism_category_ids : [])
      .map(Number).filter(Number.isInteger))];
    const hasCategorySelection = Array.isArray(employment.tourism_category_ids);
    const otherCategoryName = String(employment.other_category_name || '').trim() || null;
    // Both sections store the authoritative registration, ignoring client edits.
    profile.sltda_registration_no = registrationNumber;
    employment.sltda_registration_no = registrationNumber;
    if (profile.full_name && !profile.nic) return res.status(400).json({ message: 'NIC number is required when saving applicant information' });
    await connection.beginTransaction();
    transactionStarted = true;
    await connection.execute(`INSERT INTO applicant_profiles (application_id, full_name, nic, date_of_birth, age, gender, nationality, permanent_address, contact_number, email, district, divisional_secretariat, sltda_registration_no)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), nic=VALUES(nic), date_of_birth=VALUES(date_of_birth), age=VALUES(age), gender=VALUES(gender), nationality=VALUES(nationality), permanent_address=VALUES(permanent_address), contact_number=VALUES(contact_number), email=VALUES(email), district=VALUES(district), divisional_secretariat=VALUES(divisional_secretariat), sltda_registration_no=VALUES(sltda_registration_no)`,
      [application.id, profile.full_name || '', profile.nic || '', safeDate(profile.date_of_birth), profile.age || null, profile.gender || null, profile.nationality || null, profile.permanent_address || null, profile.contact_number || null, profile.email || null, profile.district || null, profile.divisional_secretariat || null, profile.sltda_registration_no || null]);
    // Explicitly update the existing row as well, so refilling a rejected form
    // always overwrites the applicant's previously saved values.
    await connection.execute(`UPDATE applicant_profiles SET
      full_name = ?, nic = ?, date_of_birth = ?, age = ?, gender = ?, nationality = ?,
      permanent_address = ?, contact_number = ?, email = ?, district = ?,
      divisional_secretariat = ?, sltda_registration_no = ?
      WHERE application_id = ?`,
      [profile.full_name || '', profile.nic || '', safeDate(profile.date_of_birth), profile.age || null, profile.gender || null, profile.nationality || null, profile.permanent_address || null, profile.contact_number || null, profile.email || null, profile.district || null, profile.divisional_secretariat || null, profile.sltda_registration_no || null, application.id]);
    await connection.execute(`INSERT INTO employment_details (application_id, service_years, service_months, sltda_registered, sltda_registration_no, registration_category, other_category)
      VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE service_years=VALUES(service_years), service_months=VALUES(service_months), sltda_registered=VALUES(sltda_registered), sltda_registration_no=VALUES(sltda_registration_no), registration_category=VALUES(registration_category), other_category=VALUES(other_category)`,
      [application.id, employment.service_years || 0, employment.service_months || 0, bool(employment.sltda_registered), employment.sltda_registration_no || null, employment.registration_category || null, employment.other_category || null]);
    if (hasCategorySelection) {
      const [[savedEmployment]] = await connection.execute('SELECT id FROM employment_details WHERE application_id = ?', [application.id]);
      await connection.execute('DELETE FROM employment_categories WHERE employment_id = ?', [savedEmployment.id]);
      for (const tourismCategoryId of tourismCategoryIds) {
        await connection.execute(`INSERT INTO employment_categories
          (employment_id, tourism_category_id, other_category_name) VALUES (?, ?, ?)`,
        [savedEmployment.id, tourismCategoryId, otherCategoryName]);
      }
    }
    await connection.execute(`INSERT INTO social_security_entitlements (application_id, epf, etf, government_pension, other_social_security, other_details)
      VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE epf=VALUES(epf), etf=VALUES(etf), government_pension=VALUES(government_pension), other_social_security=VALUES(other_social_security), other_details=VALUES(other_details)`,
      [application.id, bool(socialSecurity.epf), bool(socialSecurity.etf), bool(socialSecurity.government_pension), bool(socialSecurity.other_social_security), socialSecurity.other_details || null]);
    const hasSchemeSelection = selection.scheme_id !== undefined && selection.scheme_id !== null && selection.scheme_id !== '';
    if (hasSchemeSelection) {
      const schemeId = Number(selection.scheme_id);
      if (!Number.isInteger(schemeId) || schemeId < 1) { await connection.rollback(); return res.status(400).json({ message: 'Please select a valid pension scheme' }); }
      const [[scheme]] = await connection.execute('SELECT id, monthly_contribution FROM pension_schemes WHERE id = ? AND status = \'active\'', [schemeId]);
      if (!scheme) { await connection.rollback(); return res.status(400).json({ message: 'The selected pension scheme is not available' }); }
      await connection.execute(`UPDATE applications
        SET scheme_id = ?, start_month = ?, monthly_contribution = ?
        WHERE id = ?`, [schemeId, safeDate(selection.start_month), selection.monthly_contribution || scheme.monthly_contribution, application.id]);
    }
    await connection.execute('DELETE FROM family_members WHERE application_id = ?', [application.id]);
    for (const member of familyMembers.filter((item) => item && String(item.name || '').trim())) await connection.execute('INSERT INTO family_members (application_id, name, relationship, id_number, marital_status) VALUES (?, ?, ?, ?, ?)', [application.id, String(member.name).trim(), member.relationship || null, member.id_number || null, member.marital_status || null]);
    await connection.execute('DELETE FROM beneficiaries WHERE application_id = ?', [application.id]);
    for (const beneficiary of beneficiaryRows.filter((item) => item && String(item.full_name || '').trim())) await connection.execute('INSERT INTO beneficiaries (application_id, full_name, relationship, id_number, contact_number) VALUES (?, ?, ?, ?, ?)', [application.id, String(beneficiary.full_name).trim(), beneficiary.relationship || null, beneficiary.id_number || null, beneficiary.contact_number || null]);
    const wasRejected = application.status === 'rejected' || application.status === 'submitted';
    if (wasRejected) {
      await connection.execute("UPDATE applications SET status = 'draft', submitted_at = NULL WHERE id = ?", [application.id]);
    }
    // Touch the parent application row so every refill/save is reflected in applications.updated_at.
    await connection.execute('UPDATE applications SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [application.id]);
    await connection.commit();
    res.json({ message: 'Application draft saved', status: wasRejected ? 'draft' : application.status });
  } catch (error) { if (transactionStarted) await connection.rollback(); next(error); } finally { connection.release(); }
};

const submitApplication = async (req, res, next) => {
  try {
    const application = await findApplication(req.params.id, req.user.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (!['draft', 'correction_required', 'rejected'].includes(application.status)) return res.status(409).json({ message: 'This application has already been submitted' });
    const [[profile]] = await db.execute('SELECT id, full_name, nic FROM applicant_profiles WHERE application_id = ?', [application.id]);
    const [[scheme]] = await db.execute('SELECT scheme_id FROM applications WHERE id = ?', [application.id]);
    const missing = [];
    if (!profile?.full_name?.trim()) missing.push('full name');
    if (!profile?.nic?.trim()) missing.push('NIC number');
    if (!scheme?.scheme_id) missing.push('pension scheme');
    if (missing.length) return res.status(400).json({ message: `Please complete: ${missing.join(', ')} before submitting.` });
    await db.execute("UPDATE applications SET status = 'submitted', submitted_at = NOW() WHERE id = ?", [application.id]);
    res.json({ message: 'Application submitted successfully' });
  } catch (error) { next(error); }
};

const getSchemes = async (req, res, next) => { try { const [schemes] = await db.execute("SELECT * FROM pension_schemes WHERE status = 'active' ORDER BY monthly_contribution"); res.json(schemes); } catch (error) { next(error); } };
const getTourismCategories = async (req, res, next) => {
  try {
    const [categories] = await db.execute('SELECT id, category_name FROM tourism_categories WHERE is_active = 1 ORDER BY category_name');
    res.json(categories);
  } catch (error) { next(error); }
};
const getDistricts = async (req, res, next) => { try { const [districts] = await db.execute('SELECT id, district_name FROM districts ORDER BY district_name'); res.json(districts); } catch (error) { next(error); } };
const getDivisionalSecretariats = async (req, res, next) => {
  try {
    const districtId = Number(req.query.district_id);
    if (!Number.isInteger(districtId) || districtId < 1) return res.status(400).json({ message: 'A valid district is required' });
    const [divisions] = await db.execute('SELECT id, ds_name FROM divisional_secretariats WHERE district_id = ? ORDER BY ds_name', [districtId]);
    res.json(divisions);
  } catch (error) { next(error); }
};
module.exports = { createApplication, getMyApplications, getApplication, saveApplication, submitApplication, getSchemes, getTourismCategories, getDistricts, getDivisionalSecretariats, getRegistration };
