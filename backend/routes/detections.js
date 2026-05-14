const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, f.name as field_name, f.crop_type
      FROM detections d
      LEFT JOIN fields f ON d.field_id = f.id
      ORDER BY d.detected_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, f.name as field_name, f.crop_type
      FROM detections d
      LEFT JOIN fields f ON d.field_id = f.id
      WHERE d.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { field_id, pest_name, confidence, severity, location_in_field, treated, treatment_applied, detected_at, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO detections (field_id, pest_name, confidence, severity, location_in_field, treated, treatment_applied, detected_at, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [field_id, pest_name, confidence, severity, location_in_field, treated, treatment_applied, detected_at, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { field_id, pest_name, confidence, severity, location_in_field, treated, treatment_applied, detected_at, notes } = req.body;
    const result = await pool.query(
      'UPDATE detections SET field_id=$1, pest_name=$2, confidence=$3, severity=$4, location_in_field=$5, treated=$6, treatment_applied=$7, detected_at=$8, notes=$9 WHERE id=$10 RETURNING *',
      [field_id, pest_name, confidence, severity, location_in_field, treated, treatment_applied, detected_at, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM detections WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
