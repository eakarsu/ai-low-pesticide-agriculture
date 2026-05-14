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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
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
                  <Route path="/ai-center" element={<AICenter />} />
                  <Route path="/ai/spray-window" element={<SprayWindowPage />} />
                  <Route path="/ai/residue-risk" element={<ResidueRiskPage />} />
                  <Route path="/ai/soil-health" element={<SoilHealthPage />} />
                  <Route path="/ai/disease-early-warning" element={<DiseaseEarlyWarningPage />} />
                  <Route path="/ai/beneficial-insects" element={<BeneficialInsectsPage />} />
                  <Route path="/utility/export" element={<ExportPage />} />
                  <Route path="/utility/search" element={<SearchPage />} />
                  <Route path="/utility/activity" element={<ActivityFeedPage />} />
                  <Route path="/admin/sample-data" element={<SampleDataPage />} />
                  <Route path="/audit/pest-photo-classifier" element={<GapPestPhotoClassifier />} />
                  <Route path="/audit/sensor-anomaly" element={<GapSensorAnomaly />} />
                  <Route path="/audit/spray-window" element={<GapWeatherImpactForecast />} />
                  <Route path="/audit/crop-rotation" element={<GapCropRotationPlanner />} />
                  <Route path="/audit/treatment-efficacy" element={<GapTreatmentEfficacyScore />} />
                  <Route path="/audit/residue-audit" element={<CfResidueAuditTrail />} />
                  <Route path="/audit/biocontrol-market" element={<CfBiocontrolMarketplace />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
