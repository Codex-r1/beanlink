const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const pool = require('../config/db');

exports.getRecommendation = async (req, res) => {
  const { variety, season, county } = req.body;

  if (!variety || !season) {
    return res.status(400).json({ error: 'variety and season are required' });
  }

  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variety, season, county }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('ML service error:', response.status, text);
      return res.status(502).json({ error: 'Recommendation service unavailable' });
    }

    const data = await response.json();
    try {
      const rec = data.recommendation || {};
      await pool.query(
        `INSERT INTO recommendations
           (farmer_id, season, variety,
            recommended_seed, recommended_fertilizer,
            recommended_lime, recommended_inoculation,
            shap_values)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          req.user.user_id,
          season,
          variety,
          rec.seed || null,
          rec.fertilizer || null,
          rec.soilAmendment || null,
          rec.inoculation || null,
          JSON.stringify(data.explanation || []),
        ]
      );
    } catch (logErr) {
      console.error('recommendation log failed:', logErr);
      // Do not fail the request just because logging failed
    }

    res.json(data);
  } catch (err) {
    console.error('recommendationController error:', err);
    res.status(502).json({ error: 'Recommendation service unreachable' });
  }
};