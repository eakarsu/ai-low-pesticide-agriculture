# _AUDIT_NOTE — ai-low-pesticide-agriculture (AgriSense)

## Stack
- node-express (backend, port 3001) + react/vite (frontend, port 5173)
- Postgres database `agri_db`
- Auth: JWT, login `admin@demo.com` / `demo123`
- LLM helper: existing `callAI` in `backend/routes/ai.js` (OpenRouter, model `anthropic/claude-haiku-4.5`)

## Feature add (8 features)

### AI features (5)
1. **Spray-Window Predictor** — `POST /api/ai/spray-window`
   - Reads field + recent `weather_data`, returns optimal low-drift spray windows
   - BE: `backend/routes/ai_extra.js`
   - FE: `frontend/src/components/SprayWindowPage.tsx` at `/ai/spray-window`
2. **Pesticide Residue Risk Scorer** — `POST /api/ai/residue-risk`
   - Reads recent `treatments` for a field + planned harvest date, scores residue risk and PHI/MRL compliance
   - BE: `backend/routes/ai_extra.js`
   - FE: `frontend/src/components/ResidueRiskPage.tsx` at `/ai/residue-risk`
3. **Soil Health Analyzer** — `POST /api/ai/soil-health`
   - Reads field + `health_reports` history + observations, returns regenerative practice plan
   - BE: `backend/routes/ai_extra.js`
   - FE: `frontend/src/components/SoilHealthPage.tsx` at `/ai/soil-health`
4. **Plant Disease Early-Warning** — `POST /api/ai/disease-early-warning`
   - Differential diagnosis from observed symptoms + recent `detections`
   - BE: `backend/routes/ai_extra.js`
   - FE: `frontend/src/components/DiseaseEarlyWarningPage.tsx` at `/ai/disease-early-warning`
5. **Beneficial Insect Identifier** — `POST /api/ai/beneficial-insects`
   - Identifies beneficials from scout notes, suggests habitat / spray-compat strategy
   - BE: `backend/routes/ai_extra.js`
   - FE: `frontend/src/components/BeneficialInsectsPage.tsx` at `/ai/beneficial-insects`

All 5 use a `callOpenRouter` helper that returns **HTTP 503** when `OPENROUTER_API_KEY` is missing; the FE pages render a visible amber 503 notice in that case.

### Utility features (3)
6. **CSV Export of Fields (main entity)** — `GET /api/utility/export/fields.csv`
   - BE: `backend/routes/utility.js`
   - FE: `frontend/src/components/ExportPage.tsx` at `/utility/export`
7. **Global Search + Filter** — `GET /api/utility/search?q=&type=&status=`
   - Searches fields, detections, treatments, health_reports, sensors
   - BE: `backend/routes/utility.js`
   - FE: `frontend/src/components/SearchPage.tsx` at `/utility/search`
8. **Activity Feed / Audit Log** — `GET /api/utility/activity?limit=`
   - Read-only timeline aggregated from existing tables (no new tables)
   - BE: `backend/routes/utility.js`
   - FE: `frontend/src/components/ActivityFeedPage.tsx` at `/utility/activity`

### Files touched
- Backend (new): `backend/routes/ai_extra.js`, `backend/routes/utility.js`
- Backend (modified, registration only): `backend/server.js`
- Frontend (new): `frontend/src/components/AIToolPage.tsx` (shared helper), `SprayWindowPage.tsx`, `ResidueRiskPage.tsx`, `SoilHealthPage.tsx`, `DiseaseEarlyWarningPage.tsx`, `BeneficialInsectsPage.tsx`, `ExportPage.tsx`, `SearchPage.tsx`, `ActivityFeedPage.tsx`
- Frontend (modified, additive): `frontend/src/App.tsx`, `frontend/src/components/Layout.tsx`, `frontend/src/api.ts`

### Notes
- Existing endpoints, auth, and DB schema were left untouched.
- No `npm install` / no new dependencies. No schema changes.
- All new backend files pass `node --check`. All new/changed frontend files pass `esbuild` parse.

## Smoke test (run after feature-add)
- backend started: PASS
- login: PASS
- new endpoint reachable (auth): PASS

## Sample data buttons

Added a "Sample Data" page (route `/admin/sample-data`, sidebar group "Dev Tools") with one button per main entity. Each button POSTs to a new JWT-protected endpoint that inserts 5–10 domain-realistic rows (low-pesticide / IPM / sustainable agriculture). Inserts are additive — no wipes.

### Files
- Backend (new): `backend/routes/sample_data.js` — `POST /api/admin/sample-data/:entity` returning `{inserted, entity}`
- Backend (modified, registration only): `backend/server.js` — `app.use('/api/admin', require('./routes/sample_data'))`
- Frontend (new): `frontend/src/components/SampleDataPage.tsx`
- Frontend (modified, additive): `frontend/src/App.tsx`, `frontend/src/components/Layout.tsx`

### Entities + button labels
- `fields` — "Add 8 sample fields" (CA strawberry, vineyard, almond, lettuce, walnut, apple, bell pepper, processing tomato)
- `detections` — "Add 8 sample detections" (codling moth, spider mite, lygus, NOW, aphid, thrips, armyworm, etc.)
- `treatments` — "Add 8 sample treatments" (pheromone disruption, Bt, neem, Spinosad OMRI, beneficial mites, kaolin clay, sanitation pruning, insecticidal soap)
- `health_reports` — "Add 7 sample health reports" (NDVI + yield estimates with scout/agronomist/drone reporters)
- `sensors` — "Add 8 sample sensors" (Sentek probes, Davis stations, Trapview, METER, DJI multispec, Semios)
- `weather_data` — "Add 8 sample weather rows" (CA growing regions with pest-risk index)

Whitelist enforced server-side; `users` / `audit_log` / unknown entity → HTTP 400. Missing token → HTTP 401. FK-safe: child entities auto-create parent `fields` rows when none exist yet.

### Smoke test (live)
- Login `admin@demo.com` / `demo123`: PASS (HTTP 200)
- All 6 entity endpoints: PASS (HTTP 200, `inserted` 7–8)
- Bad entity rejected: PASS (HTTP 400)
- Unauthenticated rejected: PASS (HTTP 401)

### Notes
- Existing endpoints, auth, schema untouched. No `npm install`.
- All new files pass `node --check` / `esbuild` parse.

## AI feature samples

Added sample-prefill buttons to every AI feature page so a user can click a sample chip and immediately run "Generate Analysis" without typing. The shared `AIToolPage` component already supported `samples?: SampleSpec[]`; this change adds the data and extends `AICenter.tsx` (which has its own inline form rendering) with the same pattern.

### Files modified (frontend, additive only)
- `frontend/src/components/SprayWindowPage.tsx` — 3 samples (codling moth / NOW / lygus)
- `frontend/src/components/ResidueRiskPage.tsx` — 3 samples (strawberry 7d / lettuce 14d / vineyard 30d)
- `frontend/src/components/SoilHealthPage.tsx` — 3 samples (sandy loam / clay loam / hillside)
- `frontend/src/components/DiseaseEarlyWarningPage.tsx` — 3 samples (powdery mildew / Verticillium / fire blight)
- `frontend/src/components/BeneficialInsectsPage.tsx` — 3 samples (lady beetles / parasitic wasps / lacewings)
- `frontend/src/components/AICenter.tsx` — extended `AITool` with optional `samples` and renders pill buttons; 3 samples for each of the 4 embedded tools (pest pattern, yield prediction, treatment plan, field summary)

Total: 27 samples across 9 AI tool surfaces. All values use real CA crops (strawberry, almond, vineyard, lettuce, apple), real pests (codling moth, navel orangeworm, lygus bug, vine mealybug), real diseases (powdery mildew, Verticillium wilt, fire blight), and real beneficials (lady beetles, Trichogramma, lacewings, syrphids).

### Smoke test (live)
- `pkill -9` + `./start.sh`: PASS
- backend port 3001 reachable: PASS
- login `admin@demo.com` / `demo123`: PASS (HTTP 200, JWT returned)
- Vite frontend bundle compile: PASS (`VITE v5.4.21  ready in 162 ms`)
- cleanup `pkill -9`: PASS

### Notes
- No existing logic changed beyond adding the `samples` prop / extending the `AITool` interface and adding the sample-pill render block in `AICenter`.
- No `npm install` / no new dependencies.
- All 6 modified files pass `npx esbuild` parse.
- Log: `/Users/erolakarsu/projects/_AUDIT/apply3_logs/samples_ai-low-pesticide-agriculture.md`

## Dashboard page

Added a real, data-driven Dashboard as the first sidebar item and the post-login landing route (`/` → `/dashboard`). The previous `Dashboard.tsx` was a hardcoded stub; replaced with a live-fetch implementation.

### Files
- Backend (new): `backend/routes/dashboard.js` — `GET /api/dashboard/stats` (JWT-protected) returns `{ counts, recent_activity }`. Counts cover fields total/active, active treatments, 7d + open detections, sensors total/online, health reports, avg field health, avg chemical savings %. `recent_activity` aggregates the latest 10 events across `detections`, `treatments`, `fields`, `health_reports` (no `audit_log` table in schema; same read-only aggregation pattern as `/api/utility/activity`).
- Backend (modified, registration only): `backend/server.js` — `app.use('/api/dashboard', require('./routes/dashboard'))`
- Frontend (rewritten): `frontend/src/components/Dashboard.tsx` — fetches `/api/dashboard/stats` on mount, renders 6 KPI cards (green/violet/amber/teal/emerald/stone), Recent Activity list with per-icon coloring + relative timestamps + "View all" link to `/utility/activity`, and 5 Quick Action cards (AI Center, Pest Detections, Treatment Plans, Fields, Sample Data). Skeleton loading + error states.
- Frontend (modified, additive): `frontend/src/components/Layout.tsx` — added `LayoutDashboard` icon and `{ path: '/dashboard', label: 'Dashboard' }` as the **first** `navItems` entry; `frontend/src/App.tsx` — imported `Dashboard`, changed default redirect from `/fields` → `/dashboard`, added `/dashboard` route. `Login.tsx` already routes to `/`, so post-login lands on the dashboard.

### Smoke test (live)
- `pkill -9` + `./start.sh`: PASS
- backend ready on port 3001: PASS
- login `admin@demo.com` / `demo123`: PASS (HTTP 200, JWT returned)
- `GET /api/dashboard/stats` with Bearer token: HTTP 200, real counts (e.g. `fields_total=15`, `detections_recent_7d=13`, `sensors_online=13/15`, `avg_field_health=72`) and 10 recent_activity events
- `node --check` (both backend files) + `npx esbuild` parse (Dashboard.tsx, Layout.tsx, App.tsx): PASS
- cleanup `pkill -9` + ports 3001/5173 free: PASS

### Notes
- Existing AI features, sample-prefill buttons, sample-data routes untouched.
- No `npm install` / no new dependencies; uses existing `lucide-react` + `react-router-dom`.
- Tailwind palette matches the rest of the app (green/emerald/amber/violet/teal/stone).
- Log: `/Users/erolakarsu/projects/_AUDIT/apply3_logs/dashboard_ai-low-pesticide-agriculture.md`

## Apply pass 7 (full backlog implementation)

### Unaddressed items found
The backend mounted 8 scaffolded route modules in `server.js` whose corresponding frontend pages existed under `frontend/src/pages/` but were not imported/routed in `App.tsx` and not surfaced in the sidebar `Layout.tsx`. End-users had no way to reach them through the UI.

### Wired (frontend route + sidebar entry, all under "Audit Deep-Dives")
- `/audit/coop-heatmaps`              → `CfCoopHeatmaps.tsx`            (POST `/api/cf-coop-heatmaps`)
- `/audit/drone-vision`               → `CfDroneVisionPipeline.tsx`     (POST `/api/cf-drone-vision-pipeline`)
- `/audit/federated-weather`          → `CfFederatedWeather.tsx`        (POST `/api/cf-federated-weather`)
- `/audit/image-upload`               → `GapImageUpload.tsx`            (POST `/api/gap-nonai-image-upload`)
- `/audit/multi-tenant-farms`         → `GapMultiTenantFarms.tsx`       (POST `/api/gap-nonai-multi-tenant-farms`)
- `/audit/notifications`              → `GapNotifications.tsx`          (POST `/api/gap-nonai-notifications`)
- `/audit/offline-sync`               → `GapOfflineSync.tsx`            (POST `/api/gap-nonai-offline-sync`)
- `/audit/weather-providers`          → `GapWeatherProviders.tsx`       (POST `/api/gap-nonai-weather-providers`)

### Files touched
- `frontend/src/App.tsx` — 8 new imports, 8 new `<Route>` entries (inserted before existing `/custom-views` route, well before the catch-all)
- `frontend/src/components/Layout.tsx` — 8 new `auditItems` entries with new lucide icons (`Map`, `Plane`, `Cloud`, `Image`, `Building2`, `Bell`, `RefreshCcw`, `Globe`)

### Constraints satisfied
- No new backend routes mounted (all 8 were already mounted in `server.js` before the 404 handler).
- No new tables / no migrations (existing scaffolds use in-memory or no persistence).
- No new dependencies (`lucide-react` already provides all icons).
- No edits to feature page JSX/TSX content — only routing/import wiring.
- `node --check` PASS on `backend/server.js` and the 8 mounted backend route files.
- `esbuild --bundle=false` parse PASS on `frontend/src/App.tsx` and `frontend/src/components/Layout.tsx`.

