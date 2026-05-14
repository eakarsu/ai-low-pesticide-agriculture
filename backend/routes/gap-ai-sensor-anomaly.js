// Sensor Anomaly Detector — deep implementation.
// Computes rolling mean, stdev, and z-scores on sensor_readings;
// applies crop-specific physiological ranges; flags anomalies with hypotheses.
//
// Endpoints:
//   POST /api/gap-ai-sensor-anomaly/scan         (run anomaly detection now)
//   POST /api/gap-ai-sensor-anomaly/ingest       (push a new reading)
//   GET  /api/gap-ai-sensor-anomaly/anomalies    (recent anomalies)
//   GET  /api/gap-ai-sensor-anomaly/readings/:sensor_id (timeseries)

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const pool = require('../db');

router.use(verifyToken);

// Crop-specific physiological ranges (extension-derived; soil_moisture as VWC %)
const CROP_RANGES = {
  corn:       { soil_moisture_pct: [22, 35], soil_temp_c: [10, 30], leaf_wetness_pct: [0, 80] },
  soybean:    { soil_moisture_pct: [20, 35], soil_temp_c: [12, 30], leaf_wetness_pct: [0, 80] },
  wheat:      { soil_moisture_pct: [18, 30], soil_temp_c: [4, 25],  leaf_wetness_pct: [0, 80] },
  cotton:     { soil_moisture_pct: [18, 30], soil_temp_c: [15, 32], leaf_wetness_pct: [0, 75] },
  rice:       { soil_moisture_pct: [70, 100], soil_temp_c: [18, 35], leaf_wetness_pct: [0, 100] },
  sorghum:    { soil_moisture_pct: [15, 30], soil_temp_c: [15, 35], leaf_wetness_pct: [0, 75] },
  potato:     { soil_moisture_pct: [25, 40], soil_temp_c: [10, 25], leaf_wetness_pct: [0, 75] },
  tomato:     { soil_moisture_pct: [25, 40], soil_temp_c: [15, 30], leaf_wetness_pct: [0, 80] }
};
const DEFAULT_RANGES = { soil_moisture_pct: [20, 35], soil_temp_c: [10, 30], leaf_wetness_pct: [0, 80], battery_v: [3.0, 5.0] };

function rangeFor(crop, metric) {
  const r = (CROP_RANGES[(crop || '').toLowerCase()] || {})[metric] || DEFAULT_RANGES[metric];
  return r || null;
}

function zscore(value, mean, std) {
  if (!std || std < 0.0001) return 0;
  return (value - mean) / std;
}

function hypothesisFor(metric, value, low, high, crop) {
  if (metric === 'soil_moisture_pct') {
    if (value > high) return { sev: 'warning', hyp: `Soil saturated at ${value}% (above ${crop || 'crop'} optimum ${high}%). Likely irrigation overrun, drainage failure, or recent heavy rain. Risk: root anoxia, Phytophthora/Pythium pressure, denitrification.`, act: 'Halt irrigation 48h, check drain tiles, scout for crown rot, defer N application.' };
    if (value < low) return { sev: 'critical', hyp: `Drought stress at ${value}% VWC (below ${low}%). Spider mite outbreak risk doubles; chemical efficacy drops; stomatal closure → reduced photosynthate.`, act: 'Irrigate 25-50 mm immediately; expect 24-48h before VWC recovers; delay any foliar spray.' };
  }
  if (metric === 'soil_temp_c') {
    if (value > high) return { sev: 'warning', hyp: `Soil temperature elevated at ${value}°C — accelerated mineralization but heat stress on roots; pest egg hatch accelerated.`, act: 'Mulch / cover crop residue; monitor for accelerated pest emergence (corn rootworm, wireworm).' };
    if (value < low) return { sev: 'warning', hyp: `Cold soil at ${value}°C — seed/seedling vigor compromised; Pythium/Rhizoctonia risk in cool wet soil.`, act: 'Delay planting; use seed treatments; verify drainage.' };
  }
  if (metric === 'leaf_wetness_pct' && value > high) {
    return { sev: 'warning', hyp: `Prolonged leaf wetness (${value}%) — disease infection windows triggered (apple scab, soybean rust, late blight depending on crop).`, act: 'Run plant-disease model; deploy preventive fungicide only if forecast pressure high.' };
  }
  if (metric === 'battery_v' && value < 3.0) {
    return { sev: 'warning', hyp: `Sensor battery at ${value}V — data gaps imminent.`, act: 'Dispatch field tech to swap battery within 7 days.' };
  }
  return { sev: 'info', hyp: `Value ${value} for ${metric} is outside the typical ${low}-${high} range for ${crop || 'this crop'}.`, act: 'Continue monitoring.' };
}

async function callAI(systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) return null;
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'AgriSense Sensor Anomaly' },
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

router.post('/scan', async (req, res) => {
  try {
    const { field_id = null, window_hours = 72, zthresh = 2.5 } = req.body || {};

    // Pull last `window_hours` of readings grouped by sensor+metric
    const params = [window_hours];
    let where = `WHERE recorded_at >= NOW() - ($1 || ' hours')::interval`;
    if (field_id) { where += ' AND sr.field_id = $2'; params.push(field_id); }
    const sql = `
      SELECT sr.sensor_id, sr.field_id, sr.metric, sr.value, sr.recorded_at,
             s.device_type, s.model, f.crop_type, f.name AS field_name
      FROM sensor_readings sr
      JOIN sensors s ON s.id = sr.sensor_id
      JOIN fields f ON f.id = sr.field_id
      ${where}
      ORDER BY sr.sensor_id, sr.metric, sr.recorded_at DESC
    `;
    const r = await pool.query(sql, params);
    const rows = r.rows;

    // Group by (sensor,metric)
    const groups = new Map();
    for (const row of rows) {
      const key = `${row.sensor_id}::${row.metric}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }

    const anomalies = [];
    for (const [key, arr] of groups) {
      if (arr.length < 5) continue;
      const vals = arr.map(x => Number(x.value));
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);

      const latest = arr[0];
      const z = zscore(Number(latest.value), mean, std);
      const range = rangeFor(latest.crop_type, latest.metric);
      const outOfRange = range && (Number(latest.value) < range[0] || Number(latest.value) > range[1]);

      if (Math.abs(z) >= zthresh || outOfRange) {
        const h = hypothesisFor(latest.metric, Number(latest.value), range?.[0] ?? mean - 2 * std, range?.[1] ?? mean + 2 * std, latest.crop_type);
        anomalies.push({
          sensor_id: latest.sensor_id,
          field_id: latest.field_id,
          field_name: latest.field_name,
          metric: latest.metric,
          observed_value: Number(latest.value),
          rolling_mean: Number(mean.toFixed(3)),
          rolling_std: Number(std.toFixed(3)),
          zscore: Number(z.toFixed(3)),
          expected_range: range,
          severity: h.sev,
          hypothesis: h.hyp,
          recommended_action: h.act,
          observed_at: latest.recorded_at
        });
      }
    }

    // Persist anomalies
    for (const a of anomalies) {
      try {
        await pool.query(
          `INSERT INTO sensor_anomalies (sensor_id, field_id, metric, observed_value, expected_range_low, expected_range_high, zscore, severity, hypothesis, recommended_action)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [a.sensor_id, a.field_id, a.metric, a.observed_value, a.expected_range?.[0] ?? null, a.expected_range?.[1] ?? null, a.zscore, a.severity, a.hypothesis, a.recommended_action]
        );
      } catch (e) { /* tolerate dup persistence */ }
    }

    let summary = null;
    if (process.env.OPENROUTER_API_KEY && anomalies.length > 0) {
      const sys = 'You are an agronomy field-ops assistant. Given a list of sensor anomalies, write a 3-sentence executive summary an operations manager could read at 6am with morning coffee.';
      const usr = `Anomalies (${anomalies.length}):\n${anomalies.slice(0, 12).map(a => `- ${a.field_name}/${a.metric}: ${a.observed_value} (z=${a.zscore}, ${a.severity}) — ${a.hypothesis.split('.')[0]}`).join('\n')}`;
      summary = await callAI(sys, usr);
    }

    res.json({
      scanned_readings: rows.length,
      groups_evaluated: groups.size,
      anomalies_count: anomalies.length,
      anomalies,
      llm_summary: summary
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ingest', async (req, res) => {
  try {
    const { sensor_id, field_id, metric, value } = req.body || {};
    if (!sensor_id || !metric || value === undefined) {
      return res.status(400).json({ error: 'sensor_id, metric, value required' });
    }
    const r = await pool.query(
      'INSERT INTO sensor_readings (sensor_id, field_id, metric, value) VALUES ($1,$2,$3,$4) RETURNING id, recorded_at',
      [sensor_id, field_id || null, metric, value]
    );
    res.json({ id: r.rows[0].id, recorded_at: r.rows[0].recorded_at, ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/anomalies', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT sa.*, f.name AS field_name, s.device_type, s.model
       FROM sensor_anomalies sa
       LEFT JOIN fields f ON f.id = sa.field_id
       LEFT JOIN sensors s ON s.id = sa.sensor_id
       ORDER BY sa.detected_at DESC LIMIT 100`
    );
    res.json(r.rows);
  } catch (err) { res.json([]); }
});

router.get('/readings/:sensor_id', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
    const r = await pool.query(
      'SELECT id, metric, value, recorded_at FROM sensor_readings WHERE sensor_id = $1 ORDER BY recorded_at DESC LIMIT $2',
      [req.params.sensor_id, limit]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
