// Residue Audit Trail / MRL Compliance — deep implementation.
// For each spray event on a field, compute:
//   - days_since_application vs PHI (pre-harvest interval)
//   - cumulative seasonal load vs max_app_rate
//   - first-order decay residue estimate vs MRL tolerance
//   - organic-certification break (any non-OMRI product spoils organic certification)
//
// Endpoints:
//   POST /api/cf-residue-audit-trail/audit       (audit a field)
//   POST /api/cf-residue-audit-trail/log-spray   (log a real spray event)
//   GET  /api/cf-residue-audit-trail/mrl/:crop/:ai
//   GET  /api/cf-residue-audit-trail/recent

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const pool = require('../db');

router.use(verifyToken);

// First-order dissipation half-lives (days) on plant surface — literature
const HALF_LIFE = {
  'chlorantraniliprole': 14,
  'spinosad': 3,
  'imidacloprid': 7,
  'thiamethoxam': 7,
  'lambda-cyhalothrin': 6,
  'bifenthrin': 7,
  'chlorpyrifos': 5,
  'glyphosate': 7,
  'atrazine': 25,
  'methoxyfenozide': 11,
  'sulfoxaflor': 5,
  'flonicamid': 4,
  'spirotetramat': 10,
  'spinetoram': 4,
  'abamectin': 3,
  'permethrin': 5,
  'malathion': 1,
  'carbaryl': 4,
  'bacillus thuringiensis kurstaki': 1,
  'bacillus thuringiensis aizawai': 1,
  'beauveria bassiana strain gha': 7,
  'cydia pomonella granulovirus': 5
};

function halfLifeFor(ai) {
  return HALF_LIFE[(ai || '').toLowerCase()] || 7;
}

function residueAfterDays(initial_ppm, half_life, days) {
  if (!initial_ppm || !days) return initial_ppm || 0;
  return initial_ppm * Math.pow(0.5, days / half_life);
}

async function callAI(systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) return null;
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'AgriSense Residue Audit' },
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

router.post('/audit', async (req, res) => {
  try {
    const { field_id, planned_harvest_date = null } = req.body || {};
    if (!field_id) return res.status(400).json({ error: 'field_id required' });

    const fRes = await pool.query('SELECT * FROM fields WHERE id = $1', [field_id]);
    const field = fRes.rows[0];
    if (!field) return res.status(404).json({ error: 'Field not found' });

    const eRes = await pool.query(
      `SELECT se.*, pr.pre_harvest_interval_days, pr.re_entry_interval_hours, pr.max_app_rate_g_ai_per_ha, pr.max_apps_per_season, pr.organic_approved, pr.trade_name AS reg_trade_name
       FROM spray_events se
       LEFT JOIN pesticide_registry pr ON LOWER(pr.active_ingredient) = LOWER(se.active_ingredient)
       WHERE se.field_id = $1 AND se.applied_at >= NOW() - INTERVAL '180 days'
       ORDER BY se.applied_at DESC`,
      [field_id]
    );
    const events = eRes.rows;

    // Per-AI roll-up: cumulative dose, latest application, predicted residue
    const byAI = new Map();
    for (const ev of events) {
      const ai = ev.active_ingredient;
      if (!byAI.has(ai)) byAI.set(ai, []);
      byAI.get(ai).push(ev);
    }

    const findings = [];
    let highestRisk = 'low';
    const targetHarvest = planned_harvest_date ? new Date(planned_harvest_date) : new Date(Date.now() + 30 * 86400 * 1000);

    for (const [ai, evs] of byAI) {
      const latest = evs[0];
      const daysSinceLatest = Math.max(0, Math.floor((Date.now() - new Date(latest.applied_at).getTime()) / 86400000));
      const daysToHarvest = Math.max(0, Math.floor((targetHarvest.getTime() - Date.now()) / 86400000));
      const phi = Number(latest.pre_harvest_interval_days || 7);
      const phiCompliant = daysSinceLatest + daysToHarvest >= phi;
      const cumulativeG = evs.reduce((sum, e) => sum + Number(e.rate_g_ai_per_ha || 0), 0);
      const maxApps = Number(latest.max_apps_per_season || 99);
      const appsCount = evs.length;
      const overApps = appsCount > maxApps;

      // MRL lookup
      const mRes = await pool.query(
        'SELECT mrl_ppm FROM mrl_tolerances WHERE LOWER(crop) = LOWER($1) AND LOWER(active_ingredient) = LOWER($2)',
        [field.crop_type, ai]
      );
      const mrl = mRes.rows[0]?.mrl_ppm ? Number(mRes.rows[0].mrl_ppm) : null;

      // Initial-surface residue estimate (g AI / ha) -> ppm crude conversion (~ 0.001 * g/ha)
      const initialPpm = (Number(latest.rate_g_ai_per_ha || 0) * 0.001) * 0.6;
      const hl = halfLifeFor(ai);
      const residueAtHarvest = residueAfterDays(initialPpm, hl, daysSinceLatest + daysToHarvest);

      let risk = 'low';
      const issues = [];
      if (!phiCompliant) { risk = 'critical'; issues.push(`PHI VIOLATION: harvest day ${daysSinceLatest + daysToHarvest}d after application; PHI=${phi}d.`); }
      if (overApps) { risk = risk === 'low' ? 'high' : risk; issues.push(`OVER-APPLICATION: ${appsCount} apps vs label max ${maxApps}.`); }
      if (mrl && residueAtHarvest > mrl) { risk = 'critical'; issues.push(`MRL EXCEEDANCE risk: predicted ${residueAtHarvest.toFixed(4)} ppm > tolerance ${mrl} ppm.`); }
      if (latest.organic_approved === false) issues.push(`Organic certification BROKEN: non-OMRI product (${ai}). 36-month transition required.`);

      if (risk === 'critical' && highestRisk !== 'critical') highestRisk = 'critical';
      else if (risk === 'high' && highestRisk === 'low') highestRisk = 'high';

      findings.push({
        active_ingredient: ai,
        apps_this_season: appsCount,
        cumulative_g_ai_per_ha: cumulativeG.toFixed(2),
        max_apps_label: maxApps,
        days_since_latest: daysSinceLatest,
        days_to_target_harvest: daysToHarvest,
        phi_days: phi,
        phi_compliant: phiCompliant,
        half_life_days: hl,
        predicted_residue_at_harvest_ppm: Number(residueAtHarvest.toFixed(5)),
        mrl_ppm: mrl,
        organic_approved: latest.organic_approved,
        risk,
        issues
      });
    }

    let summary = null;
    if (process.env.OPENROUTER_API_KEY && findings.length > 0) {
      const sys = 'You are a food-safety compliance officer. Given a residue audit for one field, write a 3-sentence summary stating: (1) GO/HOLD recommendation for harvest, (2) the single highest risk, (3) one corrective action.';
      const usr = `Field: ${field.name} (${field.crop_type}, ${field.hectares} ha)\nTarget harvest: ${targetHarvest.toISOString().slice(0,10)}\nOverall risk: ${highestRisk}\nFindings:\n${findings.map(f => `- ${f.active_ingredient}: PHI ${f.phi_compliant ? 'OK' : 'VIOLATION'}; predicted ${f.predicted_residue_at_harvest_ppm} ppm vs MRL ${f.mrl_ppm || 'n/a'}; ${f.issues.join('; ')}`).join('\n')}`;
      summary = await callAI(sys, usr);
    }

    res.json({
      field: { id: field.id, name: field.name, crop_type: field.crop_type, hectares: field.hectares },
      target_harvest_date: targetHarvest.toISOString().slice(0, 10),
      events_evaluated: events.length,
      active_ingredients: byAI.size,
      overall_risk: highestRisk,
      findings,
      llm_summary: summary
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/log-spray', async (req, res) => {
  try {
    const { field_id, treatment_id = null, active_ingredient, product_trade_name = null, rate_g_ai_per_ha,
            treated_area_ha = null, application_method = 'broadcast',
            wind_speed_kmh = null, temp_c = null, humidity_pct = null,
            drift_risk_score = null, buffer_zone_m = null } = req.body || {};
    if (!field_id || !active_ingredient || !rate_g_ai_per_ha) {
      return res.status(400).json({ error: 'field_id, active_ingredient, rate_g_ai_per_ha required' });
    }
    const r = await pool.query(
      `INSERT INTO spray_events (field_id, treatment_id, active_ingredient, product_trade_name, rate_g_ai_per_ha, treated_area_ha, application_method, drift_risk_score, buffer_zone_m, wind_speed_kmh, temp_c, humidity_pct, applicator_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [field_id, treatment_id, active_ingredient, product_trade_name, rate_g_ai_per_ha, treated_area_ha, application_method, drift_risk_score, buffer_zone_m, wind_speed_kmh, temp_c, humidity_pct, req.user?.id || null]
    );
    res.json({ id: r.rows[0].id, ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mrl/:crop/:ai', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM mrl_tolerances WHERE LOWER(crop) = LOWER($1) AND LOWER(active_ingredient) = LOWER($2)',
      [req.params.crop, req.params.ai]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'No tolerance on record' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/recent', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT se.*, f.name AS field_name FROM spray_events se LEFT JOIN fields f ON f.id = se.field_id ORDER BY se.applied_at DESC LIMIT 50`
    );
    res.json(r.rows);
  } catch (err) { res.json([]); }
});

module.exports = router;
