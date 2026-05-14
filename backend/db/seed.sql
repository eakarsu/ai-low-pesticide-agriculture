-- Users
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@demo.com', '$2b$10$e4dPQpe3XIDluCZCv3b3iu/H/3f816tgim6l5ly5k7pChHG235Dey', 'Admin User', 'admin')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = EXCLUDED.role;

-- Fields
INSERT INTO fields (name, location, crop_type, hectares, status, soil_type, last_scan_at, health_score) VALUES
('North Valley Farm', 'Iowa, USA', 'corn', 45.5, 'active', 'loam', NOW() - INTERVAL '2 hours', 82),
('Sunridge Plot A', 'Kansas, USA', 'wheat', 28.3, 'active', 'clay_loam', NOW() - INTERVAL '6 hours', 74),
('East Basin Field', 'Nebraska, USA', 'soybean', 62.1, 'monitoring', 'sandy_loam', NOW() - INTERVAL '1 day', 61),
('West Slope Terrain', 'Texas, USA', 'cotton', 33.8, 'active', 'clay', NOW() - INTERVAL '3 hours', 88),
('Delta Lowlands', 'Mississippi, USA', 'rice', 51.2, 'active', 'silty_clay', NOW() - INTERVAL '4 hours', 79),
('Highland Plot B', 'Iowa, USA', 'corn', 38.7, 'monitoring', 'loam', NOW() - INTERVAL '12 hours', 55),
('Southern Flats', 'Texas, USA', 'sorghum', 41.5, 'active', 'sandy', NOW() - INTERVAL '5 hours', 91),
('Creek Bottom Field', 'Missouri, USA', 'soybean', 29.9, 'fallow', 'alluvial', NULL, 45),
('Ridge Line Farm', 'Ohio, USA', 'corn', 57.3, 'active', 'silty_loam', NOW() - INTERVAL '2 hours', 87),
('Valley Floor East', 'Indiana, USA', 'wheat', 44.6, 'active', 'clay_loam', NOW() - INTERVAL '8 hours', 72),
('Prairie Plot C', 'Illinois, USA', 'soybean', 36.2, 'monitoring', 'loam', NOW() - INTERVAL '1 day', 68),
('Riverbend Farm', 'Wisconsin, USA', 'corn', 23.8, 'active', 'sandy_loam', NOW() - INTERVAL '3 hours', 83),
('Mesa Top Field', 'Colorado, USA', 'wheat', 19.5, 'fallow', 'sandy', NULL, 40),
('Coastal Plain', 'Georgia, USA', 'cotton', 47.1, 'active', 'sandy_loam', NOW() - INTERVAL '7 hours', 77),
('Hill Country Farm', 'Tennessee, USA', 'corn', 31.4, 'active', 'clay_loam', NOW() - INTERVAL '4 hours', 80);

-- Detections
INSERT INTO detections (field_id, pest_name, confidence, severity, location_in_field, treated, treatment_applied, detected_at, notes) VALUES
(1, 'Aphids', 0.95, 'medium', 'Northeast quadrant', false, NULL, NOW() - INTERVAL '2 days', 'Cluster infestation near irrigation line'),
(1, 'Corn Earworm', 0.87, 'high', 'Central zone', true, 'Bacillus thuringiensis', NOW() - INTERVAL '5 days', 'Treated with biological agent'),
(2, 'Hessian Fly', 0.91, 'high', 'Western edge', false, NULL, NOW() - INTERVAL '1 day', 'Early instar stage, spread risk high'),
(3, 'Soybean Aphid', 0.78, 'medium', 'Southern section', false, NULL, NOW() - INTERVAL '3 days', 'Population below economic threshold'),
(3, 'Bean Leaf Beetle', 0.82, 'low', 'Row 15-20', true, 'Neem oil spray', NOW() - INTERVAL '7 days', 'Contained with organic treatment'),
(4, 'Boll Weevil', 0.96, 'critical', 'Full field', false, NULL, NOW() - INTERVAL '1 day', 'URGENT: immediate action required'),
(5, 'Rice Stem Borer', 0.88, 'high', 'Northern paddies', true, 'Targeted chlorpyrifos', NOW() - INTERVAL '4 days', 'Chemical treatment applied at reduced dose'),
(6, 'Corn Rootworm', 0.93, 'high', 'Northeast sector', false, NULL, NOW() - INTERVAL '2 days', 'Soil sampling confirms heavy population'),
(7, 'Armyworm', 0.85, 'medium', 'Southeast quadrant', true, 'Spinosad', NOW() - INTERVAL '6 days', 'Biological insecticide applied'),
(8, 'Slug', 0.72, 'low', 'Field edges', false, NULL, NOW() - INTERVAL '8 days', 'Fallow field, monitor for spring'),
(9, 'Spider Mites', 0.89, 'medium', 'Rows 40-55', false, NULL, NOW() - INTERVAL '1 day', 'Predatory mites released nearby'),
(10, 'Wheat Aphid', 0.94, 'medium', 'Central strip', true, 'Parasitic wasp release', NOW() - INTERVAL '3 days', 'Biological control deployed'),
(11, 'White Fly', 0.76, 'low', 'Southern boundary', false, NULL, NOW() - INTERVAL '5 days', 'Population stable, monitoring'),
(14, 'Pink Bollworm', 0.91, 'critical', 'Western blocks', false, NULL, NOW() - INTERVAL '2 hours', 'NEW DETECTION: requires immediate response'),
(15, 'Corn Borer', 0.83, 'medium', 'Rows 1-30', false, NULL, NOW() - INTERVAL '1 day', 'Trichogramma parasitoid deployment planned');

-- Treatments
INSERT INTO treatments (field_id, treatment_type, chemical_name, dosage_ml_per_ha, scheduled_date, completed_date, status, chemical_savings_pct, notes) VALUES
(1, 'biological', 'Bacillus thuringiensis', 250.0, CURRENT_DATE - 5, CURRENT_DATE - 5, 'completed', 85, 'Effective against corn earworm larvae'),
(1, 'targeted_spray', 'Imidacloprid', 150.0, CURRENT_DATE + 2, NULL, 'scheduled', 60, 'Targeted aphid treatment, northern quadrant only'),
(2, 'pheromone_trap', 'Hessian Fly Pheromone', 0, CURRENT_DATE + 1, NULL, 'scheduled', 100, 'No chemicals, monitoring traps'),
(3, 'organic', 'Neem Oil', 500.0, CURRENT_DATE - 7, CURRENT_DATE - 7, 'completed', 70, 'First organic treatment trial'),
(4, 'emergency_spray', 'Chlorpyrifos', 800.0, CURRENT_DATE, NULL, 'in_progress', 20, 'Boll weevil emergency - partial chemical use'),
(5, 'targeted_spray', 'Chlorpyrifos', 300.0, CURRENT_DATE - 4, CURRENT_DATE - 4, 'completed', 55, 'Reduced dose targeted application'),
(6, 'soil_treatment', 'Tefluthrin', 200.0, CURRENT_DATE + 3, NULL, 'scheduled', 40, 'Rootworm soil treatment planned'),
(7, 'biological', 'Spinosad', 180.0, CURRENT_DATE - 6, CURRENT_DATE - 6, 'completed', 80, 'Highly effective, minimal collateral'),
(9, 'predatory_insects', 'Phytoseiulus persimilis', 0, CURRENT_DATE - 1, NULL, 'in_progress', 100, 'Spider mite predator release'),
(10, 'biological', 'Aphidius colemani', 0, CURRENT_DATE - 3, CURRENT_DATE - 3, 'completed', 100, 'Parasitic wasp success'),
(12, 'organic', 'Pyrethrin', 120.0, CURRENT_DATE + 5, NULL, 'scheduled', 65, 'Preventive treatment planned'),
(14, 'emergency_spray', 'Deltamethrin', 350.0, CURRENT_DATE + 1, NULL, 'scheduled', 35, 'Pink bollworm emergency response'),
(15, 'biological', 'Trichogramma ostriniae', 0, CURRENT_DATE + 2, NULL, 'scheduled', 100, 'Egg parasitoid for corn borer'),
(9, 'organic', 'Kaolin Clay', 5000.0, CURRENT_DATE + 7, NULL, 'scheduled', 90, 'Physical barrier treatment'),
(11, 'monitoring', NULL, 0, CURRENT_DATE, NULL, 'in_progress', 100, 'Yellow sticky trap monitoring program');

-- Health Reports
INSERT INTO health_reports (field_id, report_date, health_score, ndvi_index, yield_estimate_kg_ha, notes, reporter) VALUES
(1, CURRENT_DATE - 1, 82, 0.73, 9200, 'Good growth, minor aphid pressure', 'Dr. Sarah Chen'),
(1, CURRENT_DATE - 15, 78, 0.69, 8800, 'Slight stress from heat wave', 'Dr. Sarah Chen'),
(2, CURRENT_DATE - 2, 74, 0.65, 3900, 'Hessian fly risk elevated', 'Mike Johnson'),
(3, CURRENT_DATE - 3, 61, 0.55, 2800, 'Drought stress reducing yields', 'Dr. Sarah Chen'),
(4, CURRENT_DATE, 88, 0.81, 1800, 'Cotton developing well, boll weevil emergency', 'Lisa Park'),
(5, CURRENT_DATE - 1, 79, 0.71, 6500, 'Rice crop on track, stem borer treated', 'Dr. James Liu'),
(6, CURRENT_DATE - 2, 55, 0.48, 7200, 'Rootworm damage causing significant stress', 'Mike Johnson'),
(7, CURRENT_DATE - 1, 91, 0.84, 4800, 'Excellent conditions, armyworm controlled', 'Dr. Sarah Chen'),
(9, CURRENT_DATE, 87, 0.79, 9500, 'Top performing field this season', 'Dr. Sarah Chen'),
(10, CURRENT_DATE - 3, 72, 0.63, 3700, 'Aphid pressure managed biologically', 'Mike Johnson'),
(11, CURRENT_DATE - 5, 68, 0.60, 2600, 'Whitefly monitoring, no treatment needed', 'Lisa Park'),
(12, CURRENT_DATE - 2, 83, 0.75, 9100, 'Strong growth, preventive measures effective', 'Dr. James Liu'),
(14, CURRENT_DATE - 1, 77, 0.70, 1700, 'Pink bollworm detection concerning', 'Lisa Park'),
(15, CURRENT_DATE, 80, 0.72, 9300, 'Corn borer parasitoid deployment pending', 'Dr. Sarah Chen'),
(1, CURRENT_DATE - 30, 71, 0.63, 8500, 'Early season baseline measurement', 'Dr. Sarah Chen');

-- Sensors
INSERT INTO sensors (field_id, device_type, model, battery_level, last_reading_at, status, location_description, readings_today) VALUES
(1, 'soil_moisture', 'AgraSense SM-300', 87, NOW() - INTERVAL '30 minutes', 'online', 'Row 15 center pivot', 48),
(1, 'pest_trap', 'CropGuard PT-100', 72, NOW() - INTERVAL '1 hour', 'online', 'Northeast corner', 24),
(2, 'camera', 'FieldEye CAM-500', 91, NOW() - INTERVAL '15 minutes', 'online', 'Elevated pole, field center', 96),
(3, 'temperature', 'EnviroSense T-200', 45, NOW() - INTERVAL '2 hours', 'online', 'Weather station mount', 48),
(4, 'pest_trap', 'CropGuard PT-100', 88, NOW() - INTERVAL '45 minutes', 'online', 'Western boundary', 24),
(4, 'camera', 'FieldEye CAM-500', 95, NOW() - INTERVAL '10 minutes', 'online', 'Mobile unit, rotating zones', 144),
(5, 'soil_moisture', 'AgraSense SM-300', 62, NOW() - INTERVAL '3 hours', 'maintenance', 'Paddy field sensor array', 12),
(6, 'soil_moisture', 'AgraSense SM-500', 23, NOW() - INTERVAL '6 hours', 'online', 'Root zone monitoring', 8),
(7, 'temperature', 'EnviroSense T-200', 78, NOW() - INTERVAL '1 hour', 'online', 'Field station alpha', 48),
(9, 'camera', 'FieldEye CAM-700', 99, NOW() - INTERVAL '5 minutes', 'online', 'High-resolution drone dock', 288),
(9, 'pest_trap', 'CropGuard PT-200', 84, NOW() - INTERVAL '2 hours', 'online', 'Multiple trap network', 48),
(10, 'soil_moisture', 'AgraSense SM-300', 55, NOW() - INTERVAL '4 hours', 'online', 'Irrigation monitoring point', 24),
(11, 'temperature', 'EnviroSense T-100', 0, NOW() - INTERVAL '2 days', 'offline', 'Station needs battery replacement', 0),
(12, 'camera', 'FieldEye CAM-500', 76, NOW() - INTERVAL '30 minutes', 'online', 'Canopy imaging station', 72),
(14, 'pest_trap', 'CropGuard PT-100', 68, NOW() - INTERVAL '1 hour', 'online', 'Bollworm monitoring grid', 24);

-- Weather Data
INSERT INTO weather_data (location, recorded_at, temp_celsius, humidity_pct, wind_speed_kmh, rainfall_mm, pest_risk_index, forecast_next_48h) VALUES
('Iowa, USA', NOW() - INTERVAL '1 hour', 24.5, 68, 12.3, 0, 6, 'Warm and humid, increasing pest activity expected'),
('Kansas, USA', NOW() - INTERVAL '2 hours', 27.8, 55, 18.5, 0, 4, 'Dry and windy, low disease pressure'),
('Nebraska, USA', NOW() - INTERVAL '1 hour', 22.1, 75, 8.2, 5.5, 7, 'Recent rainfall increases aphid risk'),
('Texas, USA', NOW() - INTERVAL '3 hours', 32.4, 48, 22.1, 0, 8, 'Hot and dry, boll weevil conditions favorable'),
('Mississippi, USA', NOW() - INTERVAL '1 hour', 29.6, 82, 6.5, 12.3, 9, 'High humidity, maximum pest pressure warning'),
('Iowa, USA', NOW() - INTERVAL '6 hours', 23.8, 71, 10.8, 2.1, 6, 'Mild conditions, monitor aphid populations'),
('Ohio, USA', NOW() - INTERVAL '2 hours', 21.3, 64, 14.2, 0, 3, 'Optimal growing conditions, low pest risk'),
('Indiana, USA', NOW() - INTERVAL '3 hours', 23.7, 69, 11.5, 1.8, 5, 'Moderate humidity, wheat aphid monitoring advised'),
('Illinois, USA', NOW() - INTERVAL '4 hours', 25.2, 72, 9.8, 0, 6, 'Warm temperatures favorable for aphid reproduction'),
('Wisconsin, USA', NOW() - INTERVAL '2 hours', 18.9, 60, 16.7, 0, 2, 'Cool temperatures limiting pest activity'),
('Georgia, USA', NOW() - INTERVAL '1 hour', 31.7, 78, 7.3, 8.9, 9, 'High humidity and heat, bollworm peak conditions'),
('Tennessee, USA', NOW() - INTERVAL '3 hours', 26.4, 67, 13.1, 0, 5, 'Typical conditions, standard monitoring'),
('Colorado, USA', NOW() - INTERVAL '5 hours', 19.6, 38, 25.3, 0, 2, 'Dry mountain conditions, low pest pressure'),
('Missouri, USA', NOW() - INTERVAL '2 hours', 24.8, 70, 10.5, 3.2, 6, 'Post-rain conditions, slug activity elevated'),
('Iowa, USA', NOW() - INTERVAL '1 day', 20.1, 73, 8.9, 15.2, 7, 'Heavy rainfall yesterday, disease risk elevated');
