require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const documentRoutes = require('./routes/documentRoutes');

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set in backend/.env');

const app = express();
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => res.json({ message: 'Surekuma backend is running' }));
app.get('/api/test-db', async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT 1 AS result');
    res.json({ success: true, database: rows });
  } catch (error) { next(error); }
});
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((error, req, res, next) => {
  console.error(error);
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'Files must be 5 MB or smaller' });
  if (error.message?.includes('Only PDF')) return res.status(400).json({ message: error.message });
  res.status(500).json({ message: 'An unexpected server error occurred' });
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`Surekuma API running at http://localhost:${port}`));
