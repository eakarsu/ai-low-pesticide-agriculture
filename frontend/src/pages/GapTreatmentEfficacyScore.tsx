import { useEffect, useState } from 'react';
import { TrendingDown, RefreshCcw, BarChart3 } from 'lucide-react';

async function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token') || '';
  const r = await fetch(`/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Request failed');
  return r.json();
}

export default function GapTreatmentEfficacyScore() {
  const [treatments, setTreatments] = useState<any[]>([]);
  const [treatmentId, setTreatmentId] = useState('');
  const [windowDays, setWindowDays] = useState(21);
  const [result, setResult] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [program, setProgram] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/treatments').then(setTreatments).catch(() => {});
    api('/gap-ai-treatment-efficacy-score/scores').then(setScores).catch(() => {});
    api('/gap-ai-treatment-efficacy-score/program').then(setProgram).catch(() => {});
  }, []);

  async function score(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await api('/gap-ai-treatment-efficacy-score/score', {
        method: 'POST',
        body: JSON.stringify({ treatment_id: Number(treatmentId), window_days: Number(windowDays) }),
      });
      setResult(r);
      api('/gap-ai-treatment-efficacy-score/scores').then(setScores).catch(() => {});
      api('/gap-ai-treatment-efficacy-score/program').then(setProgram).catch(() => {});
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  const verdictStyle = (v: string) => ({ excellent: 'bg-green-100 text-green-800', good: 'bg-emerald-100 text-emerald-800', partial: 'bg-yellow-100 text-yellow-800', failed: 'bg-red-100 text-red-800' } as any)[v] || 'bg-gray-100 text-gray-700';

  const completedTreatments = treatments.filter((t: any) => t.completed_date);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-1"><TrendingDown className="text-blue-600" />Treatment Efficacy Score</h1>
      <p className="text-sm text-gray-500 mb-6">Retrospectively scores a completed treatment by comparing pest pressure 21 days before vs after; assigns a verdict and a resistance-management recommendation.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={score} className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Completed treatment</label>
            <select value={treatmentId} onChange={e => setTreatmentId(e.target.value)} required className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Select treatment</option>
              {completedTreatments.map((t: any) => (
                <option key={t.id} value={t.id}>#{t.id} {t.treatment_type} {t.chemical_name || ''} ({t.completed_date?.slice(0, 10)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comparison window (days before/after)</label>
            <input type="number" value={windowDays} onChange={e => setWindowDays(Number(e.target.value))} min="7" max="60" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2">
            {loading && <RefreshCcw className="w-4 h-4 animate-spin" />}
            {loading ? 'Scoring...' : 'Score treatment'}
          </button>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
        </form>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          {!result && <p className="text-sm text-gray-500">Select a completed treatment and click Score.</p>}
          {result && (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-xs uppercase text-gray-400">Verdict</p>
                  <p className="text-2xl font-bold text-gray-900">{result.verdict.toUpperCase()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${verdictStyle(result.verdict)}`}>{result.knockdown_pct}% knockdown</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 border rounded p-2"><div className="text-gray-500">Pre pressure</div><div className="font-bold">{result.pre_pressure}</div></div>
                <div className="bg-gray-50 border rounded p-2"><div className="text-gray-500">Post pressure</div><div className="font-bold">{result.post_pressure}</div></div>
                <div className="bg-gray-50 border rounded p-2"><div className="text-gray-500">Pre detections</div><div className="font-bold">{result.pre_detections}</div></div>
                <div className="bg-gray-50 border rounded p-2"><div className="text-gray-500">Post detections</div><div className="font-bold">{result.post_detections}</div></div>
                <div className="bg-gray-50 border rounded p-2 col-span-2"><div className="text-gray-500">Days to suppression</div><div className="font-bold">{result.days_to_suppression ?? 'Not achieved in window'}</div></div>
              </div>
              {result.pesticide_metadata && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
                  <b>Product class:</b> {result.pesticide_metadata.chemical_class} | IRAC {result.pesticide_metadata.irac_moa_group} {result.pesticide_metadata.organic_approved ? '(OMRI)' : ''}
                </div>
              )}
              {result.notes?.length > 0 && (
                <ul className="text-xs text-gray-700 list-disc list-inside space-y-1">
                  {result.notes.map((n: string, i: number) => <li key={i}>{n}</li>)}
                </ul>
              )}
              {result.llm_critique && (
                <div className="bg-violet-50 border border-violet-200 rounded p-3 text-xs text-violet-900">
                  {result.llm_critique}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5 mt-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><BarChart3 className="text-blue-600 w-5 h-5" />Program-wide verdicts</h2>
        {program.length === 0 ? <p className="text-sm text-gray-500">No scores yet.</p> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {program.map((p: any) => (
              <div key={p.verdict} className={`border rounded p-3 ${verdictStyle(p.verdict)}`}>
                <div className="text-xs uppercase">{p.verdict}</div>
                <div className="text-2xl font-bold">{p.n}</div>
                <div className="text-xs">Avg knockdown {Number(p.avg_knockdown).toFixed(1)}%</div>
                <div className="text-xs">Avg savings {Number(p.avg_savings).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border rounded-xl p-5 mt-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Recent scores ({scores.length})</h2>
        {scores.length === 0 ? <p className="text-sm text-gray-500">No scores yet.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500 border-b"><tr><th className="py-2">When</th><th>Field</th><th>Treatment</th><th>Knockdown</th><th>Days</th><th>Verdict</th></tr></thead>
            <tbody>{scores.map((s: any) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="py-2 text-xs text-gray-500">{new Date(s.scored_at).toLocaleString()}</td>
                <td>{s.field_name}</td>
                <td>{s.treatment_type} {s.chemical_name || ''}</td>
                <td className="font-mono">{Number(s.knockdown_pct).toFixed(1)}%</td>
                <td>{s.days_to_suppression ?? '-'}</td>
                <td><span className={`px-2 py-0.5 rounded text-xs ${verdictStyle(s.verdict)}`}>{s.verdict}</span></td>
              </tr>))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
