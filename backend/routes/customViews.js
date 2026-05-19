const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');

// 1) VIZ: Pest-Pressure Field Heatmap (rows = fields, cols = pest types)
router.get('/pest-pressure-heatmap', verifyToken, async (req, res) => {
  try {
    const fields = [
      'North Valley', 'Sunridge A', 'East Basin', 'West Slope',
      'Delta Lowlands', 'Highland B', 'Southern Flats',
      'Ridge Line', 'Valley East', 'Coastal Plain'
    ];
    const pests = ['Aphid', 'Earworm', 'Borer', 'Mite', 'Weevil', 'Whitefly', 'Beetle'];
    const rows = fields.map((f, fi) => {
      const cells = pests.map((p, pi) => {
        const base = ((fi * 17 + pi * 11) % 100);
        const pressure = Math.min(100, Math.max(0, base + (pi === 4 && fi === 3 ? 25 : 0) - (fi % 4) * 6));
        const level = pressure > 75 ? 'critical' : pressure > 50 ? 'high' : pressure > 25 ? 'medium' : 'low';
        return { pest: p, pressure, level };
      });
      const fieldTotal = cells.reduce((a, c) => a + c.pressure, 0);
      return { field: f, cells, total: fieldTotal };
    });
    const flatVals = rows.flatMap(r => r.cells.map(c => c.pressure));
    res.json({
      unit: 'pressure_index_0_100',
      fields, pests, rows,
      summary: {
        peak: Math.max(...flatVals),
        average: Math.round(flatVals.reduce((a, b) => a + b, 0) / flatVals.length),
        hot_fields: rows.filter(r => r.cells.some(c => c.pressure > 75)).map(r => r.field),
        action_threshold: 60
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2) VIZ: Pesticide-Reduction Trend Chart (monthly application vs baseline)
router.get('/pesticide-reduction-trend', verifyToken, async (req, res) => {
  try {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const baselineKg = 540; // conventional baseline per month
    const series = months.map((m, i) => {
      const seasonal = i >= 4 && i <= 8 ? 1.25 : 0.85;
      const ipmReduction = 0.42 + (i * 0.018); // increasing IPM adoption
      const applied = Math.round(baselineKg * seasonal * (1 - ipmReduction));
      const baseline = Math.round(baselineKg * seasonal);
      const saved = baseline - applied;
      const reductionPct = Math.round((saved / baseline) * 100);
      return { month: m, applied_kg: applied, baseline_kg: baseline, saved_kg: saved, reduction_pct: reductionPct };
    });
    const totals = series.reduce((acc, s) => {
      acc.applied += s.applied_kg;
      acc.baseline += s.baseline_kg;
      acc.saved += s.saved_kg;
      return acc;
    }, { applied: 0, baseline: 0, saved: 0 });
    res.json({
      series,
      summary: {
        total_applied_kg: totals.applied,
        total_baseline_kg: totals.baseline,
        total_saved_kg: totals.saved,
        overall_reduction_pct: Math.round((totals.saved / totals.baseline) * 100),
        target_pct: 60,
        ytd_target_met: Math.round((totals.saved / totals.baseline) * 100) >= 60
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3) NON-VIZ: Spray Log CSV Export
router.get('/spray-log.csv', verifyToken, async (req, res) => {
  try {
    const rows = [
      ['date', 'field', 'crop', 'pest_target', 'product', 'rate_ml_ha', 'method', 'operator', 'weather', 'status'],
      ['2026-05-12', 'North Valley Farm', 'corn', 'Aphid', 'Imidacloprid', '150', 'targeted_spray', 'J.Park', 'clear,12C', 'completed'],
      ['2026-05-13', 'East Basin Field', 'soybean', 'Soybean Aphid', 'Neem Oil', '500', 'foliar_spray', 'M.Chen', 'overcast,18C', 'completed'],
      ['2026-05-13', 'Delta Lowlands', 'rice', 'Stem Borer', 'Chlorpyrifos (low-dose)', '300', 'banded', 'A.Singh', 'humid,24C', 'completed'],
      ['2026-05-14', 'Ridge Line Farm', 'corn', 'Corn Borer', 'Trichogramma release', '0', 'biocontrol', 'L.Vega', 'clear,16C', 'completed'],
      ['2026-05-15', 'Valley Floor East', 'wheat', 'Wheat Aphid', 'Parasitic wasp', '0', 'biocontrol', 'R.Iyer', 'clear,19C', 'completed'],
      ['2026-05-16', 'Coastal Plain', 'cotton', 'Whitefly', 'Spinosad', '180', 'foliar_spray', 'D.Oduya', 'breezy,22C', 'completed'],
      ['2026-05-17', 'West Slope Terrain', 'cotton', 'Boll Weevil', 'Deltamethrin', '350', 'emergency_spray', 'K.Mori', 'clear,21C', 'in_progress'],
      ['2026-05-18', 'Sunridge Plot A', 'wheat', 'Hessian Fly', 'Pheromone trap', '0', 'pheromone', 'J.Park', 'mild,15C', 'scheduled'],
      ['2026-05-19', 'Highland Plot B', 'corn', 'Rootworm', 'Tefluthrin', '200', 'soil_treatment', 'M.Chen', 'cool,11C', 'scheduled'],
      ['2026-05-20', 'Southern Flats', 'sorghum', 'Armyworm', 'Bt (organic)', '120', 'foliar_spray', 'A.Singh', 'clear,23C', 'scheduled'],
      ['2026-05-20', 'Prairie Plot C', 'soybean', 'Spider Mite', 'Predatory mites', '0', 'biocontrol', 'L.Vega', 'humid,20C', 'scheduled'],
      ['2026-05-21', 'Riverbend Farm', 'corn', 'Corn Earworm', 'Bacillus thuringiensis', '250', 'foliar_spray', 'R.Iyer', 'overcast,17C', 'scheduled']
    ];
    const csv = rows.map(r => r.map(v => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="spray_log.csv"');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4) NON-VIZ: Biocontrol Treatment Recipe Editor (CRUD, in-memory)
let recipeIdSeq = 6;
let recipes = [
  { id: 1, name: 'Trichogramma Wasp Release', target_pest: 'Corn Earworm', crop: 'corn', agent: 'Trichogramma brassicae', rate: '100k eggs/ha', frequency_days: 7, organic: true, notes: 'Release at silk emergence; avoid 24h before spray.' },
  { id: 2, name: 'Predatory Mite Inoculation', target_pest: 'Spider Mite', crop: 'soybean', agent: 'Phytoseiulus persimilis', rate: '20 mites/m2', frequency_days: 14, organic: true, notes: 'Distribute evenly along rows 40-55.' },
  { id: 3, name: 'Neem Oil Foliar', target_pest: 'Whitefly', crop: 'cotton', agent: 'Azadirachtin 1500ppm', rate: '500 ml/ha', frequency_days: 10, organic: true, notes: 'Apply at dusk to protect pollinators.' },
  { id: 4, name: 'Bt Biological Spray', target_pest: 'Corn Borer', crop: 'corn', agent: 'Bacillus thuringiensis kurstaki', rate: '250 g/ha', frequency_days: 7, organic: true, notes: 'Re-apply after rain >5mm.' },
  { id: 5, name: 'Parasitic Wasp (Aphid)', target_pest: 'Wheat Aphid', crop: 'wheat', agent: 'Aphidius colemani', rate: '500 wasps/ha', frequency_days: 14, organic: true, notes: 'Pair with sticky trap monitoring.' }
];

router.get('/biocontrol-recipes', verifyToken, (req, res) => {
  res.json({
    recipes,
    summary: {
      total: recipes.length,
      organic_count: recipes.filter(r => r.organic).length,
      pests_covered: [...new Set(recipes.map(r => r.target_pest))]
    }
  });
});

router.post('/biocontrol-recipes', verifyToken, (req, res) => {
  const { name, target_pest, crop, agent, rate, frequency_days, organic, notes } = req.body || {};
  if (!name || !target_pest || !agent) {
    return res.status(400).json({ error: 'name, target_pest, agent required' });
  }
  const next = {
    id: ++recipeIdSeq,
    name, target_pest,
    crop: crop || 'mixed',
    agent,
    rate: rate || '—',
    frequency_days: Number(frequency_days) || 7,
    organic: organic !== false,
    notes: notes || ''
  };
  recipes.push(next);
  res.json({ ok: true, recipe: next });
});

router.put('/biocontrol-recipes/:id', verifyToken, (req, res) => {
  const id = Number(req.params.id);
  const idx = recipes.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  recipes[idx] = { ...recipes[idx], ...req.body, id };
  res.json({ ok: true, recipe: recipes[idx] });
});

router.delete('/biocontrol-recipes/:id', verifyToken, (req, res) => {
  const id = Number(req.params.id);
  const before = recipes.length;
  recipes = recipes.filter(r => r.id !== id);
  res.json({ ok: true, removed: before - recipes.length });
});

module.exports = router;
