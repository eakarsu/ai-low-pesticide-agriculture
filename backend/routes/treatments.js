const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require("../middleware/auth");

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, f.name as field_name, f.crop_type
      FROM treatments t
      LEFT JOIN fields f ON t.field_id = f.id
      ORDER BY t.scheduled_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, f.name as field_name, f.crop_type
      FROM treatments t
      LEFT JOIN fields f ON t.field_id = f.id
      WHERE t.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { field_id, treatment_type, chemical_name, dosage_ml_per_ha, scheduled_date, completed_date, status, chemical_savings_pct, notes } = req.body;
    const result = await pool.query(
      'INSERT INTO treatments (field_id, treatment_type, chemical_name, dosage_ml_per_ha, scheduled_date, completed_date, status, chemical_savings_pct, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [field_id, treatment_type, chemical_name, dosage_ml_per_ha, scheduled_date, completed_date, status, chemical_savings_pct, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { field_id, treatment_type, chemical_name, dosage_ml_per_ha, scheduled_date, completed_date, status, chemical_savings_pct, notes } = req.body;
    const result = await pool.query(
      'UPDATE treatments SET field_id=$1, treatment_type=$2, chemical_name=$3, dosage_ml_per_ha=$4, scheduled_date=$5, completed_date=$6, status=$7, chemical_savings_pct=$8, notes=$9 WHERE id=$10 RETURNING *',
      [field_id, treatment_type, chemical_name, dosage_ml_per_ha, scheduled_date, completed_date, status, chemical_savings_pct, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM treatments WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
