const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

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
    res.json(data);
  } catch (err) {
    console.error('recommendationController error:', err);
    res.status(502).json({ error: 'Recommendation service unreachable' });
  }
};