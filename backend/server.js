const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/fields', require('./routes/fields'));
app.use('/api/detections', require('./routes/detections'));
app.use('/api/treatments', require('./routes/treatments'));
app.use('/api/health-reports', require('./routes/health_reports'));
app.use('/api/sensors', require('./routes/sensors'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/ai', require('./routes/ai_extra'));
app.use('/api/utility', require('./routes/utility'));
app.use('/api/admin', require('./routes/sample_data'));
app.use('/api/dashboard', require('./routes/dashboard'));

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
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AgriSense backend running on port ${PORT}`);
});
