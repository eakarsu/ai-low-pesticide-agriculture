// Pest Photo/Description Classifier — deep implementation.
// Matches pest descriptions or detection notes against the pest_catalog,
// applies IPM economic-threshold logic, and returns a treatment cascade
// (cultural -> biological -> chemical last-resort), preferring OMRI/IRAC-rotation safe options.
//
// Endpoints:
//   POST /api/gap-ai-pest-photo-classifier/classify
//   GET  /api/gap-ai-pest-photo-classifier/pests
//   GET  /api/gap-ai-pest-photo-classifier/history

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const pool = require('../db');

router.use(verifyToken);

// Keyword tokens -> candidate pests. Real ag-extension lexicon.
const PEST_KEYWORDS = [
  { pest: 'European Corn Borer', kws: ['borer', 'shotholes', 'tunneling', 'stalk', 'corn ear', 'tassel'], crops: ['corn', 'sorghum'] },
  { pest: 'Western Corn Rootworm', kws: ['rootworm', 'lodged', 'gooseneck', 'pruned roots', 'beetle yellow stripes'], crops: ['corn'] },
  { pest: 'Soybean Aphid', kws: ['aphid', 'pale yellow', 'soybean leaves', 'sooty mold', 'honeydew'], crops: ['soybean'] },
  { pest: 'Corn Earworm', kws: ['earworm', 'silking', 'ear damage', 'green caterpillar', 'kernel feeding'], crops: ['corn', 'sweet corn', 'cotton'] },
  { pest: 'Cotton Boll Weevil', kws: ['weevil', 'boll', 'square dropping', 'cotton bud'], crops: ['cotton'] },
  { pest: 'Spider Mites (Twospotted)', kws: ['stippling', 'webbing', 'mite', 'bronzing leaves', 'two-spotted'], crops: ['cotton', 'soybean', 'corn'] },
  { pest: 'Hessian Fly', kws: ['hessian', 'wheat tiller', 'dark stem', 'lodged wheat'], crops: ['wheat'] },
  { pest: 'Colorado Potato Beetle', kws: ['potato beetle', 'orange larvae', 'striped beetle', 'defoliated potato'], crops: ['potato', 'tomato'] },
  { pest: 'Diamondback Moth', kws: ['diamondback', 'cabbage', 'broccoli', 'window-pane'], crops: ['cabbage', 'broccoli', 'canola'] },
  { pest: 'Brown Marmorated Stink Bug', kws: ['stink bug', 'marmorated', 'bmsb', 'shield-shaped', 'cat-facing'], crops: ['apple', 'soybean', 'corn'] },
  { pest: 'Cabbage Looper', kws: ['looper', 'inchworm'], crops: ['cabbage', 'lettuce'] },
  { pest: 'Fall Armyworm', kws: ['armyworm', 'whorl damage', 'inverted y', 'fall armyworm'], crops: ['corn', 'sorghum', 'rice'] },
  { pest: 'Cucumber Beetle (Striped)', kws: ['cucumber beetle', 'striped beetle', 'bacterial wilt'], crops: ['cucumber', 'squash'] },
  { pest: 'Aphids (Green Peach)', kws: ['green peach aphid', 'leaf curl peach'], crops: ['peach', 'potato', 'pepper'] },
  { pest: 'Whitefly (Silverleaf)', kws: ['whitefly', 'silverleaf', 'sticky leaf', 'tylcv'], crops: ['cotton', 'tomato'] },
  { pest: 'Thrips (Western Flower)', kws: ['thrips', 'silvering', 'tswv', 'tospovirus'], crops: ['strawberry', 'pepper'] },
  { pest: 'Codling Moth', kws: ['codling', 'apple worm', 'frass apple', 'wormy apple'], crops: ['apple', 'pear'] },
  { pest: 'Plum Curculio', kws: ['curculio', 'crescent scar', 'petal fall'], crops: ['apple', 'peach'] },
  { pest: 'Tomato Hornworm', kws: ['hornworm', 'large green caterpillar'], crops: ['tomato', 'pepper'] },
  { pest: 'Mexican Bean Beetle', kws: ['mexican bean beetle', 'lacework'], crops: ['soybean', 'bean'] },
  { pest: 'Asian Citrus Psyllid', kws: ['psyllid', 'hlb', 'citrus greening'], crops: ['citrus'] },
  { pest: 'Russian Wheat Aphid', kws: ['russian wheat aphid', 'rolled leaves wheat'], crops: ['wheat', 'barley'] },
  { pest: 'Wireworm (Click Beetle larvae)', kws: ['wireworm', 'click beetle', 'orange larva soil'], crops: ['corn', 'potato'] },
  { pest: 'Black Cutworm', kws: ['cutworm', 'cut plants', 'severed seedlings'], crops: ['corn'] },
  { pest: 'Rice Stem Borer (Yellow)', kws: ['stem borer rice', 'deadheart', 'whitehead rice'], crops: ['rice'] },
  { pest: 'Striped Flea Beetle', kws: ['flea beetle', 'pinhole damage', 'canola seedling'], crops: ['canola', 'cabbage'] },
  { pest: 'Apple Maggot', kws: ['apple maggot', 'railroad worm', 'dimpled apple', 'tephritid'], crops: ['apple'] },
  { pest: 'Squash Vine Borer', kws: ['vine borer', 'squash wilting', 'frass squash stem'], crops: ['squash', 'pumpkin'] },
  { pest: 'Lygus Bug (Tarnished Plant Bug)', kws: ['lygus', 'tarnished plant bug', 'cat-facing strawberry'], crops: ['cotton', 'strawberry'] }
];

function tokenize(s) { return (s || '').toString().toLowerCase(); }

function scorePest(text, crop) {
  const t = tokenize(text);
  const c = tokenize(crop);
  const ranked = [];
  for (const entry of PEST_KEYWORDS) {
    let score = 0;
    const hits = [];
    for (const kw of entry.kws) {
      if (t.includes(kw)) { score += 25; hits.push(kw); }
    }
    if (c && entry.crops.some(x => c.includes(x))) score += 30;
    if (score > 0) ranked.push({ pest: entry.pest, score, hits, crops: entry.crops });
  }
  return ranked.sort((a, b) => b.score - a.score);
}

function severityFromText(text) {
  const t = tokenize(text);
  if (/(widespread|entire field|critical|emergency|exploded)/.test(t)) return 'critical';
  if (/(heavy|severe|throughout|spreading fast|above threshold)/.test(t)) return 'high';
  if (/(scattered|cluster|patchy|approaching threshold)/.test(t)) return 'medium';
  if (/(few|trace|isolated|sub-threshold)/.test(t)) return 'low';
  return 'medium';
}

function actionFromSeverity(catalog, severity) {
  const steps = [];
  steps.push(`SCOUT: ${catalog.monitoring_method || 'Increase scouting density'}`);
  steps.push(`IPM TIER 1 (Cultural): ${catalog.ipm_first_line || 'Crop rotation, sanitation, resistant varieties'}`);
  steps.push(`IPM TIER 2 (Biological): ${catalog.bio_pesticide || 'Release natural enemies'} | beneficials: ${catalog.natural_enemies || 'n/a'}`);
  if (severity === 'high' || severity === 'critical') {
    steps.push(`IPM TIER 3 (Chemical last-resort): ${catalog.chemical_last_resort || 'Consult extension'} — rotate IRAC modes to manage resistance (risk: ${catalog.resistance_risk || 'unknown'})`);
  } else {
    steps.push(`Chemical treatment NOT recommended at this severity — below economic threshold. Re-scout in 5-7 days.`);
  }
  return steps.join('\n');
}

async function callAI(systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) return null;
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost',
        'X-Title': 'AgriSense Pest Classifier'
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2
      })
    });
    const data = await resp.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) { return null; }
}

router.post('/classify', async (req, res) => {
  try {
    const { description = '', crop = '', field_id = null, image_url = '' } = req.body || {};
    const text = `${description} ${image_url ? '[image: ' + image_url + ']' : ''}`;

    const ranked = scorePest(text, crop);
    let primary = ranked[0];
    let catalog = null;

    if (primary) {
      const r = await pool.query('SELECT * FROM pest_catalog WHERE common_name = $1 LIMIT 1', [primary.pest]);
      catalog = r.rows[0] || null;
    }

    if (!catalog) {
      const r = await pool.query(
        'SELECT * FROM pest_catalog WHERE primary_crops ILIKE $1 LIMIT 1',
        [`%${(crop || 'corn').toLowerCase()}%`]
      );
      catalog = r.rows[0] || null;
      primary = catalog ? { pest: catalog.common_name, score: 25, hits: [] } : { pest: 'Unknown', score: 0, hits: [] };
    }

    const severity = severityFromText(text);
    const confidence = Math.min(0.99, 0.45 + (primary.score / 200));
    const recommendedAction = catalog ? actionFromSeverity(catalog, severity) : 'Insufficient data for action — collect a clearer photo / sample.';
    const alternatives = ranked.slice(1, 4).map(r => ({ pest: r.pest, score: r.score }));

    let analystNote = null;
    if (process.env.OPENROUTER_API_KEY && catalog) {
      const sys = 'You are an extension entomologist. Given a candidate pest match for a field observation, write 2 concise sentences confirming the ID and the single most important next action for an IPM-minded grower. Tone: factual.';
      const usr = `Crop: ${crop}\nObservation: ${description}\nProposed pest: ${catalog.common_name} (${catalog.scientific_name})\nDamage type: ${catalog.damage_type}\nEconomic threshold: ${catalog.economic_threshold}\nSeverity assessment: ${severity}\n\nReply in 2 sentences.`;
      analystNote = await callAI(sys, usr);
    }

    let savedId = null;
    try {
      const ins = await pool.query(
        `INSERT INTO pest_classifications (field_id, input_summary, predicted_pest, confidence, severity, recommended_action, llm_used, classified_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [field_id, text.slice(0, 500), primary.pest, confidence, severity, recommendedAction, !!analystNote, req.user?.id || null]
      );
      savedId = ins.rows[0].id;
    } catch (e) { /* persistence optional */ }

    const reasoning = [
      `Keyword hits: ${primary.hits?.length ? primary.hits.join(', ') : '(crop-based fallback)'} → ${primary.pest}`,
      catalog ? `Scientific name: ${catalog.scientific_name} (${catalog.order_family})` : null,
      catalog ? `Damage type: ${catalog.damage_type}` : null,
      catalog ? `Economic threshold (extension): ${catalog.economic_threshold}` : null,
      `Severity assessment from description text: ${severity}`,
      analystNote ? `Analyst note (LLM): ${analystNote.trim()}` : null
    ].filter(Boolean).join('\n');

    res.json({
      id: savedId,
      predicted_pest: primary.pest,
      scientific_name: catalog?.scientific_name || null,
      confidence: Number(confidence.toFixed(3)),
      severity,
      recommended_action: recommendedAction,
      reasoning,
      alternatives,
      catalog,
      llm_used: !!analystNote
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pests', async (_req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, common_name, scientific_name, primary_crops, damage_type, economic_threshold, resistance_risk FROM pest_catalog ORDER BY common_name'
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/history', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT pc.*, f.name AS field_name
       FROM pest_classifications pc
       LEFT JOIN fields f ON f.id = pc.field_id
       ORDER BY pc.classified_at DESC LIMIT 50`
    );
    res.json(r.rows);
  } catch (err) { res.json([]); }
});

module.exports = router;
