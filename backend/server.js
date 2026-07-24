const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true });

if (process.env.NODE_ENV === 'production') {
  const requiredProviders = ['maps', 'calendar', 'messaging', 'payment', 'tax', 'accounting'];
  let webhookSecrets = {};
  try { webhookSecrets = JSON.parse(process.env.PROVIDER_WEBHOOK_SECRETS_JSON || '{}'); }
  catch { throw new Error('PROVIDER_WEBHOOK_SECRETS_JSON must be valid JSON'); }
  if (requiredProviders.some((provider) => typeof webhookSecrets[provider] !== 'string' || webhookSecrets[provider].length < 32)) {
    throw new Error('production requires a 32+ character webhook secret for every provider');
  }
}

const app = express();

const configuredOrigins = String(process.env.CORS_ORIGIN || 'http://127.0.0.1:5173,http://localhost:5173').split(',').map((value) => value.trim()).filter(Boolean);
app.disable('x-powered-by');
app.use(cors({ origin(origin, callback) { callback(null, !origin || configuredOrigins.includes(origin)); }, credentials: false }));
app.use(express.json({ limit: '256kb' }));
app.get('/health/live', (_req, res) => res.json({ status: 'live' }));
app.get('/health/ready', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ready' }); }
  catch { res.status(503).json({ status: 'not_ready' }); }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/field-operations', require('./routes/fieldOperations'));
app.use('/api/fields', require('./routes/fields'));
app.use('/api/detections', require('./routes/detections'));
app.use('/api/treatments', require('./routes/treatments'));
app.use('/api/health-reports', require('./routes/health_reports'));
app.use('/api/sensors', require('./routes/sensors'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/utility', require('./routes/utility'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/application-ai', require('./routes/applicationAi'));

const generatedEnabled = process.env.ENABLE_GENERATED_FEATURES === 'true' && process.env.NODE_ENV !== 'production';
if (generatedEnabled) {
  app.use('/api/ai', require('./routes/ai'));
  app.use('/api/ai', require('./routes/ai_extra'));
  app.use('/api/admin', require('./routes/sample_data'));
  app.use('/api/gap-ai-sensor-anomaly', require('./routes/gap-ai-sensor-anomaly'));
  app.use('/api/gap-ai-weather-impact-forecast', require('./routes/gap-ai-weather-impact-forecast'));
  app.use('/api/gap-ai-treatment-efficacy-score', require('./routes/gap-ai-treatment-efficacy-score'));
  app.use('/api/gap-ai-pest-photo-classifier', require('./routes/gap-ai-pest-photo-classifier'));
  app.use('/api/gap-ai-crop-rotation-planner', require('./routes/gap-ai-crop-rotation-planner'));
  app.use('/api/gap-nonai-notifications', require('./routes/gap-nonai-notifications'));
  app.use('/api/gap-nonai-image-upload', require('./routes/gap-nonai-image-upload'));
  app.use('/api/gap-nonai-multi-tenant-farms', require('./routes/gap-nonai-multi-tenant-farms'));
  app.use('/api/gap-nonai-offline-sync', require('./routes/gap-nonai-offline-sync'));
  app.use('/api/gap-nonai-weather-providers', require('./routes/gap-nonai-weather-providers'));
  app.use('/api/cf-drone-vision-pipeline', require('./routes/cf-drone-vision-pipeline'));
  app.use('/api/cf-biocontrol-marketplace', require('./routes/cf-biocontrol-marketplace'));
  app.use('/api/cf-federated-weather', require('./routes/cf-federated-weather'));
  app.use('/api/cf-residue-audit-trail', require('./routes/cf-residue-audit-trail'));
  app.use('/api/cf-coop-heatmaps', require('./routes/cf-coop-heatmaps'));
  app.use('/api/custom-views', require('./routes/customViews'));
}
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  const port = Number(process.env.BACKEND_PORT);
  const host = process.env.BACKEND_HOST;
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || host !== '127.0.0.1') throw new Error('BACKEND_PORT and BACKEND_HOST=127.0.0.1 are required');
  app.listen(port, host, () => { console.log(`AgriSense backend running on http://${host}:${port}`); });
}
module.exports = app;
