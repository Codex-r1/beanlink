const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { generateOTP, sendOTPEmail } = require('../utils/otp'); // <-- Import OTP utility

const SALT_ROUNDS = 10;
const VALID_ROLES = ['farmer', 'buyer', 'supplier'];

// POST /auth/register
async function register(req, res) {
  try {
    const { full_name, email, password, role, phone_number, county } = req.body;

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ error: 'full_name, email, password, and role are required' });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    // Check if email already exists
    const existing = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone_number, county)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, full_name, email, role, phone_number, county, created_at`,
      [full_name, email, password_hash, role, phone_number || null, county || null]
    );

    const user = result.rows[0];

    // Registration still issues a token immediately (no 2FA on first signup)
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
}

// POST /auth/login (Step 1: Password Validation -> Send OTP)
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // --- 2FA LOGIC START ---
    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    await pool.query(
      'UPDATE users SET login_otp = $1, otp_expiry = $2 WHERE user_id = $3',
      [hashedOtp, expiry, user.user_id]
    );

    await sendOTPEmail(email, otp);

    // Do NOT return the token yet. Tell the frontend to show the OTP input.
    return res.json({ 
      requires2FA: true, 
      userId: user.user_id, 
      message: "OTP sent to email" 
    });
    // --- 2FA LOGIC END ---

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

// POST /auth/verify-otp (Step 2: OTP Validation -> Issue JWT)
async function verifyLoginOTP(req, res) {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ error: 'userId and otp are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    const user = result.rows[0];

    if (!user || !user.login_otp) {
      return res.status(400).json({ error: 'No pending OTP found' });
    }

    // Check expiry
    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ error: 'OTP has expired. Please log in again.' });
    }

    // Check OTP
    const validOTP = await bcrypt.compare(otp, user.login_otp);
    if (!validOTP) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Clear OTP from DB so it can't be reused
    await pool.query(
      'UPDATE users SET login_otp = NULL, otp_expiry = NULL WHERE user_id = $1',
      [userId]
    );

    // Generate final JWT
    const token = jwt.sign(
      { user_id: user.user_id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: { 
        user_id: user.user_id, 
        full_name: user.full_name, 
        email: user.email, 
        role: user.role, 
        phone_number: user.phone_number,
        county: user.county 
      } 
    });

  } catch (err) {
    console.error('OTP Verify error:', err);
    res.status(500).json({ error: 'Server error verifying OTP' });
  }
}

// Export all three functions
module.exports = { 
  register, 
  login, 
  verifyLoginOTP 
};