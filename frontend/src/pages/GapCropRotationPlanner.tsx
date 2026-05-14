import { useEffect, useState } from 'react';
import { Repeat, RefreshCcw, Save } from 'lucide-react';

async function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token') || '';
  const r = await fetch(`/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Request failed');
  return r.json();
}

export default function GapCropRotationPlanner() {
  const [fields, setFields] = useState<any[]>([]);
  const [fieldId, setFieldId] = useState('');
  const [prevCrop, setPrevCrop] = useState('');
  const [years, setYears] = useState(4);
  const [result, setResult] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/fields').then(setFields).catch(() => {});
    api('/gap-ai-crop-rotation-planner/plans').then(setPlans).catch(() => {});
  }, []);

  async function plan(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await api('/gap-ai-crop-rotation-planner/plan', {
        method: 'POST',
        body: JSON.stringify({ field_id: fieldId ? Number(fieldId) : null, prev_crop: prevCrop || null, years: Number(years) }),
      });
      setResult(r);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  async function savePlan() {
    if (!result) return;
    setSaving(true);
    try {
      await api('/gap-ai-crop-rotation-planner/save', {
        method: 'POST',
        body: JSON.stringify({
          field_id: result.field?.id ?? (fieldId ? Number(fieldId) : null),
          plan_year_1: result.proposed_plan.year_1,
          plan_year_2: result.proposed_plan.year_2,
          plan_year_3: result.proposed_plan.year_3,
          plan_year_4: result.proposed_plan.year_4,
          notes: result.narrative || ''
        })
      });
      api('/gap-ai-crop-rotation-planner/plans').then(setPlans).catch(() => {});
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  const recStyle = (r: string) => ({ excellent: 'bg-green-100 text-green-800', good: 'bg-emerald-100 text-emerald-800', acceptable: 'bg-yellow-100 text-yellow-800', avoid: 'bg-orange-100 text-orange-800', never: 'bg-red-100 text-red-800' } as any)[r] || 'bg-gray-100 text-gray-700';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-1"><Repeat className="text-emerald-600" />Crop Rotation Planner</h1>
      <p className="text-sm text-gray-500 mb-6">Multi-year rotations scored by extension-derived rules (pest cycle breaks, N balance) and weighted against this field's recent pest pressure.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={plan} className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field (or skip and pick crop)</label>
            <select value={fieldId} onChange={e => setFieldId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">No field (use crop only)</option>
              {fields.map(f => <option key={f.id} value={f.id}>{f.name} ({f.crop_type}, {f.hectares} ha)</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current crop (override)</label>
            <input value={prevCrop} onChange={e => setPrevCrop(e.target.value)} placeholder="corn / soybean / wheat..." className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Years to plan</label>
            <input type="number" min="1" max="6" value={years} onChange={e => setYears(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2">
            {loading && <RefreshCcw className="w-4 h-4 animate-spin" />}
            {loading ? 'Planning...' : 'Generate rotation plan'}
          </button>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
        </form>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          {!result && <p className="text-sm text-gray-500">Submit form to compute a rotation plan.</p>}
          {result && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
                <p className="text-xs uppercase text-emerald-700 mb-1">Proposed rotation</p>
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-900 flex-wrap">
                  <span className="px-2 py-1 bg-white border border-emerald-300 rounded">Y1: {result.proposed_plan.year_1}</span>
                  <span>→</span>
                  <span className="px-2 py-1 bg-white border border-emerald-300 rounded">Y2: {result.proposed_plan.year_2}</span>
                  <span>→</span>
                  <span className="px-2 py-1 bg-white border border-emerald-300 rounded">Y3: {result.proposed_plan.year_3}</span>
                  {result.proposed_plan.year_4 && <><span>→</span><span className="px-2 py-1 bg-white border border-emerald-300 rounded">Y4: {result.proposed_plan.year_4}</span></>}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase text-gray-500 mb-2">Top next-crop candidates</p>
                <div className="space-y-1">
                  {result.top_candidates.slice(0, 6).map((c: any) => (
                    <div key={c.next_crop} className="flex items-center justify-between text-sm border-b pb-1">
                      <span className="font-medium text-gray-800">{c.next_crop}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${recStyle(c.recommendation)}`}>{c.recommendation} ({c.total_score})</span>
                    </div>
                  ))}
                </div>
              </div>

              {result.recent_pests?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs">
                  <p className="font-semibold text-amber-800 mb-1">Recent pest pressure considered:</p>
                  {result.recent_pests.map((p: any) => <p key={p.pest_name}>• {p.pest_name} ({p.hits} obs)</p>)}
                </div>
              )}

              {result.narrative && (
                <div className="bg-violet-50 border border-violet-200 rounded p-3 text-xs text-violet-900">
                  {result.narrative}
                </div>
              )}

              <button onClick={savePlan} disabled={saving} className="w-full bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save plan'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5 mt-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Saved rotation plans ({plans.length})</h2>
        {plans.length === 0 ? <p className="text-sm text-gray-500">No plans saved.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500 border-b"><tr><th className="py-2">When</th><th>Field</th><th>Y1</th><th>Y2</th><th>Y3</th><th>Y4</th></tr></thead>
            <tbody>{plans.map((p: any) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2 text-xs text-gray-500">{new Date(p.created_at).toLocaleString()}</td>
                <td className="text-gray-800">{p.field_name}</td>
                <td>{p.plan_year_1}</td>
                <td>{p.plan_year_2}</td>
                <td>{p.plan_year_3}</td>
                <td>{p.plan_year_4 || '-'}</td>
              </tr>))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
