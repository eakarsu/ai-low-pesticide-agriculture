const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, f.name as field_name
      FROM sensors s
      LEFT JOIN fields f ON s.field_id = f.id
      ORDER BY s.last_reading_at DESC NULLS LAST
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, f.name as field_name
      FROM sensors s
      LEFT JOIN fields f ON s.field_id = f.id
      WHERE s.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { field_id, device_type, model, battery_level, last_reading_at, status, location_description, readings_today } = req.body;
    const result = await pool.query(
      'INSERT INTO sensors (field_id, device_type, model, battery_level, last_reading_at, status, location_description, readings_today) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [field_id, device_type, model, battery_level, last_reading_at, status, location_description, readings_today]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { field_id, device_type, model, battery_level, last_reading_at, status, location_description, readings_today } = req.body;
    const result = await pool.query(
      'UPDATE sensors SET field_id=$1, device_type=$2, model=$3, battery_level=$4, last_reading_at=$5, status=$6, location_description=$7, readings_today=$8 WHERE id=$9 RETURNING *',
      [field_id, device_type, model, battery_level, last_reading_at, status, location_description, readings_today, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sensors WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
