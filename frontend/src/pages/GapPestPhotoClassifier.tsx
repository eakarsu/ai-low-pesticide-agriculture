import { useEffect, useState } from 'react';
import { Bug, RefreshCcw, AlertTriangle, Leaf } from 'lucide-react';

type ClassifyResult = {
  id: number | null;
  predicted_pest: string;
  scientific_name: string | null;
  confidence: number;
  severity: string;
  recommended_action: string;
  reasoning: string;
  alternatives: { pest: string; score: number }[];
  catalog: any;
  llm_used: boolean;
};

const CROPS = ['corn', 'soybean', 'wheat', 'cotton', 'rice', 'sorghum', 'apple', 'tomato', 'potato', 'cabbage', 'citrus', 'strawberry'];

async function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('token') || '';
  const r = await fetch(`/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Request failed');
  return r.json();
}

export default function GapPestPhotoClassifier() {
  const [form, setForm] = useState({ description: '', crop: 'corn', image_url: '' });
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [pestRef, setPestRef] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/gap-ai-pest-photo-classifier/history').then(setHistory).catch(() => {});
    api('/gap-ai-pest-photo-classifier/pests').then(setPestRef).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await api('/gap-ai-pest-photo-classifier/classify', { method: 'POST', body: JSON.stringify(form) });
      setResult(r);
      api('/gap-ai-pest-photo-classifier/history').then(setHistory).catch(() => {});
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  const sev = (s: string) => ({ low: 'text-green-700 bg-green-100', medium: 'text-amber-700 bg-amber-100', high: 'text-orange-700 bg-orange-100', critical: 'text-red-700 bg-red-100' } as any)[s] || 'text-gray-700 bg-gray-100';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1"><Bug className="text-green-600" />Pest Photo / Description Classifier</h1>
      <p className="text-sm text-gray-500 mb-6">Describe a field observation; we match against 30 real pest species with university-extension thresholds and IPM tier-1 to tier-3 actions.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={submit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crop</label>
            <select value={form.crop} onChange={e => setForm({ ...form, crop: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
              {CROPS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field observation / damage description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={5} required
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Scattered clusters of small green aphids on soybean leaves, sooty mold appearing on lower canopy, populations approaching threshold." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
            <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://..." />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2">
            {loading && <RefreshCcw className="w-4 h-4 animate-spin" />}
            {loading ? 'Classifying...' : 'Classify Pest'}
          </button>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
        </form>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          {!result && <p className="text-gray-500 text-sm">Submit the form to classify a pest.</p>}
          {result && (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs uppercase text-gray-400">Predicted pest</div>
                  <div className="text-xl font-bold text-gray-900">{result.predicted_pest}</div>
                  {result.scientific_name && <div className="text-xs text-gray-500 italic">{result.scientific_name}</div>}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${sev(result.severity)}`}>{result.severity.toUpperCase()}</div>
              </div>
              <div className="text-xs text-gray-500">Confidence {(result.confidence * 100).toFixed(0)}%</div>
              {result.catalog && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-green-800 mb-1 flex items-center gap-1"><Leaf className="w-4 h-4" />IPM threshold</p>
                  <p className="text-gray-700">{result.catalog.economic_threshold}</p>
                </div>
              )}
              <div className="bg-gray-50 border rounded-lg p-3">
                <p className="text-xs uppercase text-gray-500 mb-2">Recommended action cascade</p>
                <pre className="whitespace-pre-wrap text-xs text-gray-700 leading-relaxed">{result.recommended_action}</pre>
              </div>
              <details className="bg-gray-50 rounded-lg p-3">
                <summary className="text-xs font-medium text-gray-700 cursor-pointer">Reasoning {result.llm_used && <span className="text-violet-600">(LLM-augmented)</span>}</summary>
                <pre className="whitespace-pre-wrap text-xs text-gray-600 mt-2">{result.reasoning}</pre>
              </details>
              {result.alternatives?.length > 0 && (
                <div className="text-xs text-gray-600">
                  <p className="font-medium mb-1">Alternative candidates:</p>
                  <ul>{result.alternatives.map(a => <li key={a.pest}>• {a.pest} (score {a.score})</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5 mt-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="text-amber-500 w-5 h-5" />Recent classifications</h2>
        {history.length === 0 ? <p className="text-sm text-gray-500">No classifications yet.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-gray-500 border-b"><tr><th className="py-2">When</th><th>Pest</th><th>Severity</th><th>Field</th><th>Conf.</th></tr></thead>
            <tbody>{history.map(h => (
              <tr key={h.id} className="border-b last:border-0">
                <td className="py-2 text-gray-500 text-xs">{new Date(h.classified_at).toLocaleString()}</td>
                <td className="text-gray-800">{h.predicted_pest}</td>
                <td><span className={`px-2 py-0.5 rounded text-xs ${sev(h.severity)}`}>{h.severity}</span></td>
                <td className="text-gray-600">{h.field_name || '-'}</td>
                <td className="text-gray-600">{(Number(h.confidence) * 100).toFixed(0)}%</td>
              </tr>))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white border rounded-xl p-5 mt-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Pest reference ({pestRef.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto text-xs">
          {pestRef.map((p: any) => (
            <div key={p.id} className="border rounded p-2">
              <p className="font-medium text-gray-800">{p.common_name}</p>
              <p className="text-gray-500 italic">{p.scientific_name}</p>
              <p className="text-gray-600">{p.primary_crops}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
