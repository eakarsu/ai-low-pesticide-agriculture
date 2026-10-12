const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = require("../middleware/auth");

async function authenticate(email, password) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) return null;
  const user = result.rows[0];
  if (!await bcrypt.compare(password, user.password_hash)) return null;
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, tenantId: process.env.DEFAULT_TENANT_ID }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '8h' });
  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

router.post('/login', async (req, res) => {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || !process.env.DEFAULT_TENANT_ID) return res.status(503).json({ error: 'Authentication is not configured' });
    const { email, password } = req.body;
    const session = await authenticate(email, password);
    if (!session) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/demo', async (_req, res) => {
  if (process.env.NODE_ENV === 'production' || !process.env.DEMO_EMAIL || !process.env.DEMO_PASSWORD) {
    return res.status(503).json({ error: 'Demo login is not configured for this session' });
  }
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || !process.env.DEFAULT_TENANT_ID) return res.status(503).json({ error: 'Authentication is not configured' });
    const session = await authenticate(process.env.DEMO_EMAIL, process.env.DEMO_PASSWORD);
    if (!session) return res.status(503).json({ error: 'Configured demo account is unavailable' });
    return res.json(session);
  } catch (_err) {
    return res.status(503).json({ error: 'Demo login is unavailable' });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
