import { useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../api';

const ENTITY_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'fields', label: 'Fields' },
  { value: 'detections', label: 'Detections' },
  { value: 'treatments', label: 'Treatments' },
  { value: 'health_reports', label: 'Health Reports' },
  { value: 'sensors', label: 'Sensors' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Any status (fields)' },
  { value: 'active', label: 'Active' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'fallow', label: 'Fallow' },
];

const ENTITY_BADGE: Record<string, string> = {
  field: 'bg-green-100 text-green-700',
  detection: 'bg-orange-100 text-orange-700',
  treatment: 'bg-purple-100 text-purple-700',
  health_report: 'bg-blue-100 text-blue-700',
  sensor: 'bg-slate-100 text-slate-700',
};

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await api.globalSearch(q, type, status);
      setResults(r.results);
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
          <Search className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Global Search</h2>
          <p className="text-gray-500 text-sm mt-0.5">Search across fields, detections, treatments, health reports, and sensors.</p>
        </div>
      </div>

      <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Search query</label>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="aphid, north field, copper, ..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Entity</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {ENTITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Field status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {hasSearched && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {results.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No matches.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Label</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Detail</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map((r, i) => (
                  <tr key={`${r.entity}-${r.id}-${i}`}>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ENTITY_BADGE[r.entity] || 'bg-gray-100 text-gray-700'}`}>
                        {r.entity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.label}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.sub}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.status || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.score ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
