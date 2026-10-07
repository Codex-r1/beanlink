const pool = require('../config/db');

// GET /api/prices?variety=&county=&from=&to=
exports.getPrices = async (req, res) => {
  const { variety, county, from, to } = req.query;
  const where = [];
  const params = [];
  let i = 1;

  if (variety) { where.push(`bean_variety = $${i++}`); params.push(variety); }
  if (county)  { where.push(`county = $${i++}`);       params.push(county); }
  if (from)    { where.push(`recorded_date >= $${i++}`); params.push(from); }
  if (to)      { where.push(`recorded_date <= $${i++}`); params.push(to); }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `SELECT price_id, market_name, county, bean_variety,
              price_per_kg, recorded_date, source
         FROM price_records
         ${clause}
        ORDER BY recorded_date DESC
        LIMIT 500`,
      params
    );
    res.json({ prices: rows });
  } catch (err) {
    console.error('getPrices', err);
    res.status(500).json({ error: 'Failed to load prices' });
  }
};

// GET /api/prices/latest?variety=Rosecoco&market=Nairobi
exports.getLatest = async (req, res) => {
  const { variety = 'Rosecoco', market } = req.query;
  const params = [variety];
  let clause = `WHERE bean_variety = $1`;
  if (market) { clause += ` AND market_name = $2`; params.push(market); }

  try {
    const { rows } = await pool.query(
      `SELECT price_per_kg, bean_variety, market_name, county, recorded_date, source
         FROM price_records
         ${clause}
        ORDER BY recorded_date DESC LIMIT 1`,
      params
    );
    res.json({ latest: rows[0] || null });
  } catch (err) {
    console.error('getLatest', err);
    res.status(500).json({ error: 'Failed to load latest price' });
  }
};