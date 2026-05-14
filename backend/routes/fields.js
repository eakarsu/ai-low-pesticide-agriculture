const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fields ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fields WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, location, crop_type, hectares, status, soil_type, last_scan_at, health_score } = req.body;
    const result = await pool.query(
      'INSERT INTO fields (name, location, crop_type, hectares, status, soil_type, last_scan_at, health_score) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [name, location, crop_type, hectares, status, soil_type, last_scan_at, health_score]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, location, crop_type, hectares, status, soil_type, last_scan_at, health_score } = req.body;
    const result = await pool.query(
      'UPDATE fields SET name=$1, location=$2, crop_type=$3, hectares=$4, status=$5, soil_type=$6, last_scan_at=$7, health_score=$8 WHERE id=$9 RETURNING *',
      [name, location, crop_type, hectares, status, soil_type, last_scan_at, health_score, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM fields WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
