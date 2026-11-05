const pool = require('../config/db');

exports.getRecommendation = async (req, res) => {
  try {
    // 1. Fallback to the hardcoded URL if the env var fails
    const mlUrl = process.env.ML_SERVICE_URL || 'https://beanlink-1.onrender.com'; 

    console.log("Connecting to ML Service at:", mlUrl); 

    const response = await fetch(`${mlUrl}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      throw new Error(`Service responded with status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('recommendationController error:', err);
    res.status(500).json({ error: 'Failed to get recommendation from ML service' });
  }
};
exports.getRecommendationHistory = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM recommendations 
       WHERE farmer_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [req.user.user_id] // The JWT still holds the user_id
    );
    res.json({ recommendations: rows });
  } catch (err) {
    console.error('getRecommendationHistory error:', err);
    res.status(500).json({ error: 'Failed to load history' });
  }
};