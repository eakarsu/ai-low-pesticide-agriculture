import { useEffect, useState } from 'react';
import { Cpu, RefreshCcw, AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';

async function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token') || '';
  const r = await fetch(`/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Request failed');
  return r.json();
}

export default function GapSensorAnomaly() {
  const [scan, setScan] = useState<any>(null);
  const [hist, setHist] = useState<any[]>([]);
  const [windowHours, setWindowHours] = useState(72);
  const [zthresh, setZthresh] = useState(2.5);
  const [fieldId, setFieldId] = useState<string>('');
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/fields').then(setFields).catch(() => {});
    api('/gap-ai-sensor-anomaly/anomalies').then(setHist).catch(() => {});
  }, []);

  async function runScan() {
    setLoading(true); setError(''); setScan(null);
    try {
      const r = await api('/gap-ai-sensor-anomaly/scan', {
        method: 'POST',
        body: JSON.stringify({ field_id: fieldId ? Number(fieldId) : null, window_hours: Number(windowHours), zthresh: Number(zthresh) }),
      });
      setScan(r);
      api('/gap-ai-sensor-anomaly/anomalies').then(setHist).catch(() => {});
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  const sevColor = (s: string) => ({ info: 'bg-blue-50 text-blue-700 border-blue-200', warning: 'bg-amber-50 text-amber-700 border-amber-200', critical: 'bg-red-50 text-red-700 border-red-200' } as any)[s] || 'bg-gray-50 text-gray-700';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-1"><Cpu className="text-blue-600" />Sensor Anomaly Detection</h1>
      <p className="text-sm text-gray-500 mb-6">Run rolling z-score + crop-physiology range checks on the last N hours of sensor readings (soil moisture, soil temperature, leaf wetness, battery).</p>

      <div className="bg-white border rounded-xl p-5 mb-6 shadow-sm flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs uppercase text-gray-500 mb-1">Field (optional)</label>
          <select value={fieldId} onChange={e => setFieldId(e.target.value)} className="border rounded px-3 py-2 text-sm">
            <option value="">All fields</option>
            {fields.map(f => <option key={f.id} value={f.id}>{f.name} ({f.crop_type})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase text-gray-500 mb-1">Window hours</label>
          <input type="number" value={windowHours} onChange={e => setWindowHours(Number(e.target.value))} className="border rounded px-3 py-2 text-sm w-24" />
        </div>
        <div>
          <label className="block text-xs uppercase text-gray-500 mb-1">z-score threshold</label>
          <input type="number" step="0.1" value={zthresh} onChange={e => setZthresh(Number(e.target.value))} className="border rounded px-3 py-2 text-sm w-24" />
        </div>
        <button onClick={runScan} disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm flex items-center gap-2">
          {loading && <RefreshCcw className="w-4 h-4 animate-spin" />}
          {loading ? 'Scanning...' : 'Run anomaly scan'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>}

      {scan && (
        <div className="bg-white border rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Scan result</h2>
            <div className="text-xs text-gray-500">scanned {scan.scanned_readings} readings · {scan.groups_evaluated} groups · <b className={scan.anomalies_count ? 'text-red-600' : 'text-green-600'}>{scan.anomalies_count} anomalies</b></div>
          </div>
          {scan.llm_summary && <div className="bg-violet-50 border border-violet-200 rounded p-3 text-sm text-violet-900 mb-3">{scan.llm_summary}</div>}
          <div className="space-y-2">
            {scan.anomalies.map((a: any, i: number) => (
              <div key={i} className={`border rounded-lg p-3 ${sevColor(a.severity)}`}>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1">
                    {a.observed_value > (a.expected_range?.[1] ?? 0) ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {a.field_name} · {a.metric}
                  </span>
                  <span>z={a.zscore} · obs {a.observed_value}</span>
                </div>
                <p className="text-sm mt-1">{a.hypothesis}</p>
                <p className="text-xs mt-1 italic">Action: {a.recommended_action}</p>
              </div>
            ))}
            {scan.anomalies.length === 0 && <p className="text-sm text-gray-500">No anomalies detected in window.</p>}
          </div>
        </div>
      )}

      <div className="bg-white border rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3"><AlertCircle className="text-amber-500 w-5 h-5" />Historical anomalies (last 100)</h2>
        {hist.length === 0 ? <p className="text-sm text-gray-500">No anomalies recorded.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500 border-b">
              <tr><th className="py-2">When</th><th>Field</th><th>Metric</th><th>Value</th><th>z</th><th>Severity</th></tr>
            </thead>
            <tbody>{hist.map((h: any) => (
              <tr key={h.id} className="border-b last:border-0">
                <td className="py-2 text-xs text-gray-500">{new Date(h.detected_at).toLocaleString()}</td>
                <td className="text-gray-800">{h.field_name}</td>
                <td className="text-gray-700">{h.metric}</td>
                <td className="font-mono text-gray-700">{Number(h.observed_value).toFixed(2)}</td>
                <td className="font-mono text-gray-700">{Number(h.zscore).toFixed(2)}</td>
                <td><span className={`px-2 py-0.5 rounded text-xs border ${sevColor(h.severity)}`}>{h.severity}</span></td>
              </tr>))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
