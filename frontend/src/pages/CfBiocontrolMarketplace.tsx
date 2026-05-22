import { useEffect, useState } from 'react';
import { ShoppingCart, RefreshCcw, Bug } from 'lucide-react';

async function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token') || '';
  const r = await fetch(`/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Request failed');
  return r.json();
}

export default function CfBiocontrolMarketplace() {
  const [fields, setFields] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [form, setForm] = useState({ target_pest: 'Soybean Aphid', field_id: '', severity: 'medium' });
  const [result, setResult] = useState<any>(null);
  const [resistancePlan, setResistancePlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/fields').then(setFields).catch(() => {});
    api('/cf-biocontrol-marketplace/catalog').then(setCatalog).catch(() => {});
    api('/cf-biocontrol-marketplace/orders').then(setOrders).catch(() => {});
  }, []);

  async function recommend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await api('/cf-biocontrol-marketplace/recommend', {
        method: 'POST',
        body: JSON.stringify({
          target_pest: form.target_pest,
          field_id: form.field_id ? Number(form.field_id) : null,
          severity: form.severity
        })
      });
      setResult(r);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  async function planResistance() {
    setLoading(true); setError(''); setResistancePlan(null);
    try {
      const r = await api('/cf-biocontrol-marketplace/resistance-plan', {
        method: 'POST',
        body: JSON.stringify({
          target_pest: form.target_pest,
          recent_modes: ['pyrethroid', 'neonicotinoid'],
          season_weeks: 8
        })
      });
      setResistancePlan(r);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  async function order(b: any) {
    try {
      await api('/cf-biocontrol-marketplace/order', {
        method: 'POST',
        body: JSON.stringify({
          field_id: form.field_id ? Number(form.field_id) : null,
          beneficial_id: b.id,
          target_pest: form.target_pest,
          quantity_units: b.purchase_units || 1,
          estimated_cost_usd: b.estimated_cost_usd
        })
      });
      api('/cf-biocontrol-marketplace/orders').then(setOrders).catch(() => {});
    } catch (e: any) { setError(e.message); }
  }

  const COMMON_PESTS = ['Soybean Aphid', 'Spider Mites (Twospotted)', 'Whitefly (Silverleaf)', 'Thrips (Western Flower)', 'European Corn Borer', 'Codling Moth', 'Colorado Potato Beetle', 'Mexican Bean Beetle', 'Aphids (Green Peach)', 'Cabbage Looper'];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-1"><ShoppingCart className="text-purple-600" />Biocontrol Marketplace</h1>
      <p className="text-sm text-gray-500 mb-6">Match a pest to commercial beneficial insects (real suppliers, real prices), compute release totals from field acreage.</p>

      <form onSubmit={recommend} className="bg-white border rounded-xl p-5 shadow-sm mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Target pest</label>
          <select value={form.target_pest} onChange={e => setForm({ ...form, target_pest: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
            {COMMON_PESTS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Field</label>
          <select value={form.field_id} onChange={e => setForm({ ...form, field_id: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">No field</option>
            {fields.map(f => <option key={f.id} value={f.id}>{f.name} ({f.hectares} ha)</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
          <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
            <option>low</option><option>medium</option><option>high</option><option>critical</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm flex items-center gap-2">
          {loading && <RefreshCcw className="w-4 h-4 animate-spin" />}
          {loading ? 'Searching...' : 'Recommend biocontrols'}
        </button>
        <button type="button" onClick={planResistance} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm">
          Resistance rotation plan
        </button>
      </form>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>}

      {resistancePlan && (
        <div className="bg-white border rounded-xl p-5 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-3">Resistance rotation plan for {resistancePlan.target_pest}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {resistancePlan.calendar.map((w: any) => (
              <div key={w.week} className="border rounded-lg p-3">
                <p className="font-semibold">Week {w.week}: {w.tactic.replaceAll('_', ' ')}</p>
                <p className="text-sm text-gray-600 mt-1">{w.recommendation}</p>
              </div>
            ))}
          </div>
          <ul className="mt-4 text-sm text-gray-700 list-disc pl-5">
            {resistancePlan.resistance_principles.map((p: string) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}

      {result && (
        <div className="bg-white border rounded-xl p-5 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-3">Recommendations for {result.target_pest}</h2>
          {result.pest_catalog_entry && (
            <div className="bg-green-50 border border-green-200 rounded p-3 text-xs mb-3">
              <p className="font-semibold text-green-800 flex items-center gap-1"><Bug className="w-3.5 h-3.5" />{result.pest_catalog_entry.scientific_name}</p>
              <p className="text-green-900 mt-1">Natural enemies (catalog): {result.pest_catalog_entry.natural_enemies}</p>
            </div>
          )}
          {result.narrative && <div className="bg-violet-50 border border-violet-200 rounded p-3 text-sm text-violet-900 mb-3">{result.narrative}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.recommendations.map((r: any) => (
              <div key={r.id} className="border rounded-lg p-3">
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold text-gray-900">{r.common_name}</p>
                  <span className="text-xs font-medium px-2 py-0.5 bg-purple-100 text-purple-800 rounded">{r.category}</span>
                </div>
                <p className="text-xs italic text-gray-500">{r.scientific_name}</p>
                <p className="text-xs mt-1 text-gray-600">Targets: {r.target_pests}</p>
                <p className="text-xs mt-1 text-gray-600">Release rate: {r.release_rate_per_ha}</p>
                <p className="text-xs mt-1 text-gray-600">Supplier: {r.supplier}</p>
                {r.recommended_release_total && (
                  <p className="text-xs mt-1 font-medium text-gray-800">For this field: {r.recommended_release_total.toLocaleString()} individuals = {r.purchase_units} units ≈ ${r.estimated_cost_usd?.toLocaleString()}</p>
                )}
                <button onClick={() => order(r)} className="mt-2 w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-1.5 rounded">Place draft order</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-3">Draft / placed orders ({orders.length})</h2>
        {orders.length === 0 ? <p className="text-sm text-gray-500">No orders yet.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500 border-b"><tr><th className="py-2">When</th><th>Beneficial</th><th>Pest</th><th>Field</th><th>Qty</th><th>Cost</th></tr></thead>
            <tbody>{orders.map((o: any) => (
              <tr key={o.id} className="border-b last:border-0">
                <td className="py-2 text-xs text-gray-500">{new Date(o.placed_at).toLocaleString()}</td>
                <td>{o.beneficial_name}</td>
                <td>{o.target_pest || '-'}</td>
                <td>{o.field_name || '-'}</td>
                <td>{o.quantity_units}</td>
                <td>${o.estimated_cost_usd ?? '-'}</td>
              </tr>))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white border rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Full beneficial-insect catalog ({catalog.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto text-xs">
          {catalog.map((c: any) => (
            <div key={c.id} className="border rounded p-2">
              <p className="font-semibold text-gray-800">{c.common_name} <span className="text-xs text-gray-500 italic">({c.scientific_name})</span></p>
              <p className="text-gray-600">{c.category} → {c.target_pests}</p>
              <p className="text-gray-500">{c.supplier} · {c.unit_description} · ${c.price_usd_per_unit}/unit</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
