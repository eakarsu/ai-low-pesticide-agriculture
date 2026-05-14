const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const pool = require('../db');

router.use(verifyToken);

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function rowsToCsv(rows, columns) {
  const header = columns.join(',');
  const body = rows.map(r => columns.map(c => csvEscape(r[c])).join(',')).join('\n');
  return header + '\n' + body + (body ? '\n' : '');
}

// 6. CSV export of fields (the main entity)
router.get('/export/fields.csv', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fields ORDER BY id ASC');
    const cols = ['id', 'name', 'location', 'crop_type', 'hectares', 'status', 'soil_type', 'last_scan_at', 'health_score', 'created_at'];
    const csv = rowsToCsv(result.rows, cols);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="fields.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Global search + filter — searches across fields, detections, treatments, health_reports, sensors
router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const type = String(req.query.type || 'all');
    const status = String(req.query.status || '');
    if (!q && !status) {
      return res.json({ results: [], total: 0 });
    }
    const like = `%${q}%`;
    const out = [];

    if (type === 'all' || type === 'fields') {
      const params = [like];
      let sql = `SELECT id, name, location, crop_type, status, health_score
                 FROM fields
                 WHERE ($1 = '%%' OR name ILIKE $1 OR location ILIKE $1 OR crop_type ILIKE $1 OR soil_type ILIKE $1)`;
      if (status) { sql += ` AND status = $2`; params.push(status); }
      sql += ' ORDER BY id DESC LIMIT 25';
      const r = await pool.query(sql, params);
      r.rows.forEach(row => out.push({ entity: 'field', id: row.id, label: row.name, sub: `${row.crop_type || ''} - ${row.location || ''}`, status: row.status, score: row.health_score }));
    }

    if (type === 'all' || type === 'detections') {
      const r = await pool.query(
        `SELECT id, field_id, pest_name, severity, location_in_field, treated, detected_at
         FROM detections
         WHERE pest_name ILIKE $1 OR location_in_field ILIKE $1 OR COALESCE(notes,'') ILIKE $1
         ORDER BY detected_at DESC LIMIT 25`,
        [like]
      );
      r.rows.forEach(row => out.push({ entity: 'detection', id: row.id, label: row.pest_name, sub: `field #${row.field_id} - ${row.severity || ''} ${row.treated ? '(treated)' : ''}`, status: row.severity, score: null, when: row.detected_at }));
    }

    if (type === 'all' || type === 'treatments') {
      const r = await pool.query(
        `SELECT id, field_id, treatment_type, chemical_name, status, scheduled_date
         FROM treatments
         WHERE treatment_type ILIKE $1 OR chemical_name ILIKE $1 OR COALESCE(notes,'') ILIKE $1
         ORDER BY scheduled_date DESC NULLS LAST LIMIT 25`,
        [like]
      );
      r.rows.forEach(row => out.push({ entity: 'treatment', id: row.id, label: row.chemical_name || row.treatment_type, sub: `field #${row.field_id} - ${row.treatment_type || ''}`, status: row.status, score: null, when: row.scheduled_date }));
    }

    if (type === 'all' || type === 'health_reports') {
      const r = await pool.query(
        `SELECT id, field_id, report_date, health_score, reporter
         FROM health_reports
         WHERE COALESCE(notes,'') ILIKE $1 OR COALESCE(reporter,'') ILIKE $1
         ORDER BY report_date DESC LIMIT 25`,
        [like]
      );
      r.rows.forEach(row => out.push({ entity: 'health_report', id: row.id, label: `Report ${row.report_date}`, sub: `field #${row.field_id} - ${row.reporter || ''}`, status: null, score: row.health_score, when: row.report_date }));
    }

    if (type === 'all' || type === 'sensors') {
      const r = await pool.query(
        `SELECT id, field_id, device_type, model, status, location_description
         FROM sensors
         WHERE device_type ILIKE $1 OR model ILIKE $1 OR location_description ILIKE $1`,
        [like]
      );
      r.rows.forEach(row => out.push({ entity: 'sensor', id: row.id, label: row.model || row.device_type, sub: `field #${row.field_id} - ${row.location_description || ''}`, status: row.status, score: null }));
    }

    res.json({ results: out, total: out.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Activity feed / audit log — read-only aggregation across existing tables
router.get('/activity', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const events = [];

    const fields = await pool.query('SELECT id, name, created_at FROM fields ORDER BY created_at DESC NULLS LAST LIMIT $1', [limit]);
    fields.rows.forEach(r => events.push({
      type: 'field_created',
      icon: 'field',
      title: `Field "${r.name}" created`,
      entity_id: r.id,
      timestamp: r.created_at,
    }));

    const detections = await pool.query('SELECT id, field_id, pest_name, severity, treated, detected_at FROM detections ORDER BY detected_at DESC NULLS LAST LIMIT $1', [limit]);
    detections.rows.forEach(r => events.push({
      type: r.treated ? 'detection_treated' : 'detection_open',
      icon: 'pest',
      title: `${r.pest_name} detected (severity: ${r.severity || 'n/a'})${r.treated ? ' - treated' : ''}`,
      entity_id: r.id,
      field_id: r.field_id,
      timestamp: r.detected_at,
    }));

    const treatments = await pool.query("SELECT id, field_id, chemical_name, treatment_type, status, scheduled_date, completed_date FROM treatments ORDER BY COALESCE(completed_date, scheduled_date) DESC NULLS LAST LIMIT $1", [limit]);
    treatments.rows.forEach(r => events.push({
      type: r.status === 'completed' ? 'treatment_completed' : 'treatment_scheduled',
      icon: 'flask',
      title: `${r.treatment_type || 'Treatment'} ${r.chemical_name ? `(${r.chemical_name}) ` : ''}${r.status}`,
      entity_id: r.id,
      field_id: r.field_id,
      timestamp: r.completed_date || r.scheduled_date,
    }));

    const reports = await pool.query('SELECT id, field_id, report_date, health_score, reporter FROM health_reports ORDER BY report_date DESC NULLS LAST LIMIT $1', [limit]);
    reports.rows.forEach(r => events.push({
      type: 'health_report',
      icon: 'report',
      title: `Health report (score ${r.health_score ?? 'n/a'})${r.reporter ? ` by ${r.reporter}` : ''}`,
      entity_id: r.id,
      field_id: r.field_id,
      timestamp: r.report_date,
    }));

    events.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });

    res.json({ events: events.slice(0, limit), total: events.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
