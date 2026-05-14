import { useState, useEffect } from 'react';
import { Plus, Search, FlaskConical } from 'lucide-react';
import { api } from '../../api';
import { Treatment } from '../../types';
import TreatmentDetail from './TreatmentDetail';
import TreatmentForm from './TreatmentForm';

export default function TreatmentsPage() {
  const [items, setItems] = useState<Treatment[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Treatment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setItems(await api.getTreatments()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(t =>
    t.field_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.treatment_type?.toLowerCase().includes(search.toLowerCase()) ||
    t.chemical_name?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s: string) => ({
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-600'
  }[s] || 'bg-gray-100 text-gray-600');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Treatment Plans</h2>
          <p className="text-gray-500 text-sm mt-1">{items.length} treatments tracked</p>
        </div>
        <button onClick={() => { setSelected(null); setShowForm(true); }} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors">
          <Plus className="w-4 h-4" /> New Treatment
        </button>
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by field, type, or chemical..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-400">Loading treatments...</div> : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Treatment', 'Field', 'Scheduled', 'Status', 'Chem Savings', 'Dosage'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(t => (
                <tr key={t.id} onClick={() => setSelected(t)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FlaskConical className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm capitalize">{t.treatment_type?.replace('_',' ')}</div>
                        <div className="text-xs text-gray-500">{t.chemical_name || 'No chemical'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{t.field_name || `#${t.field_id}`}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{t.scheduled_date ? new Date(t.scheduled_date).toLocaleDateString() : '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor(t.status)}`}>{t.status?.replace('_',' ')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-semibold ${t.chemical_savings_pct >= 70 ? 'text-green-600' : t.chemical_savings_pct >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>{t.chemical_savings_pct}%</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{t.dosage_ml_per_ha ? `${t.dosage_ml_per_ha} ml/ha` : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selected && !showForm && (
        <TreatmentDetail treatment={selected} onClose={() => setSelected(null)} onRefresh={() => { load(); setSelected(null); }} onEdit={() => setShowForm(true)} />
      )}
      {showForm && (
        <TreatmentForm treatment={showForm && selected ? selected : null} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); setSelected(null); load(); }} />
      )}
    </div>
  );
}
