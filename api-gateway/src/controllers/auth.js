const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const SALT_ROUNDS = 10;
const VALID_ROLES = ['farmer', 'buyer', 'supplier'];
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const { generateOTP, sendOTPEmail } = require('../utils/otp');

async function googleLogin(req, res) {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Google credential token is required' });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name } = payload;

    // 1. Check if user exists
    let result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = result.rows[0];

    // 2. If user DOES NOT exist, auto-register them
    if (!user) {
      const insertRes = await pool.query(
        `INSERT INTO users (full_name, email, password_hash, role, verified, onboarding_completed) 
         VALUES ($1, $2, 'GOOGLE_AUTH', 'farmer', true, false) RETURNING *`,
        [name, email]
      );
      user = insertRes.rows[0];
    }

    // 3. Generate OTP
    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiry = new Date(Date.now() + 5 * 60 * 1000); 

    await pool.query(
      'UPDATE users SET login_otp = $1, otp_expiry = $2 WHERE user_id = $3',
      [hashedOtp, expiry, user.user_id]
    );

    await sendOTPEmail(email, otp);

    // 4. Return response
    return res.json({ 
      requires2FA: true, 
      userId: user.user_id, 
      message: "Google login accepted. OTP sent to email.",
      // IMPORTANT: Send the onboarding status so the frontend knows where to route them!
      isNewUser: !user.onboarding_completed 
    });

  } catch (err) {
    console.error('Google Auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
}
// POST /auth/register
async function register(req, res) {
  try {
    const { full_name, email, password, phone_number, county } = req.body;

if (!full_name || !email || !password) {
  return res.status(400).json({
    error: "full_name, email, and password are required",
  });
}
    // Default role to 'farmer' since it's not provided in the request body
    const role = 'farmer';

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
      `INSERT INTO users (full_name, email, password_hash, role, phone_number, county, onboarding_completed)
       VALUES ($1, $2, $3, 'farmer', $4, $5, false)
       RETURNING *`,
      [full_name, email, password_hash, phone_number || null, county || null]
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
        county: user.county,
        onboarding_completed: user.onboarding_completed 
      } 
    });

  } catch (err) {
    console.error('OTP Verify error:', err);
    res.status(500).json({ error: 'Server error verifying OTP' });
  }
}
async function completeOnboarding(req, res) {
  const { role } = req.body;
  const userId = req.user.user_id; 

  const validRoles = ['farmer', 'buyer', 'supplier'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role selected' });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET role = $1, onboarding_completed = true WHERE user_id = $2 RETURNING *`,
      [role, userId]
    );
    
    const user = result.rows[0];
    res.json({ user });
  } catch (err) {
    console.error('Onboarding error:', err);
    res.status(500).json({ error: 'Failed to save onboarding details' });
  }
}
// Export all three functions
module.exports = { 
  register, 
  login, 
  verifyLoginOTP,
  googleLogin,
  completeOnboarding
};