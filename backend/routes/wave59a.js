const express = require('express');
const pool = require('../db');
const verifyToken = require('../middleware/auth');
const { filterFields, toCsv, EXPORT_COLUMNS, buildInsights } = require('../wave59a.cjs');
const router = express.Router();
router.use(verifyToken);
router.get('/fields/export', async (req,res)=>{ try{ const rows=(await pool.query('SELECT * FROM fields ORDER BY id ASC')).rows; const f=filterFields(rows, req.query||{}); const fmt=String(req.query.format||'json').toLowerCase(); if(fmt==='csv'){ res.setHeader('Content-Type','text/csv; charset=utf-8'); res.setHeader('Content-Disposition','attachment; filename="fields-export.csv"'); return res.send(toCsv(f, EXPORT_COLUMNS)); } return res.json({aiGenerated:false,count:f.length,items:f}); }catch(e){ res.status(500).json({error:e.message}); } });
for (const kind of ['field-health','pest-risk','treatment-plan']) router.post(`/ai/${kind}`, async (req,res)=>{ try{ const fields=(await pool.query('SELECT * FROM fields ORDER BY id DESC LIMIT 500')).rows; let dets=[]; try{ dets=(await pool.query('SELECT * FROM detections ORDER BY detected_at DESC LIMIT 500')).rows; }catch{} return res.json({ result: buildInsights(fields, dets, kind) }); }catch(e){ res.status(500).json({error:e.message}); } });
module.exports = router;
