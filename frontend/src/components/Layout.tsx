import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Leaf, MapPin, Bug, FlaskConical, FileBarChart2,
  Cpu, CloudRain, Sparkles, LogOut, User,
  Wind, ShieldAlert, Mountain, Stethoscope,
  Download, Search, Activity, Database, LayoutDashboard,
  Camera, Gauge, Repeat, TrendingDown, ShoppingCart,
  LayoutGrid, Map, Plane, Cloud, Image, Building2,
  Bell, RefreshCcw, Globe
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/fields', label: 'Fields', icon: MapPin },
  { path: '/detections', label: 'Pest Detections', icon: Bug },
  { path: '/treatments', label: 'Treatment Plans', icon: FlaskConical },
  { path: '/health-reports', label: 'Health Reports', icon: FileBarChart2 },
  { path: '/sensors', label: 'Sensor Devices', icon: Cpu },
  { path: '/weather', label: 'Weather', icon: CloudRain },
];

const aiItems = [
  { path: '/ai-center', label: 'AI Center', icon: Sparkles },
  { path: '/ai/spray-window', label: 'Spray Window', icon: Wind },
  { path: '/ai/residue-risk', label: 'Residue Risk', icon: ShieldAlert },
  { path: '/ai/soil-health', label: 'Soil Health', icon: Mountain },
  { path: '/ai/disease-early-warning', label: 'Disease Warning', icon: Stethoscope },
  { path: '/ai/beneficial-insects', label: 'Beneficial Insects', icon: Bug },
];

const utilItems = [
  { path: '/utility/search', label: 'Global Search', icon: Search },
  { path: '/utility/export', label: 'Export CSV', icon: Download },
  { path: '/utility/activity', label: 'Activity Feed', icon: Activity },
];

const auditItems = [
  { path: '/audit/pest-photo-classifier', label: 'Pest Classifier', icon: Camera },
  { path: '/audit/sensor-anomaly', label: 'Sensor Anomaly', icon: Gauge },
  { path: '/audit/spray-window', label: 'Spray Window', icon: Wind },
  { path: '/audit/crop-rotation', label: 'Rotation Planner', icon: Repeat },
  { path: '/audit/treatment-efficacy', label: 'Efficacy Score', icon: TrendingDown },
  { path: '/audit/residue-audit', label: 'Residue / MRL', icon: ShieldAlert },
  { path: '/audit/biocontrol-market', label: 'Biocontrol Market', icon: ShoppingCart },
  { path: '/audit/coop-heatmaps', label: 'Coop Heatmaps', icon: Map },
  { path: '/audit/drone-vision', label: 'Drone Vision', icon: Plane },
  { path: '/audit/federated-weather', label: 'Federated Weather', icon: Cloud },
  { path: '/audit/image-upload', label: 'Image Upload', icon: Image },
  { path: '/audit/multi-tenant-farms', label: 'Multi-Tenant Farms', icon: Building2 },
  { path: '/audit/notifications', label: 'Notifications', icon: Bell },
  { path: '/audit/offline-sync', label: 'Offline Sync', icon: RefreshCcw },
  { path: '/audit/weather-providers', label: 'Weather Providers', icon: Globe },
];

const adminItems = [
  { path: '/admin/sample-data', label: 'Sample Data', icon: Database },
];

const customItems = [
  { path: '/custom-views', label: 'Field Views', icon: LayoutGrid },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const pageTitle = [...navItems, ...aiItems, ...utilItems, ...auditItems, ...adminItems, ...customItems].find(i => location.pathname.startsWith(i.path))?.label || 'AgriSense';

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-gray-900 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">AgriSense</div>
              <div className="text-gray-400 text-xs">Low-Pesticide AI Platform</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">Features</div>
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                location.pathname.startsWith(path)
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2 mt-4">AI Tools</div>
          {aiItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                location.pathname === path || (path !== '/ai-center' && location.pathname.startsWith(path))
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2 mt-4">Utilities</div>
          {utilItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                location.pathname.startsWith(path)
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2 mt-4">Audit Deep-Dives</div>
          {auditItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                location.pathname.startsWith(path)
                  ? 'bg-rose-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2 mt-4">Custom</div>
          {customItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                location.pathname.startsWith(path)
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2 mt-4">Dev Tools</div>
          {adminItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors ${
                location.pathname.startsWith(path)
                  ? 'bg-amber-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user.name || 'User'}</div>
              <div className="text-xs text-gray-500 truncate">{user.email}</div>
            </div>
            <button onClick={logout} className="text-gray-500 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user.name}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
