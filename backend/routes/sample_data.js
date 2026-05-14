const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// --- Domain-realistic sample data generators ---

const FIELD_SAMPLES = [
  { name: 'North Orchard A', location: 'Salinas Valley, CA', crop_type: 'Strawberry', hectares: 12.4, status: 'active', soil_type: 'Sandy Loam', health_score: 82 },
  { name: 'East Vineyard B', location: 'Napa County, CA', crop_type: 'Wine Grape (Cabernet)', hectares: 8.7, status: 'active', soil_type: 'Clay Loam', health_score: 78 },
  { name: 'South Plot 12', location: 'Yolo County, CA', crop_type: 'Processing Tomato', hectares: 24.3, status: 'active', soil_type: 'Silty Clay', health_score: 71 },
  { name: 'West Field 7', location: 'Imperial Valley, CA', crop_type: 'Lettuce (Romaine)', hectares: 16.8, status: 'active', soil_type: 'Silt Loam', health_score: 88 },
  { name: 'Hillside Block C', location: 'Sonoma County, CA', crop_type: 'Apple (Gala)', hectares: 5.2, status: 'fallow', soil_type: 'Loam', health_score: 65 },
  { name: 'River Bottom 3', location: 'Sacramento Delta, CA', crop_type: 'Almond', hectares: 32.1, status: 'active', soil_type: 'Sandy Loam', health_score: 84 },
  { name: 'Greenhouse East', location: 'Watsonville, CA', crop_type: 'Bell Pepper', hectares: 2.1, status: 'active', soil_type: 'Compost Mix', health_score: 91 },
  { name: 'Cover-Crop Plot 9', location: 'Modesto, CA', crop_type: 'Walnut', hectares: 18.6, status: 'active', soil_type: 'Clay', health_score: 76 },
];

const PEST_SAMPLES = [
  { pest_name: 'Spotted Wing Drosophila', severity: 'moderate', location_in_field: 'NE quadrant rows 3-5', confidence: 0.91 },
  { pest_name: 'Two-Spotted Spider Mite', severity: 'low', location_in_field: 'south edge', confidence: 0.84 },
  { pest_name: 'Codling Moth', severity: 'high', location_in_field: 'block C trees 12-18', confidence: 0.96 },
  { pest_name: 'Western Flower Thrips', severity: 'moderate', location_in_field: 'greenhouse bay 2', confidence: 0.79 },
  { pest_name: 'Cabbage Looper', severity: 'low', location_in_field: 'rows 8-10', confidence: 0.72 },
  { pest_name: 'Aphid (Green Peach)', severity: 'moderate', location_in_field: 'border row', confidence: 0.88 },
  { pest_name: 'Navel Orangeworm', severity: 'high', location_in_field: 'orchard center', confidence: 0.93 },
  { pest_name: 'Lygus Bug', severity: 'moderate', location_in_field: 'west buffer strip', confidence: 0.81 },
  { pest_name: 'Beet Armyworm', severity: 'low', location_in_field: 'field NW corner', confidence: 0.69 },
  { pest_name: 'Powdery Mildew (disease)', severity: 'moderate', location_in_field: 'shaded canopy', confidence: 0.86 },
];

const TREATMENT_SAMPLES = [
  { treatment_type: 'Pheromone Mating Disruption', chemical_name: 'Isomate-CM (codling moth)', dosage_ml_per_ha: 0, chemical_savings_pct: 100, notes: 'IPM: pheromone dispensers, no spray needed' },
  { treatment_type: 'Biological Control', chemical_name: 'Phytoseiulus persimilis (predator mite)', dosage_ml_per_ha: 0, chemical_savings_pct: 100, notes: 'IPM: release of beneficial mites' },
  { treatment_type: 'Soft Pesticide', chemical_name: 'Spinosad (OMRI)', dosage_ml_per_ha: 350, chemical_savings_pct: 60, notes: 'Reduced-risk, applied at dusk to protect bees' },
  { treatment_type: 'Botanical', chemical_name: 'Neem oil (Azadirachtin)', dosage_ml_per_ha: 1200, chemical_savings_pct: 70, notes: 'Organic-approved, 7-day reapply if needed' },
  { treatment_type: 'Microbial', chemical_name: 'Bacillus thuringiensis (Bt kurstaki)', dosage_ml_per_ha: 500, chemical_savings_pct: 80, notes: 'Lepidoptera-specific, non-toxic to beneficials' },
  { treatment_type: 'Spot Spray (precision)', chemical_name: 'Sulfoxaflor', dosage_ml_per_ha: 150, chemical_savings_pct: 75, notes: 'Drone-applied, 30% area coverage only' },
  { treatment_type: 'Cultural', chemical_name: 'None — sanitation pruning', dosage_ml_per_ha: 0, chemical_savings_pct: 100, notes: 'Removed mummies and infested shoots' },
  { treatment_type: 'Mineral', chemical_name: 'Kaolin clay (Surround WP)', dosage_ml_per_ha: 2500, chemical_savings_pct: 65, notes: 'Particle film, deters egg-laying' },
  { treatment_type: 'Soft Pesticide', chemical_name: 'Insecticidal soap (potassium salts)', dosage_ml_per_ha: 800, chemical_savings_pct: 85, notes: 'Contact only, safe for harvest' },
];

const HEALTH_SAMPLES = [
  { health_score: 88, ndvi_index: 0.82, yield_estimate_kg_ha: 4200, notes: 'Canopy uniform, good color', reporter: 'Field scout J. Ramirez' },
  { health_score: 74, ndvi_index: 0.71, yield_estimate_kg_ha: 3650, notes: 'Some chlorosis on east edge', reporter: 'Agronomist K. Patel' },
  { health_score: 81, ndvi_index: 0.78, yield_estimate_kg_ha: 4100, notes: 'Recovering after irrigation fix', reporter: 'Drone scan auto-report' },
  { health_score: 92, ndvi_index: 0.86, yield_estimate_kg_ha: 4850, notes: 'Excellent flowering density', reporter: 'Field scout J. Ramirez' },
  { health_score: 67, ndvi_index: 0.62, yield_estimate_kg_ha: 2900, notes: 'Drought stress visible', reporter: 'Agronomist K. Patel' },
  { health_score: 79, ndvi_index: 0.74, yield_estimate_kg_ha: 3800, notes: 'Pest pressure managed via IPM', reporter: 'IPM consultant M. Chen' },
  { health_score: 85, ndvi_index: 0.80, yield_estimate_kg_ha: 4350, notes: 'Cover crop incorporated successfully', reporter: 'Field scout J. Ramirez' },
];

const SENSOR_SAMPLES = [
  { device_type: 'Soil Moisture Probe', model: 'Sentek Drill&Drop 60cm', battery_level: 87, status: 'online', location_description: 'Row 5 mid-field', readings_today: 144 },
  { device_type: 'Weather Station', model: 'Davis Vantage Pro2', battery_level: 92, status: 'online', location_description: 'NW corner mast', readings_today: 96 },
  { device_type: 'Pest Trap Camera', model: 'Trapview AI v3', battery_level: 64, status: 'online', location_description: 'Block C orchard center', readings_today: 24 },
  { device_type: 'Leaf Wetness Sensor', model: 'METER PHYTOS 31', battery_level: 73, status: 'online', location_description: 'Canopy mid-row 12', readings_today: 288 },
  { device_type: 'NDVI Drone', model: 'DJI Mavic 3 Multispectral', battery_level: 100, status: 'online', location_description: 'Hangar (charging)', readings_today: 0 },
  { device_type: 'Soil EC Probe', model: 'Teralytic NPK Pro', battery_level: 58, status: 'online', location_description: 'South plot 12 zone B', readings_today: 12 },
  { device_type: 'Wind Speed Anemometer', model: 'Onset HOBO RX3000', battery_level: 41, status: 'low_battery', location_description: 'East ridge tower', readings_today: 96 },
  { device_type: 'Pheromone Trap (smart)', model: 'Semios SP1', battery_level: 89, status: 'online', location_description: 'Almond block edge', readings_today: 8 },
];

const WEATHER_SAMPLES = [
  { location: 'Salinas Valley, CA', temp_celsius: 18.4, humidity_pct: 72, wind_speed_kmh: 12.3, rainfall_mm: 0.0, pest_risk_index: 35, forecast_next_48h: 'Mild marine layer, low spray drift risk' },
  { location: 'Napa County, CA', temp_celsius: 24.1, humidity_pct: 58, wind_speed_kmh: 8.7, rainfall_mm: 0.0, pest_risk_index: 52, forecast_next_48h: 'Warm dry spell — powdery mildew watch' },
  { location: 'Yolo County, CA', temp_celsius: 28.6, humidity_pct: 45, wind_speed_kmh: 15.2, rainfall_mm: 0.0, pest_risk_index: 68, forecast_next_48h: 'Hot — high lygus pressure expected' },
  { location: 'Imperial Valley, CA', temp_celsius: 32.3, humidity_pct: 30, wind_speed_kmh: 18.4, rainfall_mm: 0.0, pest_risk_index: 71, forecast_next_48h: 'Hot, windy — postpone spraying' },
  { location: 'Sonoma County, CA', temp_celsius: 21.7, humidity_pct: 64, wind_speed_kmh: 6.1, rainfall_mm: 2.4, pest_risk_index: 48, forecast_next_48h: 'Light showers — fungal risk rising' },
  { location: 'Sacramento Delta, CA', temp_celsius: 26.8, humidity_pct: 55, wind_speed_kmh: 11.0, rainfall_mm: 0.0, pest_risk_index: 60, forecast_next_48h: 'Calm mornings ideal for spray window' },
  { location: 'Watsonville, CA', temp_celsius: 17.9, humidity_pct: 80, wind_speed_kmh: 5.5, rainfall_mm: 0.6, pest_risk_index: 42, forecast_next_48h: 'Cool foggy — botrytis monitoring' },
  { location: 'Modesto, CA', temp_celsius: 30.2, humidity_pct: 38, wind_speed_kmh: 9.8, rainfall_mm: 0.0, pest_risk_index: 65, forecast_next_48h: 'Hot evenings — NOW flight peak' },
];

function pickN(arr, n) {
  // shuffle copy and take first n
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

async function getOrCreateFieldIds(client, minNeeded = 3) {
  const existing = await client.query('SELECT id FROM fields ORDER BY id DESC LIMIT 20');
  if (existing.rows.length >= minNeeded) return existing.rows.map(r => r.id);
  // seed a couple of fields so child entities have a target
  const ids = existing.rows.map(r => r.id);
  for (const f of FIELD_SAMPLES.slice(0, minNeeded)) {
    const r = await client.query(
      'INSERT INTO fields (name, location, crop_type, hectares, status, soil_type, health_score) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [f.name, f.location, f.crop_type, f.hectares, f.status, f.soil_type, f.health_score]
    );
    ids.push(r.rows[0].id);
  }
  return ids;
}

const ENTITIES = ['fields', 'detections', 'treatments', 'health_reports', 'sensors', 'weather_data'];

router.post('/sample-data/:entity', async (req, res) => {
  const entity = req.params.entity;
  if (!ENTITIES.includes(entity)) {
    return res.status(400).json({ error: `Unknown entity. Allowed: ${ENTITIES.join(', ')}` });
  }
  const client = await pool.connect();
  try {
    let inserted = 0;

    if (entity === 'fields') {
      const rows = pickN(FIELD_SAMPLES, 8);
      for (const f of rows) {
        const r = await client.query(
          `INSERT INTO fields (name, location, crop_type, hectares, status, soil_type, last_scan_at, health_score)
           VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7) RETURNING id`,
          [f.name, f.location, f.crop_type, f.hectares, f.status, f.soil_type, f.health_score]
        );
        if (r.rows.length) inserted++;
      }
    } else if (entity === 'detections') {
      const fieldIds = await getOrCreateFieldIds(client);
      const rows = pickN(PEST_SAMPLES, 8);
      for (const d of rows) {
        const fid = fieldIds[Math.floor(Math.random() * fieldIds.length)];
        const r = await client.query(
          `INSERT INTO detections (field_id, pest_name, confidence, severity, location_in_field, treated, treatment_applied, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [fid, d.pest_name, d.confidence, d.severity, d.location_in_field, false, null, `Auto-detected via drone scan, ${d.severity} severity`]
        );
        if (r.rows.length) inserted++;
      }
    } else if (entity === 'treatments') {
      const fieldIds = await getOrCreateFieldIds(client);
      const rows = pickN(TREATMENT_SAMPLES, 8);
      const today = new Date();
      for (const t of rows) {
        const fid = fieldIds[Math.floor(Math.random() * fieldIds.length)];
        const scheduled = new Date(today.getTime() + (Math.floor(Math.random() * 14) - 3) * 86400000);
        const r = await client.query(
          `INSERT INTO treatments (field_id, treatment_type, chemical_name, dosage_ml_per_ha, scheduled_date, completed_date, status, chemical_savings_pct, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [fid, t.treatment_type, t.chemical_name, t.dosage_ml_per_ha, scheduled.toISOString().slice(0,10), null, 'scheduled', t.chemical_savings_pct, t.notes]
        );
        if (r.rows.length) inserted++;
      }
    } else if (entity === 'health_reports') {
      const fieldIds = await getOrCreateFieldIds(client);
      const rows = pickN(HEALTH_SAMPLES, 7);
      const today = new Date();
      for (const h of rows) {
        const fid = fieldIds[Math.floor(Math.random() * fieldIds.length)];
        const reportDate = new Date(today.getTime() - Math.floor(Math.random() * 21) * 86400000);
        const r = await client.query(
          `INSERT INTO health_reports (field_id, report_date, health_score, ndvi_index, yield_estimate_kg_ha, notes, reporter)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [fid, reportDate.toISOString().slice(0,10), h.health_score, h.ndvi_index, h.yield_estimate_kg_ha, h.notes, h.reporter]
        );
        if (r.rows.length) inserted++;
      }
    } else if (entity === 'sensors') {
      const fieldIds = await getOrCreateFieldIds(client);
      const rows = pickN(SENSOR_SAMPLES, 8);
      for (const s of rows) {
        const fid = fieldIds[Math.floor(Math.random() * fieldIds.length)];
        const r = await client.query(
          `INSERT INTO sensors (field_id, device_type, model, battery_level, last_reading_at, status, location_description, readings_today)
           VALUES ($1,$2,$3,$4,NOW(),$5,$6,$7) RETURNING id`,
          [fid, s.device_type, s.model, s.battery_level, s.status, s.location_description, s.readings_today]
        );
        if (r.rows.length) inserted++;
      }
    } else if (entity === 'weather_data') {
      const rows = pickN(WEATHER_SAMPLES, 8);
      for (const w of rows) {
        const r = await client.query(
          `INSERT INTO weather_data (location, recorded_at, temp_celsius, humidity_pct, wind_speed_kmh, rainfall_mm, pest_risk_index, forecast_next_48h)
           VALUES ($1,NOW(),$2,$3,$4,$5,$6,$7) RETURNING id`,
          [w.location, w.temp_celsius, w.humidity_pct, w.wind_speed_kmh, w.rainfall_mm, w.pest_risk_index, w.forecast_next_48h]
        );
        if (r.rows.length) inserted++;
      }
    }

    res.json({ inserted, entity });
  } catch (err) {
    console.error('sample-data error', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get('/sample-data/_entities', (req, res) => {
  res.json({ entities: ENTITIES });
});

module.exports = router;
