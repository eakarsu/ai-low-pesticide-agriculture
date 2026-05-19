DROP TABLE IF EXISTS weather_data CASCADE;
DROP TABLE IF EXISTS sensors CASCADE;
DROP TABLE IF EXISTS health_reports CASCADE;
DROP TABLE IF EXISTS treatments CASCADE;
DROP TABLE IF EXISTS detections CASCADE;
DROP TABLE IF EXISTS fields CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE fields (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  crop_type VARCHAR(100),
  hectares DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'active',
  soil_type VARCHAR(100),
  last_scan_at TIMESTAMP,
  health_score INTEGER DEFAULT 75,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE detections (
  id SERIAL PRIMARY KEY,
  field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE,
  pest_name VARCHAR(255) NOT NULL,
  confidence DECIMAL(4,3),
  severity VARCHAR(20),
  location_in_field VARCHAR(255),
  treated BOOLEAN DEFAULT FALSE,
  treatment_applied VARCHAR(255),
  detected_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE treatments (
  id SERIAL PRIMARY KEY,
  field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE,
  treatment_type VARCHAR(100),
  chemical_name VARCHAR(255),
  dosage_ml_per_ha DECIMAL(10,2),
  scheduled_date DATE,
  completed_date DATE,
  status VARCHAR(20) DEFAULT 'scheduled',
  chemical_savings_pct INTEGER DEFAULT 0,
  notes TEXT
);

CREATE TABLE health_reports (
  id SERIAL PRIMARY KEY,
  field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  health_score INTEGER,
  ndvi_index DECIMAL(4,3),
  yield_estimate_kg_ha DECIMAL(10,2),
  notes TEXT,
  reporter VARCHAR(255)
);

CREATE TABLE sensors (
  id SERIAL PRIMARY KEY,
  field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE,
  device_type VARCHAR(100),
  model VARCHAR(100),
  battery_level INTEGER,
  last_reading_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'online',
  location_description VARCHAR(255),
  readings_today INTEGER DEFAULT 0
);

CREATE TABLE weather_data (
  id SERIAL PRIMARY KEY,
  location VARCHAR(255),
  recorded_at TIMESTAMP DEFAULT NOW(),
  temp_celsius DECIMAL(5,2),
  humidity_pct INTEGER,
  wind_speed_kmh DECIMAL(5,2),
  rainfall_mm DECIMAL(6,2),
  pest_risk_index INTEGER,
  forecast_next_48h TEXT
);

-- ============================================================================
-- AUDIT IMPLEMENTATION 2026-05-14: Deep feature tables
-- ============================================================================

-- Pest catalog: real species with damage thresholds and IPM treatment options.
CREATE TABLE IF NOT EXISTS pest_catalog (
  id SERIAL PRIMARY KEY,
  common_name VARCHAR(255) NOT NULL,
  scientific_name VARCHAR(255),
  order_family VARCHAR(255),
  primary_crops TEXT,            -- comma-separated host crops
  damage_type VARCHAR(100),      -- defoliator, sap-sucking, borer, soil, fungus, etc.
  economic_threshold TEXT,       -- e.g. "30% defoliation pre-bloom" — university extension thresholds
  monitoring_method TEXT,        -- e.g. "pheromone trap @ 1 per 5 acres"
  natural_enemies TEXT,          -- comma-separated beneficial insects that prey on this pest
  ipm_first_line TEXT,           -- cultural + biological first action
  bio_pesticide TEXT,            -- recommended biopesticide (Bt strain, NPV, etc.)
  chemical_last_resort TEXT,     -- IRAC group + active ingredient
  resistance_risk VARCHAR(20),   -- low / medium / high
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pest_catalog_crop ON pest_catalog(primary_crops);

-- EPA-registered pesticide reference with PHI / REI / MRL.
CREATE TABLE IF NOT EXISTS pesticide_registry (
  id SERIAL PRIMARY KEY,
  active_ingredient VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  epa_reg_no VARCHAR(50),        -- e.g. 100-1604 (Warrior II w/ Zeon)
  irac_moa_group VARCHAR(20),    -- IRAC mode-of-action group (e.g. 3A, 4A, 6, 28)
  chemical_class VARCHAR(100),
  target_pests TEXT,
  authorized_crops TEXT,
  pre_harvest_interval_days INT, -- PHI
  re_entry_interval_hours INT,   -- REI
  max_app_rate_g_ai_per_ha DECIMAL(10,3),
  max_apps_per_season INT,
  pollinator_warning BOOLEAN DEFAULT FALSE,
  toxicity_class VARCHAR(20),    -- I (highly toxic), II, III, IV
  organic_approved BOOLEAN DEFAULT FALSE,  -- OMRI listed
  signal_word VARCHAR(30),       -- DANGER / WARNING / CAUTION
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_pesticide_ai ON pesticide_registry(active_ingredient);
CREATE INDEX IF NOT EXISTS idx_pesticide_irac ON pesticide_registry(irac_moa_group);

-- Maximum residue limits by crop x active-ingredient (EPA 40 CFR 180).
CREATE TABLE IF NOT EXISTS mrl_tolerances (
  id SERIAL PRIMARY KEY,
  crop VARCHAR(100) NOT NULL,
  active_ingredient VARCHAR(255) NOT NULL,
  mrl_ppm DECIMAL(10,4),
  regulatory_body VARCHAR(50) DEFAULT 'US EPA',
  cfr_section VARCHAR(50),
  UNIQUE (crop, active_ingredient, regulatory_body)
);
CREATE INDEX IF NOT EXISTS idx_mrl_crop_ai ON mrl_tolerances(crop, active_ingredient);

-- Beneficial insect catalog for biocontrol marketplace + IPM planning.
CREATE TABLE IF NOT EXISTS beneficial_insects (
  id SERIAL PRIMARY KEY,
  common_name VARCHAR(255) NOT NULL,
  scientific_name VARCHAR(255),
  category VARCHAR(50),          -- predator / parasitoid / entomopathogenic
  target_pests TEXT,
  release_rate_per_ha TEXT,      -- e.g. "10,000 adults"
  optimal_temp_c VARCHAR(50),
  supplier VARCHAR(255),
  price_usd_per_unit DECIMAL(10,2),
  unit_description VARCHAR(100),
  shelf_life_days INT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_beneficial_target ON beneficial_insects(target_pests);

-- Sensor readings (timeseries) — used by anomaly detector.
CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  sensor_id INTEGER REFERENCES sensors(id) ON DELETE CASCADE,
  field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE,
  metric VARCHAR(50),            -- soil_moisture_pct / soil_temp_c / leaf_wetness_pct / air_temp_c / canopy_humidity_pct / battery_v
  value DECIMAL(10,3),
  recorded_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_readings_sensor_time ON sensor_readings(sensor_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_field_metric ON sensor_readings(field_id, metric);

-- Anomaly events (persisted from anomaly detector).
CREATE TABLE IF NOT EXISTS sensor_anomalies (
  id SERIAL PRIMARY KEY,
  sensor_id INTEGER REFERENCES sensors(id) ON DELETE CASCADE,
  field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE,
  metric VARCHAR(50),
  observed_value DECIMAL(10,3),
  expected_range_low DECIMAL(10,3),
  expected_range_high DECIMAL(10,3),
  zscore DECIMAL(10,3),
  severity VARCHAR(20),          -- info / warning / critical
  hypothesis TEXT,
  recommended_action TEXT,
  detected_at TIMESTAMP DEFAULT NOW(),
  ack BOOLEAN DEFAULT FALSE
);

-- Crop rotation rules (pre-crop -> next-crop guidance, pest/disease cycle breaks).
CREATE TABLE IF NOT EXISTS rotation_rules (
  id SERIAL PRIMARY KEY,
  prev_crop VARCHAR(100),
  next_crop VARCHAR(100),
  recommendation VARCHAR(30),    -- excellent / good / acceptable / avoid / never
  rationale TEXT,
  pest_cycle_break TEXT,
  nitrogen_balance VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_rotation_prev_next ON rotation_rules(prev_crop, next_crop);

-- Saved rotation plans.
CREATE TABLE IF NOT EXISTS rotation_plans (
  id SERIAL PRIMARY KEY,
  field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE,
  plan_year_1 VARCHAR(100),
  plan_year_2 VARCHAR(100),
  plan_year_3 VARCHAR(100),
  plan_year_4 VARCHAR(100),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Spray events log (precision spray drone telemetry + audit).
CREATE TABLE IF NOT EXISTS spray_events (
  id SERIAL PRIMARY KEY,
  field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE,
  treatment_id INTEGER REFERENCES treatments(id) ON DELETE SET NULL,
  active_ingredient VARCHAR(255),
  product_trade_name VARCHAR(255),
  rate_g_ai_per_ha DECIMAL(10,3),
  treated_area_ha DECIMAL(10,3),
  application_method VARCHAR(50),  -- broadcast / banded / spot_drone / aerial / chemigation
  drift_risk_score INTEGER,
  buffer_zone_m INTEGER,
  wind_speed_kmh DECIMAL(5,2),
  temp_c DECIMAL(5,2),
  humidity_pct INTEGER,
  applied_at TIMESTAMP DEFAULT NOW(),
  applicator_id INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_spray_field_time ON spray_events(field_id, applied_at DESC);

-- Pest classifier inferences (image or text input log).
CREATE TABLE IF NOT EXISTS pest_classifications (
  id SERIAL PRIMARY KEY,
  field_id INTEGER REFERENCES fields(id) ON DELETE SET NULL,
  input_summary TEXT,
  predicted_pest VARCHAR(255),
  confidence DECIMAL(4,3),
  severity VARCHAR(20),
  recommended_action TEXT,
  llm_used BOOLEAN DEFAULT FALSE,
  classified_by INTEGER REFERENCES users(id),
  classified_at TIMESTAMP DEFAULT NOW()
);
