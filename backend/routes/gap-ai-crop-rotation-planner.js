// Crop Rotation Planner — deep implementation.
// Given a field's recent cropping history (or current crop) it scores
// candidate next-crops using the rotation_rules table (real extension recs),
// nitrogen balance, pest-cycle break, and recent on-farm pest pressure.
//
// Endpoints:
//   POST /api/gap-ai-crop-rotation-planner/plan
//   GET  /api/gap-ai-crop-rotation-planner/rules
//   GET  /api/gap-ai-crop-rotation-planner/plans
//   POST /api/gap-ai-crop-rotation-planner/save

const express = require('express');
const router = express.Router();
const verifyToken = require("../middleware/auth");
const pool = require('../db');

router.use(verifyToken);

const RECOMMENDATION_SCORE = {
  excellent: 95,
  good: 75,
  acceptable: 55,
  avoid: 25,
  never: 5
};

const CANDIDATE_CROPS = [
  'corn', 'soybean', 'wheat', 'cotton', 'rice', 'sorghum',
  'alfalfa', 'canola', 'potato', 'tomato', 'sunflower'
];

async function callAI(systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) return null;
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'AgriSense Rotation Planner' },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.3
      })
    });
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) { return null; }
}

async function scoreNextCrop(prev, next) {
  const r = await pool.query(
    'SELECT recommendation, rationale, pest_cycle_break, nitrogen_balance FROM rotation_rules WHERE prev_crop = $1 AND next_crop = $2',
    [prev, next]
  );
  if (r.rows[0]) {
    const row = r.rows[0];
    return {
      next_crop: next,
      score: RECOMMENDATION_SCORE[row.recommendation] || 50,
      recommendation: row.recommendation,
      rationale: row.rationale,
      pest_cycle_break: row.pest_cycle_break,
      nitrogen_balance: row.nitrogen_balance,
      from_db: true
    };
  }
  return {
    next_crop: next,
    score: prev === next ? 30 : 55,
    recommendation: prev === next ? 'avoid' : 'acceptable',
    rationale: prev === next ? 'Continuous monoculture builds pest/disease pressure.' : 'No specific rule in database — default fallback.',
    pest_cycle_break: 'unknown',
    nitrogen_balance: 'unknown',
    from_db: false
  };
}

router.post('/plan', async (req, res) => {
  try {
    const { field_id, prev_crop = null, years = 4 } = req.body || {};
    if (!field_id && !prev_crop) {
      return res.status(400).json({ error: 'field_id or prev_crop required' });
    }

    let field = null;
    let startCrop = prev_crop;

    if (field_id) {
      const r = await pool.query('SELECT * FROM fields WHERE id = $1', [field_id]);
      field = r.rows[0];
      if (!field) return res.status(404).json({ error: 'Field not found' });
      startCrop = startCrop || field.crop_type;
    }

    let recentPests = [];
    if (field_id) {
      const r = await pool.query(
        `SELECT pest_name, COUNT(*) AS hits, MAX(severity) AS max_severity
         FROM detections WHERE field_id = $1 AND detected_at >= NOW() - INTERVAL '24 months'
         GROUP BY pest_name ORDER BY hits DESC LIMIT 6`,
        [field_id]
      );
      recentPests = r.rows;
    }

    const candidates = [];
    for (const next of CANDIDATE_CROPS) {
      const s = await scoreNextCrop((startCrop || '').toLowerCase(), next);

      let pestBonus = 0;
      const pestBreakNotes = [];
      for (const p of recentPests) {
        const cr = await pool.query(
          'SELECT primary_crops FROM pest_catalog WHERE common_name = $1',
          [p.pest_name]
        );
        if (cr.rows[0]) {
          const hosts = (cr.rows[0].primary_crops || '').toLowerCase();
          if (!hosts.includes(next)) {
            pestBonus += 5;
            pestBreakNotes.push(`Breaks ${p.pest_name} cycle (${p.hits} obs).`);
          }
        }
      }
      candidates.push({ ...s, pest_break_bonus: pestBonus, pest_break_notes: pestBreakNotes, total_score: s.score + pestBonus });
    }

    candidates.sort((a, b) => b.total_score - a.total_score);

    // Greedy multi-year plan
    const plan = [];
    let cur = startCrop;
    for (let y = 1; y <= years; y++) {
      const opts = [];
      for (const next of CANDIDATE_CROPS) {
        if (plan.includes(next)) continue;
        const s = await scoreNextCrop((cur || '').toLowerCase(), next);
        opts.push({ next, score: s.score, recommendation: s.recommendation });
      }
      opts.sort((a, b) => b.score - a.score);
      const choice = opts[0] || { next: 'soybean', score: 50, recommendation: 'acceptable' };
      plan.push(choice.next);
      cur = choice.next;
    }

    let narrative = null;
    if (process.env.OPENROUTER_API_KEY) {
      const sys = 'You are an extension agronomist. Given a multi-year crop rotation plan, write a 3-sentence explanation focusing on pest cycle breaks, nitrogen economy, and weed shift.';
      const usr = `Field: ${field?.name || 'unspecified'} (${field?.hectares || '?'} ha, ${field?.soil_type || ''})\nCurrent crop: ${startCrop}\nProposed rotation: Y1 ${plan[0]}, Y2 ${plan[1]}, Y3 ${plan[2]}, Y4 ${plan[3] || '(end)'}\nRecent pest pressure: ${recentPests.map(p => p.pest_name).join(', ') || '(none)'}`;
      narrative = await callAI(sys, usr);
    }

    res.json({
      field,
      start_crop: startCrop,
      recent_pests: recentPests,
      top_candidates: candidates.slice(0, 6),
      proposed_plan: { year_1: plan[0], year_2: plan[1], year_3: plan[2], year_4: plan[3] || null },
      narrative,
      llm_used: !!narrative
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/rules', async (_req, res) => {
  try {
    const r = await pool.query('SELECT * FROM rotation_rules ORDER BY prev_crop, next_crop');
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/plans', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT rp.*, f.name AS field_name FROM rotation_plans rp LEFT JOIN fields f ON f.id = rp.field_id ORDER BY rp.created_at DESC LIMIT 50`
    );
    res.json(r.rows);
  } catch (err) { res.json([]); }
});

router.post('/save', async (req, res) => {
  try {
    const { field_id, plan_year_1, plan_year_2, plan_year_3, plan_year_4, notes } = req.body || {};
    const r = await pool.query(
      `INSERT INTO rotation_plans (field_id, plan_year_1, plan_year_2, plan_year_3, plan_year_4, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [field_id, plan_year_1, plan_year_2, plan_year_3, plan_year_4, notes || null, req.user?.id || null]
    );
    res.json({ id: r.rows[0].id, ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
