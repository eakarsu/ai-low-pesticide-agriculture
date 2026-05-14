import { useState } from 'react';
import { Database, MapPin, Bug, FlaskConical, FileBarChart2, Cpu, CloudRain, CheckCircle2, AlertCircle } from 'lucide-react';

type EntityKey = 'fields' | 'detections' | 'treatments' | 'health_reports' | 'sensors' | 'weather_data';

type EntityDef = {
  key: EntityKey;
  label: string;
  buttonLabel: string;
  description: string;
  icon: React.ElementType;
  color: string; // tailwind bg+text class fragment
};

const ENTITIES: EntityDef[] = [
  { key: 'fields',         label: 'Fields',         buttonLabel: 'Add 8 sample fields',         description: 'Realistic CA crop fields (strawberry, vineyard, almond, lettuce…).',     icon: MapPin,         color: 'green' },
  { key: 'detections',     label: 'Pest Detections',buttonLabel: 'Add 8 sample detections',     description: 'Codling moth, spider mite, lygus bug, and other common pests.',          icon: Bug,            color: 'orange' },
  { key: 'treatments',     label: 'Treatments',     buttonLabel: 'Add 8 sample treatments',     description: 'IPM-first: pheromone disruption, Bt, neem oil, beneficial mites, etc.',  icon: FlaskConical,   color: 'violet' },
  { key: 'health_reports', label: 'Health Reports', buttonLabel: 'Add 7 sample health reports', description: 'NDVI + yield estimates + scout notes, dated within last 21 days.',       icon: FileBarChart2,  color: 'blue' },
  { key: 'sensors',        label: 'Sensor Devices', buttonLabel: 'Add 8 sample sensors',        description: 'Soil moisture probes, weather stations, NDVI drones, smart traps.',      icon: Cpu,            color: 'cyan' },
  { key: 'weather_data',   label: 'Weather Data',   buttonLabel: 'Add 8 sample weather rows',   description: 'Recent observations w/ pest-risk index across CA growing regions.',      icon: CloudRain,      color: 'sky' },
];

const colorMap: Record<string, { btn: string; iconBg: string }> = {
  green:  { btn: 'bg-green-600 hover:bg-green-700',   iconBg: 'bg-green-100 text-green-600' },
  orange: { btn: 'bg-orange-600 hover:bg-orange-700', iconBg: 'bg-orange-100 text-orange-600' },
  violet: { btn: 'bg-violet-600 hover:bg-violet-700', iconBg: 'bg-violet-100 text-violet-600' },
  blue:   { btn: 'bg-blue-600 hover:bg-blue-700',     iconBg: 'bg-blue-100 text-blue-600' },
  cyan:   { btn: 'bg-cyan-600 hover:bg-cyan-700',     iconBg: 'bg-cyan-100 text-cyan-600' },
  sky:    { btn: 'bg-sky-600 hover:bg-sky-700',       iconBg: 'bg-sky-100 text-sky-600' },
};

export default function SampleDataPage() {
  const [busy, setBusy] = useState<EntityKey | null>(null);
  const [results, setResults] = useState<Partial<Record<EntityKey, { ok: boolean; msg: string }>>>({});

  const seed = async (entity: EntityKey) => {
    setBusy(entity);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/admin/sample-data/${entity}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResults(r => ({ ...r, [entity]: { ok: false, msg: json.error || `HTTP ${res.status}` } }));
      } else {
        setResults(r => ({ ...r, [entity]: { ok: true, msg: `+${json.inserted} rows added` } }));
      }
    } catch (e: any) {
      setResults(r => ({ ...r, [entity]: { ok: false, msg: e.message || 'Request failed' } }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sample Data</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Populate the database with realistic low-pesticide / IPM domain rows. Inserts are additive — existing data is never wiped.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
        {ENTITIES.map(({ key, label, buttonLabel, description, icon: Icon, color }) => {
          const c = colorMap[color];
          const result = results[key];
          const isBusy = busy === key;
          return (
            <div key={key} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{description}</div>
                </div>
              </div>

              <button
                onClick={() => seed(key)}
                disabled={isBusy}
                className={`mt-2 ${c.btn} disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2`}
              >
                {isBusy ? 'Inserting…' : buttonLabel}
              </button>

              {result && (
                <div
                  className={`mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                    result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {result.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{result.msg}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 max-w-5xl text-xs text-gray-500">
        Tip: After seeding, navigate to the matching feature page (Fields, Pest Detections, etc.) to see the new rows.
      </div>
    </div>
  );
}
