// Spray Window Optimizer / Weather Impact Forecast — deep implementation.
// Given a chosen pesticide + field + 48h weather, computes a spray-go/no-go
// score driven by wind, humidity, temperature inversion risk, rain-fastness window,
// Delta-T (evaporation/droplet drift physics), bee-foraging risk, and PHI residency.
//
// Endpoints:
//   POST /api/gap-ai-weather-impact-forecast/window
//   GET  /api/gap-ai-weather-impact-forecast/pesticides
//   GET  /api/gap-ai-weather-impact-forecast/recent-events

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const pool = require('../db');

router.use(verifyToken);

// Spray-quality lookup. Wind speed in km/h. Delta-T = Tdry - Twet.
const WIND_SCORE = (kmh) => {
  if (kmh < 3) return { score: 30, note: 'Calm winds — temperature inversion risk; droplets may not settle.' };
  if (kmh <= 10) return { score: 95, note: 'Ideal spray winds (3-10 km/h).' };
  if (kmh <= 15) return { score: 75, note: 'Acceptable; consider larger droplet nozzles.' };
  if (kmh <= 20) return { score: 50, note: 'Marginal; use coarse-spray nozzles, extend buffer zones.' };
  return { score: 10, note: 'Drift hazard — DO NOT SPRAY.' };
};

const HUMIDITY_TEMP_SCORE = (tempC, humidPct) => {
  // Approximate wet-bulb via Stull (2011) simplified
  const tw = tempC * Math.atan(0.151977 * Math.sqrt(humidPct + 8.313659)) +
             Math.atan(tempC + humidPct) - Math.atan(humidPct - 1.676331) +
             0.00391838 * Math.pow(humidPct, 1.5) * Math.atan(0.023101 * humidPct) - 4.686035;
  const deltaT = tempC - tw;
  if (deltaT < 2) return { score: 60, deltaT: +deltaT.toFixed(2), note: 'Low Delta-T — slow evaporation; OK but watch for run-off.' };
  if (deltaT <= 8) return { score: 95, deltaT: +deltaT.toFixed(2), note: 'Optimal Delta-T (2-8°C) per Australian / US spray-quality guidelines.' };
  if (deltaT <= 12) return { score: 60, deltaT: +deltaT.toFixed(2), note: 'High Delta-T — fine droplets evaporate fast; increase pressure or use AI nozzles.' };
  return { score: 20, deltaT: +deltaT.toFixed(2), note: 'Critical Delta-T (>12°C) — heavy evaporation, poor coverage.' };
};

const TEMP_SCORE = (t) => {
  if (t < 5) return { score: 40, note: 'Cold — many products require >10°C for activity.' };
  if (t <= 28) return { score: 95, note: 'Within label temperature window.' };
  if (t <= 32) return { score: 65, note: 'Heat stress — risk of phytotoxicity, volatilization (dicamba, 2,4-D).' };
  return { score: 20, note: 'Too hot — high volatilization risk; consider night/early morning.' };
};

const RAIN_SCORE = (forecastNext48h, rainFastnessHr) => {
  // forecast string heuristic; in real world parse hourly QPF
  const t = (forecastNext48h || '').toLowerCase();
  if (/(heavy rain|storm|thunderstorm)/.test(t)) return { score: 5, note: 'Heavy precipitation imminent — wash-off certain.' };
  if (/rain|shower/.test(t) && rainFastnessHr > 12) return { score: 25, note: `Product needs ${rainFastnessHr}h rain-fast window; current forecast not safe.` };
  if (/rain|shower/.test(t)) return { score: 60, note: `Product is rain-fast in ${rainFastnessHr}h — light shower acceptable.` };
  return { score: 95, note: 'No rain expected — ideal.' };
};

const POLLINATOR_RISK = (pesticide, hourOfDay) => {
  if (!pesticide.pollinator_warning) return { score: 95, note: 'No bee-toxicity warning on label.' };
  if (hourOfDay >= 5 && hourOfDay <= 9) return { score: 30, note: 'EARLY MORNING — peak foraging risk for honeybees.' };
  if (hourOfDay >= 19 || hourOfDay <= 4) return { score: 90, note: 'Evening/night — bees in hives; preferred for bee-toxic products.' };
  if (hourOfDay >= 10 && hourOfDay <= 16) return { score: 45, note: 'Daytime — high foraging activity; notify nearby apiaries 48h ahead per Sec 18.' };
  return { score: 70, note: 'Marginal — pre-dawn/dusk transition.' };
};

function gradeFromScore(s) {
  if (s >= 85) return 'GO';
  if (s >= 65) return 'CAUTION';
  if (s >= 40) return 'HOLD';
  return 'NO-GO';
}

async function callAI(systemPrompt, userPrompt) {
  if (!process.env.OPENROUTER_API_KEY) return null;
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'AgriSense Spray Window' },
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

router.post('/window', async (req, res) => {
  try {
    const { field_id, pesticide_id = null, active_ingredient = null, hour_of_day = new Date().getHours() } = req.body || {};

    if (!field_id) return res.status(400).json({ error: 'field_id required' });

    // Pull field + latest weather
    const fRes = await pool.query('SELECT * FROM fields WHERE id = $1', [field_id]);
    const field = fRes.rows[0];
    if (!field) return res.status(404).json({ error: 'Field not found' });

    const wRes = await pool.query(
      'SELECT * FROM weather_data WHERE location = $1 ORDER BY recorded_at DESC LIMIT 1',
      [field.location]
    );
    const weather = wRes.rows[0] || { temp_celsius: 22, humidity_pct: 65, wind_speed_kmh: 8, forecast_next_48h: 'mild' };

    // Pull pesticide
    let pesticide = null;
    if (pesticide_id) {
      const pRes = await pool.query('SELECT * FROM pesticide_registry WHERE id = $1', [pesticide_id]);
      pesticide = pRes.rows[0];
    } else if (active_ingredient) {
      const pRes = await pool.query('SELECT * FROM pesticide_registry WHERE active_ingredient ILIKE $1 LIMIT 1', [active_ingredient]);
      pesticide = pRes.rows[0];
    }
    if (!pesticide) pesticide = { active_ingredient: 'Generic', trade_name: '', pre_harvest_interval_days: 7, re_entry_interval_hours: 12, pollinator_warning: false, irac_moa_group: 'n/a' };

    // Rain-fastness defaults by chemical class
    let rainFastnessHr = 4;
    const cls = (pesticide.chemical_class || '').toLowerCase();
    if (cls.includes('pyrethroid')) rainFastnessHr = 2;
    if (cls.includes('microbial')) rainFastnessHr = 24;
    if (cls.includes('neonicotinoid')) rainFastnessHr = 6;
    if ((pesticide.active_ingredient || '').toLowerCase().includes('glyphosate')) rainFastnessHr = 6;

    const wind = WIND_SCORE(Number(weather.wind_speed_kmh));
    const ht = HUMIDITY_TEMP_SCORE(Number(weather.temp_celsius), Number(weather.humidity_pct));
    const t = TEMP_SCORE(Number(weather.temp_celsius));
    const rn = RAIN_SCORE(weather.forecast_next_48h, rainFastnessHr);
    const pol = POLLINATOR_RISK(pesticide, hour_of_day);

    // Weighted aggregate
    const composite = Math.round(
      wind.score * 0.30 +
      ht.score   * 0.20 +
      t.score    * 0.15 +
      rn.score   * 0.20 +
      pol.score  * 0.15
    );
    const grade = gradeFromScore(composite);

    // Buffer zone (m) per wind & toxicity
    const baseBuffer = (pesticide.pollinator_warning || pesticide.toxicity_class === 'I' || pesticide.toxicity_class === 'II') ? 30 : 15;
    const wf = Number(weather.wind_speed_kmh);
    const bufferM = Math.round(baseBuffer * Math.max(1, wf / 8));

    // Best alternative window suggestion
    let altSuggestion = null;
    if (composite < 65) {
      if (pol.score < 50) altSuggestion = 'Shift to 7-9 PM (post-foraging) tonight.';
      else if (wind.score < 50) altSuggestion = 'Wait until wind drops below 15 km/h — typically dawn or dusk.';
      else if (rn.score < 50) altSuggestion = `Postpone until after the storm clears + 24h drying period.`;
      else altSuggestion = 'Re-check in 6 hours.';
    }

    const findings = [
      `Wind ${weather.wind_speed_kmh} km/h: ${wind.note}`,
      `Temperature ${weather.temp_celsius}°C / RH ${weather.humidity_pct}%: ${ht.note} (Delta-T=${ht.deltaT}°C)`,
      `Temperature absolute: ${t.note}`,
      `Forecast / rain: ${rn.note}`,
      `Pollinator (${pesticide.pollinator_warning ? 'WARNING product' : 'standard'}): ${pol.note}`,
      `PHI: ${pesticide.pre_harvest_interval_days || '?'} days; REI: ${pesticide.re_entry_interval_hours || '?'} hours`,
      `Recommended buffer zone: ${bufferM} m downwind`
    ];

    let llmNarrative = null;
    if (process.env.OPENROUTER_API_KEY) {
      const sys = 'You are an agronomy spray-application advisor. Given a spray-window analysis, write a 2-3 sentence summary an applicator could read on a tablet before climbing into a sprayer cab.';
      const usr = `Field: ${field.name} (${field.crop_type}, ${field.hectares} ha)\nProduct: ${pesticide.trade_name || pesticide.active_ingredient} (IRAC ${pesticide.irac_moa_group})\nComposite score: ${composite} (${grade})\nKey findings:\n${findings.join('\n')}`;
      llmNarrative = await callAI(sys, usr);
    }

    res.json({
      field: { id: field.id, name: field.name, crop_type: field.crop_type, hectares: field.hectares, location: field.location },
      pesticide: { id: pesticide.id || null, active_ingredient: pesticide.active_ingredient, trade_name: pesticide.trade_name, irac_moa_group: pesticide.irac_moa_group, pollinator_warning: pesticide.pollinator_warning },
      weather,
      scores: { wind: wind.score, humidity_temp: ht.score, temperature: t.score, rain: rn.score, pollinator: pol.score, composite },
      grade,
      buffer_zone_m: bufferM,
      delta_t_c: ht.deltaT,
      alt_suggestion: altSuggestion,
      findings,
      llm_narrative: llmNarrative,
      llm_used: !!llmNarrative
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pesticides', async (_req, res) => {
  try {
    const r = await pool.query(
      'SELECT id, active_ingredient, trade_name, irac_moa_group, chemical_class, pollinator_warning, organic_approved FROM pesticide_registry ORDER BY active_ingredient'
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/recent-events', async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT se.*, f.name AS field_name FROM spray_events se LEFT JOIN fields f ON f.id = se.field_id ORDER BY se.applied_at DESC LIMIT 50`
    );
    res.json(r.rows);
  } catch (err) { res.json([]); }
});

module.exports = router;
