const registrationCategories = [
  'Homestay', 'Bungalow', 'Tourist Hotels', 'Rented Apartment',
  'Tourist Guide Lecturers', 'Travel Agents', 'Tourist Driver', 'Other Category',
];

function validateRegistrationCategory(employment = {}, required = true) {
  const category = employment.registrationCategory;
  if (!category) return required ? 'Please select your registration category.' : null;
  if (!registrationCategories.includes(category)) return 'Please select a valid registration category.';
  if (category === 'Other Category') {
    const other = employment.otherRegistrationCategory;
    if (typeof other !== 'string' || !other.trim()) return 'Please specify your category.';
    if (other.trim().length > 150) return 'Your category must be 150 characters or fewer.';
  }
  return null;
}

async function getEmployment(db, applicationId) {
  const [[employment]] = await db.execute(`SELECT e.*, tc.category_name AS registrationCategory,
    CASE WHEN tc.category_name = 'Other Category' THEN ec.other_category_name ELSE NULL END AS otherRegistrationCategory
    FROM employment_details e
    LEFT JOIN employment_categories ec ON ec.employment_id = e.employment_id
    LEFT JOIN tourism_categories tc ON tc.category_id = ec.category_id
    WHERE e.application_id = ? ORDER BY tc.category_id LIMIT 1`, [applicationId]);
  return employment;
}

async function saveRegistrationCategory(db, applicationId, employment) {
  const [[row]] = await db.execute('SELECT employment_id FROM employment_details WHERE application_id = ?', [applicationId]);
  await db.execute('DELETE FROM employment_categories WHERE employment_id = ?', [row.employment_id]);
  if (!employment.registrationCategory) return;
  await db.execute(`INSERT INTO tourism_categories (category_name) VALUES (?)
    ON DUPLICATE KEY UPDATE category_name = VALUES(category_name)`, [employment.registrationCategory]);
  await db.execute(`INSERT INTO employment_categories (employment_id, category_id, other_category_name)
    SELECT ?, category_id, ? FROM tourism_categories WHERE category_name = ?`, [
    row.employment_id,
    employment.registrationCategory === 'Other Category' ? employment.otherRegistrationCategory.trim() : null,
    employment.registrationCategory,
  ]);
}

module.exports = { validateRegistrationCategory, getEmployment, saveRegistrationCategory };
