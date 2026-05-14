import { useState, useEffect } from 'react';
import { Plus, Search, Bug } from 'lucide-react';
import { api } from '../../api';
import { Detection } from '../../types';
import DetectionDetail from './DetectionDetail';
import DetectionForm from './DetectionForm';

export default function DetectionsPage() {
  const [items, setItems] = useState<Detection[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Detection | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setItems(await api.getDetections()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(d =>
    d.pest_name.toLowerCase().includes(search.toLowerCase()) ||
    d.field_name?.toLowerCase().includes(search.toLowerCase()) ||
    d.severity?.toLowerCase().includes(search.toLowerCase())
  );

  const severityColor = (s: string) => ({ critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-yellow-100 text-yellow-800', low: 'bg-green-100 text-green-800' }[s] || 'bg-gray-100 text-gray-600');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pest Detections</h2>
          <p className="text-gray-500 text-sm mt-1">{items.length} detections logged</p>
        </div>
        <button onClick={() => { setSelected(null); setShowForm(true); }} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors">
          <Plus className="w-4 h-4" /> New Detection
        </button>
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by pest, field, severity..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-400">Loading detections...</div> : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Pest', 'Field', 'Confidence', 'Severity', 'Status', 'Detected'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(d => (
                <tr key={d.id} onClick={() => setSelected(d)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Bug className="w-4 h-4 text-orange-600" />
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{d.pest_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{d.field_name || `Field #${d.field_id}`}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-700">{Math.round(d.confidence * 100)}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${severityColor(d.severity)}`}>{d.severity}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.treated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {d.treated ? 'Treated' : 'Untreated'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">{new Date(d.detected_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selected && !showForm && (
        <DetectionDetail detection={selected} onClose={() => setSelected(null)} onRefresh={() => { load(); setSelected(null); }} onEdit={() => setShowForm(true)} />
      )}
      {showForm && (
        <DetectionForm detection={showForm && selected ? selected : null} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); setSelected(null); load(); }} />
      )}
    </div>
  );
}
