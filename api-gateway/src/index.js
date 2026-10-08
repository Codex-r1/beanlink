require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const authRoutes = require('./routes/auth');
const authenticateToken = require('./middleware/auth');
const requireRole = require('./middleware/requireRole');
const dashboardRoutes = require('./routes/dashboardRoutes');
const listingRoutes = require('./routes/listingRoutes');
const orderRoutes = require('./routes/orderRoutes');
const priceRoutes = require('./routes/priceRoutes');
const profileRoutes = require('./routes/profileRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const app = express();
const recommendationRoutes = require('./routes/recommendationRoutes');

app.use(cors());
app.use(express.json());
app.use('/api', paymentRoutes);
app.use('/api', recommendationRoutes);
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

app.get('/health/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', db_time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', listingRoutes);
app.use('/api', orderRoutes);
app.use('/api', priceRoutes);
app.use('/api', profileRoutes);
app.use('/api', adminRoutes);
app.get('/farmer/profile', authenticateToken, requireRole('farmer'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, full_name, email, role, phone_number, county, created_at FROM users WHERE user_id = $1',
      [req.user.user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
require('dotenv').config();

