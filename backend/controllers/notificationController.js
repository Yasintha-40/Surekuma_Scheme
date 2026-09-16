const db = require('../config/db');
const getNotifications = async (req, res, next) => { try { const [rows] = await db.execute('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]); res.json(rows); } catch (error) { next(error); } };
const markRead = async (req, res, next) => { try { await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]); res.json({ message: 'Notification marked as read' }); } catch (error) { next(error); } };
module.exports = { getNotifications, markRead };
