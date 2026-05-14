// Treatment Efficacy Score — deep implementation.
// For each completed treatment on a field, compares pest detection rates in
// the 21-day windows before vs after treatment, computes:
//   - knockdown % (severity & confidence weighted)
//   - days-to-suppression
//   - reduction by chemical class (was the IPM step justified?)
//   - chemical-savings vs broadcast baseline
//
// Endpoints:
//   POST /api/gap-ai-treatment-efficacy-score/score
//   GET  /api/gap-ai-treatment-efficacy-score/scores
//   GET  /api/gap-ai-treatment-efficacy-score/program

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const pool = require('../db');

router.use(verifyToken);

const SEVERITY_WEIGHT = { low: 1, medium: 3, high: 5, critical: 8 };

function pestPressureScore(detections) {
  if (!detections.length) return 0;
  let s = 0;
  for (const d of detections) {
    s += (SEVERITY_WEIGHT[(d.severity || 'medium').toLowerCase()] || 3) * (Number(d.confidence) || 0.7);
  }
  return s;
}

async function ensureTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS treatment_efficacy_scores (
    id SERIAL PRIMARY KEY,
    treatment_id INTEGER REFERENCES treatments(id) ON DELETE CASCADE,
    field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE,
    pre_pressure DECIMAL(10,3),
    post_pressure DECIMAL(10,3),
    knockdown_pct DECIMAL(6,2),
    days_to_suppression INT,
    chemical_class VARCHAR(100),
    chemical_savings_pct INTEGER,
    verdict VARCHAR(30),
    notes TEXT,
    scored_at TIMESTAMP DEFAULT NOW()
  )`);
}

async function callAI(systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) return null;
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'AgriSense Efficacy' },
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

router.post('/score', async (req, res) => {
  try {
    await ensureTable();
    const { treatment_id, window_days = 21 } = req.body || {};
    if (!treatment_id) return res.status(400).json({ error: 'treatment_id required' });

    const tRes = await pool.query(
      `SELECT t.*, f.name AS field_name, f.crop_type, f.hectares FROM treatments t LEFT JOIN fields f ON f.id = t.field_id WHERE t.id = $1`,
      [treatment_id]
    );
    const treatment = tRes.rows[0];
    if (!treatment) return res.status(404).json({ error: 'Treatment not found' });
    if (!treatment.completed_date) return res.status(400).json({ error: 'Treatment not yet completed; cannot score retrospectively.' });

    const completed = new Date(treatment.completed_date);

    // PRE window: window_days before treatment
    const preRes = await pool.query(
      `SELECT * FROM detections WHERE field_id = $1
       AND detected_at BETWEEN $2 AND $3
       ORDER BY detected_at`,
      [treatment.field_id, new Date(completed.getTime() - window_days * 86400000), completed]
    );
    // POST window: window_days after treatment
    const postRes = await pool.query(
      `SELECT * FROM detections WHERE field_id = $1
       AND detected_at BETWEEN $2 AND $3
       ORDER BY detected_at`,
      [treatment.field_id, completed, new Date(completed.getTime() + window_days * 86400000)]
    );

    const prePressure = pestPressureScore(preRes.rows);
    const postPressure = pestPressureScore(postRes.rows);
    const knockdown = prePressure > 0 ? Math.max(0, Math.min(100, ((prePressure - postPressure) / prePressure) * 100)) : 0;

    // Time-to-suppression
    let daysToSuppression = null;
    for (const d of postRes.rows) {
      if ((SEVERITY_WEIGHT[(d.severity || 'medium').toLowerCase()] || 3) <= 1) {
        daysToSuppression = Math.ceil((new Date(d.detected_at).getTime() - completed.getTime()) / 86400000);
        break;
      }
    }

    // Chemical class lookup
    const pRes = await pool.query(
      'SELECT chemical_class, irac_moa_group, organic_approved FROM pesticide_registry WHERE LOWER(active_ingredient) = LOWER($1) OR LOWER(trade_name) = LOWER($2) LIMIT 1',
      [treatment.chemical_name, treatment.chemical_name]
    );
    const pesticide = pRes.rows[0] || null;

    let verdict = 'partial';
    if (knockdown >= 80) verdict = 'excellent';
    else if (knockdown >= 60) verdict = 'good';
    else if (knockdown >= 30) verdict = 'partial';
    else verdict = 'failed';

    const notes = [];
    if (treatment.treatment_type === 'biological' || treatment.treatment_type === 'predatory_insects' || treatment.treatment_type === 'pheromone_trap') {
      notes.push('Biological/cultural treatment — preserves natural enemies and avoids resistance selection.');
    }
    if (pesticide && pesticide.irac_moa_group) {
      notes.push(`IRAC MoA group ${pesticide.irac_moa_group} — rotate to a different group on next application.`);
    }
    if (knockdown < 30 && treatment.chemical_name) {
      notes.push('Low knockdown — investigate resistance, application coverage, or timing (early instars).');
    }
    if (treatment.chemical_savings_pct >= 80) {
      notes.push(`Achieved ${treatment.chemical_savings_pct}% chemical savings vs broadcast baseline.`);
    }

    // Persist
    let savedId = null;
    try {
      const ins = await pool.query(
        `INSERT INTO treatment_efficacy_scores
         (treatment_id, field_id, pre_pressure, post_pressure, knockdown_pct, days_to_suppression, chemical_class, chemical_savings_pct, verdict, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [treatment_id, treatment.field_id, prePressure, postPressure, knockdown, daysToSuppression,
         pesticide?.chemical_class || null, treatment.chemical_savings_pct || 0, verdict, notes.join(' | ')]
      );
      savedId = ins.rows[0].id;
    } catch (e) { /* persistence optional */ }

    let llmCritique = null;
    if (process.env.OPENROUTER_API_KEY) {
      const sys = 'You are an IPM auditor. Given a retrospective treatment efficacy result, write 3 sentences: (1) verdict, (2) what worked or failed, (3) one recommendation for next time.';
      const usr = `Treatment: ${treatment.treatment_type} ${treatment.chemical_name || ''} on ${treatment.field_name} (${treatment.crop_type}, ${treatment.hectares} ha)\nPre-treatment pest pressure: ${prePressure.toFixed(2)}\nPost-treatment: ${postPressure.toFixed(2)}\nKnockdown: ${knockdown.toFixed(1)}%\nDays to suppression: ${daysToSuppression || 'not achieved in window'}\nChemical class: ${pesticide?.chemical_class || 'n/a'}\nVerdict: ${verdict}`;
      llmCritique = await callAI(sys, usr);
    }

    res.json({
      id: savedId,
      treatment,
      pre_pressure: Number(prePressure.toFixed(3)),
      post_pressure: Number(postPressure.toFixed(3)),
      knockdown_pct: Number(knockdown.toFixed(2)),
      days_to_suppression: daysToSuppression,
      pre_detections: preRes.rows.length,
      post_detections: postRes.rows.length,
      pesticide_metadata: pesticide,
      verdict,
      notes,
      llm_critique: llmCritique,
      llm_used: !!llmCritique
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/scores', async (_req, res) => {
  try {
    await ensureTable();
    const r = await pool.query(
      `SELECT tes.*, t.treatment_type, t.chemical_name, f.name AS field_name
       FROM treatment_efficacy_scores tes
       LEFT JOIN treatments t ON t.id = tes.treatment_id
       LEFT JOIN fields f ON f.id = tes.field_id
       ORDER BY tes.scored_at DESC LIMIT 50`
    );
    res.json(r.rows);
  } catch (err) { res.json([]); }
});

router.get('/program', async (_req, res) => {
  try {
    await ensureTable();
    const r = await pool.query(
      `SELECT verdict, COUNT(*) AS n, AVG(knockdown_pct) AS avg_knockdown, AVG(chemical_savings_pct) AS avg_savings
       FROM treatment_efficacy_scores GROUP BY verdict ORDER BY verdict`
    );
    res.json(r.rows);
  } catch (err) { res.json([]); }
});

module.exports = router;
