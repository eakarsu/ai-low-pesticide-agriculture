import { useState, useEffect } from 'react';
import { Activity, MapPin, Bug, FlaskConical, FileBarChart2 } from 'lucide-react';
import { api } from '../api';

const ICONS: Record<string, React.ElementType> = {
  field: MapPin,
  pest: Bug,
  flask: FlaskConical,
  report: FileBarChart2,
};

const TYPE_BADGE: Record<string, string> = {
  field_created: 'bg-green-100 text-green-700',
  detection_open: 'bg-orange-100 text-orange-700',
  detection_treated: 'bg-amber-100 text-amber-700',
  treatment_completed: 'bg-purple-100 text-purple-700',
  treatment_scheduled: 'bg-violet-100 text-violet-700',
  health_report: 'bg-blue-100 text-blue-700',
};

export default function ActivityFeedPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.activityFeed(100);
      setEvents(r.events);
    } catch (e: any) {
      setError(e.message || 'Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Activity Feed</h2>
            <p className="text-gray-500 text-sm mt-0.5">Read-only timeline of recent events across fields, detections, treatments, and reports.</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading activity...</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No recent activity.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {events.map((e, i) => {
              const Icon = ICONS[e.icon] || Activity;
              return (
                <li key={`${e.type}-${e.entity_id}-${i}`} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[e.type] || 'bg-gray-100 text-gray-700'}`}>
                        {e.type}
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate">{e.title}</span>
                    </div>
                    {e.field_id && (
                      <div className="text-xs text-gray-500 mt-0.5">Field #{e.field_id}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0">
                    {e.timestamp ? new Date(e.timestamp).toLocaleString() : '—'}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
