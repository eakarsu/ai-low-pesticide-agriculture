import { useState, useEffect } from 'react';
import { Plus, Search, FileBarChart2 } from 'lucide-react';
import { api } from '../../api';
import { HealthReport } from '../../types';
import HealthReportDetail from './HealthReportDetail';
import HealthReportForm from './HealthReportForm';

export default function HealthReportsPage() {
  const [items, setItems] = useState<HealthReport[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<HealthReport | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setItems(await api.getHealthReports()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(r =>
    r.field_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.reporter?.toLowerCase().includes(search.toLowerCase())
  );

  const healthColor = (score: number) => score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Health Reports</h2>
          <p className="text-gray-500 text-sm mt-1">{items.length} reports on record</p>
        </div>
        <button onClick={() => { setSelected(null); setShowForm(true); }} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors">
          <Plus className="w-4 h-4" /> New Report
        </button>
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by field or reporter..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-400">Loading reports...</div> : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Field', 'Date', 'Health Score', 'NDVI', 'Yield Est.', 'Reporter'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => (
                <tr key={r.id} onClick={() => setSelected(r)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <FileBarChart2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{r.field_name}</div>
                        <div className="text-xs text-gray-500 capitalize">{r.crop_type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{new Date(r.report_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-bold ${healthColor(r.health_score)}`}>{r.health_score}/100</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{r.ndvi_index}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{r.yield_estimate_kg_ha?.toLocaleString()} kg/ha</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{r.reporter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selected && !showForm && (
        <HealthReportDetail report={selected} onClose={() => setSelected(null)} onRefresh={() => { load(); setSelected(null); }} onEdit={() => setShowForm(true)} />
      )}
      {showForm && (
        <HealthReportForm report={showForm && selected ? selected : null} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); setSelected(null); load(); }} />
      )}
    </div>
  );
}
