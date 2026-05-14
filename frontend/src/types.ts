export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface Field {
  id: number;
  name: string;
  location: string;
  crop_type: string;
  hectares: number;
  status: string;
  soil_type: string;
  last_scan_at: string | null;
  health_score: number;
  created_at: string;
}

export interface Detection {
  id: number;
  field_id: number;
  field_name?: string;
  crop_type?: string;
  pest_name: string;
  confidence: number;
  severity: string;
  location_in_field: string;
  treated: boolean;
  treatment_applied: string | null;
  detected_at: string;
  notes: string;
}

export interface Treatment {
  id: number;
  field_id: number;
  field_name?: string;
  crop_type?: string;
  treatment_type: string;
  chemical_name: string | null;
  dosage_ml_per_ha: number | null;
  scheduled_date: string;
  completed_date: string | null;
  status: string;
  chemical_savings_pct: number;
  notes: string;
}

export interface HealthReport {
  id: number;
  field_id: number;
  field_name?: string;
  crop_type?: string;
  report_date: string;
  health_score: number;
  ndvi_index: number;
  yield_estimate_kg_ha: number;
  notes: string;
  reporter: string;
}

export interface Sensor {
  id: number;
  field_id: number;
  field_name?: string;
  device_type: string;
  model: string;
  battery_level: number;
  last_reading_at: string | null;
  status: string;
  location_description: string;
  readings_today: number;
}

export interface WeatherData {
  id: number;
  location: string;
  recorded_at: string;
  temp_celsius: number;
  humidity_pct: number;
  wind_speed_kmh: number;
  rainfall_mm: number;
  pest_risk_index: number;
  forecast_next_48h: string;
}
