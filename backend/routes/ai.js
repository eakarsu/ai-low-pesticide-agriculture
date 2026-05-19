const express = require('express');
const router = express.Router();
const verifyToken = require("../middleware/auth");
const pool = require('../db');

router.use(verifyToken);

async function callAI(userPrompt, systemPrompt = '') {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'AgriSense'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: userPrompt }
      ]
    })
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || 'AI unavailable';
}

router.post('/pest-analysis', async (req, res) => {
  try {
    const { field_id, detections } = req.body;
    let fieldInfo = '';
    if (field_id) {
      const fieldRes = await pool.query('SELECT * FROM fields WHERE id = $1', [field_id]);
      if (fieldRes.rows.length > 0) {
        const f = fieldRes.rows[0];
        fieldInfo = `Field: ${f.name}, Crop: ${f.crop_type}, Size: ${f.hectares} hectares, Soil: ${f.soil_type}, Health Score: ${f.health_score}`;
      }
    }
    const prompt = `Analyze pest detections for an agricultural field and provide targeted treatment recommendations.

${fieldInfo}

Pest Detections:
${JSON.stringify(detections || [], null, 2)}

Provide:
1. **Pest Pattern Analysis** - Identify patterns across detections
2. **Risk Assessment** - Severity and spread risk for each detected pest
3. **Targeted Treatment Recommendations** - Specific treatments for each pest type
4. **Chemical Minimization Strategy** - How to reduce pesticide use while maintaining effectiveness
5. **Monitoring Plan** - What to watch for in the next 2 weeks
6. **Estimated Chemical Savings** - Compared to blanket spraying approach`;

    const result = await callAI(prompt, 'You are an expert agronomist specializing in integrated pest management and low-pesticide agriculture. Provide specific, actionable recommendations.');
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/yield-prediction', async (req, res) => {
  try {
    const { field_id, health_data, weather_data } = req.body;
    let fieldInfo = '';
    if (field_id) {
      const fieldRes = await pool.query('SELECT * FROM fields WHERE id = $1', [field_id]);
      if (fieldRes.rows.length > 0) {
        const f = fieldRes.rows[0];
        fieldInfo = `Field: ${f.name}, Crop: ${f.crop_type}, Size: ${f.hectares} hectares, Health Score: ${f.health_score}`;
      }
    }
    const prompt = `Predict crop yield and identify risk factors for this agricultural field.

${fieldInfo}

Health Data:
${JSON.stringify(health_data || {}, null, 2)}

Weather Data:
${JSON.stringify(weather_data || {}, null, 2)}

Provide:
1. **Yield Prediction** - Expected yield in kg/hectare with confidence interval
2. **Key Risk Factors** - Top 3-5 factors affecting yield
3. **Positive Indicators** - Factors supporting good yield
4. **Weather Impact Analysis** - How current/forecast weather affects the crop
5. **Intervention Recommendations** - Actions to optimize yield
6. **Comparison to Typical Yields** - How this prediction compares to regional averages`;

    const result = await callAI(prompt, 'You are an expert crop scientist and data analyst specializing in precision agriculture yield prediction.');
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/treatment-plan', async (req, res) => {
  try {
    const { field_id, pest_detections } = req.body;
    let fieldInfo = '';
    if (field_id) {
      const fieldRes = await pool.query('SELECT * FROM fields WHERE id = $1', [field_id]);
      if (fieldRes.rows.length > 0) {
        const f = fieldRes.rows[0];
        fieldInfo = `Field: ${f.name}, Crop: ${f.crop_type}, Size: ${f.hectares} hectares, Soil: ${f.soil_type}`;
      }
    }
    const prompt = `Generate an optimized treatment plan that minimizes chemical usage while effectively controlling pests.

${fieldInfo}

Detected Pests:
${JSON.stringify(pest_detections || [], null, 2)}

Provide a comprehensive plan including:
1. **Prioritized Treatment Schedule** - Which pests to address first and when
2. **Biological Controls** - Natural predators or microbial solutions to deploy
3. **Targeted Chemical Application** - Only where absolutely necessary, with precise dosages
4. **Application Zones** - Specific field areas requiring treatment vs no treatment
5. **Alternative Methods** - Pheromone traps, physical barriers, crop rotation suggestions
6. **Chemical Reduction Metrics** - Expected % reduction vs conventional blanket spraying
7. **Follow-up Protocol** - Monitoring schedule and response triggers
8. **Cost Estimate** - Approximate cost comparison vs conventional treatment`;

    const result = await callAI(prompt, 'You are an integrated pest management specialist focused on sustainable, low-pesticide agriculture solutions. Always prioritize biological and mechanical controls over chemical treatments.');
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/field-summary', async (req, res) => {
  try {
    const { field_id } = req.body;
    let fieldData = {};
    if (field_id) {
      const [fieldRes, detectRes, treatRes, healthRes, sensorRes] = await Promise.all([
        pool.query('SELECT * FROM fields WHERE id = $1', [field_id]),
        pool.query('SELECT * FROM detections WHERE field_id = $1 ORDER BY detected_at DESC LIMIT 5', [field_id]),
        pool.query('SELECT * FROM treatments WHERE field_id = $1 ORDER BY scheduled_date DESC LIMIT 5', [field_id]),
        pool.query('SELECT * FROM health_reports WHERE field_id = $1 ORDER BY report_date DESC LIMIT 3', [field_id]),
        pool.query('SELECT * FROM sensors WHERE field_id = $1', [field_id])
      ]);
      fieldData = {
        field: fieldRes.rows[0],
        recentDetections: detectRes.rows,
        recentTreatments: treatRes.rows,
        healthHistory: healthRes.rows,
        sensors: sensorRes.rows
      };
    }
    const prompt = `Generate a comprehensive field status report for agricultural management.

Field Data:
${JSON.stringify(fieldData, null, 2)}

Provide a complete report including:
1. **Executive Summary** - Field status at a glance
2. **Crop Health Assessment** - Current health score interpretation and trend
3. **Pest Situation** - Active threats and their management status
4. **Treatment History Review** - Recent interventions and their effectiveness
5. **Sensor Network Status** - Data quality and coverage assessment
6. **Chemical Usage Analysis** - Pesticide use vs sustainable targets
7. **Risk Outlook** - Next 30 days risk assessment
8. **Priority Actions** - Top 3 immediate action items
9. **Sustainability Score** - Rating of farming practices (1-10)`;

    const result = await callAI(prompt, 'You are a precision agriculture consultant providing comprehensive field management reports. Focus on actionable insights and sustainability metrics.');
    res.json({ result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
