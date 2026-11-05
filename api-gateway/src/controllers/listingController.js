const pool = require('../config/db');

const VALID_CATEGORIES = [
  'seed', 'fertilizer', 'soil_amendment', 'crop_protection',
  'equipment', 'other_input', 'produce',
];
const VALID_STATUSES = ['active', 'paused', 'sold', 'draft', 'unavailable'];

// GET /api/listings/mine  (any authed user — returns their own)
exports.getMine = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT listing_id, title, category, variety, price_per_unit,
              quantity_available, location, status, created_at
         FROM listings
        WHERE seller_id = $1
        ORDER BY created_at DESC`,
      [req.user.user_id]
    );
    res.json({ listings: rows });
  } catch (err) {
    console.error('getMine', err);
    res.status(500).json({ error: 'Failed to load your listings' });
  }
};

// GET /api/listings/:id  (public — used by both detail pages)
exports.getOne = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.*, u.full_name AS seller_name, u.county AS seller_county
         FROM listings l
         JOIN users u ON u.user_id = l.seller_id
        WHERE l.listing_id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ listing: rows[0] });
  } catch (err) {
    console.error('getOne', err);
    res.status(500).json({ error: 'Failed to load listing' });
  }
};

// POST /api/listings
exports.create = async (req, res) => {
  const {
    title, category, variety, price_per_unit,
    quantity_available, location, status = 'active',
  } = req.body;

  if (!title || !category || price_per_unit == null || quantity_available == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (Number(price_per_unit) < 0 || Number(quantity_available) < 0) {
    return res.status(400).json({ error: 'Price and quantity must be non-negative' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO listings
         (seller_id, title, category, variety, price_per_unit,
          quantity_available, location, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [req.user.user_id, title, category, variety || null, price_per_unit,
       quantity_available, location || null, status]
    );
    res.status(201).json({ listing: rows[0] });
  } catch (err) {
    console.error('create listing', err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
};

// PATCH /api/listings/:id
exports.update = async (req, res) => {
  const allowed = ['title', 'category', 'variety', 'price_per_unit', 'quantity_available', 'location'];
  const updates = [];
  const values = [];
  let i = 1;

  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      updates.push(`${k} = $${i++}`);
      values.push(req.body[k]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  values.push(req.params.id, req.user.user_id);

  try {
    const { rows } = await pool.query(
      `UPDATE listings SET ${updates.join(', ')}
        WHERE listing_id = $${i++} AND seller_id = $${i}
        RETURNING *`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found or not yours' });
    res.json({ listing: rows[0] });
  } catch (err) {
    console.error('update listing', err);
    res.status(500).json({ error: 'Failed to update listing' });
  }
};

// PATCH /api/listings/:id/status
exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const { rows } = await pool.query(
      `UPDATE listings SET status = $1
        WHERE listing_id = $2 AND seller_id = $3
        RETURNING *`,
      [status, req.params.id, req.user.user_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found or not yours' });
    res.json({ listing: rows[0] });
  } catch (err) {
    console.error('updateStatus', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// DELETE /api/listings/:id
exports.remove = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM listings
        WHERE listing_id = $1 AND seller_id = $2
        RETURNING listing_id`,
      [req.params.id, req.user.user_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found or not yours' });
    res.json({ deleted: rows[0].listing_id });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Listing is referenced by an order' });
    }
    console.error('delete listing', err);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
};

// GET /api/marketplace/listings (public — used by both marketplaces)
exports.getMarketplace = async (req, res) => {
  const { category, variety, county, min_price, max_price, sort } = req.query;

  const where = [`l.status = 'active'`];
  const params = [];
  let i = 1;

  // If authenticated, exclude the caller's own listings
  if (req.user?.user_id) {
    where.push(`l.seller_id <> $${i++}`);
    params.push(req.user.user_id);
  }

  if (category) { where.push(`l.category = $${i++}`); params.push(category); }
  if (variety)  { where.push(`l.variety = $${i++}`);  params.push(variety); }
  if (county)   { where.push(`l.location ILIKE $${i++}`); params.push(`%${county}%`); }
  if (min_price){ where.push(`l.price_per_unit >= $${i++}`); params.push(min_price); }
  if (max_price){ where.push(`l.price_per_unit <= $${i++}`); params.push(max_price); }

  let orderBy = 'l.created_at DESC';
  if (sort === 'price-low')  orderBy = 'l.price_per_unit ASC';
  if (sort === 'price-high') orderBy = 'l.price_per_unit DESC';
  if (sort === 'quantity')   orderBy = 'l.quantity_available DESC';

  try {
    const { rows } = await pool.query(
      `SELECT l.listing_id, l.title, l.category, l.variety,
              l.price_per_unit, l.quantity_available, l.location,
              l.status, l.created_at,
              u.full_name AS seller_name, u.county AS seller_county
         FROM listings l
         JOIN users u ON u.user_id = l.seller_id
        WHERE ${where.join(' AND ')}
        ORDER BY ${orderBy}
        LIMIT 200`,
      params
    );
    res.json({ listings: rows });
  } catch (err) {
    console.error('getMarketplace', err);
    res.status(500).json({ error: 'Failed to load marketplace' });
  }
};