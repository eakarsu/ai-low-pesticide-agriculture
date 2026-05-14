import { useEffect, useState } from 'react';
import { Wind, RefreshCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';

async function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token') || '';
  const r = await fetch(`/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Request failed');
  return r.json();
}

export default function GapWeatherImpactForecast() {
  const [fields, setFields] = useState<any[]>([]);
  const [pesticides, setPesticides] = useState<any[]>([]);
  const [form, setForm] = useState({ field_id: '', pesticide_id: '', hour_of_day: new Date().getHours() });
  const [result, setResult] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/fields').then(setFields).catch(() => {});
    api('/gap-ai-weather-impact-forecast/pesticides').then(setPesticides).catch(() => {});
    api('/gap-ai-weather-impact-forecast/recent-events').then(setRecent).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await api('/gap-ai-weather-impact-forecast/window', {
        method: 'POST',
        body: JSON.stringify({
          field_id: Number(form.field_id),
          pesticide_id: form.pesticide_id ? Number(form.pesticide_id) : null,
          hour_of_day: Number(form.hour_of_day),
        }),
      });
      setResult(r);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  const gradeStyle = (g: string) => ({
    'GO': 'bg-green-100 text-green-800 border-green-300',
    'CAUTION': 'bg-amber-100 text-amber-800 border-amber-300',
    'HOLD': 'bg-orange-100 text-orange-800 border-orange-300',
    'NO-GO': 'bg-red-100 text-red-800 border-red-300'
  } as any)[g] || 'bg-gray-100 text-gray-700';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-1"><Wind className="text-cyan-600" />Spray Window Optimizer</h1>
      <p className="text-sm text-gray-500 mb-6">Weighted drift / Delta-T / pollinator / rain-fastness score; decides GO / CAUTION / HOLD / NO-GO for a field x product x hour.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={submit} className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field</label>
            <select value={form.field_id} onChange={e => setForm({ ...form, field_id: e.target.value })} required className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Select field</option>
              {fields.map(f => <option key={f.id} value={f.id}>{f.name} ({f.crop_type}, {f.hectares} ha)</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product (active ingredient)</label>
            <select value={form.pesticide_id} onChange={e => setForm({ ...form, pesticide_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Any / generic</option>
              {pesticides.map(p => <option key={p.id} value={p.id}>{p.trade_name || p.active_ingredient} - IRAC {p.irac_moa_group} {p.organic_approved ? '(OMRI)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Application hour (0-23)</label>
            <input type="number" min="0" max="23" value={form.hour_of_day} onChange={e => setForm({ ...form, hour_of_day: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2">
            {loading && <RefreshCcw className="w-4 h-4 animate-spin" />}
            {loading ? 'Computing...' : 'Score spray window'}
          </button>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
        </form>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          {!result && <p className="text-sm text-gray-500">Submit form for a spray-window analysis.</p>}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase text-gray-400">Composite score</div>
                  <div className="text-3xl font-bold text-gray-900">{result.scores.composite}</div>
                </div>
                <div className={`px-4 py-2 rounded-lg border font-bold ${gradeStyle(result.grade)}`}>
                  {result.grade === 'GO' ? <CheckCircle2 className="inline w-5 h-5 mr-1" /> : <AlertTriangle className="inline w-5 h-5 mr-1" />}
                  {result.grade}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(result.scores).filter(([k]) => k !== 'composite').map(([k, v]) => (
                  <div key={k} className="bg-gray-50 border rounded p-2"><div className="text-gray-500 uppercase">{k}</div><div className="font-bold text-gray-800">{v as any}</div></div>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
                <p className="text-blue-900"><b>Delta-T:</b> {result.delta_t_c}°C · <b>Buffer zone:</b> {result.buffer_zone_m} m downwind</p>
              </div>
              {result.alt_suggestion && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900">
                  <b>Suggestion:</b> {result.alt_suggestion}
                </div>
              )}
              <ul className="text-xs text-gray-700 list-disc list-inside">
                {result.findings.map((f: string, i: number) => <li key={i}>{f}</li>)}
              </ul>
              {result.llm_narrative && (
                <div className="bg-violet-50 border border-violet-200 rounded p-3 text-xs text-violet-900">
                  <b>Applicator brief:</b> {result.llm_narrative}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5 mt-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Recent spray events ({recent.length})</h2>
        {recent.length === 0 ? <p className="text-sm text-gray-500">No spray events logged.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500 border-b"><tr><th className="py-2">When</th><th>Field</th><th>Product</th><th>Rate</th><th>Method</th><th>Wind</th></tr></thead>
            <tbody>{recent.map((e: any) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="py-2 text-xs text-gray-500">{new Date(e.applied_at).toLocaleString()}</td>
                <td>{e.field_name}</td>
                <td className="text-gray-700">{e.product_trade_name || e.active_ingredient}</td>
                <td className="font-mono">{e.rate_g_ai_per_ha} g/ha</td>
                <td>{e.application_method}</td>
                <td>{e.wind_speed_kmh ?? '-'} km/h</td>
              </tr>))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
