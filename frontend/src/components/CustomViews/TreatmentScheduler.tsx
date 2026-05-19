import { useEffect, useState } from 'react';
import { Leaf, Plus, Trash2, Save, X } from 'lucide-react';

type Recipe = {
  id: number;
  name: string;
  target_pest: string;
  crop: string;
  agent: string;
  rate: string;
  frequency_days: number;
  organic: boolean;
  notes: string;
};

const empty: Omit<Recipe, 'id'> = {
  name: '', target_pest: '', crop: 'corn', agent: '', rate: '', frequency_days: 7, organic: true, notes: ''
};

export default function TreatmentScheduler() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [summary, setSummary] = useState<{ total: number; organic_count: number; pests_covered: string[] } | null>(null);
  const [draft, setDraft] = useState<Omit<Recipe, 'id'>>(empty);
  const [editId, setEditId] = useState<number | null>(null);
  const [err, setErr] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const auth = { Authorization: `Bearer ${localStorage.getItem('token') || ''}`, 'Content-Type': 'application/json' };

  const load = async () => {
    try {
      const r = await fetch('/api/custom-views/biocontrol-recipes', { headers: auth });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setRecipes(j.recipes);
      setSummary(j.summary);
    } catch (e: any) { setErr(e.message); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    setErr('');
    try {
      if (editId !== null) {
        const r = await fetch(`/api/custom-views/biocontrol-recipes/${editId}`, {
          method: 'PUT', headers: auth, body: JSON.stringify(draft)
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      } else {
        const r = await fetch('/api/custom-views/biocontrol-recipes', {
          method: 'POST', headers: auth, body: JSON.stringify(draft)
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || `HTTP ${r.status}`);
        }
      }
      setDraft(empty);
      setEditId(null);
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    setErr('');
    try {
      const r = await fetch(`/api/custom-views/biocontrol-recipes/${id}`, { method: 'DELETE', headers: auth });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e: any) { setErr(e.message); }
  };

  const edit = (r: Recipe) => {
    setEditId(r.id);
    const { id: _id, ...rest } = r;
    setDraft(rest);
  };

  const cancel = () => { setEditId(null); setDraft(empty); };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 lg:col-span-2" data-testid="biocontrol-recipe-editor">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-900">Biocontrol Treatment Recipes</h3>
        </div>
        {summary && (
          <span className="text-xs text-gray-500">
            {summary.total} recipes · {summary.organic_count} organic · {summary.pests_covered.length} pests
          </span>
        )}
      </div>

      {err && <div className="text-xs text-red-600 mb-2">Error: {err}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-2 py-1.5">Name</th>
                <th className="text-left px-2 py-1.5">Pest</th>
                <th className="text-left px-2 py-1.5">Crop</th>
                <th className="text-left px-2 py-1.5">Agent</th>
                <th className="text-left px-2 py-1.5">Rate</th>
                <th className="text-left px-2 py-1.5">Every</th>
                <th className="text-left px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {recipes.map(r => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-emerald-50/30">
                  <td className="px-2 py-1.5 font-medium text-gray-900">{r.name}</td>
                  <td className="px-2 py-1.5">{r.target_pest}</td>
                  <td className="px-2 py-1.5 text-gray-600">{r.crop}</td>
                  <td className="px-2 py-1.5 text-gray-600">{r.agent}</td>
                  <td className="px-2 py-1.5 text-gray-600">{r.rate}</td>
                  <td className="px-2 py-1.5 text-gray-600">{r.frequency_days}d</td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">
                    <button onClick={() => edit(r)} className="text-violet-600 hover:underline mr-2">Edit</button>
                    <button onClick={() => remove(r.id)} className="text-red-600 hover:text-red-800" title="Delete">
                      <Trash2 className="w-3.5 h-3.5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            {editId !== null ? 'Edit recipe' : 'New recipe'}
          </div>
          <div className="space-y-2">
            <input
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              placeholder="Name"
              value={draft.name}
              onChange={e => setDraft({ ...draft, name: e.target.value })}
            />
            <input
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              placeholder="Target pest"
              value={draft.target_pest}
              onChange={e => setDraft({ ...draft, target_pest: e.target.value })}
            />
            <input
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              placeholder="Crop"
              value={draft.crop}
              onChange={e => setDraft({ ...draft, crop: e.target.value })}
            />
            <input
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              placeholder="Bio-agent"
              value={draft.agent}
              onChange={e => setDraft({ ...draft, agent: e.target.value })}
            />
            <input
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              placeholder="Rate (e.g. 250 g/ha)"
              value={draft.rate}
              onChange={e => setDraft({ ...draft, rate: e.target.value })}
            />
            <input
              type="number"
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              placeholder="Frequency days"
              value={draft.frequency_days}
              onChange={e => setDraft({ ...draft, frequency_days: Number(e.target.value) })}
            />
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={draft.organic}
                onChange={e => setDraft({ ...draft, organic: e.target.checked })}
              />
              Organic-certified
            </label>
            <textarea
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
              rows={2}
              placeholder="Notes"
              value={draft.notes}
              onChange={e => setDraft({ ...draft, notes: e.target.value })}
            />
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={busy}
                className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
              >
                {editId !== null ? <Save className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {editId !== null ? 'Update' : 'Add'}
              </button>
              {editId !== null && (
                <button
                  onClick={cancel}
                  className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  <X className="w-3 h-3" />Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
