const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const pool = require('../db');

router.use(verifyToken);

async function callOpenRouter(userPrompt, systemPrompt = '') {
  if (!process.env.OPENROUTER_API_KEY) {
    const err = new Error('OPENROUTER_API_KEY not configured');
    err.status = 503;
    throw err;
  }
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'AgriSense'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: userPrompt }
      ]
    })
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    const err = new Error(`OpenRouter error ${resp.status}: ${text.slice(0, 200)}`);
    err.status = resp.status === 401 ? 503 : 502;
    throw err;
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || 'AI unavailable';
}

function handleAIError(res, err) {
  if (err.status === 503) {
    return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured on server.' });
  }
  if (err.status === 502) {
    return res.status(502).json({ error: err.message });
  }
  return res.status(500).json({ error: err.message });
}

// 1. Spray-Window Predictor
router.post('/spray-window', async (req, res) => {
  try {
    const { field_id, target_pest, weather_summary } = req.body;
    let fieldInfo = '';
    let recentWeather = [];
    if (field_id) {
      const fr = await pool.query('SELECT * FROM fields WHERE id = $1', [field_id]);
      if (fr.rows.length) {
        const f = fr.rows[0];
        fieldInfo = `Field: ${f.name}, Crop: ${f.crop_type}, Hectares: ${f.hectares}, Health: ${f.health_score}, Soil: ${f.soil_type}`;
        const wr = await pool.query('SELECT * FROM weather_data WHERE location = $1 ORDER BY recorded_at DESC LIMIT 5', [f.location]);
        recentWeather = wr.rows;
      }
    }
    const prompt = `You are an agronomist. Recommend the optimal spray window (date/time + duration) for the target pest and field below, choosing low-wind, low-rain, low-temperature-stress conditions to minimise drift and maximise efficacy with minimum chemical.

${fieldInfo}
Target pest: ${target_pest || 'unspecified'}
User-supplied weather summary: ${weather_summary || '(none)'}

Recent recorded weather:
${JSON.stringify(recentWeather, null, 2)}

Provide:
1. **Recommended Spray Window** - date(s) + time-of-day with rationale
2. **Avoid Windows** - dates/times to avoid and why
3. **Wind, Temperature, Humidity Targets** - exact ranges
4. **Drift Risk** - low/medium/high with mitigation
5. **Beneficial-insect Protection** - timing to spare pollinators
6. **Re-entry Interval Reminder** - typical safe re-entry`;
    const result = await callOpenRouter(prompt, 'You are an integrated pest management specialist focused on optimal spray timing for low-pesticide agriculture.');
    res.json({ result });
  } catch (err) {
    handleAIError(res, err);
  }
});

// 2. Pesticide Residue Risk Scorer
router.post('/residue-risk', async (req, res) => {
  try {
    const { field_id, harvest_date } = req.body;
    let fieldInfo = '';
    let recentTreatments = [];
    if (field_id) {
      const fr = await pool.query('SELECT * FROM fields WHERE id = $1', [field_id]);
      if (fr.rows.length) {
        const f = fr.rows[0];
        fieldInfo = `Field: ${f.name}, Crop: ${f.crop_type}, Hectares: ${f.hectares}`;
      }
      const tr = await pool.query('SELECT * FROM treatments WHERE field_id = $1 ORDER BY scheduled_date DESC LIMIT 10', [field_id]);
      recentTreatments = tr.rows;
    }
    const prompt = `Score pesticide residue risk for produce harvested from this field.

${fieldInfo}
Planned harvest date: ${harvest_date || '(unspecified)'}

Recent treatments:
${JSON.stringify(recentTreatments, null, 2)}

Provide:
1. **Residue Risk Score** - 0 (none) to 100 (high) with confidence interval
2. **Risk Drivers** - which chemicals + days-since-application contribute most
3. **PHI Compliance Check** - whether each chemical's pre-harvest interval is satisfied
4. **MRL Concerns** - which residues may exceed common Maximum Residue Limits
5. **Mitigation Suggestions** - delay options, rinse-off, alternative harvest blocks
6. **Recommended Lab Tests** - what to test and when`;
    const result = await callOpenRouter(prompt, 'You are a food-safety / agricultural chemistry expert. Be conservative and protective of consumer safety.');
    res.json({ result });
  } catch (err) {
    handleAIError(res, err);
  }
});

// 3. Soil Health Analyzer
router.post('/soil-health', async (req, res) => {
  try {
    const { field_id, soil_observations } = req.body;
    let fieldInfo = '';
    let healthHistory = [];
    if (field_id) {
      const fr = await pool.query('SELECT * FROM fields WHERE id = $1', [field_id]);
      if (fr.rows.length) {
        const f = fr.rows[0];
        fieldInfo = `Field: ${f.name}, Crop: ${f.crop_type}, Soil type: ${f.soil_type}, Health score: ${f.health_score}`;
      }
      const hr = await pool.query('SELECT * FROM health_reports WHERE field_id = $1 ORDER BY report_date DESC LIMIT 6', [field_id]);
      healthHistory = hr.rows;
    }
    const prompt = `Analyse soil health for this field and recommend regenerative low-input practices.

${fieldInfo}
Field observations from user: ${soil_observations || '(none)'}

Health-report history:
${JSON.stringify(healthHistory, null, 2)}

Provide:
1. **Soil Health Score** - 0-100 with rationale
2. **Likely Limiting Factors** - structure, organic matter, pH, microbiome, drainage
3. **Cover-crop Recommendations** - species + timing
4. **Amendment Strategy** - compost, biochar, lime, etc. with quantities per hectare
5. **Microbiome Boost** - mycorrhizal / biological inoculants worth trying
6. **3-Year Improvement Plan** - measurable milestones`;
    const result = await callOpenRouter(prompt, 'You are a soil scientist specialising in regenerative, low-pesticide agriculture.');
    res.json({ result });
  } catch (err) {
    handleAIError(res, err);
  }
});

// 4. Plant Disease Early-Warning
router.post('/disease-early-warning', async (req, res) => {
  try {
    const { field_id, observed_symptoms } = req.body;
    let fieldInfo = '';
    let recentDetections = [];
    if (field_id) {
      const fr = await pool.query('SELECT * FROM fields WHERE id = $1', [field_id]);
      if (fr.rows.length) {
        const f = fr.rows[0];
        fieldInfo = `Field: ${f.name}, Crop: ${f.crop_type}, Health: ${f.health_score}`;
      }
      const dr = await pool.query('SELECT * FROM detections WHERE field_id = $1 ORDER BY detected_at DESC LIMIT 8', [field_id]);
      recentDetections = dr.rows;
    }
    const prompt = `Provide an early-warning analysis for likely plant diseases based on the symptoms described.

${fieldInfo}
Observed symptoms: ${observed_symptoms || '(none)'}

Recent pest/disease detections in this field:
${JSON.stringify(recentDetections, null, 2)}

Provide:
1. **Top 3 Likely Diseases** - name + probability + key diagnostic features
2. **Differential Diagnosis** - what to rule out
3. **Spread Risk** - how fast it could move through the field
4. **Confirmation Steps** - what samples to collect / lab tests
5. **First-Response Actions** - low-input cultural and biological measures before any chemical
6. **When To Escalate** - threshold for chemical intervention`;
    const result = await callOpenRouter(prompt, 'You are a plant pathologist focused on early detection and minimum-intervention disease management.');
    res.json({ result });
  } catch (err) {
    handleAIError(res, err);
  }
});

// 5. Beneficial Insect Identifier
router.post('/beneficial-insects', async (req, res) => {
  try {
    const { field_id, observation_notes } = req.body;
    let fieldInfo = '';
    if (field_id) {
      const fr = await pool.query('SELECT * FROM fields WHERE id = $1', [field_id]);
      if (fr.rows.length) {
        const f = fr.rows[0];
        fieldInfo = `Field: ${f.name}, Crop: ${f.crop_type}, Hectares: ${f.hectares}`;
      }
    }
    const prompt = `Identify likely beneficial insects from these scout notes and recommend how to encourage them.

${fieldInfo}
Scout notes: ${observation_notes || '(none)'}

Provide:
1. **Likely Species Identified** - common + scientific name + role (predator/parasitoid/pollinator)
2. **Confidence Level** - per identification
3. **Pests They Control** - specific to this crop
4. **Habitat Recommendations** - flower strips, refuges, water sources
5. **Spray Compatibility** - chemicals to avoid, BCAs (biocontrol agents) to combine
6. **Population-Boost Tactics** - releases, lures, banker plants`;
    const result = await callOpenRouter(prompt, 'You are an entomologist specialising in biological control and beneficial-insect conservation in agriculture.');
    res.json({ result });
  } catch (err) {
    handleAIError(res, err);
  }
});

module.exports = router;
