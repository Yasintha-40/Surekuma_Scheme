const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const normaliseEmail = (email) => String(email || '').trim().toLowerCase();

const register = async (req, res, next) => {
  try {
    const fullName = String(req.body.full_name || '').trim();
    const email = normaliseEmail(req.body.email);
    const { password } = req.body;
    if (!fullName || !email || !password) return res.status(400).json({ message: 'Full name, email and password are required' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    if (String(password).length < 8) return res.status(400).json({ message: 'Password must contain at least 8 characters' });

    const [existing] = await db.execute('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ message: 'An account with this email already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, 'APPLICANT')",
      [fullName, email, passwordHash],
    );
    res.status(201).json({ message: 'Registration successful. Please sign in.', user_id: result.insertId });
  } catch (error) { next(error); }
};

const login = async (req, res, next) => {
  try {
    const email = normaliseEmail(req.body.email);
    const { password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const [users] = await db.execute('SELECT user_id, full_name, email, password_hash, role, status FROM users WHERE email = ?', [email]);
    const user = users[0];
    if (!user || user.status !== 'ACTIVE' || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const role = user.role.toLowerCase();
    const token = jwt.sign({ id: user.user_id, role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ message: 'Login successful', token, user: { id: user.user_id, full_name: user.full_name, email: user.email, role } });
  } catch (error) { next(error); }
};

module.exports = { register, login };
