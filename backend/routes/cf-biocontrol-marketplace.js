// Biocontrol Marketplace — deep implementation.
// Given a target pest (or active detection), returns ranked beneficial-insect
// recommendations with release rates per field hectares, supplier, and cost.
// Also exposes a CRUD listing of the beneficial_insects catalog and an
// "order" endpoint that records a draft procurement event.
//
// Endpoints:
//   POST /api/cf-biocontrol-marketplace/recommend
//   GET  /api/cf-biocontrol-marketplace/catalog
//   POST /api/cf-biocontrol-marketplace/order
//   GET  /api/cf-biocontrol-marketplace/orders

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const pool = require('../db');

router.use(verifyToken);

async function ensureOrderTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS biocontrol_orders (
    id SERIAL PRIMARY KEY,
    field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE,
    beneficial_id INTEGER REFERENCES beneficial_insects(id) ON DELETE SET NULL,
    target_pest VARCHAR(255),
    quantity_units DECIMAL(10,2),
    estimated_cost_usd DECIMAL(10,2),
    notes TEXT,
    status VARCHAR(30) DEFAULT 'draft',
    placed_by INTEGER REFERENCES users(id),
    placed_at TIMESTAMP DEFAULT NOW()
  )`);
}

function parseFirstNumber(s) {
  const m = (s || '').toString().replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

async function callAI(systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) return null;
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'AgriSense Biocontrol' },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.2
      })
    });
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) { return null; }
}

router.post('/recommend', async (req, res) => {
  try {
    await ensureOrderTable();
    const { target_pest, field_id = null, severity = 'medium' } = req.body || {};
    if (!target_pest) return res.status(400).json({ error: 'target_pest required' });

    // Field context (hectares + crop)
    let field = null;
    if (field_id) {
      const f = await pool.query('SELECT * FROM fields WHERE id = $1', [field_id]);
      field = f.rows[0] || null;
    }
    const hectares = Number(field?.hectares || 1);

    // Match pest catalog -> natural_enemies
    const pcat = await pool.query('SELECT * FROM pest_catalog WHERE common_name = $1', [target_pest]);
    const pestRow = pcat.rows[0];
    const naturalEnemies = (pestRow?.natural_enemies || '').toLowerCase();

    // Find beneficial_insects whose target_pests OR scientific_name overlaps
    const bRes = await pool.query(
      `SELECT * FROM beneficial_insects WHERE target_pests ILIKE $1 OR scientific_name = ANY($2::text[])`,
      [`%${target_pest.toLowerCase()}%`, naturalEnemies.split(',').map(s => s.trim()).filter(Boolean)]
    );
    let candidates = bRes.rows;

    // If no overlap, broaden to any predator/parasitoid matching crop
    if (candidates.length === 0 && pestRow) {
      const broad = await pool.query(
        `SELECT * FROM beneficial_insects WHERE target_pests ILIKE $1`,
        [`%${(pestRow.damage_type || '').split(' ')[0] || ''}%`]
      );
      candidates = broad.rows;
    }

    // Score: matches in target_pests > matches in catalog natural_enemies
    const ranked = candidates.map(c => {
      let score = 50;
      const tp = (c.target_pests || '').toLowerCase();
      if (tp.includes(target_pest.toLowerCase())) score += 30;
      if (naturalEnemies.includes((c.scientific_name || '').toLowerCase())) score += 25;
      if (severity === 'critical' && c.category === 'predator') score += 5;
      if (severity === 'low' && c.category === 'parasitoid') score += 5;

      const releaseNum = parseFirstNumber(c.release_rate_per_ha);
      const unitNum = parseFirstNumber(c.unit_description);
      const totalUnits = releaseNum ? Math.ceil(releaseNum * hectares) : null;
      const purchaseUnits = (totalUnits && unitNum) ? Math.ceil(totalUnits / unitNum) : null;
      const totalCost = (purchaseUnits && c.price_usd_per_unit) ? Number((purchaseUnits * Number(c.price_usd_per_unit)).toFixed(2)) : null;

      return {
        ...c,
        match_score: score,
        recommended_release_total: totalUnits,
        purchase_units: purchaseUnits,
        estimated_cost_usd: totalCost
      };
    }).sort((a, b) => b.match_score - a.match_score);

    let narrative = null;
    if (process.env.OPENROUTER_API_KEY && ranked.length > 0) {
      const sys = 'You are an IPM consultant. Given a ranked biocontrol slate for a pest, write 3 sentences explaining the top choice and one cultural-companion practice that boosts the biocontrol\'s establishment.';
      const top = ranked[0];
      const usr = `Pest: ${target_pest}\nField: ${field?.name || 'unspecified'} (${field?.crop_type || ''}, ${hectares} ha)\nTop biocontrol: ${top.common_name} (${top.scientific_name}) — release ${top.recommended_release_total || top.release_rate_per_ha}, cost $${top.estimated_cost_usd || '?'}\nAlternatives: ${ranked.slice(1, 4).map(r => r.common_name).join(', ')}`;
      narrative = await callAI(sys, usr);
    }

    res.json({
      target_pest,
      pest_catalog_entry: pestRow,
      field,
      hectares,
      recommendations: ranked.slice(0, 8),
      narrative,
      llm_used: !!narrative
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/catalog', async (_req, res) => {
  try {
    const r = await pool.query('SELECT * FROM beneficial_insects ORDER BY common_name');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/order', async (req, res) => {
  try {
    await ensureOrderTable();
    const { field_id, beneficial_id, target_pest, quantity_units, estimated_cost_usd, notes } = req.body || {};
    if (!beneficial_id || !quantity_units) return res.status(400).json({ error: 'beneficial_id and quantity_units required' });
    const r = await pool.query(
      `INSERT INTO biocontrol_orders (field_id, beneficial_id, target_pest, quantity_units, estimated_cost_usd, notes, placed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [field_id || null, beneficial_id, target_pest || null, quantity_units, estimated_cost_usd || null, notes || null, req.user?.id || null]
    );
    res.json({ id: r.rows[0].id, ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/orders', async (_req, res) => {
  try {
    await ensureOrderTable();
    const r = await pool.query(
      `SELECT bo.*, bi.common_name AS beneficial_name, bi.scientific_name, f.name AS field_name
       FROM biocontrol_orders bo
       LEFT JOIN beneficial_insects bi ON bi.id = bo.beneficial_id
       LEFT JOIN fields f ON f.id = bo.field_id
       ORDER BY bo.placed_at DESC LIMIT 50`
    );
    res.json(r.rows);
  } catch (err) { res.json([]); }
});

module.exports = router;
