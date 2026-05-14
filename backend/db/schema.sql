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
