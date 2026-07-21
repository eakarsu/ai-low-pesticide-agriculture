import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import FieldsPage from './components/Fields/FieldsPage';
import DetectionsPage from './components/Detections/DetectionsPage';
import TreatmentsPage from './components/Treatments/TreatmentsPage';
import HealthReportsPage from './components/HealthReports/HealthReportsPage';
import SensorsPage from './components/Sensors/SensorsPage';
import WeatherPage from './components/Weather/WeatherPage';
import AICenter from './components/AICenter';
import SprayWindowPage from './components/SprayWindowPage';
import ResidueRiskPage from './components/ResidueRiskPage';
import SoilHealthPage from './components/SoilHealthPage';
import DiseaseEarlyWarningPage from './components/DiseaseEarlyWarningPage';
import BeneficialInsectsPage from './components/BeneficialInsectsPage';
import ExportPage from './components/ExportPage';
import SearchPage from './components/SearchPage';
import ActivityFeedPage from './components/ActivityFeedPage';
import SampleDataPage from './components/SampleDataPage';
import Dashboard from './components/Dashboard';
import GapPestPhotoClassifier from './pages/GapPestPhotoClassifier';
import GapSensorAnomaly from './pages/GapSensorAnomaly';
import GapWeatherImpactForecast from './pages/GapWeatherImpactForecast';
import GapCropRotationPlanner from './pages/GapCropRotationPlanner';
import GapTreatmentEfficacyScore from './pages/GapTreatmentEfficacyScore';
import CfResidueAuditTrail from './pages/CfResidueAuditTrail';
import CfBiocontrolMarketplace from './pages/CfBiocontrolMarketplace';
import CfCoopHeatmaps from './pages/CfCoopHeatmaps';
import CfDroneVisionPipeline from './pages/CfDroneVisionPipeline';
import CfFederatedWeather from './pages/CfFederatedWeather';
import GapImageUpload from './pages/GapImageUpload';
import GapMultiTenantFarms from './pages/GapMultiTenantFarms';
import GapNotifications from './pages/GapNotifications';
import GapOfflineSync from './pages/GapOfflineSync';
import GapWeatherProviders from './pages/GapWeatherProviders';
import CustomViewsPage from './components/CustomViews/CustomViewsPage';
import FieldOperationsPage from './pages/FieldOperationsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const experimental = import.meta.env.DEV && import.meta.env.VITE_ENABLE_GENERATED_FEATURES === 'true';
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/fields" element={<FieldsPage />} />
                  <Route path="/detections" element={<DetectionsPage />} />
                  <Route path="/treatments" element={<TreatmentsPage />} />
                  <Route path="/health-reports" element={<HealthReportsPage />} />
                  <Route path="/sensors" element={<SensorsPage />} />
                  <Route path="/weather" element={<WeatherPage />} />
                  <Route path="/field-operations" element={<FieldOperationsPage />} />
                  {experimental && <Route path="/ai-center" element={<AICenter />} />}
                  {experimental && <Route path="/ai/spray-window" element={<SprayWindowPage />} />}
                  {experimental && <Route path="/ai/residue-risk" element={<ResidueRiskPage />} />}
                  {experimental && <Route path="/ai/soil-health" element={<SoilHealthPage />} />}
                  {experimental && <Route path="/ai/disease-early-warning" element={<DiseaseEarlyWarningPage />} />}
                  {experimental && <Route path="/ai/beneficial-insects" element={<BeneficialInsectsPage />} />}
                  <Route path="/utility/export" element={<ExportPage />} />
                  <Route path="/utility/search" element={<SearchPage />} />
                  <Route path="/utility/activity" element={<ActivityFeedPage />} />
                  {experimental && <Route path="/admin/sample-data" element={<SampleDataPage />} />}
                  {experimental && <Route path="/audit/pest-photo-classifier" element={<GapPestPhotoClassifier />} />}
                  {experimental && <Route path="/audit/sensor-anomaly" element={<GapSensorAnomaly />} />}
                  {experimental && <Route path="/audit/spray-window" element={<GapWeatherImpactForecast />} />}
                  {experimental && <Route path="/audit/crop-rotation" element={<GapCropRotationPlanner />} />}
                  {experimental && <Route path="/audit/treatment-efficacy" element={<GapTreatmentEfficacyScore />} />}
                  {experimental && <Route path="/audit/residue-audit" element={<CfResidueAuditTrail />} />}
                  {experimental && <Route path="/audit/biocontrol-market" element={<CfBiocontrolMarketplace />} />}
                  {experimental && <Route path="/audit/coop-heatmaps" element={<CfCoopHeatmaps />} />}
                  {experimental && <Route path="/audit/drone-vision" element={<CfDroneVisionPipeline />} />}
                  {experimental && <Route path="/audit/federated-weather" element={<CfFederatedWeather />} />}
                  {experimental && <Route path="/audit/image-upload" element={<GapImageUpload />} />}
                  {experimental && <Route path="/audit/multi-tenant-farms" element={<GapMultiTenantFarms />} />}
                  {experimental && <Route path="/audit/notifications" element={<GapNotifications />} />}
                  {experimental && <Route path="/audit/offline-sync" element={<GapOfflineSync />} />}
                  {experimental && <Route path="/audit/weather-providers" element={<GapWeatherProviders />} />}
                  {experimental && <Route path="/custom-views" element={<CustomViewsPage />} />}
                </Routes>
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
