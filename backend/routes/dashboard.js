const express = require('express');
const router = express.Router();
const verifyToken = require("../middleware/auth");
const pool = require('../db');

router.use(verifyToken);

// GET /api/dashboard/stats — KPI counts + recent activity for the home dashboard
router.get('/stats', async (req, res) => {
  try {
    // KPI counts
    const fieldsCount = await pool.query('SELECT COUNT(*)::int AS c FROM fields');
    const fieldsActive = await pool.query("SELECT COUNT(*)::int AS c FROM fields WHERE status = 'active'");
    const treatmentsActive = await pool.query(
      "SELECT COUNT(*)::int AS c FROM treatments WHERE status IN ('scheduled','in_progress')"
    );
    const detectionsRecent = await pool.query(
      "SELECT COUNT(*)::int AS c FROM detections WHERE detected_at >= NOW() - INTERVAL '7 days'"
    );
    const detectionsOpen = await pool.query(
      'SELECT COUNT(*)::int AS c FROM detections WHERE treated = FALSE'
    );
    const sensorsTotal = await pool.query('SELECT COUNT(*)::int AS c FROM sensors');
    const sensorsOnline = await pool.query("SELECT COUNT(*)::int AS c FROM sensors WHERE status = 'online'");
    const reportsCount = await pool.query('SELECT COUNT(*)::int AS c FROM health_reports');
    const avgHealth = await pool.query(
      'SELECT COALESCE(ROUND(AVG(health_score))::int, 0) AS avg FROM fields'
    );

    // Avg chemical reduction (treatments)
    const avgChemSavings = await pool.query(
      'SELECT COALESCE(ROUND(AVG(chemical_savings_pct))::int, 0) AS avg FROM treatments'
    );

    const counts = {
      fields_total: fieldsCount.rows[0].c,
      fields_active: fieldsActive.rows[0].c,
      treatments_active: treatmentsActive.rows[0].c,
      detections_recent_7d: detectionsRecent.rows[0].c,
      detections_open: detectionsOpen.rows[0].c,
      sensors_total: sensorsTotal.rows[0].c,
      sensors_online: sensorsOnline.rows[0].c,
      health_reports_total: reportsCount.rows[0].c,
      avg_field_health: avgHealth.rows[0].avg,
      avg_chemical_savings_pct: avgChemSavings.rows[0].avg,
    };

    // Recent activity — aggregate last events across detections, treatments, fields, health_reports
    const events = [];

    const detEvents = await pool.query(
      `SELECT d.id, d.field_id, d.pest_name, d.severity, d.treated, d.detected_at, f.name AS field_name
       FROM detections d
       LEFT JOIN fields f ON f.id = d.field_id
       ORDER BY d.detected_at DESC NULLS LAST
       LIMIT 8`
    );
    detEvents.rows.forEach((r) => events.push({
      type: r.treated ? 'detection_treated' : 'detection_open',
      icon: 'pest',
      title: `${r.pest_name} detected${r.field_name ? ` in ${r.field_name}` : ''}`,
      meta: `severity ${r.severity || 'n/a'}${r.treated ? ' - treated' : ''}`,
      timestamp: r.detected_at,
    }));

    const txEvents = await pool.query(
      `SELECT t.id, t.field_id, t.treatment_type, t.chemical_name, t.status,
              t.scheduled_date, t.completed_date, f.name AS field_name
       FROM treatments t
       LEFT JOIN fields f ON f.id = t.field_id
       ORDER BY COALESCE(t.completed_date, t.scheduled_date) DESC NULLS LAST
       LIMIT 8`
    );
    txEvents.rows.forEach((r) => events.push({
      type: r.status === 'completed' ? 'treatment_completed' : 'treatment_scheduled',
      icon: 'flask',
      title: `${r.treatment_type || 'Treatment'}${r.chemical_name ? ` (${r.chemical_name})` : ''} ${r.status}`,
      meta: r.field_name ? `field ${r.field_name}` : '',
      timestamp: r.completed_date || r.scheduled_date,
    }));

    const fieldEvents = await pool.query(
      'SELECT id, name, crop_type, created_at FROM fields ORDER BY created_at DESC NULLS LAST LIMIT 5'
    );
    fieldEvents.rows.forEach((r) => events.push({
      type: 'field_created',
      icon: 'field',
      title: `Field "${r.name}" added`,
      meta: r.crop_type || '',
      timestamp: r.created_at,
    }));

    const reportEvents = await pool.query(
      `SELECT r.id, r.field_id, r.report_date, r.health_score, r.reporter, f.name AS field_name
       FROM health_reports r
       LEFT JOIN fields f ON f.id = r.field_id
       ORDER BY r.report_date DESC NULLS LAST LIMIT 5`
    );
    reportEvents.rows.forEach((r) => events.push({
      type: 'health_report',
      icon: 'report',
      title: `Health report${r.field_name ? ` for ${r.field_name}` : ''} (score ${r.health_score ?? 'n/a'})`,
      meta: r.reporter ? `by ${r.reporter}` : '',
      timestamp: r.report_date,
    }));

    events.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });

    res.json({
      counts,
      recent_activity: events.slice(0, 10),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
