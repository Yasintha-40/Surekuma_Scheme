const db = require('../config/db');

const getNotifications = async (req, res, next) => {
  try {
    const [rows] = await db.execute(`SELECT h.history_id AS id, h.application_id, h.remarks AS message,
      LOWER(h.new_status) AS status, h.changed_at AS created_at, 0 AS is_read,
      CONCAT('Application status: ', h.new_status) AS title
      FROM application_status_history h JOIN applications a ON a.application_id = h.application_id
      JOIN applicants p ON p.applicant_id = a.applicant_id
      WHERE p.user_id = ? ORDER BY h.changed_at DESC`, [req.user.id]);
    res.json(rows);
  } catch (error) { next(error); }
};

const markRead = async (req, res) => {
  res.json({ message: 'Notifications are derived from status history and do not have a read flag in the current schema' });
};

module.exports = { getNotifications, markRead };
