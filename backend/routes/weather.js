const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM weather_data ORDER BY recorded_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM weather_data WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { location, recorded_at, temp_celsius, humidity_pct, wind_speed_kmh, rainfall_mm, pest_risk_index, forecast_next_48h } = req.body;
    const result = await pool.query(
      'INSERT INTO weather_data (location, recorded_at, temp_celsius, humidity_pct, wind_speed_kmh, rainfall_mm, pest_risk_index, forecast_next_48h) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [location, recorded_at, temp_celsius, humidity_pct, wind_speed_kmh, rainfall_mm, pest_risk_index, forecast_next_48h]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { location, recorded_at, temp_celsius, humidity_pct, wind_speed_kmh, rainfall_mm, pest_risk_index, forecast_next_48h } = req.body;
    const result = await pool.query(
      'UPDATE weather_data SET location=$1, recorded_at=$2, temp_celsius=$3, humidity_pct=$4, wind_speed_kmh=$5, rainfall_mm=$6, pest_risk_index=$7, forecast_next_48h=$8 WHERE id=$9 RETURNING *',
      [location, recorded_at, temp_celsius, humidity_pct, wind_speed_kmh, rainfall_mm, pest_risk_index, forecast_next_48h, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM weather_data WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
