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

-- ============================================================================
-- AUDIT IMPLEMENTATION 2026-05-14: real domain seed data
-- Sources: University Extension IPM guides (Iowa State, Purdue, UC IPM, Penn State),
-- EPA pesticide registration (PPLS), 40 CFR 180 tolerance tables, OMRI, IRAC MoA.
-- ============================================================================

-- Pest catalog (30 real crop pests with extension-based thresholds)
INSERT INTO pest_catalog (common_name, scientific_name, order_family, primary_crops, damage_type, economic_threshold, monitoring_method, natural_enemies, ipm_first_line, bio_pesticide, chemical_last_resort, resistance_risk) VALUES
('European Corn Borer','Ostrinia nubilalis','Lepidoptera: Crambidae','corn,sorghum','borer','Threshold per Iowa State: 50% of plants with shotholes + live larvae before tassel; or pheromone trap >100 moths/wk','Pheromone traps 1/40 ac; weekly scouting; Bt-corn refuge plots','Trichogramma ostriniae,Macrocentrus grandii,Eriborus terebrans','Plant Bt-corn hybrids (Cry1Ab/Cry1F); destroy stalks post-harvest','Bacillus thuringiensis kurstaki (Dipel DF)','IRAC 3A pyrethroids (lambda-cyhalothrin) — pre-tassel only','medium'),
('Western Corn Rootworm','Diabrotica virgifera virgifera','Coleoptera: Chrysomelidae','corn','soil','Adult: 0.75 beetles/plant; or rootworm-damage rating >2.0 on Iowa 1-6 scale','Pherocon AM yellow sticky cards 4/40 ac; root digs 4 plants @ V8','Pasteuria penetrans,ground beetles,parasitic nematodes (Heterorhabditis)','Crop rotation to soybean (most effective IPM tool, >90% reduction)','Heterorhabditis bacteriophora entomopathogenic nematodes','IRAC 4A clothianidin seed treatment; pyrethroid only if Bt-RW resistance confirmed','high'),
('Soybean Aphid','Aphis glycines','Hemiptera: Aphididae','soybean','sap-sucking','250 aphids/plant on 80% of plants AND increasing populations (Univ. of Minnesota)','Whole-plant counts 30 plants/40 ac weekly during R1-R5','Harmonia axyridis,Orius insidiosus,Aphidoletes aphidimyza,Aphelinus certus','Plant resistant varieties (Rag1, Rag2); preserve native predators','Beauveria bassiana strain GHA (Mycotrol ESO)','IRAC 4A imidacloprid foliar; rotate with IRAC 1B chlorpyrifos','medium'),
('Corn Earworm','Helicoverpa zea','Lepidoptera: Noctuidae','corn,cotton,soybean,sorghum','defoliator','Sweet corn: 1 moth/trap/night at silk; field corn rarely treated','Hartstack pheromone traps; ear inspection at R3','Trichogramma pretiosum,Cotesia marginiventris,big-eyed bug','Bt-corn (Cry1Ab + Vip3A pyramid); plant early to escape peak flight','Helicoverpa zea NPV (Heligen)','IRAC 28 chlorantraniliprole (Coragen); IRAC 5 spinosad','high'),
('Cotton Boll Weevil','Anthonomus grandis','Coleoptera: Curculionidae','cotton','borer','Texas Boll Weevil Eradication Program: zero tolerance; trap captures trigger response','Pheromone (grandlure) traps 1/40 ac season-long','Catolaccus grandis,fire ants opportunistic','Eradication zones; pheromone trapping; stalk destruction by Dec 31','None registered (sterile-release used historically)','IRAC 1B malathion ULV (Boll Weevil Eradication Program std)','low'),
('Spider Mites (Twospotted)','Tetranychus urticae','Acari: Tetranychidae','cotton,soybean,corn,strawberry','sap-sucking','25-50% of plants with mites + visible stippling (UC IPM)','Hand lens scouting; tap test on white paper','Phytoseiulus persimilis,Neoseiulus californicus,Stethorus punctillum','Avoid drought stress; suppress dust; preserve predator mites','Beauveria bassiana,abamectin (IRAC 6 but soft)','IRAC 25A bifenazate (Acramite); rotate IRAC 21A pyridaben','high'),
('Hessian Fly','Mayetiola destructor','Diptera: Cecidomyiidae','wheat','borer','Treatment if >5% tiller infestation at jointing (Kansas State)','Look for green stripe in spring; pull tillers to find puparia','Platygaster hiemalis,Eupelmus allynii','Plant resistant wheat varieties (Hessian fly Hessian-resistant); delay sowing past fly-free date','None registered','IRAC 4A imidacloprid seed treatment (Gaucho 600); chlorpyrifos foliar','medium'),
('Colorado Potato Beetle','Leptinotarsa decemlineata','Coleoptera: Chrysomelidae','potato,tomato,eggplant','defoliator','30% defoliation pre-bloom, 10% during bloom (Univ. Maine)','Visual; egg-mass counts; sweep nets','Edovum puttleri,Perillus bioculatus,Beauveria bassiana','Crop rotation 0.5 mi; trench trapping; resistant cultivars','Bacillus thuringiensis tenebrionis (Novodor FC),Beauveria bassiana','IRAC 28 chlorantraniliprole; IRAC 4A imidacloprid (resistance widespread)','high'),
('Diamondback Moth','Plutella xylostella','Lepidoptera: Plutellidae','cabbage,broccoli,canola','defoliator','0.3 larvae/plant pre-cupping; 0.5 larvae/plant at heading','Pheromone traps; sequential scouting 25 plants','Diadegma insulare,Cotesia plutellae,Microplitis plutellae','Plant trap crops (mustards); rotate fields; preserve parasitoids','Bacillus thuringiensis aizawai (XenTari)','IRAC 28 chlorantraniliprole; IRAC 6 emamectin (Proclaim)','high'),
('Two-spotted Stink Bug','Perillus bioculatus','Hemiptera: Pentatomidae','soybean,cotton','sap-sucking','3 bugs/30 sweeps R3-R5 (Univ. Georgia)','Sweep nets 25 sweeps/site','(Predator, not pest in soybean!)','Conserve as natural enemy of Colorado potato beetle','N/A — beneficial','N/A','low'),
('Brown Marmorated Stink Bug','Halyomorpha halys','Hemiptera: Pentatomidae','apple,peach,corn,soybean,tomato','sap-sucking','Apple: 10 BMSB/sample week at peripheral border; soybean 4/25 sweeps','Pyramid traps with aggregation pheromone; sweep nets','Trissolcus japonicus (samurai wasp),generalist mantids','Border-applied sprays; netting on high-value crops; trap cropping','Beauveria bassiana','IRAC 3A bifenthrin (border-only); IRAC 4A dinotefuran','medium'),
('Cabbage Looper','Trichoplusia ni','Lepidoptera: Noctuidae','cabbage,lettuce,cotton','defoliator','5% damaged seedlings; 10-30% at heading','Visual; pheromone traps','Trichogramma pretiosum,Hyposoter exiguae,NPV','Promote parasitoids; row covers','Bacillus thuringiensis kurstaki (DiPel),Trichoplusia ni NPV','IRAC 28 chlorantraniliprole; IRAC 22A indoxacarb','low'),
('Fall Armyworm','Spodoptera frugiperda','Lepidoptera: Noctuidae','corn,sorghum,rice,turf','defoliator','25% of plants with live larvae + feeding damage in whorl','Pheromone traps; visual whorl inspection','Cotesia marginiventris,Telenomus remus,NPV','Plant early; Bt-corn (Vip3A); destroy weed hosts','Spodoptera frugiperda NPV (Fawligen)','IRAC 28 chlorantraniliprole + IRAC 5 spinetoram (Radiant)','very high'),
('Cucumber Beetle (Striped)','Acalymma vittatum','Coleoptera: Chrysomelidae','cucumber,squash,melon','defoliator','1 beetle/plant cucurbits (transmits bacterial wilt)','Visual; yellow sticky traps','Celatoria setosa,Pristomerus austrinus,beauveria','Row covers until flowering; trap cropping w/ Blue Hubbard','Beauveria bassiana strain GHA','IRAC 4A imidacloprid (Admire Pro); IRAC 3A bifenthrin','medium'),
('Aphids (Green Peach)','Myzus persicae','Hemiptera: Aphididae','peach,potato,pepper,canola','sap-sucking','10 aphids/leaf during fruit set (UC IPM peach)','Beat sheet; visual; yellow pan traps','Aphidius colemani,Aphidoletes aphidimyza,Chrysoperla carnea','Reflective mulch; preserve parasitoids; remove weeds','Beauveria bassiana,insecticidal soap (potassium salts)','IRAC 9D flonicamid (Beleaf); IRAC 4A imidacloprid (widespread resistance)','very high'),
('Whitefly (Silverleaf)','Bemisia tabaci MEAM1','Hemiptera: Aleyrodidae','cotton,tomato,cucurbits','sap-sucking','5 adults/leaf or 0.5 nymphs/cm2 (Arizona threshold)','Yellow sticky traps; leaf-turn counts','Encarsia formosa,Eretmocerus eremicus,Delphastus catalinae','UV-reflective mulch; remove crop residues; resistant tomato varieties','Beauveria bassiana,Isaria fumosorosea (PFR-97)','IRAC 23 spiromesifen (Oberon); IRAC 9B pymetrozine','very high'),
('Thrips (Western Flower)','Frankliniella occidentalis','Thysanoptera: Thripidae','strawberry,pepper,onion,greenhouse','sap-sucking','5-10 thrips/flower (TSWV vector — lower if virus present)','Blue sticky cards; flower tapping','Orius insidiosus,Neoseiulus cucumeris,Amblyseius swirskii','Sanitation; UV-reflective mulch; resistant cultivars','Beauveria bassiana,Isaria fumosorosea','IRAC 5 spinetoram (Radiant); IRAC 6 abamectin','very high'),
('Codling Moth','Cydia pomonella','Lepidoptera: Tortricidae','apple,pear,walnut','borer','Pheromone traps: 5 moths/trap/wk biofix; degree-day model >150 DD','Pheromone traps 1/2.5 ac; fruit injury counts','Trichogramma platneri,Mastrus ridens,Pristiphora wesmaeli','Mating disruption (Isomate-CM); sanitation','Cydia pomonella granulovirus (Cyd-X)','IRAC 28 chlorantraniliprole (Altacor); IRAC 18 methoxyfenozide','high'),
('Plum Curculio','Conotrachelus nenuphar','Coleoptera: Curculionidae','apple,peach,plum,cherry','borer','First fresh oviposition scar after petal fall = treat (Cornell)','Trap trees (Hubbard); jarring; visual scars','Anaphes iole,Cholomyia inaequipes','Tree banding (sticky); ground covers; thinning fruit','Beauveria bassiana','IRAC 3A phosmet (Imidan); IRAC 4A thiamethoxam','medium'),
('Tomato Hornworm','Manduca quinquemaculata','Lepidoptera: Sphingidae','tomato,tobacco,pepper','defoliator','1 hornworm per plant or visible defoliation (Univ. Maryland)','Visual; black light traps','Cotesia congregata,Trichogramma',
'Handpicking on small farms; preserve braconid parasitoids','Bacillus thuringiensis kurstaki','IRAC 5 spinosad (Entrust); IRAC 28 chlorantraniliprole','low'),
('Mexican Bean Beetle','Epilachna varivestis','Coleoptera: Coccinellidae','soybean,bean','defoliator','1.5 larvae/sweep or 16% defoliation pre-pod (Virginia Tech)','Sweep net 25 sweeps; defoliation est.','Pediobius foveolatus','Pediobius release 2-3 wk after first eggs','Beauveria bassiana','IRAC 1B carbaryl; IRAC 3A bifenthrin','low'),
('Asian Citrus Psyllid','Diaphorina citri','Hemiptera: Liviidae','citrus','sap-sucking','Zero tolerance (HLB vector); CDFA quarantine','Yellow sticky traps; tap sampling new flush','Tamarixia radiata,Diaphorencyrtus aligarhensis','Resistant rootstocks; thermotherapy; CRISPR-edited HLB-tolerant trees','Beauveria bassiana','IRAC 4A imidacloprid soil drench; IRAC 9B pymetrozine','very high'),
('Russian Wheat Aphid','Diuraphis noxia','Hemiptera: Aphididae','wheat,barley','sap-sucking','5% tillers w/ aphids pre-boot; 10% post-boot (Colorado State)','Sweep net; tiller examination','Diaeretiella rapae,Aphidius matricariae','Plant Dn4-gene resistant varieties (Halt, Stanton)','Beauveria bassiana','IRAC 4A imidacloprid; IRAC 1B chlorpyrifos','medium'),
('Wireworm (Click Beetle larvae)','Agriotes spp.','Coleoptera: Elateridae','corn,potato,wheat','soil','>1 wireworm/bait station (CPS bait method)','Solar bait stations; soil core sampling','Metarhizium anisopliae,parasitic nematodes','Crop rotation away from grass cover; trap cropping','Metarhizium brunneum (BIO-1020),Steinernema feltiae','IRAC 28 broflanilide (Teraxxa); IRAC 4A thiamethoxam ST','low'),
('Black Cutworm','Agrotis ipsilon','Lepidoptera: Noctuidae','corn,vegetables','defoliator','3% cut plants or 5% leaf-feeding (Iowa State)','Pheromone traps; visual','Cotesia marginiventris,Meteorus autographae','Eliminate winter weeds 2 wk pre-plant; preserve carabid beetles','Bacillus thuringiensis kurstaki','IRAC 3A lambda-cyhalothrin rescue; IRAC 28 chlorantraniliprole','medium'),
('Rice Stem Borer (Yellow)','Scirpophaga incertulas','Lepidoptera: Crambidae','rice','borer','5% dead hearts (vegetative) or 1 moth/m2','Light traps; pheromone; deadheart counts','Trichogramma japonicum,Telenomus dignus','Resistant varieties; balanced N fertilization; flood management','Bacillus thuringiensis,Trichogramma releases','IRAC 28 chlorantraniliprole (Coragen); IRAC 1B fipronil','medium'),
('Striped Flea Beetle','Phyllotreta striolata','Coleoptera: Chrysomelidae','canola,cabbage,radish','defoliator','25% leaf area damaged at cotyledon (Saskatchewan)','Visual; sweep nets','Microctonus melanopus','Higher seeding rate; row covers; trap crops','Beauveria bassiana','IRAC 4A thiamethoxam seed treatment (Helix Vibrance); IRAC 3A bifenthrin','medium'),
('Apple Maggot','Rhagoletis pomonella','Diptera: Tephritidae','apple,blueberry,cherry','borer','Trap captures: 1 fly/trap unbaited; 5 flies/trap baited','Red sphere sticky traps; yellow boards','Aphaereta pallipes,Diachasma alloeum','Sanitation (pick fallen fruit); kaolin clay (Surround WP)','Kaolin clay (Surround WP) — physical barrier OMRI','IRAC 5 spinosad-GF120 bait; IRAC 1B phosmet','low'),
('Squash Vine Borer','Melittia cucurbitae','Lepidoptera: Sesiidae','squash,pumpkin','borer','Pheromone trap captures + visible frass at base','Pheromone traps; visual','Apanteles spp.,Telenomus','Resistant cultivars (butternut); injection w/ Bt into stems','Bacillus thuringiensis kurstaki injection','IRAC 3A permethrin perimeter; IRAC 28 chlorantraniliprole','low'),
('Lygus Bug (Tarnished Plant Bug)','Lygus lineolaris','Hemiptera: Miridae','cotton,strawberry,alfalfa','sap-sucking','Cotton: 8 bugs/100 sweeps pre-bloom; 15/100 during bloom (Mississippi)','Sweep nets; drop cloth','Peristenus digoneutis,Anaphes iole','Border alfalfa trap strips; preserve P. digoneutis','Beauveria bassiana strain GHA','IRAC 4D sulfoxaflor (Transform); IRAC 4A imidacloprid','high')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Pesticide registry — real EPA registrations, IRAC MoA, PHI/REI from labels.
-- ============================================================================
INSERT INTO pesticide_registry (active_ingredient, trade_name, epa_reg_no, irac_moa_group, chemical_class, target_pests, authorized_crops, pre_harvest_interval_days, re_entry_interval_hours, max_app_rate_g_ai_per_ha, max_apps_per_season, pollinator_warning, toxicity_class, organic_approved, signal_word, notes) VALUES
('Chlorantraniliprole','Coragen','352-729','28','diamide','Lepidoptera (corn earworm, fall armyworm, codling moth, diamondback moth)','corn,soybean,cotton,vegetables,tree fruit',1,4,90.0,4,FALSE,'IV',FALSE,'CAUTION','Low toxicity to bees & mammals; preferred reduced-risk option'),
('Spinosad','Entrust SC','62719-621','5','spinosyn','Lepidoptera, thrips, leafminers, fire ants','vegetables,tree fruit,grapes,turf',1,4,140.0,6,TRUE,'IV',TRUE,'CAUTION','OMRI-listed; bee-toxic until dry — apply evenings'),
('Bacillus thuringiensis kurstaki','DiPel DF','73049-39','11A','microbial','Lepidoptera larvae (caterpillars only)','vegetables,corn,tree fruit,turf',0,4,1120.0,99,FALSE,'IV',TRUE,'CAUTION','OMRI; species-specific; degrades in UV — apply evenings'),
('Bacillus thuringiensis aizawai','XenTari','73049-17','11A','microbial','Plutella xylostella, Spodoptera spp.','crucifers,leafy greens,cotton',0,4,1120.0,99,FALSE,'IV',TRUE,'CAUTION','OMRI; effective on Bt-k resistant populations'),
('Imidacloprid','Admire Pro','264-827','4A','neonicotinoid','aphids, whiteflies, leafhoppers, beetles','vegetables,cotton,tree fruit',7,12,140.0,2,TRUE,'III',FALSE,'CAUTION','EU banned outdoor 2018; severely restricted on flowering crops'),
('Thiamethoxam','Actara','100-938','4A','neonicotinoid','aphids, whiteflies, thrips, flea beetles','soybean,vegetables,potato',14,12,75.0,2,TRUE,'III',FALSE,'CAUTION','EU banned outdoor; cannot apply during bloom'),
('Clothianidin','Belay','7969-221','4A','neonicotinoid','soil pests, seedling pests, aphids','corn,soybean,canola (seed treatment)',21,12,200.0,1,TRUE,'III',FALSE,'WARNING','Predominantly seed treatment; EU banned outdoor'),
('Lambda-cyhalothrin','Warrior II w/ Zeon','100-1112','3A','pyrethroid','broad spectrum: lepidoptera, hemiptera, coleoptera','corn,soybean,cotton,vegetables',21,24,32.0,4,TRUE,'II',FALSE,'WARNING','High bee toxicity; do not apply during bloom'),
('Bifenthrin','Brigade WSB','279-3313','3A','pyrethroid','spider mites, aphids, stink bugs, lygus','cotton,corn,soybean',14,12,112.0,3,TRUE,'II',FALSE,'WARNING','Highly toxic to aquatic life — drift critical'),
('Permethrin','Pounce 25WP','279-3014','3A','pyrethroid','caterpillars, beetles','vegetables,corn',1,12,224.0,4,TRUE,'II',FALSE,'CAUTION','Toxic to bees and fish'),
('Methoxyfenozide','Intrepid 2F','62719-442','18','diacylhydrazine','lepidoptera (codling moth, leafrollers)','tree fruit,vegetables',14,4,280.0,3,FALSE,'IV',FALSE,'CAUTION','IGR; low non-target impact'),
('Indoxacarb','Avaunt','352-597','22A','oxadiazine','caterpillars, plum curculio','tree fruit,vegetables,cotton',7,12,90.0,4,FALSE,'III',FALSE,'CAUTION','Reduced-risk; safer to predators'),
('Abamectin','Agri-Mek SC','100-1351','6','avermectin','spider mites, leafminers','tree fruit,grape,vegetables',7,12,21.0,2,TRUE,'II',FALSE,'WARNING','Highly toxic to bees if applied during bloom'),
('Sulfoxaflor','Transform WG','62719-625','4D','sulfoximine','aphids, lygus, scale, whiteflies','cotton,soybean,strawberry',14,24,70.0,2,TRUE,'III',FALSE,'CAUTION','EPA section-3 restored 2019 with bloom-restriction'),
('Flupyradifurone','Sivanto Prime','264-1141','4D','butenolide','aphids, whiteflies, leafhoppers','vegetables,tree fruit,citrus',1,4,200.0,4,FALSE,'IV',FALSE,'CAUTION','Bee-safe at label rates; reduced-risk'),
('Pymetrozine','Fulfill','100-912','9B','pyridine azomethine','aphids, whiteflies','tree fruit,vegetables,potato',14,12,75.0,2,FALSE,'III',FALSE,'CAUTION','Anti-feedant — rapid feeding cessation'),
('Flonicamid','Beleaf 50SG','279-9551','9D','pyridinecarboxamide','aphids, lygus, thrips','cotton,tree fruit,vegetables',7,12,90.0,3,FALSE,'III',FALSE,'CAUTION','Reduced-risk; selective to pests'),
('Spirotetramat','Movento','264-1050','23','tetramic acid','aphids, scales, psyllids, whiteflies','tree fruit,citrus,vegetables',7,24,140.0,3,FALSE,'IV',FALSE,'CAUTION','Two-way systemic; juvenile-stage activity'),
('Spinetoram','Radiant SC','62719-545','5','spinosyn','thrips, lepidoptera','vegetables,tree fruit',1,4,75.0,3,TRUE,'IV',FALSE,'CAUTION','Reduced-risk; toxic to bees until dry'),
('Glyphosate','Roundup PowerMax','524-549','HRAC 9','glycine','non-selective herbicide (weeds)','glyphosate-tolerant corn/soy/cotton',7,12,1680.0,3,FALSE,'III',FALSE,'CAUTION','IARC 2A possible carcinogen; resistant weed pressure'),
('Atrazine','AAtrex 4L','100-497','HRAC 5','triazine','broadleaf weeds','corn,sorghum',60,12,2240.0,1,FALSE,'III',FALSE,'CAUTION','EU banned 2004; US water-quality restrictions'),
('Chlorpyrifos','Lorsban Advanced','62719-591','1B','organophosphate','broad spectrum soil & foliar pests','corn,wheat,citrus (RESTRICTED)',21,24,1120.0,1,TRUE,'II',FALSE,'DANGER','EPA banned food-use 2022; permitted only 11 commodities post-2024 reinstatement'),
('Malathion','Fyfanon ULV','67760-69','1B','organophosphate','broad spectrum (mosquito + boll weevil)','cotton (BWEP),vegetables',7,12,1200.0,3,TRUE,'III',FALSE,'WARNING','Boll Weevil Eradication Program standard'),
('Carbaryl','Sevin XLR Plus','264-334','1A','carbamate','Mexican bean beetle, Japanese beetle','corn,vegetables,turf',14,12,2240.0,4,TRUE,'II',FALSE,'WARNING','High bee toxicity'),
('Pyriproxyfen','Knack','71711-2','7C','juvenile-hormone mimic','whitefly nymphs, scale','cotton,citrus,vegetables',14,12,75.0,2,FALSE,'IV',FALSE,'CAUTION','IGR; embryo & molt inhibitor; bee-safe'),
('Buprofezin','Courier 40SC','71711-26','16','thiadiazine','whitefly, leafhoppers, scale','cotton,citrus,grape',14,12,420.0,2,FALSE,'IV',FALSE,'CAUTION','Chitin synthesis inhibitor; selective IGR'),
('Beauveria bassiana strain GHA','Mycotrol ESO','82074-3','UN-F','entomopathogenic fungus','whitefly, thrips, aphids, lygus','vegetables,strawberry,greenhouse',0,4,560.0,99,FALSE,'IV',TRUE,'CAUTION','OMRI; living organism — needs 50%+ humidity'),
('Isaria fumosorosea','PFR-97 20%WDG','70299-2','UN-F','entomopathogenic fungus','whitefly, thrips, aphids, psyllids','vegetables,citrus,greenhouse',0,4,1120.0,99,FALSE,'IV',TRUE,'CAUTION','OMRI; high humidity required'),
('Heterorhabditis bacteriophora','NemAttack','69592-2','UN','entomopathogenic nematode','corn rootworm, fungus gnats, weevils','corn,turf,nursery',0,0,0.0,99,FALSE,'IV',TRUE,'CAUTION','Apply to moist soil only; living organism'),
('Cydia pomonella granulovirus','Cyd-X','70051-9','31','baculovirus','codling moth larvae','apple,pear,walnut',0,4,150.0,99,FALSE,'IV',TRUE,'CAUTION','OMRI; species-specific virus'),
('Helicoverpa zea NPV','Heligen','70051-19','31','baculovirus','Helicoverpa zea, Heliothis virescens','cotton,corn,vegetables',0,4,180.0,99,FALSE,'IV',TRUE,'CAUTION','OMRI; species-specific NPV')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MRL tolerances — real EPA 40 CFR 180 tolerance values (ppm)
-- ============================================================================
INSERT INTO mrl_tolerances (crop, active_ingredient, mrl_ppm, cfr_section) VALUES
('corn','Chlorantraniliprole',0.04,'40 CFR 180.628(a)'),
('soybean','Chlorantraniliprole',0.05,'40 CFR 180.628(a)'),
('cotton','Chlorantraniliprole',0.4,'40 CFR 180.628(a)'),
('apple','Chlorantraniliprole',1.2,'40 CFR 180.628(a)'),
('corn','Spinosad',0.02,'40 CFR 180.495'),
('cotton','Spinosad',0.05,'40 CFR 180.495'),
('apple','Spinosad',0.2,'40 CFR 180.495'),
('tomato','Spinosad',0.4,'40 CFR 180.495'),
('corn','Imidacloprid',0.05,'40 CFR 180.472'),
('soybean','Imidacloprid',0.5,'40 CFR 180.472'),
('cotton','Imidacloprid',0.5,'40 CFR 180.472'),
('apple','Imidacloprid',0.5,'40 CFR 180.472'),
('tomato','Imidacloprid',0.5,'40 CFR 180.472'),
('corn','Lambda-cyhalothrin',0.02,'40 CFR 180.438'),
('soybean','Lambda-cyhalothrin',0.05,'40 CFR 180.438'),
('cotton','Lambda-cyhalothrin',0.5,'40 CFR 180.438'),
('corn','Bifenthrin',0.05,'40 CFR 180.442'),
('soybean','Bifenthrin',0.05,'40 CFR 180.442'),
('cotton','Bifenthrin',0.5,'40 CFR 180.442'),
('corn','Atrazine',0.25,'40 CFR 180.220'),
('sorghum','Atrazine',0.25,'40 CFR 180.220'),
('corn','Glyphosate',5.0,'40 CFR 180.364'),
('soybean','Glyphosate',20.0,'40 CFR 180.364'),
('cotton','Glyphosate',40.0,'40 CFR 180.364'),
('wheat','Glyphosate',30.0,'40 CFR 180.364'),
('corn','Chlorpyrifos',0.05,'40 CFR 180.342 (revoked food-use 2022, restored 11 commodities)'),
('wheat','Chlorpyrifos',0.5,'40 CFR 180.342'),
('cotton','Chlorpyrifos',0.05,'40 CFR 180.342'),
('apple','Methoxyfenozide',2.0,'40 CFR 180.544'),
('tomato','Methoxyfenozide',2.0,'40 CFR 180.544'),
('apple','Sulfoxaflor',0.6,'40 CFR 180.668'),
('cotton','Sulfoxaflor',0.4,'40 CFR 180.668'),
('strawberry','Sulfoxaflor',0.5,'40 CFR 180.668'),
('apple','Abamectin',0.02,'40 CFR 180.449'),
('strawberry','Abamectin',0.02,'40 CFR 180.449'),
('apple','Indoxacarb',0.6,'40 CFR 180.564'),
('cotton','Indoxacarb',0.5,'40 CFR 180.564'),
('apple','Flonicamid',0.4,'40 CFR 180.613'),
('cotton','Flonicamid',0.4,'40 CFR 180.613'),
('apple','Spirotetramat',0.7,'40 CFR 180.646'),
('citrus','Spirotetramat',0.6,'40 CFR 180.646')
ON CONFLICT (crop, active_ingredient, regulatory_body) DO NOTHING;

-- ============================================================================
-- Beneficial insects — real commercial biocontrol species + suppliers
-- ============================================================================
INSERT INTO beneficial_insects (common_name, scientific_name, category, target_pests, release_rate_per_ha, optimal_temp_c, supplier, price_usd_per_unit, unit_description, shelf_life_days, notes) VALUES
('Green Lacewing','Chrysoperla rufilabris','predator','aphids,thrips,mealybugs,whitefly,small caterpillars','25000-50000 eggs','18-32','Beneficial Insectary',45.00,'5,000 eggs on cards',7,'Larvae voracious; release as eggs near aphid colonies'),
('Convergent Lady Beetle','Hippodamia convergens','predator','aphids,scale','9000-12000 adults','15-30','ARBICO Organics',38.00,'1,500 adults',30,'Pre-conditioned to reduce dispersal; release at dusk'),
('Predatory Mite (Persimilis)','Phytoseiulus persimilis','predator','two-spotted spider mite,European red mite','5000-10000','20-27','Koppert Biological',95.00,'2,000 mites in vermiculite',14,'Releases must match Tetranychus density 1:10 to 1:50'),
('Predatory Mite (Swirskii)','Amblyseius swirskii','predator','thrips,whitefly,broad mite','250 per m2 (greenhouse)','22-30','Koppert Biological',78.00,'25,000 mites in bran sachets',28,'Effective on first-instar western flower thrips'),
('Minute Pirate Bug','Orius insidiosus','predator','thrips,aphids,spider mites,small caterpillars','2-5 per m2','18-30','Biobest USA',125.00,'500 adults',7,'Both nymphs & adults predaceous'),
('Aphid Parasitoid','Aphidius colemani','parasitoid','green peach aphid,cotton aphid,Aphis gossypii','1-2 mummies per m2 weekly','18-30','Koppert Biological',58.00,'500 mummies',5,'Mummified aphids hatch in 7-10 days; banker plants extend efficacy'),
('Larger Aphid Parasitoid','Aphidius ervi','parasitoid','potato aphid,foxglove aphid','1-2 mummies per m2','15-28','Biobest USA',62.00,'500 mummies',5,'Targets larger aphid species than A. colemani'),
('Whitefly Parasitoid','Encarsia formosa','parasitoid','greenhouse whitefly,silverleaf whitefly','3-9 per m2 (greenhouse)','18-30','Koppert Biological',85.00,'3,000 parasitized pupae on cards',7,'Female-only releases; degree-day driven'),
('Whitefly Parasitoid','Eretmocerus eremicus','parasitoid','Bemisia tabaci','3-6 per m2','18-30','Biobest USA',88.00,'3,000 parasitized pupae',7,'Higher heat tolerance than Encarsia — better for desert SW'),
('Corn Borer Parasitoid','Trichogramma ostriniae','parasitoid','European corn borer','75,000-150,000 eggs per acre','20-30','IPM Laboratories',45.00,'30,000 parasitized eggs',14,'Synchronize with first ECB moth flight; multiple releases'),
('Codling Moth Parasitoid','Trichogramma platneri','parasitoid','codling moth,leafrollers','150,000-300,000 eggs per acre','18-28','Beneficial Insectary',65.00,'30,000 eggs on cards',14,'Aerial release in orchards via drones'),
('Corn Earworm Parasitoid','Trichogramma pretiosum','parasitoid','corn earworm,bollworm,tomato hornworm','75,000 eggs per acre','18-30','IPM Laboratories',45.00,'30,000 eggs',14,'Most studied Trichogramma species; broad host range'),
('Colorado Beetle Parasitoid','Edovum puttleri','parasitoid','Colorado potato beetle','5000 adults per ha','20-28','Biobest USA',120.00,'500 adults',5,'Egg parasitoid; warm-season biocontrol'),
('Mexican Bean Beetle Parasitoid','Pediobius foveolatus','parasitoid','Mexican bean beetle larvae','500 wasps per acre per release','22-30','Univ Maryland Extension',55.00,'500 adults',5,'Requires warm temps; multi-release schedule'),
('Stink Bug Parasitoid','Trissolcus japonicus','parasitoid','brown marmorated stink bug','Naturally established (do not commercially release outside permitted areas)','18-32','USDA-permitted only',0.00,'(research distribution)',0,'Adventive populations established in mid-Atlantic states'),
('Squash Bug Parasitoid','Trichopoda pennipes','parasitoid','squash bug,leaf-footed bug','Conserve natural populations','20-30','(conservation only)',0.00,'(habitat management)',0,'Plant insectary strips of dill, fennel, sweet alyssum'),
('Beneficial Nematode (Hb)','Heterorhabditis bacteriophora','entomopathogenic','wireworms,white grubs,corn rootworm','2.5 billion infective juveniles per ha','15-25 soil','Arbico Organics',150.00,'250 million IJs',14,'Apply to moist soil; UV-sensitive — apply dusk/dawn'),
('Beneficial Nematode (Sf)','Steinernema feltiae','entomopathogenic','fungus gnats,thrips pupae,flea larvae','2.5 billion IJs per ha','10-25 soil','Koppert Biological',145.00,'250 million IJs',14,'Cool-soil specialist; greenhouse pupal control'),
('Beneficial Nematode (Sc)','Steinernema carpocapsae','entomopathogenic','codling moth larvae (cocoons),black cutworm','2.5 billion IJs per ha','15-30','Arbico Organics',150.00,'250 million IJs',14,'Ambush forager — surface pests'),
('Predatory Stink Bug','Podisus maculiventris','predator','Colorado potato beetle,cabbage looper','2500 adults per ha','18-30','Beneficial Insectary',180.00,'250 adults',7,'Spined soldier bug; broad lepidoptera predator'),
('Hover Fly','Eupeodes americanus','predator','aphids','Plant insectary strips (sweet alyssum, buckwheat)','15-30','(conservation)',0.00,'(habitat)',0,'Larvae predaceous on aphids; adults need nectar/pollen'),
('Mealybug Destroyer','Cryptolaemus montrouzieri','predator','mealybugs,scale','2500-5000 adults per ha','20-30','Biobest USA',220.00,'250 adults',7,'Australian lady beetle; tropical-greenhouse use'),
('Soldier Beetle','Chauliognathus pennsylvanicus','predator','aphids,small caterpillars,grasshopper eggs','(conservation; plant goldenrod, milkweed)','15-30','(habitat)',0.00,'(insectary strips)',0,'Conserve by planting late-summer nectar plants'),
('Ground Beetle','Pterostichus spp.','predator','soil-dwelling pests,slugs,cutworm pupae','(conservation: no-till, cover crops, beetle banks)','5-25','(habitat)',0.00,'(habitat)',0,'Beetle banks (raised tussock strips) 20m long boost populations 10x')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Crop rotation rules — real extension recommendations
-- ============================================================================
INSERT INTO rotation_rules (prev_crop, next_crop, recommendation, rationale, pest_cycle_break, nitrogen_balance) VALUES
('corn','corn','avoid','Continuous corn favors corn rootworm (Diabrotica) — yield drag 5-15%; high nitrogen demand; residue mgmt issues','None; rootworm completes life cycle','Heavy N user → heavy N user (deficit)'),
('corn','soybean','excellent','Classic 2-yr rotation; breaks WCR cycle (>90% reduction); soybean fixes 50-100 lb N/ac','Corn rootworm cannot survive on soybean roots','Demand → fixation (positive)'),
('corn','wheat','good','Breaks corn pest cycle; allows fall cover crop seeding','ECB, corn rootworm cycle disrupted','Demand → moderate demand'),
('corn','alfalfa','excellent','3+ yr alfalfa builds soil N (150-250 lb/ac); deep roots improve subsoil','All corn-specific pests eliminated','Demand → strong fixation'),
('soybean','corn','excellent','Reverse of classic rotation; soybean N credit ~40 lb/ac','Soybean aphid, SCN cycle broken','Fixation → demand (balanced)'),
('soybean','soybean','avoid','Soybean cyst nematode (Heterodera glycines) populations explode; sudden death syndrome','SCN cycle continues; SDS Fusarium','Fixation → fixation (no demand)'),
('soybean','wheat','good','Wheat can follow soybean in same calendar year (double-crop in SE)','Soybean pest pressure released','Fixation → demand (good)'),
('wheat','soybean','excellent','Standard wheat-soybean double-crop pattern','Hessian fly cycle broken; wheat stem sawfly disrupted','Demand → fixation'),
('wheat','wheat','avoid','Hessian fly, take-all (Gaeumannomyces) build up; allelopathy','Hessian fly persists; root diseases','Demand → demand (depletion)'),
('wheat','corn','good','Standard winter wheat → corn rotation','Wheat pests released','Demand → demand (manage N)'),
('cotton','corn','good','Breaks cotton-bollworm cycle; deep cotton roots leave subsoil structure','Heliothis, lygus cycle reduced','Demand → demand'),
('cotton','soybean','excellent','Soybean fixes N for following cotton; breaks bollworm','Bollworm cycle broken; reniform nematode reduced','Demand → fixation'),
('cotton','cotton','avoid','Boll weevil (BWEP zones), reniform nematode, Verticillium wilt build up','Pest cycles continue','Demand → demand'),
('potato','corn','excellent','Breaks Colorado potato beetle, late blight, common scab cycles','CPB starves; Phytophthora reduced','Heavy demand → demand'),
('potato','potato','avoid','Verticillium wilt, scab, CPB all build to severe levels','Multiple pest cycles persist','Demand → demand'),
('potato','alfalfa','excellent','3-yr alfalfa break used in seed-potato production for nematode/disease control','Globodera, Verticillium reduced 90%','Demand → strong fixation'),
('rice','soybean','excellent','Rotation w/ soybean breaks rice water weevil, rice blast; soybean tolerates flood-stressed soil','Lissorhoptrus, Pyricularia broken','Demand → fixation'),
('rice','rice','acceptable','Rice can monocrop with flooding (unique pest mgmt); but stem borer + blast pressure grows','Stem borer, sheath blight build','Demand → demand'),
('sorghum','corn','good','Sorghum-corn rotation common in plains; both cereal but different pests','Sugarcane aphid (sorghum) released','Demand → demand'),
('alfalfa','corn','excellent','Alfalfa N credit 150-250 lb/ac for following corn','Alfalfa weevil released; corn benefits','Strong fixation → demand'),
('sunflower','wheat','good','Sunflower beetle cycle broken; deep tap roots','Cylindrocopturus, head moth broken','Demand → demand'),
('canola','wheat','excellent','Brassica-cereal rotation breaks Fusarium, clubroot; canola allelopathy suppresses weeds','Sclerotinia, blackleg cycle broken','Demand → demand'),
('canola','canola','avoid','Clubroot (Plasmodiophora) and blackleg (Leptosphaeria) build rapidly','Multiple Brassica pathogens','Demand → demand'),
('tomato','corn','excellent','Breaks bacterial wilt, Verticillium, tomato hornworm','Multiple soil pathogens reduced','Heavy demand → demand'),
('tomato','tomato','avoid','Bacterial wilt, root-knot nematode, Verticillium','Solanaceae pathogens persist','Demand → demand')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Sample timeseries sensor readings — for anomaly detector (last 14 days)
-- ============================================================================
INSERT INTO sensor_readings (sensor_id, field_id, metric, value, recorded_at)
SELECT s.id, s.field_id, 'soil_moisture_pct',
       25 + (random()*15) + 5*sin(extract(epoch from (NOW() - INTERVAL '1 day' * g))/86400.0),
       NOW() - INTERVAL '1 hour' * g
FROM sensors s, generate_series(0, 336, 6) g
WHERE s.device_type='soil_moisture';

INSERT INTO sensor_readings (sensor_id, field_id, metric, value, recorded_at)
SELECT s.id, s.field_id, 'soil_temp_c',
       18 + (random()*4) + 3*sin(extract(epoch from (NOW() - INTERVAL '1 hour' * g))/86400.0),
       NOW() - INTERVAL '1 hour' * g
FROM sensors s, generate_series(0, 168, 3) g
WHERE s.device_type='temperature';

-- Inject a few real anomalies (very wet sensor + low-battery temp + dry zone)
INSERT INTO sensor_readings (sensor_id, field_id, metric, value, recorded_at) VALUES
((SELECT id FROM sensors WHERE field_id=6 AND device_type='soil_moisture' LIMIT 1), 6, 'soil_moisture_pct', 78.4, NOW() - INTERVAL '2 hours'),
((SELECT id FROM sensors WHERE field_id=6 AND device_type='soil_moisture' LIMIT 1), 6, 'soil_moisture_pct', 75.1, NOW() - INTERVAL '4 hours'),
((SELECT id FROM sensors WHERE field_id=3 AND device_type='temperature' LIMIT 1), 3, 'soil_temp_c', 38.4, NOW() - INTERVAL '1 hour'),
((SELECT id FROM sensors WHERE field_id=11 AND device_type='temperature' LIMIT 1), 11, 'battery_v', 2.4, NOW() - INTERVAL '6 hours');
