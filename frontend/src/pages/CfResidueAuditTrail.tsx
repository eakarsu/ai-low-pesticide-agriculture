import { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCcw, CheckCircle2, XCircle } from 'lucide-react';

async function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token') || '';
  const r = await fetch(`/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Request failed');
  return r.json();
}

export default function CfResidueAuditTrail() {
  const [fields, setFields] = useState<any[]>([]);
  const [fieldId, setFieldId] = useState('');
  const [harvestDate, setHarvestDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [result, setResult] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [logForm, setLogForm] = useState({ field_id: '', active_ingredient: '', product_trade_name: '', rate_g_ai_per_ha: '', application_method: 'broadcast' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/fields').then(setFields).catch(() => {});
    api('/cf-residue-audit-trail/recent').then(setRecent).catch(() => {});
  }, []);

  async function audit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await api('/cf-residue-audit-trail/audit', {
        method: 'POST',
        body: JSON.stringify({ field_id: Number(fieldId), planned_harvest_date: harvestDate }),
      });
      setResult(r);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  async function logSpray() {
    try {
      await api('/cf-residue-audit-trail/log-spray', {
        method: 'POST',
        body: JSON.stringify({
          field_id: Number(logForm.field_id),
          active_ingredient: logForm.active_ingredient,
          product_trade_name: logForm.product_trade_name,
          rate_g_ai_per_ha: Number(logForm.rate_g_ai_per_ha),
          application_method: logForm.application_method,
        }),
      });
      setLogForm({ field_id: '', active_ingredient: '', product_trade_name: '', rate_g_ai_per_ha: '', application_method: 'broadcast' });
      api('/cf-residue-audit-trail/recent').then(setRecent).catch(() => {});
    } catch (e: any) { setError(e.message); }
  }

  const riskStyle = (r: string) => ({ low: 'bg-green-100 text-green-800', medium: 'bg-yellow-100 text-yellow-800', high: 'bg-orange-100 text-orange-800', critical: 'bg-red-100 text-red-800' } as any)[r] || 'bg-gray-100';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-1"><ShieldAlert className="text-red-600" />Residue Audit Trail / MRL Compliance</h1>
      <p className="text-sm text-gray-500 mb-6">Field-level audit of PHI, REI, max-app-rate, and first-order decay residue against US EPA 40 CFR 180 tolerances.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={audit} className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-800">Audit a field for harvest readiness</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field</label>
            <select value={fieldId} onChange={e => setFieldId(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Select field</option>
              {fields.map(f => <option key={f.id} value={f.id}>{f.name} ({f.crop_type})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Planned harvest date</label>
            <input type="date" value={harvestDate} onChange={e => setHarvestDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2">
            {loading && <RefreshCcw className="w-4 h-4 animate-spin" />}
            {loading ? 'Auditing...' : 'Run residue audit'}
          </button>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
        </form>

        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-800">Log a new spray event</h2>
          <select value={logForm.field_id} onChange={e => setLogForm({ ...logForm, field_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Field</option>
            {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <input value={logForm.active_ingredient} onChange={e => setLogForm({ ...logForm, active_ingredient: e.target.value })} placeholder="Active ingredient (e.g. Chlorantraniliprole)" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input value={logForm.product_trade_name} onChange={e => setLogForm({ ...logForm, product_trade_name: e.target.value })} placeholder="Trade name (e.g. Coragen)" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input type="number" value={logForm.rate_g_ai_per_ha} onChange={e => setLogForm({ ...logForm, rate_g_ai_per_ha: e.target.value })} placeholder="Rate (g a.i./ha)" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <select value={logForm.application_method} onChange={e => setLogForm({ ...logForm, application_method: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="broadcast">broadcast</option>
            <option value="banded">banded</option>
            <option value="spot_drone">spot_drone</option>
            <option value="aerial">aerial</option>
            <option value="chemigation">chemigation</option>
          </select>
          <button onClick={logSpray} className="w-full bg-gray-800 hover:bg-gray-900 text-white font-medium py-2 rounded-lg text-sm">Log spray</button>
        </div>
      </div>

      {result && (
        <div className="bg-white border rounded-xl p-5 mt-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{result.field.name} — audit</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${riskStyle(result.overall_risk)}`}>{result.overall_risk.toUpperCase()}</span>
          </div>
          {result.llm_summary && <div className="bg-violet-50 border border-violet-200 rounded p-3 text-sm text-violet-900 mb-3">{result.llm_summary}</div>}
          {result.findings.length === 0 ? <p className="text-sm text-gray-500">No spray events on file in last 180 days.</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500 border-b"><tr>
                <th className="py-2">Active Ingredient</th><th>Apps</th><th>PHI</th><th>Days Since</th><th>Residue (ppm)</th><th>MRL (ppm)</th><th>Risk</th>
              </tr></thead>
              <tbody>{result.findings.map((f: any, i: number) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 font-medium text-gray-800">{f.active_ingredient}</td>
                  <td>{f.apps_this_season}/{f.max_apps_label}</td>
                  <td>{f.phi_days}d</td>
                  <td>{f.phi_compliant ? <CheckCircle2 className="inline w-4 h-4 text-green-600" /> : <XCircle className="inline w-4 h-4 text-red-600" />} {f.days_since_latest}d</td>
                  <td className="font-mono">{f.predicted_residue_at_harvest_ppm}</td>
                  <td className="font-mono">{f.mrl_ppm ?? '—'}</td>
                  <td><span className={`px-2 py-0.5 rounded text-xs ${riskStyle(f.risk)}`}>{f.risk}</span></td>
                </tr>))}
              </tbody>
            </table>
          )}
          {result.findings.some((f: any) => f.issues?.length > 0) && (
            <div className="mt-3 space-y-1">
              {result.findings.flatMap((f: any) => f.issues.map((i: string, idx: number) => (
                <div key={`${f.active_ingredient}-${idx}`} className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-800">
                  <b>{f.active_ingredient}:</b> {i}
                </div>
              )))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white border rounded-xl p-5 mt-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Recent spray log ({recent.length})</h2>
        {recent.length === 0 ? <p className="text-sm text-gray-500">No spray events recorded.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500 border-b"><tr><th className="py-2">When</th><th>Field</th><th>AI</th><th>Rate</th><th>Method</th></tr></thead>
            <tbody>{recent.slice(0, 20).map((e: any) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="py-2 text-xs text-gray-500">{new Date(e.applied_at).toLocaleString()}</td>
                <td>{e.field_name}</td>
                <td>{e.active_ingredient}</td>
                <td className="font-mono">{e.rate_g_ai_per_ha}</td>
                <td>{e.application_method}</td>
              </tr>))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
