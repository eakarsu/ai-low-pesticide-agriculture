import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Bug, FlaskConical, Cpu, Sparkles, FileBarChart2,
  Database, Leaf, Activity, TrendingUp, AlertTriangle, ChevronRight,
} from 'lucide-react';

type Counts = {
  fields_total: number;
  fields_active: number;
  treatments_active: number;
  detections_recent_7d: number;
  detections_open: number;
  sensors_total: number;
  sensors_online: number;
  health_reports_total: number;
  avg_field_health: number;
  avg_chemical_savings_pct: number;
};

type ActivityEvent = {
  type: string;
  icon: string;
  title: string;
  meta: string;
  timestamp: string | null;
};

type DashboardData = {
  counts: Counts;
  recent_activity: ActivityEvent[];
};

function formatRelative(ts: string | null) {
  if (!ts) return '-';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '-';
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function eventIcon(icon: string) {
  switch (icon) {
    case 'pest':
      return <Bug className="w-4 h-4 text-amber-600" />;
    case 'flask':
      return <FlaskConical className="w-4 h-4 text-violet-600" />;
    case 'field':
      return <MapPin className="w-4 h-4 text-green-600" />;
    case 'report':
      return <FileBarChart2 className="w-4 h-4 text-teal-600" />;
    default:
      return <Activity className="w-4 h-4 text-stone-500" />;
  }
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = localStorage.getItem('token') || '';
        const res = await fetch('/api/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        const json = (await res.json()) as DashboardData;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || 'Failed to load dashboard');
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const c = data?.counts;

  const kpis = c
    ? [
        {
          label: 'Fields Monitored',
          value: c.fields_total,
          sub: `${c.fields_active} active`,
          color: 'bg-green-50 border-green-200',
          valueColor: 'text-green-700',
          Icon: MapPin,
        },
        {
          label: 'Active Treatments',
          value: c.treatments_active,
          sub: `${c.avg_chemical_savings_pct}% avg chemical savings`,
          color: 'bg-violet-50 border-violet-200',
          valueColor: 'text-violet-700',
          Icon: FlaskConical,
        },
        {
          label: 'Detections (7d)',
          value: c.detections_recent_7d,
          sub: `${c.detections_open} untreated`,
          color: 'bg-amber-50 border-amber-200',
          valueColor: 'text-amber-700',
          Icon: Bug,
        },
        {
          label: 'Sensor Health',
          value: c.sensors_total > 0 ? `${c.sensors_online}/${c.sensors_total}` : '0/0',
          sub: c.sensors_total > 0 ? `${Math.round((c.sensors_online / c.sensors_total) * 100)}% online` : 'no devices',
          color: 'bg-teal-50 border-teal-200',
          valueColor: 'text-teal-700',
          Icon: Cpu,
        },
        {
          label: 'Avg Field Health',
          value: c.avg_field_health,
          sub: 'health score',
          color: 'bg-emerald-50 border-emerald-200',
          valueColor: 'text-emerald-700',
          Icon: Leaf,
        },
        {
          label: 'Health Reports',
          value: c.health_reports_total,
          sub: 'total filed',
          color: 'bg-stone-50 border-stone-200',
          valueColor: 'text-stone-700',
          Icon: FileBarChart2,
        },
      ]
    : [];

  const quickActions = [
    {
      to: '/ai-center',
      label: 'AI Center',
      desc: 'Pest analysis, yield prediction, plans',
      Icon: Sparkles,
      accent: 'bg-violet-100 text-violet-700',
      ring: 'hover:border-violet-300',
    },
    {
      to: '/detections',
      label: 'Pest Detections',
      desc: 'Review and triage open detections',
      Icon: Bug,
      accent: 'bg-amber-100 text-amber-700',
      ring: 'hover:border-amber-300',
    },
    {
      to: '/treatments',
      label: 'Treatment Plans',
      desc: 'Schedule and track applications',
      Icon: FlaskConical,
      accent: 'bg-green-100 text-green-700',
      ring: 'hover:border-green-300',
    },
    {
      to: '/fields',
      label: 'Fields',
      desc: 'Inventory, status, health scores',
      Icon: MapPin,
      accent: 'bg-emerald-100 text-emerald-700',
      ring: 'hover:border-emerald-300',
    },
    {
      to: '/admin/sample-data',
      label: 'Sample Data',
      desc: 'Seed demo rows for testing',
      Icon: Database,
      accent: 'bg-stone-100 text-stone-700',
      ring: 'hover:border-stone-300',
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Leaf className="w-6 h-6 text-green-600" />
            Farm Overview
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Live snapshot of fields, detections, treatments, and sensors.
          </p>
        </div>
        {c && c.detections_open > 0 && (
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            {c.detections_open} untreated detection{c.detections_open === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load dashboard: {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading && !error
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-stone-200 bg-white p-5 animate-pulse h-28" />
            ))
          : kpis.map((k) => (
              <div key={k.label} className={`rounded-xl border p-5 ${k.color}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-stone-500 font-medium uppercase tracking-wide">
                    {k.label}
                  </div>
                  <k.Icon className={`w-4 h-4 ${k.valueColor}`} />
                </div>
                <div className={`text-2xl font-bold ${k.valueColor}`}>{k.value}</div>
                <div className="text-xs text-stone-500 mt-1">{k.sub}</div>
              </div>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-600" />
              Recent Activity
            </h3>
            <Link to="/utility/activity" className="text-xs text-green-700 hover:text-green-800 font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <ul className="divide-y divide-stone-100">
            {loading && !error && (
              <li className="px-6 py-10 text-center text-sm text-stone-400">Loading…</li>
            )}
            {!loading && data && data.recent_activity.length === 0 && (
              <li className="px-6 py-10 text-center text-sm text-stone-400">
                No activity yet. Seed sample data to get started.
              </li>
            )}
            {data?.recent_activity.map((ev, i) => (
              <li key={i} className="px-6 py-3.5 flex items-start gap-3 hover:bg-stone-50 transition-colors">
                <div className="mt-0.5 w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                  {eventIcon(ev.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-stone-800 truncate">{ev.title}</div>
                  {ev.meta && <div className="text-xs text-stone-500 truncate">{ev.meta}</div>}
                </div>
                <div className="text-xs text-stone-400 whitespace-nowrap">{formatRelative(ev.timestamp)}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Quick Actions
            </h3>
          </div>
          <div className="p-3 space-y-2">
            {quickActions.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border border-stone-200 ${a.ring} bg-white transition-colors group`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.accent}`}>
                  <a.Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-stone-800">{a.label}</div>
                  <div className="text-xs text-stone-500 truncate">{a.desc}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
