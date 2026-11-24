const pool = require('../config/db');
const fs = require('fs');
const csv = require('csv-parser');
exports.listUsers = async (req, res) => {
  const { role, userId } = req.query;
  const params = [req.user.user_id];
  let where = `WHERE user_id <> $1`;
  let i = 2;

  if (role) {
    where += ` AND role = $${i++}`;
    params.push(role);
  }

  if (userId) {
    if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(userId))) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }
    where += ` AND user_id = $${i++}`;
    params.push(userId);
  }

  try {
    const { rows } = await pool.query(
      `SELECT user_id, full_name, phone_number, email, role, county, verified, moderation_status, moderation_reason, created_at
         FROM users ${where}
        ORDER BY created_at DESC LIMIT 200`,
      params
    );
    res.json({ users: rows });
  } catch (err) {
    console.error('listUsers', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
};

exports.verifyUser = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users SET verified = true
        WHERE user_id = $1 AND role <> 'admin' AND moderation_status <> 'restricted'
        RETURNING user_id, full_name, verified`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('verifyUser', err);
    res.status(500).json({ error: 'Failed to verify user' });
  }
};

exports.listPrices = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM price_records ORDER BY recorded_date DESC LIMIT 100`
    );
    
    // Find the most recent date in the database
    let lastUpdated = null;
    if (rows.length > 0) {
      // Assuming recorded_date is a standard date string
      lastUpdated = rows[0].recorded_date; 
    }

    res.json({ prices: rows, lastUpdated });
  } catch (err) {
    console.error('listPrices', err);
    res.status(500).json({ error: 'Failed to load prices' });
  }
};

exports.createPrice = async (req, res) => {
  const { market_name, county, bean_variety, price_per_kg, recorded_date, source } = req.body;
  if (!market_name || !bean_variety || price_per_kg == null || !recorded_date || !source) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO price_records
         (market_name, county, bean_variety, price_per_kg, recorded_date, source)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [market_name, county || null, bean_variety, price_per_kg, recorded_date, source]
    );
    res.status(201).json({ price: rows[0] });
  } catch (err) {
    console.error('createPrice', err);
    res.status(500).json({ error: 'Failed to create price record' });
  }
};

exports.deletePrice = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM price_records WHERE price_id = $1 RETURNING price_id`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: rows[0].price_id });
  } catch (err) {
    console.error('deletePrice', err);
    res.status(500).json({ error: 'Failed to delete' });
  }
};

exports.submitReport = async (req, res) => {
  const { reason, details, listingId } = req.body || {};
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 80 ||
      typeof details !== 'string' || !details.trim() || details.trim().length > 2000 ||
      (listingId != null && !/^[1-9][0-9]{0,17}$/.test(String(listingId)))) {
    return res.status(400).json({ error: 'Enter a reason and a description of up to 2,000 characters.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO reports (reporter_id, listing_id, reported_user_id, reason, details, status)
       SELECT $1, l.listing_id, l.seller_id, $3, $4, 'open'
       FROM (SELECT 1) AS input
       LEFT JOIN listings l ON l.listing_id = $2
       WHERE $2::bigint IS NULL OR (l.listing_id IS NOT NULL AND l.seller_id <> $1)
       RETURNING report_id`,
      [req.user.user_id, listingId ?? null, reason.trim(), details.trim()]
    );
    if (!rows.length) return res.status(400).json({ error: 'Choose an existing listing from another account.' });
    res.status(201).json({ reportId: rows[0].report_id });
  } catch (err) {
    console.error('submitReport', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
};

exports.moderateUser = async (req, res) => {
  const { status, reason } = req.body || {};
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(req.params.id) ||
      !['active', 'flagged', 'restricted'].includes(status) ||
      typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) {
    return res.status(400).json({ error: 'Choose a valid status and provide a reason of up to 500 characters.' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE users
       SET moderation_status = $1, moderation_reason = $2
       WHERE user_id = $3 AND role <> 'admin'
         AND (moderation_status <> 'restricted' OR $1 <> 'flagged')
       RETURNING user_id, moderation_status, moderation_reason`,
      [status, reason.trim(), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Account is unavailable for moderation.' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('moderateUser', err);
    res.status(500).json({ error: 'Failed to update account status' });
  }
};

exports.listReports = async (req, res) => {
  const { status } = req.query;
  const where = status && status !== 'all' ? `WHERE r.status = $1` : '';
  const params = status && status !== 'all' ? [status] : [];

  try {
    const { rows } = await pool.query(
      `SELECT
         r.report_id,
         r.listing_id,
         
         subject.user_id AS subject_id,
         subject.full_name AS subject_name,
         subject.moderation_status AS subject_status,
         r.reason,
         r.details,
         r.decision_reason,
         r.status,
         r.created_at,
         r.resolved_at,
         l.title AS listing_title,
         l.category AS listing_category,
         reporter.full_name AS reporter_name,
         resolver.full_name AS resolver_name
       FROM reports r
       LEFT JOIN listings l ON l.listing_id = r.listing_id
       LEFT JOIN users subject ON subject.user_id = COALESCE(r.reported_user_id, l.seller_id)
       LEFT JOIN users reporter ON reporter.user_id = r.reporter_id
       LEFT JOIN users resolver ON resolver.user_id = r.resolved_by
       ${where}
       ORDER BY
         CASE WHEN r.status = 'open' THEN 0 ELSE 1 END,
         r.created_at DESC
       LIMIT 200`,
      params
    );

    res.json({
      reports: rows.map((r) => ({
        id: `RPT-${String(r.report_id).padStart(3, '0')}`,
        rawId: r.report_id,
        listingId: r.listing_id,
        listing: r.listing_title ? `${r.listing_category === 'produce' ? 'PL' : 'IN'}-${r.listing_id} Â· ${r.listing_title}` : null,
        subjectId: r.subject_id,
        subjectName: r.subject_name,
        subjectStatus: r.subject_status,
        listingTitle: r.listing_title,
        reason: r.reason,
        decisionReason: r.decision_reason,
        details: r.details,
        status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
        reporter: r.reporter_name,
        resolvedBy: r.resolver_name,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at,
      })),
    });
  } catch (err) {
    console.error('listReports', err);
    res.status(500).json({ error: 'Failed to load reports' });
  }
};

exports.reportNotifications = async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const scope = isAdmin
    ? "created_at >= now() - interval '14 days'"
    : `reporter_id = $1
       AND status IN ('resolved', 'dismissed')
       AND resolved_at >= now() - interval '14 days'`;

  try {
    const { rows } = await pool.query(
      `SELECT report_id, reason, status, decision_reason, created_at, resolved_at
       FROM reports
       WHERE ${scope}
       ORDER BY ${isAdmin ? 'created_at' : 'resolved_at'} DESC, report_id DESC
       LIMIT 100`,
      isAdmin ? [] : [req.user.user_id]
    );

    return res.json({ reports: rows });
  } catch (err) {
    console.error('reportNotifications', err);
    return res.status(500).json({ error: 'Failed to load report notifications' });
  }
};

exports.resolveReport = async (req, res) => {
  const { action, reason } = req.body || {};
  const id = req.params.id;

  if (!['resolve', 'dismiss'].includes(action) || !/^[1-9][0-9]{0,17}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid report action' });
  }

  const decisionReason = typeof reason === 'string' ? reason.trim() : '';
  if ((reason != null && typeof reason !== 'string') || decisionReason.length > 500) {
    return res.status(400).json({ error: 'Enter a reason of up to 500 characters.' });
  }
  if (action === 'dismiss' && !decisionReason) {
    return res.status(400).json({ error: 'A reason is required to dismiss a report.' });
  }

  const status = action === 'dismiss' ? 'dismissed' : 'resolved';

  try {
    const { rows: [report] } = await pool.query(
      `UPDATE reports
       SET status = $1, resolved_by = $2, resolved_at = now(), decision_reason = $4
       WHERE report_id = $3 AND status = 'open'
       RETURNING report_id, status, decision_reason`,
      [status, req.user.user_id, id, decisionReason || null]
    );

    if (!report) {
      return res.status(404).json({ error: 'Open report not found' });
    }

    return res.json({ report });
  } catch (err) {
    console.error('resolveReport', err);
    return res.status(500).json({ error: 'Failed to update report' });
  }
};
exports.getStats = async (req, res) => {
  try {
    const { rows: [userStats] } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE role = 'farmer')::int   AS farmers,
        COUNT(*) FILTER (WHERE role = 'buyer')::int    AS buyers,
        COUNT(*) FILTER (WHERE role = 'supplier')::int AS suppliers,
        COUNT(*) FILTER (WHERE verified = false AND role <> 'admin')::int AS pending_verifications
      FROM users
    `);

    const { rows: [listings] } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')::int AS active_listings,
        COUNT(*)::int AS total_listings
      FROM listings
    `);

    const { rows: [orders] } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_orders,
        COUNT(*)::int AS total_orders
      FROM transactions
    `);

    res.json({ ...userStats, ...listings, ...orders });
  } catch (err) {
    console.error('getStats', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
};
exports.importKamisCsv = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const results = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        // 1. Normalize keys to lowercase to avoid hidden spaces
        const cleanData = {};
        Object.keys(data).forEach(key => {
          cleanData[key.toLowerCase().trim()] = data[key];
        });

        const marketName = cleanData['market_name'] || cleanData['market'] || cleanData['market name'];
        const county = cleanData['county'];
        
        // 2. Look for commodity, then clean it
        let rawVariety = cleanData['commodity'] || cleanData['commodity_variety'] || cleanData['variety'] || cleanData['bean_variety'] || 'Beans';
        
        // Ensure it's a string before calling .replace()
        if (typeof rawVariety !== 'string') rawVariety = 'Beans';

        let variety = rawVariety.replace(/beans/gi, '').trim();
        if (!variety) variety = 'Beans';

        const price = parseFloat(cleanData['unit_price_kes'] || cleanData['retail'] || cleanData['price_per_kg'] || cleanData['wholesale'] || cleanData['price']);
        const date = cleanData['recorded_date'] || cleanData['date'] || new Date().toISOString().split('T')[0];
        const source = cleanData['source'] || 'KAMIS';

        if (marketName && !isNaN(price)) {
          results.push({ marketName, county, variety, price, date, source });
        }
      })
      .on('end', async () => {
        try {
          for (const r of results) {
            await pool.query(
              `INSERT INTO price_records (market_name, county, bean_variety, price_per_kg, recorded_date, source)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [r.marketName, r.county || null, r.variety, r.price, r.date, r.source]
            );
          }

          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }

          return res.status(200).json({
            message: 'KAMIS CSV imported successfully',
            count: results.length,
          });
        } catch (dbErr) {
          console.error('Database insertion error:', dbErr);
          if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
          return res.status(500).json({ error: 'Failed to insert price records into database' });
        }
      })
      .on('error', (error) => {
        console.error('CSV stream error:', error);
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(500).json({ error: 'Failed to read CSV file' });
      });

  } catch (error) {
    console.error('CSV import controller error:', error);
    return res.status(500).json({ error: error.message || 'Server error during import' });
  }
};