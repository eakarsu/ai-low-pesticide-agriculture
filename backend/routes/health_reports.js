const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT hr.*, f.name as field_name, f.crop_type
      FROM health_reports hr
      LEFT JOIN fields f ON hr.field_id = f.id
      ORDER BY hr.report_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT hr.*, f.name as field_name, f.crop_type
      FROM health_reports hr
      LEFT JOIN fields f ON hr.field_id = f.id
      WHERE hr.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { field_id, report_date, health_score, ndvi_index, yield_estimate_kg_ha, notes, reporter } = req.body;
    const result = await pool.query(
      'INSERT INTO health_reports (field_id, report_date, health_score, ndvi_index, yield_estimate_kg_ha, notes, reporter) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [field_id, report_date, health_score, ndvi_index, yield_estimate_kg_ha, notes, reporter]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { field_id, report_date, health_score, ndvi_index, yield_estimate_kg_ha, notes, reporter } = req.body;
    const result = await pool.query(
      'UPDATE health_reports SET field_id=$1, report_date=$2, health_score=$3, ndvi_index=$4, yield_estimate_kg_ha=$5, notes=$6, reporter=$7 WHERE id=$8 RETURNING *',
      [field_id, report_date, health_score, ndvi_index, yield_estimate_kg_ha, notes, reporter, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM health_reports WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
